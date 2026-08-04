// Renders the demo's soundtrack as a WAV buffer, from scratch. No samples, no
// dependencies, nothing to license: every sound is synthesised from noise and
// sine partials, then mixed onto one buffer at the cue times the page reports.

const RATE = 44100

const clamp = (v) => (v > 1 ? 1 : v < -1 ? -1 : v)

/** Mixes `src` into `dst` starting at `atMs`, scaled by `gain`. */
function mix(dst, src, atMs, gain = 1) {
  const off = Math.round((atMs / 1000) * RATE)
  for (let i = 0; i < src.length; i++) {
    const j = off + i
    if (j >= 0 && j < dst.length) dst[j] += src[i] * gain
  }
}

/** Short filtered-noise burst with a fast decay: a key press. */
function key() {
  const n = Math.round(RATE * 0.035)
  const out = new Float32Array(n)
  let lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / n
    // Two-stage envelope: instant attack, exponential tail.
    const env = Math.exp(-t * 26) * (1 - Math.exp(-t * 900))
    const noise = Math.random() * 2 - 1
    lp += (noise - lp) * 0.42 // gentle low-pass, keeps it from sounding brittle
    // A little body under the click so it reads as a keyboard, not a tick.
    const body = Math.sin((2 * Math.PI * 1750 * i) / RATE) * 0.25
    out[i] = (lp * 0.8 + body) * env
  }
  return out
}

/** Rounder, lower click for a mouse press. */
function click() {
  const n = Math.round(RATE * 0.07)
  const out = new Float32Array(n)
  let lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / n
    const env = Math.exp(-t * 18) * (1 - Math.exp(-t * 700))
    const noise = Math.random() * 2 - 1
    lp += (noise - lp) * 0.22
    const body = Math.sin((2 * Math.PI * 620 * i) / RATE) * 0.5
      + Math.sin((2 * Math.PI * 310 * i) / RATE) * 0.3
    out[i] = (lp * 0.5 + body) * env
  }
  return out
}

/** Airy sweep for a screen change. */
function whoosh() {
  const n = Math.round(RATE * 0.42)
  const out = new Float32Array(n)
  let lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / n
    const env = Math.sin(Math.PI * t) ** 2 // fades in and back out
    const noise = Math.random() * 2 - 1
    // Sweeping the filter coefficient sweeps the perceived pitch.
    lp += (noise - lp) * (0.03 + 0.25 * t)
    out[i] = lp * env
  }
  return out
}

/** Bright confirmation blip: copy, paste. */
function pop() {
  const n = Math.round(RATE * 0.13)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / n
    const env = Math.exp(-t * 15) * (1 - Math.exp(-t * 600))
    // Rising two-tone, which is what makes it read as "done" rather than "error".
    const f = 880 + 420 * t
    out[i] = (Math.sin((2 * Math.PI * f * i) / RATE) + Math.sin((2 * Math.PI * f * 2 * i) / RATE) * 0.3) * env
  }
  return out
}

/** Major triad with a soft bell decay: the success screen. */
function chime() {
  const n = Math.round(RATE * 1.6)
  const out = new Float32Array(n)
  const notes = [
    { f: 587.33, at: 0.0 },  // D5
    { f: 739.99, at: 0.09 }, // F#5
    { f: 987.77, at: 0.18 }, // B5
  ]
  for (const { f, at } of notes) {
    const start = Math.round(at * RATE)
    for (let i = start; i < n; i++) {
      const t = (i - start) / RATE
      const env = Math.exp(-t * 3.4) * (1 - Math.exp(-t * 300))
      out[i] += (
        Math.sin(2 * Math.PI * f * t) * 0.6
        + Math.sin(2 * Math.PI * f * 2 * t) * 0.18
        + Math.sin(2 * Math.PI * f * 3.01 * t) * 0.07
      ) * env * 0.5
    }
  }
  return out
}

const VOICES = { key, click, whoosh, pop, chime }
const GAIN = { key: 0.16, click: 0.3, whoosh: 0.11, pop: 0.24, chime: 0.4 }

/**
 * @param {{at:number, kind:keyof VOICES}[]} cues
 * @param {number} durationMs
 * @returns {Buffer} 16-bit mono WAV
 */
export function renderWav(cues, durationMs, voiceClips = []) {
  const total = Math.round((durationMs / 1000) * RATE) + RATE // +1s tail for the chime
  const buf = new Float32Array(total)

  // Room tone. Near-silent, but it stops the track sounding "dead" between
  // events, which is what makes synthesised audio feel fake.
  let lp = 0
  for (let i = 0; i < total; i++) {
    lp += ((Math.random() * 2 - 1) - lp) * 0.0025
    buf[i] += lp * 0.05
  }

  // Cache one render per voice; keystrokes get a fresh render so the noise
  // differs each time and they do not sound machine-gunned.
  const cache = {}
  for (const { at, kind } of cues) {
    const make = VOICES[kind]
    if (!make) continue
    const src = kind === 'key' ? make() : (cache[kind] ??= make())
    // Slight per-hit gain variation, same reason.
    const jitter = kind === 'key' ? 0.75 + Math.random() * 0.5 : 1
    mix(buf, src, at, GAIN[kind] * jitter)
  }

  // Duck the effects wherever narration is playing, so the voice stays the
  // clearest thing in the mix rather than fighting the keystrokes.
  if (voiceClips.length) {
    const duck = new Float32Array(total).fill(1)
    const fade = Math.round(RATE * 0.12)
    for (const { at, samples } of voiceClips) {
      const start = Math.round((at / 1000) * RATE)
      const end = Math.min(total, start + samples.length)
      for (let i = Math.max(0, start - fade); i < Math.min(total, end + fade); i++) {
        // Triangular ramp in and out of the ducked region.
        const into = Math.min(1, Math.max(0, (i - (start - fade)) / fade))
        const outOf = Math.min(1, Math.max(0, (end + fade - i) / fade))
        duck[i] = Math.min(duck[i], 1 - 0.65 * Math.min(into, outOf))
      }
    }
    for (let i = 0; i < total; i++) buf[i] *= duck[i]
  }

  for (const { at, samples } of voiceClips) mix(buf, samples, at, 1.15)

  // 16-bit PCM WAV
  const data = Buffer.alloc(total * 2)
  for (let i = 0; i < total; i++) data.writeInt16LE(Math.round(clamp(buf[i]) * 32767), i * 2)

  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)  // PCM
  header.writeUInt16LE(1, 22)  // mono
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)

  return Buffer.concat([header, data])
}
