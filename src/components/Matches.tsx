import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Calendar, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { STAGE_LABELS } from '@/types'
import type { Team, Stage } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    <div className="flex items-center gap-3 py-3 px-4 border-b last:border-0">
      <div className="flex-1 flex items-center justify-end gap-2 text-right">
        <span className="font-medium text-sm hidden sm:block">{match.home_team.name}</span>
        <span className="font-medium text-sm sm:hidden">{match.home_team.name.split(' ').pop()}</span>
        <FlagImg emoji={match.home_team.flag} size={24} />
      </div>

      <div className="text-center shrink-0 w-24">
        {match.is_completed ? (
          <div>
            <p className="font-bold text-lg leading-none">
              {match.home_goals} – {match.away_goals}
            </p>
            {hasPens && (
              <p className="text-xs text-muted-foreground mt-0.5">
                ({match.home_penalty_goals}–{match.away_penalty_goals} pens)
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-muted-foreground">vs</p>
            {match.match_date && (
              <p className="text-xs text-muted-foreground">{formatTime(match.match_date)}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center gap-2">
        <FlagImg emoji={match.away_team.flag} size={24} />
        <span className="font-medium text-sm hidden sm:block">{match.away_team.name}</span>
        <span className="font-medium text-sm sm:hidden">{match.away_team.name.split(' ').pop()}</span>
      </div>

      <Badge variant="outline" className="text-xs shrink-0 hidden sm:flex">
        {STAGE_LABELS[match.stage]}
      </Badge>
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
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setTab('upcoming')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'upcoming' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Upcoming
            {upcoming.length > 0 && (
              <span className="bg-primary/10 text-primary text-xs rounded-full px-1.5">{upcoming.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'completed' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Results
            {completed.length > 0 && (
              <span className="bg-green-100 text-green-700 text-xs rounded-full px-1.5">{completed.length}</span>
            )}
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && upcoming.length === 0 && completed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Loading matches…</div>
      ) : tab === 'upcoming' ? (
        upcomingGroups.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>No upcoming matches yet — check back after the first sync.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingGroups.map(([date, matches]) => (
              <div key={date} className="border rounded-xl overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b">
                  <p className="text-sm font-semibold">{date}</p>
                </div>
                {matches.map((m) => <MatchCard key={m.id} match={m} />)}
              </div>
            ))}
          </div>
        )
      ) : (
        completedGroups.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>No results yet — tournament starts June 11.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {completedGroups.map(([date, matches]) => (
              <div key={date} className="border rounded-xl overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b">
                  <p className="text-sm font-semibold">{date}</p>
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
