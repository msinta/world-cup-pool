import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Calendar, CheckCircle, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { STAGE_LABELS } from '@/types'
import type { Team, Stage } from '@/types'
import { Button } from '@/components/ui/button'
import { FlagImg } from '@/components/ui/flag-img'

interface MatchRow {
  id: string
  stage: Stage
  home_goals: number | null
  away_goals: number | null
  home_penalty_goals: number
  away_penalty_goals: number
  is_completed: boolean
  match_date: string | null
  home_team: Team | null
  away_team: Team | null
}

const MATCH_SELECT = 'id, stage, home_goals, away_goals, home_penalty_goals, away_penalty_goals, is_completed, match_date, home_team:teams!matches_home_team_id_fkey(id, name, flag, level, created_at), away_team:teams!matches_away_team_id_fkey(id, name, flag, level, created_at)'

const KNOCKOUT_STAGES: Stage[] = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final']

// R32 has 16 matches (48 team World Cup). Each subsequent round halves.
const ROUND_COUNTS: Record<string, number> = {
  round_of_32: 16,
  round_of_16: 8,
  quarter_final: 4,
  semi_final: 2,
  final: 1,
}

const ROUND_LABELS: Record<string, string> = {
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter-Final',
  semi_final: 'Semi-Final',
  final: 'Final',
}

// Base slot height (px) for one R32 match — later rounds get proportionally taller
const BASE = 68
const TOTAL_H = BASE * 16 // 1088px — full bracket height

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function groupByDate(matches: MatchRow[]): [string, MatchRow[]][] {
  const groups = new Map<string, MatchRow[]>()
  for (const m of matches) {
    const key = m.match_date ? formatDate(m.match_date) : 'TBD'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }
  return [...groups.entries()]
}

// ─── List-view match card (Upcoming / Results tabs) ───────────────────────────
function MatchCard({ match }: { match: MatchRow }) {
  const hasPens = match.home_penalty_goals > 0 || match.away_penalty_goals > 0
  const homeName = match.home_team?.name ?? 'TBD'
  const awayName = match.away_team?.name ?? 'TBD'
  return (
    <div className="flex items-center gap-2 py-3 px-4 border-b last:border-0 hover:bg-black/[0.01] transition-colors">
      <div className="flex-1 flex items-center justify-end gap-2">
        <span className="text-sm font-medium text-foreground hidden sm:block text-right">{homeName}</span>
        <span className="text-sm font-medium text-foreground sm:hidden text-right">{homeName.split(' ').slice(-1)[0]}</span>
        {match.home_team ? <FlagImg emoji={match.home_team.flag} size={22} /> : <span className="text-lg">🏳️</span>}
      </div>
      <div className="text-center shrink-0 w-20">
        {match.is_completed ? (
          <div>
            <p className="font-bold text-base tabular-nums leading-tight">{match.home_goals} – {match.away_goals}</p>
            {hasPens && <p className="text-[10px] text-muted-foreground mt-0.5">pens {match.home_penalty_goals}–{match.away_penalty_goals}</p>}
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-muted-foreground">vs</p>
            {match.match_date && <p className="text-xs text-muted-foreground">{formatTime(match.match_date)}</p>}
          </div>
        )}
      </div>
      <div className="flex-1 flex items-center gap-2">
        {match.away_team ? <FlagImg emoji={match.away_team.flag} size={22} /> : <span className="text-lg">🏳️</span>}
        <span className="text-sm font-medium text-foreground hidden sm:block">{awayName}</span>
        <span className="text-sm font-medium text-foreground sm:hidden">{awayName.split(' ').slice(-1)[0]}</span>
      </div>
      <span className="text-[11px] text-muted-foreground shrink-0 hidden md:block w-20 text-right">{STAGE_LABELS[match.stage]}</span>
    </div>
  )
}

// ─── Bracket match card ────────────────────────────────────────────────────────
function BracketTeamRow({ team, goals, isCompleted, isWinner }: { team: Team | null; goals: number | null; isCompleted: boolean; isWinner: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-[7px] ${isWinner ? 'bg-emerald-50' : ''}`}>
      {team ? <FlagImg emoji={team.flag} size={14} /> : <span className="text-sm opacity-30">🏳️</span>}
      <span className={`text-[11px] flex-1 min-w-0 truncate ${isWinner ? 'font-semibold text-foreground' : team ? 'text-foreground' : 'text-muted-foreground/50'}`}>
        {team?.name ?? 'TBD'}
      </span>
      {isCompleted && <span className={`text-[11px] font-bold tabular-nums ${isWinner ? 'text-emerald-600' : 'text-muted-foreground'}`}>{goals}</span>}
    </div>
  )
}

function BracketCard({ match }: { match: MatchRow | null }) {
  if (!match) {
    return (
      <div className="w-40 rounded-lg border border-dashed border-border overflow-hidden bg-muted/20">
        <div className="px-2.5 py-[7px] text-[11px] text-muted-foreground/40">TBD</div>
        <div className="px-2.5 py-[7px] border-t border-dashed border-border text-[11px] text-muted-foreground/40">TBD</div>
        <div className="border-t border-dashed border-border bg-muted/10 px-2.5 py-1 text-[10px] text-muted-foreground/30">—</div>
      </div>
    )
  }

  const homeWin = match.is_completed && (match.home_goals ?? 0) > (match.away_goals ?? 0)
  const awayWin = match.is_completed && (match.away_goals ?? 0) > (match.home_goals ?? 0)
  const hasPens = match.home_penalty_goals > 0 || match.away_penalty_goals > 0

  return (
    <div className="w-40 rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <BracketTeamRow team={match.home_team} goals={match.home_goals} isCompleted={match.is_completed} isWinner={homeWin} />
      <div className="border-t border-border">
        <BracketTeamRow team={match.away_team} goals={match.away_goals} isCompleted={match.is_completed} isWinner={awayWin} />
      </div>
      <div className="border-t border-border bg-muted/30 px-2.5 py-1 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{match.match_date ? formatDate(match.match_date) : 'TBD'}</span>
        {hasPens && <span className="text-[10px] text-muted-foreground">pens {match.home_penalty_goals}–{match.away_penalty_goals}</span>}
      </div>
    </div>
  )
}

// ─── One round column ──────────────────────────────────────────────────────────
function BracketRound({ matches, isLast }: { stage: string; matches: (MatchRow | null)[]; isLast: boolean }) {
  const count = matches.length
  const slotH = TOTAL_H / count // height allocated to each match in this round

  return (
    <div className="flex flex-col shrink-0" style={{ height: TOTAL_H }}>
      {matches.map((match, i) => {
        const isEven = i % 2 === 0
        // Connector: right-side arm joining pairs into the next round
        const showConnector = !isLast

        return (
          <div key={i} className="relative flex items-center" style={{ height: slotH }}>
            {/* Match card — centered in its slot */}
            <div className="flex items-center justify-center w-full">
              <BracketCard match={match} />
            </div>

            {showConnector && (
              <>
                {/* Horizontal arm from card to vertical spine */}
                <div
                  className="absolute right-0 bg-border"
                  style={{ top: '50%', height: 1, width: 16 }}
                />
                {/* Vertical spine: drawn on the even slot, spans to the odd slot below */}
                {isEven && (
                  <div
                    className="absolute bg-border"
                    style={{ top: '50%', right: 0, width: 1, height: slotH }}
                  />
                )}
                {/* Horizontal arm from spine to next column — drawn on the odd slot at the midpoint between pair */}
                {!isEven && (
                  <div
                    className="absolute bg-border"
                    style={{ bottom: '50%', right: -16, height: 1, width: 16 }}
                  />
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Full bracket view ─────────────────────────────────────────────────────────
function BracketView({ all }: { all: MatchRow[] }) {
  const knockout = all.filter((m) => KNOCKOUT_STAGES.includes(m.stage))

  if (knockout.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Trophy className="h-10 w-10 mx-auto mb-4 opacity-20" />
        <p className="font-medium text-foreground">Knockout bracket not yet available</p>
        <p className="text-sm mt-1 mb-6">Teams are set after the group stage concludes.</p>
        <div className="max-w-xs mx-auto space-y-2">
          {KNOCKOUT_STAGES.map((stage) => (
            <div key={stage} className="flex items-center justify-between px-4 py-2.5 bg-card border border-border rounded-lg">
              <span className="text-sm font-medium text-foreground">{ROUND_LABELS[stage]}</span>
              <span className="text-xs text-muted-foreground">{ROUND_COUNTS[stage]} matches</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const rounds = KNOCKOUT_STAGES.map((stage) => {
    const count = ROUND_COUNTS[stage]
    const played = knockout.filter((m) => m.stage === stage)
    // Pad with nulls for unplayed/upcoming slots
    const slots: (MatchRow | null)[] = Array.from({ length: count }, (_, i) => played[i] ?? null)
    return { stage, slots }
  })

  return (
    <div className="overflow-x-auto pb-4">
      {/* Column headers */}
      <div className="flex mb-3" style={{ minWidth: `${KNOCKOUT_STAGES.length * 192}px` }}>
        {KNOCKOUT_STAGES.map((stage) => (
          <div key={stage} className="text-center" style={{ width: 192 }}>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {ROUND_LABELS[stage]}
            </span>
          </div>
        ))}
      </div>

      {/* Bracket columns */}
      <div className="flex" style={{ minWidth: `${KNOCKOUT_STAGES.length * 192}px` }}>
        {rounds.map(({ stage, slots }, ri) => (
          <div key={stage} style={{ width: 192 }}>
            <BracketRound
              stage={stage}
              matches={slots}
              isLast={ri === rounds.length - 1}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export function Matches() {
  const [all, setAll] = useState<MatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'completed' | 'bracket'>('upcoming')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('matches').select(MATCH_SELECT).order('match_date')
    setAll((data ?? []) as unknown as MatchRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    const iv = setInterval(() => void load(), 60_000)
    return () => clearInterval(iv)
  }, [load])

  const upcoming = all.filter((m) => !m.is_completed)
  const completed = [...all.filter((m) => m.is_completed)].reverse()
  const upcomingGroups = groupByDate(upcoming)
  const completedGroups = groupByDate(completed)
  const knockoutCount = all.filter((m) => KNOCKOUT_STAGES.includes(m.stage)).length

  const tabs = [
    { key: 'upcoming' as const, label: 'Upcoming', icon: <Calendar className="h-3.5 w-3.5" />, count: upcoming.length, cs: 'bg-muted text-muted-foreground' },
    { key: 'completed' as const, label: 'Results', icon: <CheckCircle className="h-3.5 w-3.5" />, count: completed.length, cs: 'bg-emerald-100 text-emerald-700' },
    { key: 'bracket' as const, label: 'Bracket', icon: <Trophy className="h-3.5 w-3.5" />, count: knockoutCount, cs: 'bg-amber-100 text-amber-700' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-0 border-b border-border">
          {tabs.map(({ key, label, icon, count, cs }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {icon}
              {label}
              {count > 0 && <span className={`text-[11px] rounded-full px-1.5 py-0.5 leading-none ${cs}`}>{count}</span>}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && all.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">Loading matches…</div>
      ) : tab === 'bracket' ? (
        <BracketView all={all} />
      ) : tab === 'upcoming' ? (
        upcomingGroups.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p className="font-medium text-foreground">No upcoming matches yet</p>
            <p className="text-sm mt-1">Check back after the first sync.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingGroups.map(([date, matches]) => (
              <div key={date} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{date}</p>
                </div>
                {matches.map((m) => <MatchCard key={m.id} match={m} />)}
              </div>
            ))}
          </div>
        )
      ) : completedGroups.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CheckCircle className="h-10 w-10 mx-auto mb-4 opacity-20" />
          <p className="font-medium text-foreground">No results yet</p>
          <p className="text-sm mt-1">Tournament starts June 11, 2026.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedGroups.map(([date, matches]) => (
            <div key={date} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{date}</p>
              </div>
              {matches.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
