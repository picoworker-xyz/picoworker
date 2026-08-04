import { useEffect, useRef, useState } from 'react'
import { BrandMark } from '../../components/layout'
import { Apple, ArrowRight, Check, Google, Phone, Eye, EyeOff, Shield } from '../../components/icons'
import { Avatar } from '../../components/ui'

/**
 * Scripted, non-interactive replica of <Login /> for screen recording.
 * Nothing here touches Supabase or the store — it just replays the happy path
 * (sign up → email code → success) on a loop with a fake cursor and typing.
 * Route: /login-demo
 */

type Stage = 'landing' | 'form' | 'code' | 'done' | 'feed' | 'offers' | 'store' | 'game' | 'wallet'
/** Which tutorial this is: creating an account, or signing back into one. */
export type Flow = 'signup' | 'signin' | 'earn'
/** Narration language. The interface stays English either way. */
export type Lang = 'en' | 'ur'
/** The fake Gmail window: inbox list → opened email → code copied → dismissed. */
type Mail = null | 'inbox' | 'open' | 'copied'

const NAME = 'Bilal Ahmed'
const EMAIL = 'bilal.ahmed@gmail.com'
const PASSWORD = 'Pico#2026'
const CODE = '418206'
const SITE = 'picoworker.xyz'

/**
 * The offer the earn tutorial walks through, shaped exactly like a real
 * LootablyOffer: a multistep Android game that pays per goal. Swap these values
 * for a live offer off the Offers tab and the video follows automatically.
 */
const OFFER = {
  title: 'Royal Match',
  categories: 'Game · Android',
  total: 4.12,
  goals: [
    { description: 'Install and open Royal Match', rewardUsd: 0.24 },
    { description: 'Reach level 20', rewardUsd: 0.68 },
    { description: 'Reach level 60', rewardUsd: 1.35 },
    { description: 'Reach level 120', rewardUsd: 1.85 },
  ],
}

/** Filler cards, so the Offers tab looks as busy as the real one. */
const OTHER_OFFERS = [
  { title: 'Temu: sign up and place your first order', cat: 'Shopping', reward: '$6.40', note: 'Paid on completion' },
  { title: 'Solitaire Grand Harvest: reach level 15', cat: 'Game', reward: '$1.92', note: 'Across 3 steps' },
  { title: 'Bingo Blitz: complete 3 rooms', cat: 'Game', reward: '$2.75', note: 'Across 3 steps' },
  { title: 'Monopoly GO!: finish Album Set 2', cat: 'Game', reward: '$3.60', note: 'Across 5 steps' },
  { title: 'MyPoints: complete registration', cat: 'Survey', reward: '$0.85', note: 'Paid on completion' },
]

/** Narration shown along the bottom. `step` is null for non-numbered asides. */
type Caption = { step: number | null; text: string; voice?: string } | null

// One entry per beat of the video. `at` is milliseconds from the start of the loop.
type Beat = { at: number; run: (s: Setters) => void }

type Setters = {
  setStage: (v: Stage) => void
  setMode: (v: 'earner' | 'business') => void
  setIsSignup: (v: boolean) => void
  setName: (v: string) => void
  setEmail: (v: string) => void
  setPassword: (v: string) => void
  setConfirm: (v: string) => void
  setShowPassword: (v: boolean) => void
  setBusy: (v: boolean) => void
  setCode: (v: string) => void
  setMail: (v: Mail) => void
  setPasteFlash: (v: boolean) => void
  setSheet: (v: boolean) => void
  /** Play Store mock: browsing, downloading, ready to open. */
  setInstall: (v: 'idle' | 'installing' | 'done') => void
  setProgress: (v: number) => void
  setLevel: (v: number) => void
  setMilestone: (v: string | null) => void
  setUrl: (v: string) => void
  setLoaded: (v: boolean) => void
  setIntro: (v: boolean) => void
  setCaption: (v: Caption) => void
  setCursor: (v: string | null) => void
  setPressed: (v: string | null) => void
  type: (target: 'name' | 'email' | 'password' | 'confirm' | 'code' | 'url', text: string, at: number) => void
}

const TYPE_SPEED = 62
/** Quiet time held on the final frame before the loop restarts. */
const TAIL = 3500

/** When the last beat lands, plus the tail. Grows automatically with narration. */
function scriptLength(beats: Beat[]) {
  return Math.max(...beats.map((b) => b.at)) + TAIL
}


/** One narrated beat: the caption on screen and the words spoken over it. */
type Narration = { step: number | null; text: string; voice: string }

const EN_SIGNUP: Narration[] = [
  { step: null, text: '', voice: "Hey. Today I'm going to show you how you can earn real money online with PicoWorker, and honestly, getting started takes less than a minute." },
  { step: 1, text: 'Open picoworker.xyz', voice: "So first things first. Open your browser, and go to picoworker dot xyz." },
  { step: null, text: 'A micro task marketplace', voice: "And this is the homepage. PicoWorker is a micro task marketplace. You do small jobs, like following an account or filling in a survey, and you get paid in USDC." },
  { step: 2, text: 'Click Get started', voice: "Alright, so up here in the top right corner, click Get started." },
  { step: 3, text: 'Tap Create one', voice: "That brings you to the login page. We don't have an account yet, so tap Create one." },
  { step: 4, text: 'Choose how you want to use it', voice: "Next, pick how you want to use it. Choose I want to earn if you're here to make money. Or I post tasks, if you're a business." },
  { step: 5, text: 'Your name and email', voice: "Now type in your name, and your email address. Use one you actually check, because we'll need it in a second." },
  { step: 6, text: 'Pick a strong password', voice: "Then choose a password. At least eight characters, with an uppercase letter, a number, and a symbol." },
  { step: null, text: 'Tap the eye to check it', voice: "And if you want to check what you typed, tap that little eye icon." },
  { step: null, text: 'Type it again to confirm', voice: "Type it one more time to confirm. That green tick means it's strong enough." },
  { step: 7, text: 'Press Create account', voice: "And now just press Create account." },
  { step: 8, text: 'Open your inbox', voice: "PicoWorker just sent you a confirmation email. Open your inbox in another tab." },
  { step: null, text: 'From hello@picoworker.xyz', voice: "It comes from PicoWorker, hello at picoworker dot xyz. If you can't see it, check your spam folder. Let's open it up." },
  { step: 9, text: 'Copy the six digit code', voice: "And there's your six digit code. Go ahead and copy it." },
  { step: 10, text: 'Paste it into PicoWorker', voice: "Now head back over to PicoWorker, and paste that code straight into the box." },
  { step: 11, text: 'Confirm and continue', voice: "And press Confirm and continue." },
  { step: null, text: "You're in", voice: "And that's it, you're in. Your welcome bonus is already in your balance, and you can start earning right now." },
]

/**
 * Urdu narration for the same beats. The interface itself stays in English,
 * because that is what the real app shows — only the narrator and the captions
 * are translated, and the captions render right to left.
 */
const UR_SIGNUP: Narration[] = [
  { step: null, text: '', voice: 'السلام علیکم! آج میں آپ کو بتاؤں گی کہ پیکو ورکر پر اکاؤنٹ کیسے بنایا جاتا ہے، اور آپ آن لائن پیسے کیسے کما سکتے ہیں۔ اس میں ایک منٹ سے بھی کم وقت لگے گا۔' },
  { step: 1, text: 'picoworker.xyz کھولیں', voice: 'سب سے پہلے اپنا براؤزر کھولیں، اور picoworker.xyz پر جائیں۔' },
  { step: null, text: 'مائیکرو ٹاسک مارکیٹ پلیس', voice: 'یہ ہوم پیج ہے۔ پیکو ورکر ایک مائیکرو ٹاسک مارکیٹ پلیس ہے۔ آپ چھوٹے چھوٹے کام کرتے ہیں، جیسے کسی اکاؤنٹ کو فالو کرنا یا کوئی سروے مکمل کرنا، اور آپ کو یو ایس ڈی سی میں ادائیگی ہوتی ہے۔' },
  { step: 2, text: 'Get started پر کلک کریں', voice: 'اب اوپر دائیں طرف، Get started پر کلک کریں۔' },
  { step: 3, text: 'Create one پر ٹیپ کریں', voice: 'یہ آپ کو لاگ ان پیج پر لے آتا ہے۔ ہمارا اکاؤنٹ ابھی نہیں ہے، تو Create one پر ٹیپ کریں۔' },
  { step: 4, text: 'اپنا انتخاب کریں', voice: 'اب یہ منتخب کریں کہ آپ پیکو ورکر کو کیسے استعمال کریں گے۔ اگر آپ پیسے کمانا چاہتے ہیں تو I want to earn چنیں۔ اور اگر آپ کا کاروبار ہے تو I post tasks۔' },
  { step: 5, text: 'نام اور ای میل', voice: 'اب اپنا نام لکھیں، اور اپنا ای میل ایڈریس۔ وہی ای میل استعمال کریں جو آپ واقعی چیک کرتے ہیں، کیونکہ تھوڑی دیر میں ہمیں اس کی ضرورت پڑے گی۔' },
  { step: 6, text: 'مضبوط پاس ورڈ بنائیں', voice: 'پھر ایک پاس ورڈ بنائیں۔ کم از کم آٹھ حروف، ایک بڑا حرف، ایک نمبر، اور ایک علامت۔' },
  { step: null, text: 'آنکھ کے نشان پر ٹیپ کریں', voice: 'اور اگر آپ دیکھنا چاہتے ہیں کہ آپ نے کیا لکھا ہے، تو آنکھ کے چھوٹے نشان پر ٹیپ کریں۔' },
  { step: null, text: 'دوبارہ لکھ کر تصدیق کریں', voice: 'اب وہی پاس ورڈ ایک بار پھر لکھیں۔ سبز نشان کا مطلب ہے کہ پاس ورڈ کافی مضبوط ہے۔' },
  { step: 7, text: 'Create account دبائیں', voice: 'اور اب صرف Create account دبائیں۔' },
  { step: 8, text: 'ای میل باکس کھولیں', voice: 'پیکو ورکر نے آپ کو تصدیقی ای میل بھیج دی ہے۔ اپنا ای میل باکس دوسرے ٹیب میں کھولیں۔' },
  { step: null, text: 'hello@picoworker.xyz سے', voice: 'یہ ای میل پیکو ورکر کی طرف سے آتی ہے، hello@picoworker.xyz سے۔ اگر نظر نہ آئے تو اپنا اسپیم فولڈر ضرور دیکھیں۔ آئیے اسے کھولتے ہیں۔' },
  { step: 9, text: 'چھ ہندسوں کا کوڈ کاپی کریں', voice: 'اور یہ ہے آپ کا چھ ہندسوں کا کوڈ۔ اسے کاپی کر لیں۔' },
  { step: 10, text: 'کوڈ پیسٹ کریں', voice: 'اب واپس پیکو ورکر پر آئیں، اور یہ کوڈ سیدھا خانے میں پیسٹ کر دیں۔' },
  { step: 11, text: 'Confirm and continue', voice: 'اور Confirm and continue دبائیں۔' },
  { step: null, text: 'آپ اندر آ گئے', voice: 'بس ہو گیا، آپ اندر آ گئے۔ آپ کا ویلکم بونس پہلے ہی بیلنس میں موجود ہے، اور اب آپ کمانا شروع کر سکتے ہیں۔' },
]

/**
 * The script, as a running time cursor rather than absolute timestamps. `wait`
 * advances it, `beat` schedules at the current instant.
 *
 * Narration length drives the pacing: `say` registers a line and then reserves
 * however much extra time that line needs, which the recorder measures from the
 * real audio and injects back as `window.__demoPace`. Without an injected pace
 * every hold is zero and the video plays at its natural animation speed.
 */
function buildScript(s: Setters, flow: Flow, lang: Lang = 'en'): Beat[] {
  const beats: Beat[] = []
  const pace: number[] = (globalThis as { __demoPace?: number[] }).__demoPace ?? []

  let t = 0
  let lineIndex = 0
  let pending = 0

  const beat = (run: (s: Setters) => void) => beats.push({ at: t, run })
  const wait = (ms: number) => { t += ms }
  /** Pays out the time the current narration line still needs. */
  const hold = () => { t += pending; pending = 0 }
  /**
   * @param text  what appears on screen; empty means no caption bar
   * @param voice what the narrator says; defaults to the caption text
   */
  const say = (step: number | null, text: string, voice?: string) => {
    hold()
    beat((x) => x.setCaption({ step, text, voice }))
    pending = pace[lineIndex++] ?? 0
  }
  const table = lang === 'ur' ? UR_SIGNUP : EN_SIGNUP
  let nextLine = 0
  /** Speaks the next beat from the narration table. */
  const sayNext = () => {
    const n = table[nextLine++]
    say(n.step, n.text, n.voice)
  }
  const type = (target: Parameters<Setters['type']>[0], text: string) => {
    s.type(target, text, t)
    t += text.length * (target === 'code' ? 220 : TYPE_SPEED)
  }
  /** Move the cursor somewhere, pause, click it. */
  const clickOn = (spot: string, travel = 700) => {
    beat((x) => x.setCursor(spot))
    wait(travel)
    beat((x) => x.setPressed(spot))
    wait(180)
    beat((x) => x.setPressed(null))
  }

  beat((x) => {
    x.setStage('landing'); x.setIsSignup(false); x.setMode('earner')
    x.setName(''); x.setEmail(''); x.setPassword(''); x.setConfirm('')
    x.setShowPassword(false); x.setBusy(false); x.setCode('')
    x.setMail(null); x.setPasteFlash(false)
    x.setUrl(''); x.setLoaded(false)
    x.setIntro(true); x.setCaption(null)
    x.setCursor(null); x.setPressed(null)
  })

  /** Shorter companion tutorial: logging back into an existing account. */
  function signInScript() {
    wait(600)
    say(null, '', "Hey. In this quick video, I'm going to show you how to log back into your PicoWorker account.")
    hold()
    wait(300)
    beat((x) => x.setIntro(false))
    wait(700)

    say(1, 'Open picoworker.xyz', "So, same as before. Open your browser and go to picoworker dot xyz.")
    clickOn('urlbar', 600)
    beat((x) => x.setCursor(null))
    wait(250)
    type('url', SITE)
    wait(600)
    beat((x) => x.setLoaded(true))
    wait(400)

    say(2, 'Click Log in', "Then up in the top right, this time click Log in, not Get started.")
    clickOn('log-in', 800)
    beat((x) => { x.setCursor(null); x.setStage('form'); x.setUrl(`${SITE}/login`) })
    wait(700)

    say(3, 'Enter your email', "And here's the login page. It says Welcome back. Type in the email address you signed up with.")
    beat((x) => x.setCursor('field-email'))
    wait(500)
    type('email', EMAIL)
    wait(400)

    say(4, 'Then your password', "Then your password. And again, if you want to make sure you typed it right, just tap the eye icon.")
    beat((x) => x.setCursor('field-password'))
    wait(400)
    type('password', PASSWORD)
    wait(400)
    beat((x) => x.setCursor('eye'))
    wait(500)
    beat((x) => { x.setPressed('eye'); x.setShowPassword(true) })
    wait(180)
    beat((x) => x.setPressed(null))
    wait(400)

    say(null, 'Forgot it? Tap here', "Now if you've forgotten your password, don't worry. Tap Forgot password, and PicoWorker will email you a code so you can set a new one.")
    beat((x) => x.setCursor('forgot'))
    hold()

    say(5, 'Press Continue', "But we know ours, so just press Continue.")
    clickOn('submit', 700)
    beat((x) => { x.setBusy(true); x.setCursor(null) })
    wait(1600)
    beat((x) => { x.setBusy(false); x.setStage('done') })
    wait(300)

    say(null, "You're back in", "And that's it. You're straight back into your account, your balance is exactly where you left it, and you can carry on earning.")
    hold()

    return beats.sort((a, b) => a.at - b.at)
  }

  /**
   * The money video: find an offer, do it, get paid. The important beat is the
   * last one — rewards are confirmed by the provider, so they are not instant.
   */
  function earnScript() {
    wait(600)
    say(null, '', "Okay, this is the video that actually matters. Today I'm going to show you exactly how you earn money on PicoWorker, step by step, from picking an offer to seeing it land in your balance.")
    hold()
    wait(300)
    beat((x) => x.setIntro(false))
    wait(700)

    say(1, 'Open picoworker.xyz and log in', "So, go to picoworker dot xyz and log into your account. This is your Earn page. This is where everything happens.")
    beat((x) => { x.setStage('feed'); x.setUrl(`${SITE}/`) })
    hold()

    say(2, 'Click Offers at the top', "Now, up here at the top, click Offers.")
    clickOn('nav-offers', 800)
    beat((x) => { x.setStage('offers'); x.setUrl(`${SITE}/offers/lootably`); x.setCursor(null) })
    wait(800)

    say(null, 'Loads of offers to choose from', "And look at this. There are loads of offers in here, and they change all the time. Games, shopping, surveys, app installs. The green number is what you get paid.")
    hold()

    say(3, 'Pick an app offer', `Let's do an app one, because they pay the most. This one is ${OFFER.title}. Four dollars twelve, across four steps. Before you start anything, tap Steps, so you know exactly what you have to do.`)
    clickOn('offer-steps', 900)
    beat((x) => { x.setSheet(true); x.setCursor(null) })
    wait(700)

    say(null, 'Read the steps first', "And here they are. Install and open the app pays twenty four cents. Reach level twenty, sixty eight cents. Level sixty, a dollar thirty five. And level one hundred and twenty pays a dollar eighty five. Every step pays on its own, so even if you stop halfway, you keep what you finished.")
    hold()

    say(4, 'Press Start offer', "Happy with that? Press Start offer.")
    clickOn('sheet-start', 800)
    beat((x) => { x.setSheet(false); x.setStage('store'); x.setCursor(null); x.setUrl('play.google.com') })
    wait(800)

    say(5, 'Install the app from the Play Store', "PicoWorker sends you straight to the Play Store. Now this bit is important. Install the app from this link, and only this link. If you already have the game, or you install it some other way, the offer will not track and you will not get paid.")
    clickOn('install-btn', 900)
    beat((x) => x.setInstall('installing'))
    for (let i = 1; i <= 10; i++) { wait(220); const v = i * 10; beat((x) => x.setProgress(v)) }
    beat((x) => x.setInstall('done'))
    hold()

    say(6, 'Open it and start playing', "Once it has downloaded, press Open, and start playing. Play it properly, in the app, on the same phone.")
    clickOn('open-btn', 800)
    beat((x) => { x.setStage('game'); x.setCursor(null); x.setLevel(1); x.setUrl('Royal Match · Android app') })
    wait(600)
    for (const lv of [4, 9, 13, 17, 20]) { wait(700); beat((x) => x.setLevel(lv)) }
    wait(400)

    say(7, 'Hit a milestone and it is tracked', `And there we go, level twenty. That is the second step done, so that is sixty eight more cents. The provider tracks this automatically, you do not have to send us a screenshot or anything.`)
    beat((x) => x.setMilestone(`${OFFER.goals[1].description} · +$${OFFER.goals[1].rewardUsd.toFixed(2)}`))
    hold()

    say(8, 'Check your balance in PicoWorker', "Now come back over to PicoWorker and open your wallet.")
    beat((x) => { x.setMilestone(null); x.setStage('wallet'); x.setUrl(`${SITE}/wallet`) })
    wait(900)

    say(null, 'Pending, not instant', "And this is the part everybody gets wrong, so listen carefully. Your reward shows up as pending first. It is not instant. The provider has to confirm you really did it, and that normally takes up to twenty four hours. So do not panic, and please do not message support after ten minutes. Just leave it, and it will move into your available balance.")
    hold()

    say(null, 'Then cash out in USDC', "Once it is confirmed, it is yours. Keep stacking offers, and when you are ready, cash out in USDC straight to your own wallet. That is honestly all there is to it. Good luck.")
    hold()

    return beats.sort((a, b) => a.at - b.at)
  }

  if (flow === 'earn') return earnScript()
  if (flow === 'signin') return signInScript()

  // ===== Opening =====
  wait(600)
  sayNext()
  hold()
  wait(300)
  beat((x) => x.setIntro(false))
  wait(700)

  // ===== Act 1: the homepage =====
  sayNext()
  clickOn('urlbar', 600)
  beat((x) => x.setCursor(null))
  wait(250)
  type('url', SITE)
  wait(600)
  beat((x) => x.setLoaded(true))
  wait(400)

  sayNext()
  hold()

  sayNext()
  clickOn('get-started', 800)
  beat((x) => { x.setCursor(null); x.setStage('form'); x.setUrl(`${SITE}/login`) })
  wait(700)

  // ===== Act 2: creating the account =====
  sayNext()
  clickOn('switch', 900)
  beat((x) => x.setIsSignup(true))
  wait(800)

  sayNext()
  clickOn('role-earner', 800)
  beat((x) => x.setMode('earner'))
  wait(600)

  sayNext()
  beat((x) => x.setCursor('field-name'))
  wait(500)
  type('name', NAME)
  wait(400)
  beat((x) => x.setCursor('field-email'))
  wait(400)
  type('email', EMAIL)
  wait(400)

  sayNext()
  beat((x) => x.setCursor('field-password'))
  wait(400)
  type('password', PASSWORD)
  wait(400)

  sayNext()
  beat((x) => x.setCursor('eye'))
  wait(500)
  beat((x) => { x.setPressed('eye'); x.setShowPassword(true) })
  wait(180)
  beat((x) => x.setPressed(null))
  wait(400)

  sayNext()
  beat((x) => x.setCursor('field-confirm'))
  wait(400)
  type('confirm', PASSWORD)
  wait(500)

  sayNext()
  clickOn('submit', 700)
  beat((x) => { x.setBusy(true); x.setCursor(null) })
  wait(1500)
  beat((x) => { x.setBusy(false); x.setStage('code') })
  wait(500)

  // ===== Act 3: the email =====
  sayNext()
  beat((x) => x.setMail('inbox'))
  wait(700)

  sayNext()
  clickOn('mail-row', 900)
  beat((x) => { x.setMail('open'); x.setCursor(null) })
  wait(700)

  sayNext()
  clickOn('copy-btn', 800)
  beat((x) => x.setMail('copied'))
  wait(900)

  sayNext()
  beat((x) => { x.setMail(null); x.setCursor('code-input') })
  wait(800)
  beat((x) => x.setPressed('code-input'))
  wait(180)
  beat((x) => x.setPressed(null))
  wait(400)
  beat((x) => { x.setCode(CODE); x.setPasteFlash(true) })
  wait(600)
  beat((x) => x.setPasteFlash(false))
  wait(200)

  sayNext()
  clickOn('confirm-btn', 700)
  beat((x) => { x.setBusy(true); x.setCursor(null) })
  wait(1400)
  beat((x) => { x.setBusy(false); x.setStage('done') })
  wait(300)

  sayNext()
  hold()

  return beats.sort((a, b) => a.at - b.at)
}

/** A sound the recorder should place on the audio track, in ms from loop start. */
export type Cue = { at: number; kind: 'key' | 'click' | 'whoosh' | 'pop' | 'chime' }

/**
 * Derives the sound cues by running the script against a probe: every setter is
 * a recorder instead of a state update. Doing it this way means the audio can
 * never drift out of sync with the animation, because both come from the one
 * timeline in buildScript.
 */
/** One spoken line for the voice over, in ms from loop start. */
export type Line = { at: number; text: string }

function collectCues(flow: Flow, lang: Lang): { cues: Cue[]; lines: Line[]; endsAt: number } {
  const cues: Cue[] = []
  const lines: Line[] = []
  let now = 0
  const noop = () => {}
  const probe: Setters = {
    setStage: (v) => { if (now > 0) cues.push({ at: now, kind: v === 'done' ? 'chime' : 'whoosh' }) },
    setMode: noop, setIsSignup: noop, setName: noop, setEmail: noop, setPassword: noop,
    setConfirm: noop, setShowPassword: noop, setBusy: noop, setCode: noop,
    setMail: (v) => { if (v === 'copied') cues.push({ at: now, kind: 'pop' }) },
    setPasteFlash: (v) => { if (v) cues.push({ at: now, kind: 'pop' }) },
    setSheet: (v) => { if (v) cues.push({ at: now, kind: 'whoosh' }) },
    setInstall: noop, setProgress: noop, setLevel: noop,
    setMilestone: (v) => { if (v) cues.push({ at: now, kind: 'chime' }) },
    setUrl: noop,
    setLoaded: (v) => { if (v && now > 0) cues.push({ at: now, kind: 'whoosh' }) },
    setIntro: noop, setCursor: noop,
    setCaption: (v) => { if (v) lines.push({ at: now, text: v.voice ?? v.text }) },
    setPressed: (v) => { if (v) cues.push({ at: now, kind: 'click' }) },
    type: (target, text, at) => {
      const speed = target === 'code' ? 220 : TYPE_SPEED
      for (let i = 1; i <= text.length; i++) cues.push({ at: at + i * speed, kind: 'key' })
    },
  }
  const beats = buildScript(probe, flow, lang)
  for (const beat of beats) { now = beat.at; beat.run(probe) }
  return {
    cues: cues.sort((a, b) => a.at - b.at),
    lines: lines.sort((a, b) => a.at - b.at),
    endsAt: scriptLength(beats),
  }
}

export function LoginDemo({ flow = 'signup', lang = 'en' }: { flow?: Flow; lang?: Lang } = {}) {
  const [stage, setStage] = useState<Stage>('landing')
  const [mode, setMode] = useState<'earner' | 'business'>('earner')
  const [isSignup, setIsSignup] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const [mail, setMail] = useState<Mail>(null)
  const [pasteFlash, setPasteFlash] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [install, setInstall] = useState<'idle' | 'installing' | 'done'>('idle')
  const [progress, setProgress] = useState(0)
  const [level, setLevel] = useState(1)
  const [milestone, setMilestone] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [intro, setIntro] = useState(true)
  const [caption, setCaption] = useState<Caption>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [pressed, setPressed] = useState<string | null>(null)
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 })
  const [loop, setLoop] = useState(0)

  const rootRef = useRef<HTMLDivElement>(null)

  // Run the script. Every beat is a plain timeout keyed off the loop counter, so
  // restarting the loop just remounts the whole schedule.
  useEffect(() => {
    const timers: number[] = []
    const setters: Setters = {
      setStage, setMode, setIsSignup, setName, setEmail, setPassword,
      setConfirm, setShowPassword, setBusy, setCode, setMail, setPasteFlash,
      setUrl, setLoaded, setIntro, setCaption, setCursor, setPressed,
      setSheet, setInstall, setProgress, setLevel, setMilestone,
      type: (target, text, at) => {
        const set = { name: setName, email: setEmail, password: setPassword, confirm: setConfirm, code: setCode, url: setUrl }[target]
        const speed = target === 'code' ? 220 : TYPE_SPEED
        for (let i = 1; i <= text.length; i++) {
          timers.push(window.setTimeout(() => set(text.slice(0, i)), at + i * speed))
        }
      },
    }
    const script = buildScript(setters, flow, lang)
    for (const beat of script) timers.push(window.setTimeout(() => beat.run(setters), beat.at))
    timers.push(window.setTimeout(() => setLoop((n) => n + 1), scriptLength(script)))

    // Lets the recording script restart the loop from a known instant, so the
    // captured video does not open on the app's own loading screen.
    ;(window as unknown as { __restartDemo?: () => void }).__restartDemo = () => setLoop((n) => n + 1)
    ;(window as unknown as { __demoAudio?: ReturnType<typeof collectCues> }).__demoAudio = collectCues(flow, lang)

    return () => timers.forEach(clearTimeout)
  }, [loop, flow, lang])

  // Park the fake cursor over whichever element the script is pointing at.
  useEffect(() => {
    if (!cursor) return
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-spot="${cursor}"]`)
    const root = rootRef.current?.getBoundingClientRect()
    if (!el || !root) return
    const r = el.getBoundingClientRect()
    setCursorPos({ x: r.left - root.left + r.width / 2, y: r.top - root.top + r.height / 2 })
  }, [cursor, stage, isSignup, password, mail, loaded, sheet, install])

  const strong = password.length >= 8

  return (
    <div ref={rootRef} data-demo-root className="h-svh flex flex-col relative overflow-hidden select-none">
      {/* ===== Browser chrome — carries the URL through the whole video ===== */}
      <div className="shrink-0 bg-[#111318] border-b border-[var(--line)] px-4 py-2 flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-[11px] h-[11px] rounded-full bg-[#FF5F57]" />
          <span className="w-[11px] h-[11px] rounded-full bg-[#FEBC2E]" />
          <span className="w-[11px] h-[11px] rounded-full bg-[#28C840]" />
        </div>
        <div
          data-spot="urlbar"
          className={`flex-1 max-w-[560px] mx-auto rounded-full px-4 py-[7px] text-[12.5px] font-semibold flex items-center gap-2 transition-all ${cursor === 'urlbar' ? 'bg-[var(--fill)] ring-1 ring-[var(--accent)]' : 'bg-[var(--fill-2)]'} ${pressed === 'urlbar' ? 'scale-[.99]' : ''}`}
        >
          <span className="text-[var(--ink-5)]">🔒</span>
          <span className="text-[var(--ink-2)]">{url || <span className="text-[var(--ink-5)]">Search or type a URL</span>}</span>
          {stage === 'landing' && !loaded && <span className="inline-block w-[2px] h-[13px] bg-[var(--accent-strong)] animate-pulse" />}
        </div>
        <div className="w-[60px] shrink-0" />
      </div>

      <div className="flex-1 relative overflow-hidden">

      {stage === 'landing' && (
        <DemoLanding loaded={loaded} pressed={pressed} />
      )}

      {stage === 'form' && (
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
          {/* Brand panel */}
          <div className="hidden lg:flex flex-col justify-between p-12 border-r border-[var(--line)] hero-grid relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(600px 400px at 20% 10%, rgba(46,224,110,.12), transparent 60%), radial-gradient(500px 400px at 90% 90%, rgba(139,108,255,.14), transparent 60%)' }}
            />
            <div className="relative"><BrandMark size={40} /></div>
            <div className="relative">
              <h1 className="font-head font-bold text-[44px] leading-[1.08] tracking-[-.02em] text-[var(--ink)]">
                Get paid for<br />the <span className="text-[var(--accent-strong)]">tiny stuff.</span>
              </h1>
              <p className="text-[var(--ink-3)] text-[16px] font-medium mt-4 max-w-[400px] leading-[1.55]">
                Follow, watch, test, survey — cash out in USDC straight to your wallet.
              </p>
              <div className="flex items-center gap-2 mt-6 px-3 py-2 rounded-full bg-[rgba(68,209,122,.1)] border border-[rgba(68,209,122,.25)] w-fit">
                <Avatar name="B" size={22} gradient="linear-gradient(135deg,#FF6B5A,#FFB05A)" />
                <span className="text-[var(--ink-2)] text-[12.5px] font-semibold">
                  Bilal just earned <span className="text-[var(--green)] font-extrabold">$0.35</span>
                </span>
              </div>
            </div>
            <div className="relative text-[var(--ink-5)] text-[12.5px] font-semibold">Non-custodial — your keys, your USDC.</div>
          </div>

          {/* Auth card */}
          <div className="flex items-center justify-center p-6 lg:p-12">
            <div className="w-full max-w-[400px]">
              <div className="lg:hidden mb-8 flex justify-center"><BrandMark size={44} /></div>

              <div className="text-center lg:text-left mb-7">
                <h2 className="font-head font-bold text-[28px] text-[var(--ink)] tracking-[-.02em]">
                  {isSignup ? 'Create your account' : 'Welcome back'}
                </h2>
                <p className="text-[var(--ink-3)] text-[14.5px] font-semibold mt-2">
                  {isSignup ? 'Start earning USDC in seconds.' : 'Log in to keep earning.'}
                </p>
              </div>

              <div className="flex gap-[6px] bg-[var(--fill-2)] border border-[var(--line)] rounded-[14px] p-[5px] mb-4">
                {(['earner', 'business'] as const).map((m) => (
                  <div
                    key={m}
                    data-spot={`role-${m}`}
                    className={`flex-1 text-center py-[11px] rounded-[10px] text-[13.5px] font-head transition-all duration-200 ${mode === m ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-extrabold' : 'text-[var(--ink-3)] font-bold'} ${pressed === `role-${m}` ? 'scale-95' : ''}`}
                  >
                    {m === 'earner' ? 'I want to earn' : 'I post tasks'}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-[10px]">
                {isSignup && (
                  <FakeField spot="field-name" placeholder={mode === 'business' ? 'Business name' : 'Your name'} value={name} focused={cursor === 'field-name'} />
                )}
                <FakeField spot="field-email" placeholder="Email" value={email} focused={cursor === 'field-email'} />
                <FakeField
                  spot="field-password"
                  placeholder="Password"
                  value={showPassword ? password : '•'.repeat(password.length)}
                  focused={cursor === 'field-password'}
                  trailing={
                    <span data-spot="eye" className={`absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-5)] transition-transform ${pressed === 'eye' ? 'scale-90' : ''}`}>
                      {showPassword ? <EyeOff width={20} height={20} /> : <Eye width={20} height={20} />}
                    </span>
                  }
                />
                {isSignup && (
                  <>
                    <FakeField
                      spot="field-confirm"
                      placeholder="Confirm password"
                      value={showPassword ? confirm : '•'.repeat(confirm.length)}
                      focused={cursor === 'field-confirm'}
                    />
                    {password.length > 0 ? (
                      <div className="px-1 text-[11px] font-bold">
                        {strong
                          ? <span className="text-[var(--green)]">Strong password ✓</span>
                          : <span className="text-[var(--ink-4)] text-[11.5px] font-semibold">Missing: 8 characters</span>}
                      </div>
                    ) : (
                      <div className="text-[var(--ink-4)] text-[11.5px] font-semibold px-1">8+ characters with upper &amp; lower case, a number, and a special character (#@$).</div>
                    )}
                  </>
                )}

                <div
                  data-spot="submit"
                  className={`w-full font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[14px] flex items-center justify-center gap-2 transition-transform ${pressed === 'submit' ? 'scale-[.97]' : ''}`}
                  style={{ boxShadow: 'var(--glow)' }}
                >
                  {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Continue'}
                  {!busy && <ArrowRight width={16} height={16} />}
                </div>
              </div>

              {!isSignup && (
                <div className="text-center mt-3">
                  <div
                    data-spot="forgot"
                    className={`inline-block text-[13px] font-semibold transition-colors ${cursor === 'forgot' ? 'text-[var(--accent-strong)]' : 'text-[var(--ink-3)]'}`}
                  >
                    Forgot password?
                  </div>
                </div>
              )}

              <div
                data-spot="switch"
                className={`block w-full text-center text-[var(--ink-4)] text-[13px] font-semibold mt-3 transition-transform ${pressed === 'switch' ? 'scale-95' : ''}`}
              >
                {isSignup ? 'Already have an account? ' : 'New here? '}
                <span className="text-[var(--accent-strong)] font-extrabold">{isSignup ? 'Sign in' : 'Create one'}</span>
              </div>

              <div className="flex items-center gap-[10px] my-5">
                <div className="flex-1 h-px bg-[var(--fill)]" />
                <span className="text-[var(--ink-3)] text-[12px] font-bold">or</span>
                <div className="flex-1 h-px bg-[var(--fill)]" />
              </div>

              <div className="grid grid-cols-3 gap-[10px]">
                {[<Google width={20} height={20} key="g" />, <Apple width={18} height={18} className="text-[#fff]" key="a" />, <Phone width={18} height={18} className="text-[#fff]" key="p" />].map((icon, i) => (
                  <div key={i} className="py-[13px] rounded-[14px] bg-[var(--card)] border border-[var(--line-2)] flex items-center justify-center">{icon}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === 'code' && (
        <div className="h-full flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-[400px] reveal">
            <div className="flex justify-center mb-8"><BrandMark size={44} /></div>
            <div className="rounded-[24px] bg-[var(--card)] border border-[var(--line)] p-7 text-center">
              <div className="w-14 h-14 rounded-full bg-[rgba(46,224,110,.12)] border border-[rgba(46,224,110,.3)] flex items-center justify-center mx-auto">
                <Check width={28} height={28} className="text-[var(--accent-strong)]" />
              </div>
              <div className="font-head font-bold text-[22px] text-[var(--ink)] mt-5">Enter your code</div>
              <div className="text-[var(--ink-3)] text-[14px] font-semibold mt-2 leading-[1.5]">
                We sent a 6-digit code to<br /><span className="text-[var(--ink)] font-bold break-all">{EMAIL}</span>
              </div>
              <div
                data-spot="code-input"
                className={`w-full mt-5 border rounded-[14px] px-4 py-[14px] text-[var(--ink)] text-[22px] font-head font-extrabold tracking-[.3em] text-center transition-all duration-300 ${cursor === 'code-input' ? 'border-[var(--accent)]' : 'border-[var(--line-2)]'} ${pasteFlash ? 'bg-[rgba(46,224,110,.14)] scale-[1.02]' : 'bg-[var(--fill)]'}`}
              >
                {code || <span className="text-[var(--ink-5)]">000000</span>}
                {cursor === 'code-input' && !code && <span className="inline-block w-[2px] h-[20px] align-middle bg-[var(--accent-strong)] animate-pulse" />}
              </div>
              <div
                data-spot="confirm-btn"
                className={`w-full mt-3 font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] py-[14px] rounded-[14px] transition-transform ${pressed === 'confirm-btn' ? 'scale-[.97]' : ''}`}
                style={{ boxShadow: 'var(--glow)' }}
              >
                {busy ? 'Checking…' : 'Confirm and continue'}
              </div>
              <div className="mt-4 rounded-[14px] bg-[rgba(255,176,90,.1)] border border-[rgba(255,176,90,.3)] p-3 text-left">
                <div className="text-[#FFB05A] text-[12.5px] font-extrabold">Check your Spam or Junk folder</div>
                <div className="text-[var(--ink-2)] text-[12px] font-semibold mt-1 leading-[1.45]">
                  Our emails often land there. Mark it “Not spam” so future emails reach your inbox.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div className="h-full flex items-center justify-center p-6 overflow-y-auto">
          <div className="text-center reveal">
            <div className="w-20 h-20 rounded-full bg-[rgba(46,224,110,.14)] border border-[rgba(46,224,110,.35)] flex items-center justify-center mx-auto" style={{ boxShadow: 'var(--glow)' }}>
              <Check width={40} height={40} className="text-[var(--accent-strong)]" />
            </div>
            <div className="font-head font-bold text-[30px] text-[var(--ink)] mt-6 tracking-[-.02em]">
              {flow === 'signin' ? 'Welcome back.' : "You're in."}
            </div>
            <div className="text-[var(--ink-3)] text-[15px] font-semibold mt-2">
              {flow === 'signin'
                ? `Good to see you again, ${NAME.split(' ')[0]}.`
                : `Welcome to PicoWorker, ${NAME.split(' ')[0]}.`}
            </div>
            <div className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-full bg-[rgba(68,209,122,.1)] border border-[rgba(68,209,122,.25)]">
              <span className="text-[var(--ink-2)] text-[13px] font-semibold">
                {flow === 'signin'
                  ? <>Your balance <span className="text-[var(--green)] font-extrabold">$3.42 USDC</span></>
                  : <>Welcome bonus <span className="text-[var(--green)] font-extrabold">$0.05 USDC</span> added</>}
              </span>
            </div>
          </div>
        </div>
      )}

      {stage === 'feed' && <DemoFeed pressed={pressed} />}
      {stage === 'offers' && <DemoOffers pressed={pressed} />}
      {stage === 'store' && <DemoStore install={install} progress={progress} pressed={pressed} />}
      {stage === 'game' && <DemoGame level={level} />}
      {stage === 'wallet' && <DemoWallet />}

      {sheet && <DemoGoalSheet pressed={pressed} />}

      {milestone && (
        <div className="absolute left-1/2 top-10 z-[46] -translate-x-1/2 reveal">
          <div
            className="flex items-center gap-3 rounded-[16px] border border-[rgba(46,224,110,.35)] px-5 py-3"
            style={{ background: 'rgba(14,15,19,.95)', boxShadow: '0 14px 40px rgba(0,0,0,.6)' }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(46,224,110,.15)]">
              <Check width={17} height={17} className="text-[var(--accent-strong)]" />
            </div>
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[.06em] text-[var(--accent-strong)]">Milestone tracked</div>
              <div className="text-[13.5px] font-bold text-[var(--ink)]">{milestone}</div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Fake Gmail window ===== */}
      {mail && <GmailWindow mail={mail} pressed={pressed} />}

      </div>

      {/* ===== Narration ===== */}
      <div
        className="absolute left-0 right-0 bottom-0 z-[45] flex justify-center px-6 pb-7 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,.75), transparent)', paddingTop: 60 }}
      >
        <div
          key={caption?.text}
          className="flex items-center gap-3 max-w-[720px] rounded-[16px] px-5 py-[13px] border border-[var(--line-2)]"
          style={{
            background: 'rgba(14,15,19,.92)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 14px 40px rgba(0,0,0,.55)',
            opacity: caption?.text ? 1 : 0,
            transform: caption ? 'none' : 'translateY(8px)',
            transition: 'opacity .35s, transform .35s',
          }}
        >
          {caption?.step != null && (
            <span className="shrink-0 w-7 h-7 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] font-head font-extrabold text-[13px] flex items-center justify-center">
              {caption.step}
            </span>
          )}
          <span
            dir={lang === 'ur' ? 'rtl' : 'ltr'}
            className={`text-[var(--ink)] font-semibold leading-[1.6] ${lang === 'ur' ? 'text-[17px]' : 'text-[15px]'}`}
          >
            {caption?.text}
          </span>
        </div>
      </div>

      {/* ===== Opening title card ===== */}
      <div
        className="absolute inset-0 z-[70] flex items-center justify-center bg-[var(--bg)]"
        style={{ opacity: intro ? 1 : 0, pointerEvents: 'none', transition: 'opacity .55s ease' }}
      >
          <div className="text-center px-6">
            <div className="flex justify-center mb-7"><BrandMark size={52} /></div>
            {lang === 'ur' ? (
              <div dir="rtl">
                <h1 className="font-bold text-[34px] sm:text-[42px] leading-[2] text-[var(--ink)] pb-2">
                  <span className="text-[var(--accent-strong)]">پیکو ورکر</span> پر اکاؤنٹ کیسے بنائیں
                </h1>
                <p className="text-[var(--ink-3)] text-[17px] font-semibold mt-6 leading-[2.2]">
                  بالکل مفت، ایک منٹ سے بھی کم وقت میں
                </p>
              </div>
            ) : (
              <>
                <h1 className="font-head font-bold text-[40px] sm:text-[52px] leading-[1.06] tracking-[-.03em] text-[var(--ink)]">
                  How to create<br />a <span className="text-[var(--accent-strong)]">PicoWorker</span> account
                </h1>
                <p className="text-[var(--ink-3)] text-[16px] font-semibold mt-5">
                  Free, takes under a minute
                </p>
              </>
            )}
          </div>
      </div>

      {/* Fake cursor — lives outside the stage container so it can also reach
          the URL bar up in the browser chrome. */}
      <div
        className="pointer-events-none absolute z-50 transition-all duration-[650ms] ease-out"
        style={{ left: cursorPos.x, top: cursorPos.y, opacity: cursor ? 1 : 0, transform: `scale(${pressed ? 0.8 : 1})` }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.5))' }}>
          <path d="M5 3l14 8.5-6.2 1.4L9.6 19 5 3z" fill="#fff" stroke="#111" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
        {pressed && <span className="absolute -left-3 -top-3 w-7 h-7 rounded-full border-2 border-[var(--accent-strong)] animate-ping" />}
      </div>
    </div>
  )
}

/**
 * Condensed replica of the marketing homepage (<Landing />) — nav, hero and the
 * two CTAs. Only what fits on one screen without scrolling, since the video
 * never scrolls. `loaded` gates the fade-in so the page appears to load after
 * the URL is typed.
 */
function DemoLanding({ loaded, pressed }: { loaded: boolean; pressed: string | null }) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-[var(--line)] bg-[var(--bar)]" style={{ opacity: loaded ? 1 : 0, transition: 'opacity .5s' }}>
        <div className="app-container flex items-center justify-between gap-3 h-16">
          <BrandMark size={34} />
          <nav className="hidden md:flex items-center gap-8 text-[14px] font-bold text-[var(--ink-3)]">
            <span>How it works</span><span>Earn</span><span>For business</span><span>FAQ</span>
          </nav>
          <div className="flex items-center gap-2">
            <div
              data-spot="log-in"
              className={`hidden sm:block px-4 py-[9px] rounded-[12px] text-[14px] font-bold text-[var(--ink)] transition-all ${pressed === 'log-in' ? 'scale-95 bg-[var(--fill)]' : ''}`}
            >
              Log in
            </div>
            <div
              data-spot="get-started"
              className={`px-4 py-[9px] rounded-[12px] text-[14px] font-extrabold font-head bg-[var(--accent)] text-[var(--accent-ink)] whitespace-nowrap transition-transform ${pressed === 'get-started' ? 'scale-95' : ''}`}
            >
              Get started
            </div>
          </div>
        </div>
      </header>

      <section className="flex-1 hero-grid overflow-hidden flex items-center" style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(10px)', transition: 'opacity .6s .1s, transform .6s .1s' }}>
        <div className="app-container w-full py-10">
          <div className="max-w-[760px] mx-auto text-center">
            <h1 className="font-head font-bold text-[38px] sm:text-[48px] lg:text-[54px] leading-[1.05] tracking-[-.03em] text-[var(--ink)]">
              Complete tiny tasks.<br />
              <span className="relative inline-block text-[var(--accent-strong)]">
                Earn useful rewards.
                <svg className="absolute left-0 -bottom-1.5 w-full" height="12" viewBox="0 0 320 12" fill="none" preserveAspectRatio="none" aria-hidden>
                  <path d="M3 8.5C70 3 250 3 317 7.5" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="text-[var(--ink-3)] text-[15px] lg:text-[17px] font-medium mt-6 max-w-[540px] mx-auto leading-[1.6]">
              PicoWorker is a micro-task marketplace. Follow an account, watch a clip, try an app or share your opinion, then earn a reward when your work is verified.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-9">
              <div className="px-6 py-[14px] rounded-[13px] font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] flex items-center gap-2" style={{ boxShadow: 'var(--glow)' }}>
                Start earning <ArrowRight width={17} height={17} />
              </div>
              <div className="px-6 py-[14px] rounded-[13px] font-head font-extrabold text-[15px] bg-[var(--fill)] text-[var(--ink)] border border-[var(--line-2)]">
                Post a task
              </div>
            </div>
            <div className="text-[var(--ink-4)] text-[13.5px] font-semibold mt-6">
              Free to join · Clear requirements · Verified rewards
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/**
 * Light-themed mock of the Gmail web UI, shown as a window floating over the
 * dark app. The contrast is deliberate: it reads as "the user switched to their
 * inbox in another tab" rather than as part of PicoWorker.
 */
function GmailWindow({ mail, pressed }: { mail: Exclude<Mail, null>; pressed: string | null }) {
  const open = mail === 'open' || mail === 'copied'
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-[1100px] rounded-[14px] overflow-hidden reveal font-sans" style={{ boxShadow: '0 40px 100px rgba(0,0,0,.65)' }}>
        {/* browser chrome */}
        <div className="bg-[#DEE1E6] px-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <span className="w-3 h-3 rounded-full bg-[#28C840]" />
            <div className="ml-3 bg-white rounded-t-[8px] px-4 py-[7px] text-[12px] text-[#3C4043] font-medium flex items-center gap-2">
              <span className="w-[14px] h-[14px] rounded-full bg-[#EA4335] inline-block" />
              Inbox (1) — bilal.ahmed@gmail.com
            </div>
          </div>
        </div>
        <div className="bg-white px-3 py-2 border-b border-[#E0E0E0] flex items-center gap-2">
          <div className="flex-1 bg-[#F1F3F4] rounded-full px-4 py-[6px] text-[12px] text-[#5F6368]">mail.google.com/mail/u/0/#inbox</div>
        </div>

        {/* gmail header */}
        <div className="bg-white px-4 py-3 flex items-center gap-4 border-b border-[#E8EAED]">
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><path fill="#EA4335" d="M2 6.5L12 13l10-6.5V18a2 2 0 01-2 2H4a2 2 0 01-2-2V6.5z" /><path fill="#C5221F" d="M2 6a2 2 0 012-2h16a2 2 0 012 2l-10 6.5L2 6z" /></svg>
            <span className="text-[19px] text-[#5F6368] tracking-[-.01em]">Gmail</span>
          </div>
          <div className="flex-1 bg-[#EAF1FB] rounded-[8px] px-4 py-[8px] text-[13px] text-[#5F6368]">Search mail</div>
          <div className="w-8 h-8 rounded-full bg-[#1A73E8] text-white text-[13px] font-bold flex items-center justify-center">B</div>
        </div>

        <div className="flex bg-white h-[440px]">
          {/* sidebar */}
          <div className="w-[170px] shrink-0 py-3 pr-2 hidden sm:block">
            <div className="mx-3 mb-4 inline-flex items-center gap-2 bg-[#C2E7FF] text-[#001D35] rounded-[16px] px-4 py-[10px] text-[13px] font-medium">Compose</div>
            {[['Inbox', '1'], ['Starred', ''], ['Snoozed', ''], ['Sent', ''], ['Drafts', '']].map(([label, badge]) => (
              <div key={label} className={`flex items-center justify-between pl-6 pr-3 py-[7px] rounded-r-full text-[13.5px] ${label === 'Inbox' ? 'bg-[#D3E3FD] text-[#001D35] font-bold' : 'text-[#202124]'}`}>
                <span>{label}</span>
                {badge && <span className="text-[12px] font-bold">{badge}</span>}
              </div>
            ))}
          </div>

          {/* list / reading pane */}
          <div className="flex-1 border-l border-[#E8EAED] overflow-hidden">
            {!open ? (
              <div>
                <div className="px-4 py-2 text-[12px] text-[#5F6368] border-b border-[#F1F3F4]">Primary</div>
                <div
                  data-spot="mail-row"
                  className={`flex items-center gap-3 px-4 py-[11px] border-b border-[#F1F3F4] bg-white transition-all ${pressed === 'mail-row' ? 'bg-[#F1F3F4] scale-[.995]' : ''}`}
                  style={{ boxShadow: 'inset 3px 0 0 #1A73E8' }}
                >
                  <span className="text-[#F4B400] text-[15px]">☆</span>
                  <span className="w-[110px] shrink-0 text-[13.5px] font-bold text-[#202124]">PicoWorker</span>
                  <span className="text-[13.5px] text-[#202124] truncate">
                    <b>Your confirmation code</b>
                    <span className="text-[#5F6368]"> — Enter this code to finish creating your PicoWorker account…</span>
                  </span>
                  <span className="ml-auto text-[12px] font-bold text-[#202124] shrink-0">12:04 PM</span>
                </div>
                {[['Netflix', 'New arrivals this week', '11:32 AM'], ['GitHub', '[picoworker] 2 new pull requests', '9:15 AM'], ['Coinbase', 'Your USDC statement is ready', 'Yesterday']].map(([from, subj, time]) => (
                  <div key={from} className="flex items-center gap-3 px-4 py-[11px] border-b border-[#F1F3F4] bg-[#F8FAFD]">
                    <span className="text-[#DADCE0] text-[15px]">☆</span>
                    <span className="w-[110px] shrink-0 text-[13.5px] text-[#5F6368]">{from}</span>
                    <span className="text-[13.5px] text-[#5F6368] truncate">{subj}</span>
                    <span className="ml-auto text-[12px] text-[#5F6368] shrink-0">{time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 overflow-y-auto h-full">
                <div className="text-[20px] text-[#202124]">Your confirmation code</div>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-9 h-9 rounded-full text-white text-[14px] font-bold flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#2EE06E,#8B6CFF)' }}>P</div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] text-[#202124]">
                      <b>PicoWorker</b> <span className="text-[#5F6368]">&lt;hello@picoworker.xyz&gt;</span>
                    </div>
                    <div className="text-[12px] text-[#5F6368]">to me · 12:04 PM</div>
                  </div>
                </div>

                <div className="mt-5 border border-[#E8EAED] rounded-[10px] p-6 text-center">
                  <div className="text-[15px] text-[#202124] font-bold">Confirm your email</div>
                  <div className="text-[13px] text-[#5F6368] mt-2">Enter this code in PicoWorker to finish signing up. It expires in 10 minutes.</div>
                  <div className="mt-4 text-[32px] font-bold tracking-[.34em] text-[#202124]">{CODE}</div>
                  <div
                    data-spot="copy-btn"
                    className={`inline-block mt-5 px-6 py-[10px] rounded-[8px] text-[13.5px] font-bold transition-all duration-200 ${mail === 'copied'
                      ? 'bg-[#E6F4EA] text-[#137333] border border-[#137333]'
                      : 'bg-[#1A73E8] text-white'} ${pressed === 'copy-btn' ? 'scale-95' : ''}`}
                  >
                    {mail === 'copied' ? 'Copied ✓' : 'Copy code'}
                  </div>
                  <div className="text-[11.5px] text-[#80868B] mt-5">If you didn&apos;t create a PicoWorker account, ignore this email.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===================== Earn tutorial screens ===================== */

/** Shared app chrome for the signed-in screens: header, balance pill, nav. */
function AppChrome({ active, pressed, children }: { active: string; pressed: string | null; children: React.ReactNode }) {
  const items = ['Earn', 'Offers', 'Check in', 'Referral', 'Leaderboard']
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-[var(--line)] bg-[var(--bar)]">
        <div className="flex items-center justify-between gap-3 px-6 h-16">
          <BrandMark size={32} />
          <nav className="hidden md:flex items-center gap-1">
            {items.map((label) => (
              <div
                key={label}
                data-spot={label === 'Offers' ? 'nav-offers' : undefined}
                className={`rounded-[11px] px-3.5 py-[9px] text-[13.5px] font-head transition-all ${
                  label === active
                    ? 'bg-[var(--fill)] font-extrabold text-[var(--ink)]'
                    : 'font-bold text-[var(--ink-3)]'
                } ${pressed === 'nav-offers' && label === 'Offers' ? 'scale-95 bg-[var(--fill)]' : ''}`}
              >
                {label}
              </div>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-[rgba(46,224,110,.3)] bg-[rgba(46,224,110,.1)] px-3.5 py-[7px] text-[13px] font-extrabold text-[var(--accent-strong)]">
              $3.42
            </div>
            <Avatar name="B" size={30} gradient="linear-gradient(135deg,#FF6B5A,#FFB05A)" />
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-hidden px-6 py-6">{children}</div>
    </div>
  )
}

/** The Earn page you land on after signing in. */
function DemoFeed({ pressed }: { pressed: string | null }) {
  return (
    <AppChrome active="Earn" pressed={pressed}>
      <div className="font-head text-[22px] font-extrabold text-[var(--ink)]">Earn</div>
      <div className="mt-1 text-[13px] font-semibold text-[var(--ink-4)]">
        Pick a task or an offer. Rewards are credited once your work is verified.
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { t: 'Follow an account on X', r: '$0.05', c: 'Social' },
          { t: 'Watch a 30 second clip', r: '$0.03', c: 'Video' },
          { t: 'Try a new app for 2 minutes', r: '$0.18', c: 'App' },
          { t: 'Answer a 5 question survey', r: '$0.24', c: 'Survey' },
          { t: 'Rate a landing page', r: '$0.09', c: 'Feedback' },
          { t: 'Sign up for a free trial', r: '$0.65', c: 'Signup' },
        ].map((o) => (
          <div key={o.t} className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4">
            <div className="text-[9.5px] font-extrabold uppercase tracking-[.04em] text-[var(--ink-5)]">{o.c}</div>
            <div className="mt-1 font-head text-[13.5px] font-extrabold leading-[1.3] text-[var(--ink)]">{o.t}</div>
            <div className="mt-2 text-[13px] font-extrabold text-[var(--green)]">{o.r}</div>
          </div>
        ))}
      </div>
    </AppChrome>
  )
}

/** The Offers tab, rebuilt from the real LootablyOffers card. */
function DemoOffers({ pressed }: { pressed: string | null }) {
  return (
    <AppChrome active="Offers" pressed={pressed}>
      <div className="mb-4 inline-flex rounded-full bg-[var(--fill-2)] p-1">
        {['Offers', 'Worldwide', 'Featured'].map((t) => (
          <div
            key={t}
            className={`rounded-full px-4 py-2 font-head text-[13px] ${
              t === 'Offers' ? 'bg-[var(--accent)] font-extrabold text-[var(--accent-ink)]' : 'font-bold text-[var(--ink-3)]'
            }`}
          >
            {t}
          </div>
        ))}
      </div>
      <div className="mb-3 font-head text-[14px] font-extrabold text-[var(--ink)]">142 available offers</div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* The offer the video walks through */}
        <article className="flex min-h-[172px] flex-col rounded-[18px] border border-[rgba(46,224,110,.35)] bg-[var(--card)] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px]" style={{ background: 'linear-gradient(135deg,#FFB05A,#FF6B5A)' }}>
              <span className="font-head text-[15px] font-extrabold text-white">R</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-head text-[13.5px] font-extrabold leading-[1.3] text-[var(--ink)]">{OFFER.title}</h3>
              <div className="mt-1 text-[9.5px] font-extrabold uppercase tracking-[.04em] text-[var(--ink-5)]">{OFFER.categories}</div>
              <div className="mt-1 text-[13px] font-extrabold text-[var(--green)]">${OFFER.total.toFixed(2)}</div>
              <div className="text-[10px] font-semibold text-[var(--ink-5)]">Across {OFFER.goals.length} steps</div>
            </div>
          </div>
          <p className="mt-3 text-[12px] font-semibold leading-[1.5] text-[var(--ink-3)]">
            Install Royal Match and reach the listed levels. Each level pays separately.
          </p>
          <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-3">
            <div className="flex h-[38px] items-center justify-center gap-1.5 rounded-[12px] bg-[var(--accent)] text-[12px] font-head font-extrabold text-[var(--accent-ink)]">
              Start offer
            </div>
            <div
              data-spot="offer-steps"
              className={`flex h-[38px] items-center rounded-[12px] border border-[var(--line-2)] bg-[var(--fill)] px-3 text-[11.5px] font-extrabold text-[var(--ink-2)] transition-transform ${pressed === 'offer-steps' ? 'scale-95' : ''}`}
            >
              Steps
            </div>
          </div>
        </article>

        {OTHER_OFFERS.map((o) => (
          <article key={o.title} className="flex min-h-[172px] flex-col rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 flex-none rounded-[12px] bg-[var(--fill)]" />
              <div className="min-w-0 flex-1">
                <h3 className="font-head text-[13.5px] font-extrabold leading-[1.3] text-[var(--ink)]">{o.title}</h3>
                <div className="mt-1 text-[9.5px] font-extrabold uppercase tracking-[.04em] text-[var(--ink-5)]">{o.cat}</div>
                <div className="mt-1 text-[13px] font-extrabold text-[var(--green)]">{o.reward}</div>
                <div className="text-[10px] font-semibold text-[var(--ink-5)]">{o.note}</div>
              </div>
            </div>
            <div className="mt-auto pt-3">
              <div className="flex h-[38px] items-center justify-center rounded-[12px] bg-[var(--fill)] text-[12px] font-head font-extrabold text-[var(--ink-3)]">
                Start offer
              </div>
            </div>
          </article>
        ))}
      </div>
    </AppChrome>
  )
}

/** The real GoalSheet: what each step pays, before you commit to anything. */
function DemoGoalSheet({ pressed }: { pressed: string | null }) {
  return (
    <div className="absolute inset-0 z-[44] flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-[520px] rounded-[24px] border border-[var(--line)] bg-[var(--card)] p-6 reveal" style={{ boxShadow: '0 24px 80px rgba(0,0,0,.45)' }}>
        <h2 className="font-head text-[18px] font-extrabold leading-[1.3] text-[var(--ink)]">{OFFER.title}</h2>
        <div className="mt-1 font-head text-[16px] font-extrabold text-[var(--green)]">
          ${OFFER.total.toFixed(2)} <span className="text-[12px] font-bold text-[var(--ink-4)]">total</span>
        </div>

        <div className="mt-4 text-[11px] font-extrabold uppercase tracking-[.08em] text-[var(--ink-5)]">
          Steps · each one pays separately
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {OFFER.goals.map((g, i) => (
            <div key={g.description} className="flex items-start justify-between gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--fill)] px-3 py-2.5">
              <span className="text-[12px] font-semibold leading-[1.45] text-[var(--ink-2)]">
                <span className="text-[var(--ink-4)]">{i + 1}.</span> {g.description}
              </span>
              <span className="flex-none text-[12px] font-extrabold text-[var(--green)]">${g.rewardUsd.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11.5px] font-semibold leading-[1.5] text-[var(--ink-4)]">
          You are paid for every step you finish, so stopping part way still earns what you completed.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="flex h-[46px] items-center justify-center rounded-[13px] border border-[var(--line-2)] bg-[var(--fill)] text-[14px] font-head font-extrabold text-[var(--ink-2)]">Cancel</div>
          <div
            data-spot="sheet-start"
            className={`flex h-[46px] items-center justify-center rounded-[13px] bg-[var(--accent)] text-[14px] font-head font-extrabold text-[var(--accent-ink)] transition-transform ${pressed === 'sheet-start' ? 'scale-95' : ''}`}
            style={{ boxShadow: 'var(--glow)' }}
          >
            Start offer
          </div>
        </div>
      </div>
    </div>
  )
}

/** Play Store listing, install progress, then Open. Light theme on purpose. */
function DemoStore({ install, progress, pressed }: { install: 'idle' | 'installing' | 'done'; progress: number; pressed: string | null }) {
  return (
    <div className="h-full overflow-hidden bg-white">
      <div className="flex items-center gap-3 border-b border-[#E8EAED] px-6 py-4">
        <svg width="22" height="24" viewBox="0 0 24 26" aria-hidden>
          <path fill="#34A853" d="M3 1l12.5 12L3 25z" /><path fill="#4285F4" d="M3 1l12.5 12L20 9.5z" opacity=".9" />
          <path fill="#FBBC04" d="M15.5 13L20 16.5 23 13 20 9.5z" /><path fill="#EA4335" d="M3 25l12.5-12L20 16.5z" />
        </svg>
        <span className="text-[19px] text-[#5F6368]">Google Play</span>
        <div className="ml-6 flex-1 rounded-full bg-[#F1F3F4] px-4 py-[7px] text-[13px] text-[#5F6368]">Search for apps and games</div>
      </div>

      <div className="px-10 py-8">
        <div className="flex items-start gap-6">
          <div className="flex h-[110px] w-[110px] flex-none items-center justify-center rounded-[22px]" style={{ background: 'linear-gradient(135deg,#FFB05A,#FF6B5A)' }}>
            <span className="font-head text-[42px] font-extrabold text-white">R</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[30px] font-medium text-[#202124]">{OFFER.title}</div>
            <div className="text-[14px] font-bold text-[#01875F]">Dream Games</div>
            <div className="mt-3 flex items-center gap-6 text-[13px] text-[#5F6368]">
              <span><b className="text-[#202124]">4.6★</b> 8.4M reviews</span>
              <span><b className="text-[#202124]">500M+</b> Downloads</span>
              <span><b className="text-[#202124]">E</b> Everyone</span>
            </div>

            <div className="mt-5 w-[300px]">
              {install === 'idle' && (
                <div
                  data-spot="install-btn"
                  className={`flex h-[42px] w-[130px] items-center justify-center rounded-[8px] bg-[#01875F] text-[15px] font-bold text-white transition-transform ${pressed === 'install-btn' ? 'scale-95' : ''}`}
                >
                  Install
                </div>
              )}
              {install === 'installing' && (
                <div>
                  <div className="text-[13px] font-bold text-[#01875F]">Downloading… {progress}%</div>
                  <div className="mt-2 h-[4px] w-full overflow-hidden rounded-full bg-[#E8EAED]">
                    <div className="h-full rounded-full bg-[#01875F] transition-all duration-200" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
              {install === 'done' && (
                <div className="flex gap-3">
                  <div
                    data-spot="open-btn"
                    className={`flex h-[42px] w-[130px] items-center justify-center rounded-[8px] bg-[#01875F] text-[15px] font-bold text-white transition-transform ${pressed === 'open-btn' ? 'scale-95' : ''}`}
                  >
                    Open
                  </div>
                  <div className="flex h-[42px] items-center justify-center rounded-[8px] border border-[#DADCE0] px-5 text-[15px] font-bold text-[#01875F]">
                    Uninstall
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Stand-in for the game itself: enough to show a level climbing. */
function DemoGame({ level }: { level: number }) {
  const target = 20
  return (
    <div className="h-full flex items-center justify-center overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 20%, #2B6CB0, #12233B 70%)' }}>
      <div className="text-center">
        <div className="mx-auto flex h-[92px] w-[92px] items-center justify-center rounded-[24px]" style={{ background: 'linear-gradient(135deg,#FFB05A,#FF6B5A)', boxShadow: '0 18px 50px rgba(0,0,0,.45)' }}>
          <span className="font-head text-[38px] font-extrabold text-white">R</span>
        </div>
        <div className="mt-6 font-head text-[34px] font-extrabold text-white">Level {level}</div>
        <div className="mt-2 text-[14px] font-semibold text-[rgba(255,255,255,.7)]">
          {level >= target ? 'Milestone reached' : `${target - level} levels to your next reward`}
        </div>
        <div className="mx-auto mt-5 h-[8px] w-[320px] overflow-hidden rounded-full bg-[rgba(255,255,255,.18)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (level / target) * 100)}%`, background: 'linear-gradient(90deg,#FFB05A,#2EE06E)' }}
          />
        </div>
      </div>
    </div>
  )
}

/** Wallet, with the reward sitting in pending. The point of the whole video. */
function DemoWallet() {
  return (
    <AppChrome active="Earn" pressed={null}>
      <div className="font-head text-[22px] font-extrabold text-[var(--ink)]">Wallet</div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-5">
          <div className="text-[11px] font-extrabold uppercase tracking-[.06em] text-[var(--ink-5)]">Available</div>
          <div className="mt-1 font-head text-[28px] font-extrabold text-[var(--ink)]">$3.42</div>
          <div className="mt-1 text-[12px] font-semibold text-[var(--ink-4)]">Ready to cash out in USDC</div>
        </div>
        <div className="rounded-[18px] border border-[rgba(242,163,60,.3)] bg-[rgba(242,163,60,.07)] p-5">
          <div className="text-[11px] font-extrabold uppercase tracking-[.06em] text-[#D99832]">Pending</div>
          <div className="mt-1 font-head text-[28px] font-extrabold text-[#F2A33C]">$0.92</div>
          <div className="mt-1 text-[12px] font-semibold text-[var(--ink-4)]">Clears within 24 hours</div>
        </div>
      </div>

      <div className="mt-5 text-[11px] font-extrabold uppercase tracking-[.08em] text-[var(--ink-5)]">Recent activity</div>
      <div className="mt-2 flex flex-col gap-2">
        {[
          { t: `${OFFER.title} · ${OFFER.goals[1].description}`, a: `+$${OFFER.goals[1].rewardUsd.toFixed(2)}`, s: 'Pending' },
          { t: `${OFFER.title} · ${OFFER.goals[0].description}`, a: `+$${OFFER.goals[0].rewardUsd.toFixed(2)}`, s: 'Pending' },
          { t: 'Answer a 5 question survey', a: '+$0.24', s: 'Paid' },
          { t: 'Follow an account on X', a: '+$0.05', s: 'Paid' },
        ].map((r) => (
          <div key={r.t} className="flex items-center justify-between gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--card)] px-4 py-3">
            <span className="text-[13px] font-bold text-[var(--ink-2)]">{r.t}</span>
            <span className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-[3px] text-[10.5px] font-extrabold ${
                r.s === 'Pending'
                  ? 'bg-[rgba(242,163,60,.14)] text-[#F2A33C]'
                  : 'bg-[rgba(46,224,110,.12)] text-[var(--accent-strong)]'
              }`}>
                {r.s}
              </span>
              <span className="text-[13px] font-extrabold text-[var(--green)]">{r.a}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-[rgba(242,163,60,.25)] bg-[rgba(242,163,60,.08)] p-3.5">
        <Shield width={17} height={17} className="mt-0.5 flex-none text-[#D99832]" />
        <p className="text-[11.5px] font-semibold leading-[1.5] text-[var(--ink-3)]">
          Offer rewards are credited once the provider confirms your completion. This is usually within 24 hours
          and is not instant. VPNs, duplicate accounts and automated traffic will not be paid.
        </p>
      </div>
    </AppChrome>
  )
}

function FakeField({ spot, placeholder, value, focused, trailing }: {
  spot: string
  placeholder: string
  value: string
  focused?: boolean
  trailing?: React.ReactNode
}) {
  return (
    <div className="relative">
      <div
        data-spot={spot}
        className={`w-full bg-[var(--card)] border rounded-[14px] px-4 py-[14px] text-[15px] font-semibold min-h-[52px] transition-colors ${focused ? 'border-[var(--accent)]' : 'border-[var(--line-2)]'} ${trailing ? 'pr-12' : ''}`}
      >
        {value
          ? <span className="text-[var(--ink)]">{value}</span>
          : <span className="text-[var(--ink-5)]">{placeholder}</span>}
        {focused && <span className="inline-block w-[2px] h-[16px] align-middle ml-[2px] bg-[var(--accent-strong)] animate-pulse" />}
      </div>
      {trailing}
    </div>
  )
}
