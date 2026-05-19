import { useEffect, useState, useCallback } from 'react'
import { Trophy, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { calcTeamPoints, ENTRY_FEE } from '@/types'
import type { Team, TeamAdvancement, Participant } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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

interface EntryWithPoints {
  entry: EntryRow
  teams: Array<{ team: Team; points: number }>
  totalPoints: number
}

export function Leaderboard() {
  const [data, setData] = useState<EntryWithPoints[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: entries, error: e1 }, { data: advs, error: e2 }] = await Promise.all([
        supabase
          .from('entries')
          .select('id, entry_name, created_at, participant:participants(id, name, access_code, created_at), entry_teams(id, team:teams(id, name, flag, level, created_at))')
          .order('created_at'),
        supabase.from('team_advancement').select('*'),
      ])

      if (e1) throw e1
      if (e2) throw e2

      const advMap = new Map<string, TeamAdvancement>(
        (advs ?? []).map((a: TeamAdvancement) => [a.team_id, a]),
      )

      const withPoints: EntryWithPoints[] = ((entries ?? []) as unknown as EntryRow[]).map(
        (entry) => {
          const teams = entry.entry_teams
            .map(({ team }) => ({ team, points: calcTeamPoints(advMap.get(team.id)) }))
            .sort((a, b) => a.team.level - b.team.level)
          const totalPoints = teams.reduce((s, t) => s + t.points, 0)
          return { entry, teams, totalPoints }
        },
      )

      withPoints.sort((a, b) => b.totalPoints - a.totalPoints)
      setData(withPoints)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const iv = setInterval(() => void load(), 30_000)
    return () => clearInterval(iv)
  }, [load])

  const medal = (i: number) => {
    if (i === 0) return '🥇'
    if (i === 1) return '🥈'
    if (i === 2) return '🥉'
    return `#${i + 1}`
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Prize Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${data.length * ENTRY_FEE}</p>
            <p className="text-xs text-muted-foreground">
              {data.length} {data.length === 1 ? 'entry' : 'entries'} × ${ENTRY_FEE}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.length}</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leader</CardTitle>
          </CardHeader>
          <CardContent>
            {data[0] ? (
              <>
                <p className="text-lg font-bold truncate">
                  {data[0].entry.participant?.name ?? data[0].entry.entry_name}
                </p>
                <p className="text-xs text-muted-foreground">{data[0].totalPoints} pts</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Standings */}
      {loading && data.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Loading standings…</div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No entries yet. Be the first to submit!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item, i) => (
            <Card
              key={item.entry.id}
              className={i === 0 ? 'border-yellow-400 border-2 shadow-md' : ''}
            >
              <CardContent className="py-4 px-5">
                <div className="flex items-start gap-3">
                  <span className="text-xl w-8 text-center shrink-0 mt-0.5">{medal(i)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-semibold">
                        {item.entry.participant?.name ?? '—'}
                      </span>
                      {item.entry.entry_name && (
                        <span className="text-sm text-muted-foreground">
                          {item.entry.entry_name}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.teams.map(({ team, points }) => (
                        <span
                          key={team.id}
                          className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2.5 py-0.5"
                        >
                          <span>{team.flag}</span>
                          <span>{team.name}</span>
                          {points > 0 && (
                            <span className="text-green-600 font-bold">+{points}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-2xl font-bold">{item.totalPoints}</p>
                    <p className="text-xs text-muted-foreground">pts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
