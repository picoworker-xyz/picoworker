// Voice over via ElevenLabs. Falls back to macOS `say` in voice.mjs when no
// API key is configured.
//
// The key lives in .env.local (gitignored) as ELEVENLABS_API_KEY.
//
// Renders are cached on disk by a hash of voice + model + text, because the
// free tier is metered per character and re-recording the video should not
// spend quota on lines that have not changed.

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, rm, access } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import ffmpeg from 'ffmpeg-static'

const RATE = 44100
const API = 'https://api.elevenlabs.io/v1/text-to-speech'

// Sarah: mature, reassuring, clear. Good fit for a how-to.
export const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'
const DEFAULT_MODEL = 'eleven_v3'

function run(cmd, args) {
  return new Promise((ok, fail) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => { err += d })
    p.on('close', (c) => (c === 0 ? ok() : fail(new Error(`${cmd} failed: ${err.slice(-400)}`))))
  })
}

const exists = (p) => access(p).then(() => true, () => false)

/** Reads KEY=value pairs out of .env.local without pulling in a dotenv dep. */
export async function loadEnvLocal(file = resolve('.env.local')) {
  if (!(await exists(file))) return {}
  const out = {}
  for (const line of (await readFile(file, 'utf8')).split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

/**
 * @param {{at:number,text:string}[]} lines
 * @returns {Promise<{at:number, samples:Float32Array, text:string}[]>}
 */
export async function speakLinesEleven(lines, {
  apiKey,
  voiceId = DEFAULT_VOICE_ID,
  model = DEFAULT_MODEL,
  dir,
  cacheDir = resolve('recordings/.voice-cache'),
  // Slightly above the defaults: a touch more consistency, a touch less drama,
  // which is what a tutorial read wants.
  stability = 0.45,
  similarity = 0.8,
  speed = 1.0,
} = {}) {
  await mkdir(cacheDir, { recursive: true })
  const out = []
  let spent = 0

  for (const [i, line] of lines.entries()) {
    const hash = createHash('sha256')
      .update([voiceId, model, stability, similarity, speed, line.text].join('|'))
      .digest('hex')
      .slice(0, 16)
    const cached = resolve(cacheDir, `${hash}.raw`)

    if (!(await exists(cached))) {
      const res = await fetch(`${API}/${voiceId}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          text: line.text,
          model_id: model,
          voice_settings: model.startsWith('eleven_v3')
            ? { stability: 0.5, similarity_boost: similarity } // v3 takes 0.0, 0.5 or 1.0 only
            : { stability, similarity_boost: similarity, speed },
        }),
      })
      if (!res.ok) {
        throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`)
      }
      const mp3 = resolve(dir, `vo-${i}.mp3`)
      await writeFile(mp3, Buffer.from(await res.arrayBuffer()))
      // Decode to headerless float mono so it can be mixed sample by sample.
      await run(ffmpeg, ['-y', '-i', mp3, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', cached])
      await rm(mp3, { force: true })
      spent += line.text.length
    }

    const buf = await readFile(cached)
    out.push({
      at: line.at,
      samples: Float32Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4)),
      text: line.text,
    })
  }

  return { clips: out, charactersUsed: spent }
}
