export interface Team {
  id: string
  name: string
  flag: string
  level: number
  created_at: string
}

export interface Participant {
  id: string
  name: string
  access_code: string
  created_at: string
}

export interface Entry {
  id: string
  participant_id: string
  entry_name: string
  created_at: string
  participant?: Participant
  entry_teams?: EntryTeam[]
}

export interface EntryTeam {
  id: string
  entry_id: string
  team_id: string
  team?: Team
}

export type Stage =
  | 'group'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'final'

export const STAGE_LABELS: Record<Stage, string> = {
  group: 'Group Stage',
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter Final',
  semi_final: 'Semi Final',
  final: 'Final',
}

export interface Match {
  id: string
  home_team_id: string
  away_team_id: string
  stage: Stage
  home_goals: number | null
  away_goals: number | null
  home_penalty_goals: number
  away_penalty_goals: number
  is_completed: boolean
  match_date: string | null
  created_at: string
  home_team?: Team
  away_team?: Team
}

export interface TeamAdvancement {
  team_id: string
  advanced_to_round_32: boolean
  advanced_to_round_16: boolean
  advanced_to_quarters: boolean
  advanced_to_semis: boolean
  advanced_to_final: boolean
  won_world_cup: boolean
  updated_at: string
}

export const POINTS = {
  advanced_to_round_32: 2,
  advanced_to_round_16: 4,
  advanced_to_quarters: 8,
  advanced_to_semis: 16,
  advanced_to_final: 32,
  won_world_cup: 64,
} as const

export type AdvancementKey = keyof typeof POINTS

export function calcTeamPoints(adv: TeamAdvancement | undefined): number {
  if (!adv) return 0
  let total = 0
  const keys = Object.keys(POINTS) as AdvancementKey[]
  for (const key of keys) {
    if (adv[key]) {
      total += POINTS[key]
    }
  }
  return total
}

export const ENTRY_FEE = 20

export const LEVEL_LABELS: Record<number, string> = {
  1: 'Tier 1 — Elite',
  2: 'Tier 2 — Strong',
  3: 'Tier 3 — Solid',
  4: 'Tier 4 — Mid',
  5: 'Tier 5 — Dark Horse',
  6: 'Tier 6 — Underdog',
}
