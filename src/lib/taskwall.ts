import { supabase } from './supabase'

export type TaskwallDevice = 'android' | 'ios' | 'desktop'

export type TaskwallOffer = {
  offerId: string
  title: string
  description: string
  conversion: string
  icon: string
  link: string
  reward: number
  devices: string[]
  countries: string[]
}

export type TaskwallOffersState =
  | { status: 'loading' }
  | { status: 'ready'; offers: TaskwallOffer[]; country: string | null; os: TaskwallDevice }
  | { status: 'error'; message: string }

export const TASKWALL_DEVICE_OPTIONS: { value: TaskwallDevice; label: string }[] = [
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iPhone / iPad' },
  { value: 'desktop', label: 'Desktop' },
]

export function detectTaskwallDevice(): TaskwallDevice {
  const agent = navigator.userAgent.toLowerCase()
  if (agent.includes('android')) return 'android'
  if (/iphone|ipad|ipod/.test(agent)) return 'ios'
  return 'desktop'
}

export async function requestTaskwallOffers(os: TaskwallDevice): Promise<TaskwallOffersState> {
  if (!supabase) {
    return { status: 'error', message: 'TaskWall requires the production account service.' }
  }

  const { data, error } = await supabase.functions.invoke('taskwall-offers', {
    body: { os },
  })
  if (error || data?.status !== 'success' || !Array.isArray(data?.offers)) {
    return {
      status: 'error',
      message: data?.error ?? error?.message ?? 'Could not load TaskWall offers.',
    }
  }
  return {
    status: 'ready',
    offers: data.offers as TaskwallOffer[],
    country: typeof data.country === 'string' ? data.country : null,
    os,
  }
}
