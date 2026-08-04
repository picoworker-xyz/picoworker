// Voice over, spoken by macOS's built-in speech synthesiser. No API key, no
// upload of the script to a third party, and it runs offline.
//
// Voice quality depends on what is installed locally. The stock voices are
// serviceable; the Premium ones are dramatically better and are a free download
// in System Settings > Accessibility > Spoken Content > System Voice > Manage.

import { spawn, spawnSync } from 'node:child_process'
import { readFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import ffmpeg from 'ffmpeg-static'

const RATE = 44100

function run(cmd, args) {
  return new Promise((ok, fail) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => { err += d })
    p.on('close', (c) => (c === 0 ? ok() : fail(new Error(`${cmd} failed: ${err.slice(-500)}`))))
  })
}

/** True if `say` exists and the named voice is installed. */
export function voiceAvailable(voice) {
  const r = spawnSync('say', ['-v', '?'], { encoding: 'utf8' })
  if (r.status !== 0) return false
  return r.stdout.split('\n').some((l) => l.trim().toLowerCase().startsWith(voice.toLowerCase()))
}

/**
 * Speaks each line and decodes it to mono float samples at 44.1kHz.
 * @param {{at:number,text:string}[]} lines
 * @returns {Promise<{at:number, samples:Float32Array}[]>}
 */
export async function speakLines(lines, { voice = 'Samantha', wpm = 175, dir }) {
  const out = []
  for (const [i, line] of lines.entries()) {
    const aiff = resolve(dir, `vo-${i}.aiff`)
    const raw = resolve(dir, `vo-${i}.raw`)
    await run('say', ['-v', voice, '-r', String(wpm), '-o', aiff, line.text])
    // Decode to headerless 32-bit float mono so it can be mixed directly.
    await run(ffmpeg, ['-y', '-i', aiff, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', raw])
    const buf = await readFile(raw)
    const samples = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4)
    out.push({ at: line.at, samples: Float32Array.from(samples), text: line.text })
    await rm(aiff, { force: true })
    await rm(raw, { force: true })
  }
  return out
}

/** Warns when a line runs past the point where the next one starts. */
export function reportOverlaps(clips) {
  const problems = []
  for (let i = 0; i < clips.length - 1; i++) {
    const endsAt = clips[i].at + (clips[i].samples.length / RATE) * 1000
    const gap = clips[i + 1].at - endsAt
    if (gap < 0) problems.push({ text: clips[i].text, overrunMs: Math.round(-gap) })
  }
  return problems
}
