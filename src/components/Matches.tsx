import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Calendar, CheckCircle } from 'lucide-react'
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
      {/* Home team */}
      <div className="flex-1 flex items-center justify-end gap-2">
        <span className="text-sm font-medium text-foreground hidden sm:block text-right">{match.home_team.name}</span>
        <span className="text-sm font-medium text-foreground sm:hidden text-right">{match.home_team.name.split(' ').slice(-1)[0]}</span>
        <FlagImg emoji={match.home_team.flag} size={22} />
      </div>

      {/* Score / time */}
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

      {/* Away team */}
      <div className="flex-1 flex items-center gap-2">
        <FlagImg emoji={match.away_team.flag} size={22} />
        <span className="text-sm font-medium text-foreground hidden sm:block">{match.away_team.name}</span>
        <span className="text-sm font-medium text-foreground sm:hidden">{match.away_team.name.split(' ').slice(-1)[0]}</span>
      </div>

      {/* Stage badge */}
      <span className="text-[11px] text-muted-foreground shrink-0 hidden md:block w-20 text-right">
        {STAGE_LABELS[match.stage]}
      </span>
    </div>
  )
}

export function Matches() {
  const [upcoming, setUpcoming] = useState<MatchRow[]>([])
  const [completed, setCompleted] = useState<MatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'completed'>('upcoming')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('matches')
      .select(MATCH_SELECT)
      .order('match_date')
    const all = (data ?? []) as unknown as MatchRow[]
    setUpcoming(all.filter((m) => !m.is_completed))
    setCompleted(all.filter((m) => m.is_completed).reverse())
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    const iv = setInterval(() => void load(), 60_000)
    return () => clearInterval(iv)
  }, [load])

  const upcomingGroups = groupByDate(upcoming)
  const completedGroups = groupByDate(completed)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {/* Tab toggle */}
        <div className="flex gap-0 border-b border-border">
          <button
            onClick={() => setTab('upcoming')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'upcoming'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Upcoming
            {upcoming.length > 0 && (
              <span className="text-[11px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 leading-none">{upcoming.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'completed'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Results
            {completed.length > 0 && (
              <span className="text-[11px] bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5 leading-none">{completed.length}</span>
            )}
          </button>
        </div>

        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && upcoming.length === 0 && completed.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">Loading matches…</div>
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
