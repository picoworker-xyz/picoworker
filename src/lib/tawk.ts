// Tell the Tawk.to widget who the visitor is.
//
// Without this every conversation arrives as "Visitor 42" and you cannot tell
// which worker is asking, which makes a support chat close to useless when the
// question is "where is my payment".
//
// The widget script is injected async from index.html, so Tawk_API may not have
// its methods yet when React mounts. Tawk handles this by letting you assign
// Tawk_API.onLoad before the script arrives; the stub object created in
// index.html is the same object the real widget later fills in. So we set the
// attributes if the method already exists, and otherwise queue them for onLoad.
//
// NOTE ON TRUST: these attributes come from the browser and are not verified by
// Tawk unless Secure Mode is enabled, which requires signing the email with the
// Tawk API key server-side. So treat the identity shown in the dashboard as a
// strong hint, not proof. Never action a payout or account change on the basis
// of the name in a chat alone.

type TawkApi = {
  setAttributes?: (attrs: Record<string, string>, cb?: (err?: unknown) => void) => void
  onLoad?: () => void
  maximize?: () => void
  toggle?: () => void
}

declare global {
  interface Window { Tawk_API?: TawkApi }
}

export type TawkIdentity = {
  id: string
  name: string
  email: string
  /** Shown as extra context in the Tawk dashboard, not used for matching. */
  level?: string
  balance?: string
}

function apply(api: TawkApi, who: TawkIdentity) {
  api.setAttributes?.({
    // Tawk treats `name` and `email` specially; everything else is custom.
    name: who.name || 'PicoWorker user',
    email: who.email,
    picoworkerId: who.id,
    ...(who.level ? { level: who.level } : {}),
    ...(who.balance ? { balance: who.balance } : {}),
  }, () => { /* failures here must never surface to the worker */ })
}

export function identifyTawk(who: TawkIdentity) {
  if (typeof window === 'undefined') return
  const api = window.Tawk_API = window.Tawk_API || {}
  if (typeof api.setAttributes === 'function') {
    apply(api, who)
    return
  }
  // Widget not ready. onLoad fires once the real API replaces the stub.
  const previous = api.onLoad
  api.onLoad = () => {
    previous?.()
    apply(window.Tawk_API ?? {}, who)
  }
}

/** Opens the chat, so an in-app "Support" entry can use Tawk instead of a page. */
export function openTawk(): boolean {
  const api = typeof window !== 'undefined' ? window.Tawk_API : undefined
  if (api?.maximize) { api.maximize(); return true }
  if (api?.toggle) { api.toggle(); return true }
  return false
}
