import { useEffect, useState, useCallback } from 'react'
import { Trophy, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { calcAdvancementPoints, calcMatchPoints, ENTRY_FEE, PRIZE_SPLIT } from '@/types'
import type { Team, TeamAdvancement, Match, Participant } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

  const medal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '🥇 1st Place', value: `$${prizes[0]}`, sub: '60%' },
          { label: '🥈 2nd Place', value: `$${prizes[1]}`, sub: '30%' },
          { label: '🥉 3rd Place', value: `$${prizes[2]}`, sub: '10%' },
        ].map((p) => (
          <Card key={p.label} className="text-center">
            <CardHeader className="pb-1 pt-4 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">{p.label}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-3">
              <p className="text-xl font-bold">{p.value}</p>
              <p className="text-xs text-muted-foreground">{p.sub} of ${totalPrize}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {results.length} {results.length === 1 ? 'entry' : 'entries'} · $20 each
        </p>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && results.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Loading standings…</div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No entries yet — be the first!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((item, i) => {
            const isExpanded = expanded === item.entry.id
            const hasPoints = item.totalPoints > 0
            const name = item.entry.participant?.name ?? '—'
            const entryLabel = item.entry.entry_name ? ` · ${item.entry.entry_name}` : ''
            return (
              <Card
                key={item.entry.id}
                className={`transition-all ${i === 0 && hasPoints ? 'border-yellow-400 border-2' : ''}`}
              >
                <button
                  className="w-full text-left"
                  onClick={() => setExpanded(isExpanded ? null : item.entry.id)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl w-8 text-center shrink-0">
                        {hasPoints ? medal(i) : `#${i + 1}`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {name}
                          <span className="font-normal text-muted-foreground text-sm">{entryLabel}</span>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {item.teamScores.map(({ team, total }) => (
                            <span
                              key={team.id}
                              className="inline-flex items-center gap-1.5 bg-muted rounded-md px-2 py-1"
                            >
                              <FlagImg emoji={team.flag} size={22} />
                              <span className="text-xs hidden sm:inline">{team.name}</span>
                              {total > 0 && (
                                <span className="text-xs text-green-600 font-bold">+{total}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold">{item.totalPoints}</p>
                        <p className="text-xs text-muted-foreground">pts</p>
                        {item.totalGoals > 0 && (
                          <p className="text-xs text-muted-foreground">{item.totalGoals} gls</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </button>

                {isExpanded && (
                  <CardContent className="pt-0 px-4 pb-4">
                    <div className="border-t pt-3 mt-1 space-y-1">
                      {item.teamScores.map(({ team, advPts, matchPts, total }) => (
                        <div key={team.id} className="flex items-center gap-2 text-sm py-0.5">
                          <span className="text-xs text-muted-foreground w-14 shrink-0">
                            Tier {team.level}
                          </span>
                          <FlagImg emoji={team.flag} size={20} />
                          <span className="flex-1">{team.name}</span>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            {matchPts > 0 && (
                              <span className="text-green-600">+{matchPts} match</span>
                            )}
                            {advPts > 0 && (
                              <span className="text-blue-600">+{advPts} adv</span>
                            )}
                          </div>
                          <Badge
                            variant={total > 0 ? 'success' : 'outline'}
                            className="w-14 justify-center"
                          >
                            {total > 0 ? `+${total}` : total === 0 ? '0' : total}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
