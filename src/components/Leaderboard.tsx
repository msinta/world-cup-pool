import { useEffect, useState, useCallback } from 'react'
import { Trophy, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { calcAdvancementPoints, calcMatchPoints, ENTRY_FEE, PRIZE_SPLIT } from '@/types'
import type { Team, TeamAdvancement, Match, Participant } from '@/types'
import { Button } from '@/components/ui/button'
import { FlagImg } from '@/components/ui/flag-img'

interface EntryTeamRow {
  id: string
  team: Team
}

interface EntryRow {
  id: string
  entry_name: string
  created_at: string
  participant: Participant | null
  entry_teams: EntryTeamRow[]
}

interface TeamScore {
  team: Team
  advPts: number
  matchPts: number
  goalsScored: number
  total: number
}

interface EntryResult {
  entry: EntryRow
  teamScores: TeamScore[]
  totalPoints: number
  totalGoals: number
}

const RANK_STYLES = ['text-amber-500', 'text-slate-400', 'text-amber-700']
const RANK_BG = ['bg-amber-50 border-amber-200', 'bg-slate-50 border-slate-200', 'bg-orange-50 border-orange-200']

export function Leaderboard() {
  const [results, setResults] = useState<EntryResult[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: entries, error: e1 }, { data: advs, error: e2 }, { data: matches, error: e3 }] =
        await Promise.all([
          supabase
            .from('entries')
            .select(
              'id, entry_name, created_at, participant:participants(id, name, access_code, created_at), entry_teams(id, team:teams(id, name, flag, level, created_at))',
            )
            .order('created_at'),
          supabase.from('team_advancement').select('*'),
          supabase.from('matches').select('*').eq('is_completed', true),
        ])

      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3

      const advMap = new Map<string, TeamAdvancement>(
        (advs ?? []).map((a: TeamAdvancement) => [a.team_id, a]),
      )

      const teamMatches = new Map<string, Match[]>()
      for (const m of (matches ?? []) as Match[]) {
        for (const tid of [m.home_team_id, m.away_team_id]) {
          if (!teamMatches.has(tid)) teamMatches.set(tid, [])
          teamMatches.get(tid)!.push(m)
        }
      }

      const entryResults: EntryResult[] = ((entries ?? []) as unknown as EntryRow[]).map((entry) => {
        const teamScores: TeamScore[] = entry.entry_teams
          .sort((a, b) => a.team.level - b.team.level)
          .map(({ team }) => {
            const advPts = calcAdvancementPoints(advMap.get(team.id))
            let matchPts = 0
            let goalsScored = 0
            for (const match of teamMatches.get(team.id) ?? []) {
              const r = calcMatchPoints(team.id, match)
              matchPts += r.resultPts
              goalsScored += r.goalsScored
            }
            return { team, advPts, matchPts, goalsScored, total: advPts + matchPts }
          })

        const totalPoints = teamScores.reduce((s, t) => s + t.total, 0)
        const totalGoals = teamScores.reduce((s, t) => s + t.goalsScored, 0)
        return { entry, teamScores, totalPoints, totalGoals }
      })

      entryResults.sort((a, b) => b.totalPoints - a.totalPoints || b.totalGoals - a.totalGoals)
      setResults(entryResults)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const iv = setInterval(() => void load(), 30_000)
    return () => clearInterval(iv)
  }, [load])

  const totalPrize = results.length * ENTRY_FEE
  const prizes = [
    Math.floor(totalPrize * PRIZE_SPLIT.first),
    Math.floor(totalPrize * PRIZE_SPLIT.second),
    Math.floor(totalPrize * PRIZE_SPLIT.third),
  ]

  return (
    <div className="space-y-6">
      {/* Prize Pool */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '1st Place', emoji: '🥇', value: prizes[0], pct: '60%', style: 'border-amber-200 bg-gradient-to-b from-amber-50 to-white' },
          { label: '2nd Place', emoji: '🥈', value: prizes[1], pct: '30%', style: 'border-slate-200 bg-gradient-to-b from-slate-50 to-white' },
          { label: '3rd Place', emoji: '🥉', value: prizes[2], pct: '10%', style: 'border-orange-200 bg-gradient-to-b from-orange-50 to-white' },
        ].map((p) => (
          <div key={p.label} className={`rounded-xl border p-4 text-center ${p.style}`}>
            <p className="text-2xl mb-1">{p.emoji}</p>
            <p className="text-xl font-bold text-foreground">${p.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{p.pct} of ${totalPrize}</p>
            <p className="text-[11px] text-muted-foreground">{p.label}</p>
          </div>
        ))}
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {results.length} {results.length === 1 ? 'entry' : 'entries'}
          {results.length > 0 && <span className="ml-1">· ${totalPrize} prize pool</span>}
        </p>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Entry list */}
      {loading && results.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">Loading standings…</div>
      ) : results.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Trophy className="h-10 w-10 mx-auto mb-4 opacity-20" />
          <p className="font-medium text-foreground">No entries yet</p>
          <p className="text-sm mt-1">Head to Entries to be the first!</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
          {results.map((item, i) => {
            const isExpanded = expanded === item.entry.id
            const hasPoints = item.totalPoints > 0
            const name = item.entry.participant?.name ?? '—'
            const entryLabel = item.entry.entry_name

            return (
              <div key={item.entry.id} className={i < 3 && hasPoints ? RANK_BG[i] + ' border-l-2' : ''}>
                <button
                  className="w-full text-left hover:bg-black/[0.02] transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : item.entry.id)}
                >
                  <div className="px-4 py-3.5 flex items-center gap-3">
                    {/* Rank */}
                    <div className={`w-8 shrink-0 text-center font-bold text-sm ${i < 3 && hasPoints ? RANK_STYLES[i] : 'text-muted-foreground'}`}>
                      {hasPoints ? (i < 3 ? ['1st', '2nd', '3rd'][i] : `${i + 1}th`) : `—`}
                    </div>

                    {/* Name + teams */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span className="font-medium text-foreground truncate">{name}</span>
                        {entryLabel && (
                          <span className="text-xs text-muted-foreground truncate">{entryLabel}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.teamScores.map(({ team, total }) => (
                          <span
                            key={team.id}
                            className="inline-flex items-center gap-1 bg-background border border-border rounded-md px-1.5 py-0.5"
                          >
                            <FlagImg emoji={team.flag} size={16} />
                            <span className="text-[11px] text-muted-foreground hidden sm:inline">{team.name}</span>
                            {total > 0 && (
                              <span className="text-[11px] font-semibold text-emerald-600">+{total}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <p className="text-2xl font-bold text-foreground tabular-nums">{item.totalPoints}</p>
                        <p className="text-[11px] text-muted-foreground text-right">pts</p>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 bg-background/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {item.teamScores.map(({ team, advPts, matchPts, total }) => (
                        <div key={team.id} className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg bg-card border border-border">
                          <span className="text-[10px] text-muted-foreground w-10 shrink-0">Tier {team.level}</span>
                          <FlagImg emoji={team.flag} size={18} />
                          <span className="text-sm flex-1 min-w-0 truncate">{team.name}</span>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            {matchPts > 0 && (
                              <span className="text-emerald-600 font-medium">+{matchPts}</span>
                            )}
                            {advPts > 0 && (
                              <span className="text-blue-600 font-medium">+{advPts}</span>
                            )}
                            {total === 0 && (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                          <span className="text-sm font-semibold w-8 text-right tabular-nums">
                            {total > 0 ? `${total}` : '0'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 px-1">
                      <span className="text-emerald-600 font-medium">green</span> = match pts ·{' '}
                      <span className="text-blue-600 font-medium">blue</span> = advancement pts
                      {item.totalGoals > 0 && ` · ${item.totalGoals} goals scored (tiebreaker)`}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
