import { supabase } from './supabase'

export type CpxSurvey = {
  surveyId: string
  category: string
  minutes: number
  rewardUsd: number
  rating: number
  ratingCount: number
  needsQualification: boolean
  link: string
}

export type CpxState =
  | { status: 'loading' }
  | { status: 'ready'; surveys: CpxSurvey[] }
  | { status: 'error'; message: string }

/**
 * Survey inventory for the signed-in worker.
 *
 * CPX matches surveys to the caller's IP and profile, so the list is per user
 * and short-lived: a survey that filled up is gone on the next call. The cache
 * is deliberately brief for that reason — a stale card sends the worker to a
 * closed survey, which reads as a broken app.
 */
const CACHE_TTL_MS = 5 * 60 * 1000
let cache: { userId: string; savedAt: number; surveys: CpxSurvey[] } | null = null

export async function fetchCpxSurveys(options: { force?: boolean } = {}): Promise<CpxState> {
  if (!supabase) return { status: 'error', message: 'Surveys require the production account service.' }

  const { data: session } = await supabase.auth.getUser()
  const userId = session?.user?.id
  if (!userId) return { status: 'error', message: 'Please sign in first.' }

  if (!options.force && cache && cache.userId === userId && Date.now() - cache.savedAt < CACHE_TTL_MS) {
    return { status: 'ready', surveys: cache.surveys }
  }

  const { data, error } = await supabase.functions.invoke('cpx-offers', { body: {} })
  if (error || data?.status !== 'success' || !Array.isArray(data?.surveys)) {
    return { status: 'error', message: data?.error ?? error?.message ?? 'Could not load surveys.' }
  }

  const surveys = data.surveys as CpxSurvey[]
  cache = { userId, savedAt: Date.now(), surveys }
  return { status: 'ready', surveys }
}

/**
 * Signed frame URL for the full CPX wall.
 *
 * Kept alongside the survey list as the fallback when CPX has matched the
 * worker to nothing: the frame still offers profile questions that unlock
 * inventory, so an empty list is not a dead end.
 */
let frameCache: { userId: string; url: string } | null = null

export async function cpxFrameUrl(): Promise<string> {
  if (!supabase) throw new Error('Surveys require the production account service.')
  const { data: session } = await supabase.auth.getUser()
  const userId = session?.user?.id
  if (!userId) throw new Error('Please sign in first.')
  if (frameCache && frameCache.userId === userId) return frameCache.url

  const { data, error } = await supabase.functions.invoke('cpx-widget', { body: {} })
  if (error || data?.status !== 'success' || !data?.url) {
    throw new Error(data?.error ?? error?.message ?? 'Could not open surveys right now.')
  }
  frameCache = { userId, url: data.url as string }
  return frameCache.url
}
