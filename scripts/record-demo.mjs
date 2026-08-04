// Records one full loop of /login-demo to a video file, offscreen.
//
//   npm run dev            # in one terminal
//   npm run record:demo    # in another
//
// Env overrides: DEMO_URL, DEMO_OUT, DEMO_WIDTH, DEMO_HEIGHT, DEMO_MS.
// Output is .webm — Playwright's only video format. Convert with ffmpeg if you
// need .mp4 (see the note printed at the end).

import { chromium } from 'playwright'
import ffmpeg from 'ffmpeg-static'
import { spawn } from 'node:child_process'
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { renderWav } from './sfx.mjs'
import { speakLines, voiceAvailable, reportOverlaps } from './voice.mjs'
import { speakLinesEleven, loadEnvLocal, DEFAULT_VOICE_ID } from './voice-eleven.mjs'

const URL = process.env.DEMO_URL ?? 'http://localhost:5175/login-demo'
const OUT_DIR = resolve(process.env.DEMO_OUT ?? 'recordings')
// Basename for the output files, so the two tutorials do not overwrite each other.
const NAME = process.env.DEMO_NAME ?? 'picoworker-signup'
// The CSS viewport. This is what controls how large everything *looks*: the
// page lays out for a 1440px window, so at a 1920px output frame every element
// is drawn about 1.35x bigger than it would be on a real 1080p desktop. Shrink
// this to zoom in further, grow it to fit more on screen.
const VIEW_W = Number(process.env.DEMO_VIEW_W ?? 1440)
const VIEW_H = Number(process.env.DEMO_VIEW_H ?? 810)
// The delivered frame size.
const WIDTH = Number(process.env.DEMO_WIDTH ?? 1920)
const HEIGHT = Number(process.env.DEMO_HEIGHT ?? 1080)
// Playwright captures video in CSS pixels and ignores deviceScaleFactor, so the
// video canvas must match the viewport exactly. Anything larger just pads the
// frame with empty space. ffmpeg does the scale up to the output size instead.
// The recording length is derived from the paced timeline further down; set
// DEMO_MS only to override it.
// Narration. DEMO_VOICE=off disables it; any installed `say` voice works.
const VOICE = process.env.DEMO_VOICE ?? 'Samantha'
const WPM = Number(process.env.DEMO_WPM ?? 172)
const MODEL = process.env.DEMO_MODEL ?? 'eleven_v3'
// Breathing room left after each spoken line before the next one starts.
const PAD = Number(process.env.DEMO_PAD ?? 450)
// Which effect kinds survive into the mix. Keystroke and mouse clicks are off:
// under a real voice over they read as noise, not polish.
const SFX = (process.env.DEMO_SFX ?? 'whoosh,pop,chime').split(',').filter(Boolean)

const tmp = resolve(OUT_DIR, '.tmp')
await rm(tmp, { recursive: true, force: true })
await mkdir(tmp, { recursive: true })

console.log(`Recording ${URL} — ${VIEW_W}x${VIEW_H} layout, out ${WIDTH}x${HEIGHT}…`)

const startedAt = Date.now()
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: VIEW_W, height: VIEW_H },
  recordVideo: { dir: tmp, size: { width: VIEW_W, height: VIEW_H } },
  // The demo has no motion the user can opt out of, but be explicit: we want
  // the animations, not the reduced-motion fallbacks.
  reducedMotion: 'no-preference',
})

const page = await context.newPage()
try {
  await page.goto(URL, { waitUntil: 'load', timeout: 15_000 })
} catch {
  await browser.close()
  console.error(`\nCould not reach ${URL}. Start the dev server first (npm run dev), then re-run.`)
  console.error('If Vite picked a different port, pass it: DEMO_URL=http://localhost:5173/login-demo npm run record:demo')
  process.exit(1)
}

await page.waitForSelector('[data-demo-root]', { timeout: 15_000 })

// ---- Pass 1: read the script at its natural animation speed.
const first = await page.evaluate(() => window.__demoAudio)

// ---- Speak the lines, so their real durations are known.
let voiceClips = []
if (VOICE !== 'off') {
  const env = await loadEnvLocal()
  const apiKey = process.env.ELEVENLABS_API_KEY ?? env.ELEVENLABS_API_KEY
  if (apiKey) {
    const voiceId = process.env.DEMO_VOICE_ID ?? DEFAULT_VOICE_ID
    console.log(`Speaking ${first.lines.length} lines with ElevenLabs (${MODEL}, ${voiceId})…`)
    const r = await speakLinesEleven(first.lines, { apiKey, voiceId, model: MODEL, dir: tmp })
    voiceClips = r.clips
    console.log(r.charactersUsed
      ? `  ${r.charactersUsed} characters billed, the rest came from cache`
      : '  all lines came from cache, nothing billed')
  } else if (voiceAvailable(VOICE)) {
    console.log(`No ELEVENLABS_API_KEY — falling back to macOS ${VOICE}…`)
    voiceClips = await speakLines(first.lines, { voice: VOICE, wpm: WPM, dir: tmp })
  } else {
    console.warn('No narration: set ELEVENLABS_API_KEY in .env.local.')
  }
}

// ---- Pass 2: stretch each segment so the narration fits inside it.
// A segment is the span between one spoken line and the next; whatever the
// animation does not already fill, the pace array adds.
let pace = []
if (voiceClips.length) {
  pace = voiceClips.map((clip, i) => {
    const spoken = (clip.samples.length / 44100) * 1000 + PAD
    const natural = i + 1 < first.lines.length
      ? first.lines[i + 1].at - first.lines[i].at
      : first.endsAt - first.lines[i].at
    return Math.max(0, Math.round(spoken - natural))
  })
  await page.addInitScript((p) => { window.__demoPace = p }, pace)
  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('[data-demo-root]', { timeout: 15_000 })
}

// Final timeline, with narration-driven pacing applied.
const { cues, lines, endsAt } = await page.evaluate(() => window.__demoAudio)
for (const [i, clip] of voiceClips.entries()) clip.at = lines[i].at

const DURATION = Number(process.env.DEMO_MS ?? endsAt)
console.log(`Timeline is ${(DURATION / 1000).toFixed(1)}s with narration (was ${(first.endsAt / 1000).toFixed(1)}s)`)

// Start the capture from a clean frame 0; the head gets trimmed by ffmpeg.
await page.evaluate(() => window.__restartDemo?.())
const head = (Date.now() - startedAt) / 1000

await page.waitForTimeout(DURATION)

await context.close() // flushes the video file
await browser.close()

const [file] = (await readdir(tmp)).filter((f) => f.endsWith('.webm'))
if (!file) {
  console.error('No video was produced.')
  process.exit(1)
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const out = resolve(OUT_DIR, `${NAME}-${stamp}.webm`)
await rename(resolve(tmp, file), out)
await rm(tmp, { recursive: true, force: true })

console.log(`Saved ${out}`)

// WhatsApp, iMessage and most phone galleries refuse .webm, so always ship an
// H.264 .mp4 alongside it. The silent AAC track is not optional: some WhatsApp
// clients treat a video with no audio stream as a corrupt file.
const mp4 = out.replace(/\.webm$/, '.mp4')

// Report any line that still collides with the next one.
for (const p of reportOverlaps(voiceClips)) {
  console.warn(`  line runs ${p.overrunMs}ms into the next: "${p.text}"`)
}
await rm(tmp, { recursive: true, force: true })

const wav = resolve(OUT_DIR, '.sfx.wav')
const kept = cues.filter((c) => SFX.includes(c.kind))
await writeFile(wav, renderWav(kept, DURATION, voiceClips))
console.log(`Mixing ${kept.length} sound cues (${SFX.join(', ')})…`)

console.log('Converting to mp4…')
await new Promise((ok, fail) => {
  const p = spawn(ffmpeg, [
    '-y',
    '-ss', head.toFixed(3), // drop the pre-mount head
    '-i', out,
    '-i', wav,
    '-shortest',
    '-vf', `scale=${WIDTH}:${HEIGHT}:flags=lanczos`,
    '-c:v', 'libx264',
    '-profile:v', 'high', '-level', '4.0',
    '-pix_fmt', 'yuv420p',
    '-crf', '20',
    '-movflags', '+faststart',
    // Narration sets the level; the effects sit under it. Modest lift plus a
    // limiter, since a 7dB push clipped once voice joined the mix.
    '-af', 'volume=2dB,alimiter=limit=0.89:level=disabled',
    '-c:a', 'aac', '-b:a', '128k',
    mp4,
  ], { stdio: ['ignore', 'ignore', 'pipe'] })
  let err = ''
  p.stderr.on('data', (d) => { err += d })
  p.on('close', (c) => (c === 0 ? ok() : fail(new Error(err.slice(-800)))))
})

await rm(wav, { force: true })

console.log(`\nShare this one: ${mp4}`)
