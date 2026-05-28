import type { Stage } from '@/types'
import { supabase } from '@/lib/supabase'

export const hasApiKey = true // key lives server-side in Supabase secret

const STAGE_MAP: Partial<Record<string, Stage>> = {
  GROUP_STAGE: 'group',
  ROUND_OF_32: 'round_of_32',
  ROUND_OF_16: 'round_of_16',
  QUARTER_FINALS: 'quarter_final',
  SEMI_FINALS: 'semi_final',
  FINAL: 'final',
}

function norm(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

const ALIASES: Record<string, string> = {
  'united states': 'usa',
  'republic of ireland': 'ireland',
  'ir iran': 'iran',
  'cote divoire': 'ivory coast',
  'czech republic': 'czechia',
  'dr congo': 'congo dr',
  'congo': 'congo dr',
  'bosnia and herzegovina': 'bosnia-herzegovina',
  'south korea': 'korea republic',
}

export interface ApiTeam {
  id: number
  name: string | null
  shortName: string | null
}

export interface ApiMatch {
  id: number
  utcDate: string
  stage: string
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'SUSPENDED'
  homeTeam: ApiTeam | null
  awayTeam: ApiTeam | null
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
    fullTime: { home: number | null; away: number | null } | null
    penalties: { home: number | null; away: number | null } | null
  } | null
}

export async function fetchWorldCupMatches(): Promise<ApiMatch[]> {
  const { data, error } = await supabase.functions.invoke('fetch-matches')
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return (data as { matches: ApiMatch[] }).matches
}

export function mapApiStage(apiStage: string): Stage | null {
  return STAGE_MAP[apiStage] ?? null
}

export function resolveTeamId(apiName: string | null | undefined, shortName: string | null | undefined, nameToId: Map<string, string>): string | null {
  for (const candidate of [apiName, shortName]) {
    const n = norm(candidate)
    if (!n) continue
    const alias = ALIASES[n] ?? n
    const id = nameToId.get(alias) ?? nameToId.get(n)
    if (id) return id
  }
  return null
}

export function buildNameMap(teams: { id: string; name: string }[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const t of teams) {
    const n = norm(t.name)
    if (n) map.set(n, t.id)
  }
  return map
}
