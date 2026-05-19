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

// Advancement bonus points (per the rules sheet)
export const ADVANCEMENT_POINTS = {
  advanced_to_round_32: 2,
  advanced_to_round_16: 2,
  advanced_to_quarters: 3,
  advanced_to_semis: 4,
  advanced_to_final: 5,
  won_world_cup: 10,
} as const

export type AdvancementKey = keyof typeof ADVANCEMENT_POINTS

// Keep POINTS as alias for Admin panel display
export const POINTS = ADVANCEMENT_POINTS

export function calcAdvancementPoints(adv: TeamAdvancement | undefined): number {
  if (!adv) return 0
  return (Object.keys(ADVANCEMENT_POINTS) as AdvancementKey[]).reduce(
    (sum, key) => sum + (adv[key] ? ADVANCEMENT_POINTS[key] : 0),
    0,
  )
}

// calcTeamPoints is an alias kept for backward compat
export const calcTeamPoints = calcAdvancementPoints

export interface MatchResult {
  resultPts: number
  goalPts: number
  goalsScored: number
}

export function calcMatchPoints(teamId: string, match: Match): MatchResult {
  const isHome = match.home_team_id === teamId
  const goalsFor = isHome ? (match.home_goals ?? 0) : (match.away_goals ?? 0)
  const goalsAgainst = isHome ? (match.away_goals ?? 0) : (match.home_goals ?? 0)
  const penFor = isHome ? match.home_penalty_goals : match.away_penalty_goals
  const penAgainst = isHome ? match.away_penalty_goals : match.home_penalty_goals

  const totalScored = goalsFor + penFor
  const totalConceded = goalsAgainst + penAgainst

  let resultPts = 0
  if (goalsFor > goalsAgainst) {
    resultPts = 3
  } else if (goalsFor === goalsAgainst) {
    if (penFor > penAgainst) {
      resultPts = 3 // won on penalties
    } else if (penFor < penAgainst) {
      resultPts = 0 // lost on penalties
    } else {
      resultPts = 1 // true draw (group stage)
    }
  }

  return { resultPts, goalPts: totalScored - totalConceded, goalsScored: totalScored }
}

export const ENTRY_FEE = 20
export const MAX_ENTRIES_PER_PERSON = 5
export const TEAMS_PER_TIER = 2 // pick 2 teams from each of 6 tiers = 12 total

export const PRIZE_SPLIT = { first: 0.6, second: 0.3, third: 0.1 }

export const LEVEL_LABELS: Record<number, string> = {
  1: 'Tier 1 — Elite',
  2: 'Tier 2 — Strong',
  3: 'Tier 3 — Solid',
  4: 'Tier 4 — Mid',
  5: 'Tier 5 — Dark Horse',
  6: 'Tier 6 — Underdog',
}
