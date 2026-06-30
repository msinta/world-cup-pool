import { useEffect, useState, useCallback } from 'react'
import { Shield, Trash2, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { STAGE_LABELS, picksHidden } from '@/types'
import type { Team, Stage, Participant } from '@/types'
import { fetchWorldCupMatches, mapApiStage, resolveTeamId, buildNameMap } from '@/lib/football-api'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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

// --- PIN Gate ---
function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const tryUnlock = () => {
    const expected = '2026'
    if (pin === expected) {
      onUnlock()
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <div className="flex justify-center py-20">
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              placeholder="Enter admin PIN"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value)
                setError(false)
              }}
              onKeyDown={(e) => e.key === 'Enter' && tryUnlock()}
            />
            {error && <p className="text-sm text-destructive">Incorrect PIN</p>}
          </div>
          <Button className="w-full" onClick={tryUnlock}>
            Unlock
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Entries Tab ---
const TIERS = [1, 2, 3, 4, 5, 6]

function EntriesPanel() {
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('entries')
      .select('id, entry_name, created_at, participant:participants(id, name, access_code, created_at), entry_teams(id, team:teams(id, name, flag, level, created_at))')
      .order('created_at')
    if (!error) setEntries((data ?? []) as unknown as EntryRow[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const deleteEntry = async (entryId: string) => {
    if (!confirm('Delete this entry? This cannot be undone.')) return
    const { error: e1 } = await supabase.from('entry_teams').delete().eq('entry_id', entryId)
    if (e1) { toast({ title: 'Error', description: e1.message, variant: 'destructive' }); return }
    const { error: e2 } = await supabase.from('entries').delete().eq('id', entryId)
    if (e2) { toast({ title: 'Error', description: e2.message, variant: 'destructive' }); return }
    toast({ title: 'Entry deleted', variant: 'success' })
    void load()
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading…</div>

  return (
    <div className="space-y-3">
      {entries.length === 0 && (
        <p className="text-center py-12 text-muted-foreground">No entries yet.</p>
      )}
      {entries.map((entry) => {
        const sorted = [...entry.entry_teams].sort((a, b) => a.team.level - b.team.level)
        return (
          <div key={entry.id} className="p-3 rounded-lg border bg-card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{entry.participant?.name ?? '—'}</p>
                {entry.entry_name && <p className="text-sm text-muted-foreground">{entry.entry_name}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => void deleteEntry(entry.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {picksHidden() ? (
              <p className="text-xs text-muted-foreground pt-1">Picks hidden until June 11 at 3 PM EDT.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {TIERS.map((tier) => {
                  const tierTeams = sorted.filter((et) => et.team.level === tier)
                  return (
                    <div key={tier} className="bg-muted/50 rounded-md px-2 py-1.5">
                      <p className="text-xs text-muted-foreground mb-1">Tier {tier}</p>
                      {tierTeams.map(({ team }) => (
                        <div key={team.id} className="flex items-center gap-1.5 mb-0.5">
                          <FlagImg emoji={team.flag} size={16} />
                          <p className="text-xs">{team.name}</p>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// --- API Sync Tab ---
function MatchCard({ match }: { match: MatchRow }) {
  const hasPens = match.home_penalty_goals > 0 || match.away_penalty_goals > 0
  return (
    <div className="p-3 rounded-lg border bg-card text-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>{STAGE_LABELS[match.stage]}</span>
        <div className="flex items-center gap-2">
          {match.match_date && <span>{new Date(match.match_date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
          {match.is_completed && <Badge variant="success" className="text-xs">Final</Badge>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex-1 flex items-center justify-end gap-1.5 text-right">
          {match.home_team?.name ?? 'TBD'}
          {match.home_team && <FlagImg emoji={match.home_team.flag} size={18} />}
        </span>
        <span className="font-bold text-base w-20 text-center shrink-0">
          {match.is_completed
            ? `${match.home_goals ?? '-'} – ${match.away_goals ?? '-'}${hasPens ? ` (${match.home_penalty_goals}–${match.away_penalty_goals} pens)` : ''}`
            : 'vs'}
        </span>
        <span className="flex-1 flex items-center gap-1.5">
          {match.away_team && <FlagImg emoji={match.away_team.flag} size={18} />}
          {match.away_team?.name ?? 'TBD'}
        </span>
      </div>
    </div>
  )
}

function ApiSyncPanel() {
  const [syncing, setSyncing] = useState(false)
  const [upcoming, setUpcoming] = useState<MatchRow[]>([])
  const [completed, setCompleted] = useState<MatchRow[]>([])
  const [loading, setLoading] = useState(true)

  const MATCH_SELECT = 'id, stage, home_goals, away_goals, home_penalty_goals, away_penalty_goals, is_completed, match_date, home_team:teams!matches_home_team_id_fkey(id, name, flag, level, created_at), away_team:teams!matches_away_team_id_fkey(id, name, flag, level, created_at)'

  const load = useCallback(async () => {
    setLoading(true)
    const { data: m } = await supabase
      .from('matches')
      .select(MATCH_SELECT)
      .order('match_date')
    const all = (m ?? []) as unknown as MatchRow[]
    setCompleted(all.filter((x) => x.is_completed).reverse())
    setUpcoming(all.filter((x) => !x.is_completed))
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const sync = async () => {
    setSyncing(true)
    try {
      const apiMatches = await fetchWorldCupMatches()
      const [{ data: dbTeams }, { data: existingCompleted }] = await Promise.all([
        supabase.from('teams').select('id, name'),
        supabase.from('matches').select('external_id').eq('is_completed', true),
      ])
      const nameMap = buildNameMap((dbTeams ?? []) as { id: string; name: string }[])
      const completedIds = new Set((existingCompleted ?? []).map((r: { external_id: string }) => r.external_id))

      let synced = 0
      const advancement = new Map<string, Set<Stage>>()
      const finalWinners: string[] = []

      // Winning a knockout match = advancing to the next stage
      const NEXT_STAGE: Partial<Record<Stage, Stage>> = {
        round_of_32: 'round_of_16',
        round_of_16: 'quarter_final',
        quarter_final: 'semi_final',
        semi_final: 'final',
      }

      for (const m of apiMatches) {
        const stage = mapApiStage(m.stage)
        if (!stage) continue

        const homeId = resolveTeamId(m.homeTeam?.name, m.homeTeam?.shortName, nameMap)
        const awayId = resolveTeamId(m.awayTeam?.name, m.awayTeam?.shortName, nameMap)

        // Store TBD knockout matches (known date, unknown teams) so they show in upcoming/bracket
        if (!homeId && !awayId && stage !== 'group') {
          await supabase.from('matches').upsert({
            external_id: String(m.id),
            home_team_id: null,
            away_team_id: null,
            stage,
            match_date: m.utcDate,
            is_completed: false,
            home_goals: null,
            away_goals: null,
            home_penalty_goals: 0,
            away_penalty_goals: 0,
          }, { onConflict: 'external_id' })
          synced++
          continue
        }

        if (!homeId || !awayId) continue

        const isFinished = m.status === 'FINISHED'
        const extId = String(m.id)
        // Don't overwrite scores on already-completed matches — protects manually corrected data
        // when the API returns incorrect fullTime/penalty values.
        const alreadyDone = completedIds.has(extId)
        const rec = alreadyDone ? {
          external_id: extId,
          home_team_id: homeId,
          away_team_id: awayId,
          stage,
          match_date: m.utcDate,
          is_completed: true,
        } : {
          external_id: extId,
          home_team_id: homeId,
          away_team_id: awayId,
          stage,
          match_date: m.utcDate,
          is_completed: isFinished,
          home_goals: m.score?.fullTime?.home ?? null,
          away_goals: m.score?.fullTime?.away ?? null,
          home_penalty_goals: m.score?.penalties?.home ?? 0,
          away_penalty_goals: m.score?.penalties?.away ?? 0,
        }

        const { error } = await supabase.from('matches').upsert(rec, { onConflict: 'external_id' })
        if (!error) synced++

        if (stage !== 'group') {
          // Both teams participated in this stage
          for (const tid of [homeId, awayId]) {
            if (!advancement.has(tid)) advancement.set(tid, new Set())
            advancement.get(tid)!.add(stage)
          }

          // Winner advances to the next stage — inferred from result even before
          // the API assigns the winner to the next-round match
          if (isFinished) {
            const winnerId = m.score?.winner === 'HOME_TEAM' ? homeId
              : m.score?.winner === 'AWAY_TEAM' ? awayId
              : null
            if (winnerId) {
              const next = NEXT_STAGE[stage]
              if (next) {
                if (!advancement.has(winnerId)) advancement.set(winnerId, new Set())
                advancement.get(winnerId)!.add(next)
              }
              if (stage === 'final') finalWinners.push(winnerId)
            }
          }
        }
      }

      // Compute group standings from all completed group matches in the DB.
      // This populates finished_first_in_group / finished_second_in_group even before
      // R32 matches are available from the API.
      const { data: groupMatches } = await supabase
        .from('matches')
        .select('home_team_id, away_team_id, home_goals, away_goals')
        .eq('stage', 'group')
        .eq('is_completed', true)

      const groupFirst = new Set<string>()
      const groupSecond = new Set<string>()

      if (groupMatches && groupMatches.length > 0) {
        // Find groups: teams that played each other are in the same group
        const neighbors = new Map<string, Set<string>>()
        for (const m of groupMatches as { home_team_id: string; away_team_id: string; home_goals: number; away_goals: number }[]) {
          if (!m.home_team_id || !m.away_team_id) continue
          if (!neighbors.has(m.home_team_id)) neighbors.set(m.home_team_id, new Set())
          if (!neighbors.has(m.away_team_id)) neighbors.set(m.away_team_id, new Set())
          neighbors.get(m.home_team_id)!.add(m.away_team_id)
          neighbors.get(m.away_team_id)!.add(m.home_team_id)
        }

        const visited = new Set<string>()
        for (const teamId of neighbors.keys()) {
          if (visited.has(teamId)) continue
          const group: string[] = []
          const queue = [teamId]
          while (queue.length > 0) {
            const t = queue.shift()!
            if (visited.has(t)) continue
            visited.add(t)
            group.push(t)
            for (const n of (neighbors.get(t) ?? [])) {
              if (!visited.has(n)) queue.push(n)
            }
          }

          const gm = groupMatches as { home_team_id: string; away_team_id: string; home_goals: number; away_goals: number }[]
          const standings = group.map((tid) => {
            let pts = 0, gf = 0, ga = 0
            for (const m of gm) {
              const isHome = m.home_team_id === tid
              const isAway = m.away_team_id === tid
              if (!isHome && !isAway) continue
              const teamGoals = isHome ? (m.home_goals ?? 0) : (m.away_goals ?? 0)
              const oppGoals = isHome ? (m.away_goals ?? 0) : (m.home_goals ?? 0)
              gf += teamGoals; ga += oppGoals
              if (teamGoals > oppGoals) pts += 3
              else if (teamGoals === oppGoals) pts += 1
            }
            return { tid, pts, gd: gf - ga, gf }
          }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)

          if (standings[0]) groupFirst.add(standings[0].tid)
          if (standings[1]) groupSecond.add(standings[1].tid)
        }
      }

      // Merge: all teams needing a record are either in knockout matches OR placed 1st/2nd in group
      const allTeams = new Set([...advancement.keys(), ...groupFirst, ...groupSecond])

      for (const teamId of allTeams) {
        const stages = advancement.get(teamId) ?? new Set<Stage>()
        const inFinal = stages.has('final')
        const inSF = stages.has('semi_final') || inFinal
        const inQF = stages.has('quarter_final') || inSF
        const inR16 = stages.has('round_of_16') || inQF
        const inR32 = stages.has('round_of_32') || inR16 || groupFirst.has(teamId) || groupSecond.has(teamId)

        await supabase.from('team_advancement').upsert({
          team_id: teamId,
          advanced_to_round_32: inR32,
          advanced_to_round_16: inR16,
          advanced_to_quarters: inQF,
          advanced_to_semis: inSF,
          advanced_to_final: inFinal,
          won_world_cup: finalWinners.includes(teamId),
          finished_first_in_group: groupFirst.has(teamId),
          finished_second_in_group: groupSecond.has(teamId),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'team_id' })
      }

      toast({ title: `Synced ${synced} matches`, description: 'Advancement + group standings updated.', variant: 'success' })
      void load()
    } catch (err) {
      toast({ title: 'Sync failed', description: err instanceof Error ? err.message : 'Unknown', variant: 'destructive' })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Live Match Data</p>
          <p className="text-xs text-muted-foreground">football-data.org · auto-syncs every 2 hours</p>
        </div>
        <Button size="sm" onClick={() => void sync()} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync Now'}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div>
            <p className="text-sm font-semibold mb-2">Upcoming ({upcoming.length})</p>
            {upcoming.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-4">No upcoming matches synced yet.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.slice(0, 15).map((m) => <MatchCard key={m.id} match={m} />)}
                {upcoming.length > 15 && (
                  <p className="text-xs text-center text-muted-foreground">+{upcoming.length - 15} more</p>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Completed ({completed.length})</p>
            {completed.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-4">No completed matches yet.</p>
            ) : (
              <div className="space-y-2">
                {completed.map((m) => <MatchCard key={m.id} match={m} />)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// --- Main Admin Component ---
export function Admin() {
  const [unlocked, setUnlocked] = useState(false)

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Admin Panel</h2>
      </div>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="matches">Match Sync</TabsTrigger>
        </TabsList>
        <TabsContent value="entries" className="mt-4">
          <EntriesPanel />
        </TabsContent>
        <TabsContent value="matches" className="mt-4">
          <ApiSyncPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
