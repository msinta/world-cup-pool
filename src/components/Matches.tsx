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
  home_team: Team
  away_team: Team
}

const MATCH_SELECT = 'id, stage, home_goals, away_goals, home_penalty_goals, away_penalty_goals, is_completed, match_date, home_team:teams!matches_home_team_id_fkey(id, name, flag, level, created_at), away_team:teams!matches_away_team_id_fkey(id, name, flag, level, created_at)'

const KNOCKOUT_STAGES: Stage[] = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final']

const STAGE_POINTS: Record<string, string> = {
  round_of_32: '+3 pts to advance',
  round_of_16: '+8 pts to advance',
  quarter_final: '+10 pts to advance',
  semi_final: '+12 pts to advance',
  final: '+15 pts · winner +25 pts',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  })
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

function MatchCard({ match }: { match: MatchRow }) {
  const hasPens = match.home_penalty_goals > 0 || match.away_penalty_goals > 0

  return (
    <div className="flex items-center gap-2 py-3 px-4 border-b last:border-0 hover:bg-black/[0.01] transition-colors">
      <div className="flex-1 flex items-center justify-end gap-2">
        <span className="text-sm font-medium text-foreground hidden sm:block text-right">{match.home_team.name}</span>
        <span className="text-sm font-medium text-foreground sm:hidden text-right">{match.home_team.name.split(' ').slice(-1)[0]}</span>
        <FlagImg emoji={match.home_team.flag} size={22} />
      </div>

      <div className="text-center shrink-0 w-20">
        {match.is_completed ? (
          <div>
            <p className="font-bold text-base tabular-nums leading-tight">
              {match.home_goals} – {match.away_goals}
            </p>
            {hasPens && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                pens {match.home_penalty_goals}–{match.away_penalty_goals}
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-muted-foreground">vs</p>
            {match.match_date && (
              <p className="text-xs text-muted-foreground">{formatTime(match.match_date)}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center gap-2">
        <FlagImg emoji={match.away_team.flag} size={22} />
        <span className="text-sm font-medium text-foreground hidden sm:block">{match.away_team.name}</span>
        <span className="text-sm font-medium text-foreground sm:hidden">{match.away_team.name.split(' ').slice(-1)[0]}</span>
      </div>

      <span className="text-[11px] text-muted-foreground shrink-0 hidden md:block w-20 text-right">
        {STAGE_LABELS[match.stage]}
      </span>
    </div>
  )
}

function BracketView({ all }: { all: MatchRow[] }) {
  const knockout = all.filter((m) => KNOCKOUT_STAGES.includes(m.stage))

  if (knockout.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Trophy className="h-10 w-10 mx-auto mb-4 opacity-20" />
        <p className="font-medium text-foreground">Knockout bracket not yet available</p>
        <p className="text-sm mt-1">Teams will be set after the group stage concludes.</p>
        <div className="mt-6 max-w-sm mx-auto space-y-2">
          {KNOCKOUT_STAGES.map((stage) => (
            <div key={stage} className="flex items-center justify-between px-4 py-2.5 bg-card border border-border rounded-lg text-sm">
              <span className="font-medium text-foreground">{STAGE_LABELS[stage]}</span>
              <span className="text-[11px] text-emerald-600 font-medium">{STAGE_POINTS[stage]}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {KNOCKOUT_STAGES.map((stage) => {
        const stageMatches = knockout.filter((m) => m.stage === stage)
        if (stageMatches.length === 0) return null
        const completed = stageMatches.filter((m) => m.is_completed).length
        return (
          <div key={stage} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{STAGE_LABELS[stage]}</p>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-emerald-600 font-medium">{STAGE_POINTS[stage]}</span>
                {completed > 0 && (
                  <span className="text-[11px] text-muted-foreground">{completed}/{stageMatches.length} played</span>
                )}
              </div>
            </div>
            {stageMatches.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        )
      })}
    </div>
  )
}

export function Matches() {
  const [all, setAll] = useState<MatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'completed' | 'bracket'>('upcoming')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('matches')
      .select(MATCH_SELECT)
      .order('match_date')
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
    { key: 'upcoming' as const, label: 'Upcoming', icon: <Calendar className="h-3.5 w-3.5" />, count: upcoming.length, countStyle: 'bg-muted text-muted-foreground' },
    { key: 'completed' as const, label: 'Results', icon: <CheckCircle className="h-3.5 w-3.5" />, count: completed.length, countStyle: 'bg-emerald-100 text-emerald-700' },
    { key: 'bracket' as const, label: 'Bracket', icon: <Trophy className="h-3.5 w-3.5" />, count: knockoutCount, countStyle: 'bg-amber-100 text-amber-700' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-0 border-b border-border">
          {tabs.map(({ key, label, icon, count, countStyle }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {icon}
              {label}
              {count > 0 && (
                <span className={`text-[11px] rounded-full px-1.5 py-0.5 leading-none ${countStyle}`}>{count}</span>
              )}
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
      ) : (
        completedGroups.length === 0 ? (
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
        )
      )}
    </div>
  )
}
