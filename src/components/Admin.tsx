import { useEffect, useState, useCallback } from 'react'
import { Shield, Trash2, Plus, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { calcTeamPoints, LEVEL_LABELS, STAGE_LABELS } from '@/types'
import type { Team, TeamAdvancement, AdvancementKey, Stage, Participant } from '@/types'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ADV_KEYS: AdvancementKey[] = [
  'advanced_to_round_32',
  'advanced_to_round_16',
  'advanced_to_quarters',
  'advanced_to_semis',
  'advanced_to_final',
  'won_world_cup',
]

const ADV_LABELS: Record<AdvancementKey, string> = {
  advanced_to_round_32: 'R32',
  advanced_to_round_16: 'R16',
  advanced_to_quarters: 'QF',
  advanced_to_semis: 'SF',
  advanced_to_final: 'Fin',
  won_world_cup: 'W',
}

const STAGES: Stage[] = [
  'group',
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'final',
]

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
  is_completed: boolean
  match_date: string | null
  home_team: Team
  away_team: Team
}

// --- PIN Gate ---
function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const tryUnlock = () => {
    const expected = import.meta.env.VITE_ADMIN_PIN as string
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

// --- Advancement Tab ---
function AdvancementPanel() {
  const [teams, setTeams] = useState<Team[]>([])
  const [advMap, setAdvMap] = useState<Map<string, TeamAdvancement>>(new Map())
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [{ data: t }, { data: a }] = await Promise.all([
      supabase.from('teams').select('*').order('level').order('name'),
      supabase.from('team_advancement').select('*'),
    ])
    setTeams(t ?? [])
    const m = new Map<string, TeamAdvancement>((a ?? []).map((r: TeamAdvancement) => [r.team_id, r]))
    setAdvMap(m)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const getAdv = (teamId: string): TeamAdvancement =>
    advMap.get(teamId) ?? {
      team_id: teamId,
      advanced_to_round_32: false,
      advanced_to_round_16: false,
      advanced_to_quarters: false,
      advanced_to_semis: false,
      advanced_to_final: false,
      won_world_cup: false,
      updated_at: new Date().toISOString(),
    }

  const toggle = (teamId: string, key: AdvancementKey, value: boolean) => {
    const current = getAdv(teamId)
    const updated = { ...current }

    const idx = ADV_KEYS.indexOf(key)
    if (value) {
      // Check all keys up to and including this one
      for (let i = 0; i <= idx; i++) updated[ADV_KEYS[i]] = true
    } else {
      // Uncheck this key and all after it
      for (let i = idx; i < ADV_KEYS.length; i++) updated[ADV_KEYS[i]] = false
    }

    setAdvMap((prev) => new Map(prev).set(teamId, updated))
    setDirty((prev) => new Set(prev).add(teamId))
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const toSave = [...dirty].map((id) => ({ ...getAdv(id), updated_at: new Date().toISOString() }))
      const { error } = await supabase.from('team_advancement').upsert(toSave, { onConflict: 'team_id' })
      if (error) throw error
      setDirty(new Set())
      toast({ title: 'Advancement saved', variant: 'success' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error saving'
      toast({ title: 'Save failed', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const grouped: Record<number, Team[]> = {}
  for (const team of teams) {
    if (!grouped[team.level]) grouped[team.level] = []
    grouped[team.level].push(team)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Toggle rounds advanced. Changes are cascading.
        </p>
        {dirty.size > 0 && (
          <Button size="sm" onClick={() => void saveAll()} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving…' : `Save ${dirty.size} change${dirty.size > 1 ? 's' : ''}`}
          </Button>
        )}
      </div>

      {[1, 2, 3, 4, 5, 6].map((level) => (
        <div key={level}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">{LEVEL_LABELS[level]}</h3>
          <div className="space-y-1">
            {(grouped[level] ?? []).map((team) => {
              const adv = getAdv(team.id)
              const pts = calcTeamPoints(adv)
              return (
                <div
                  key={team.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${dirty.has(team.id) ? 'bg-yellow-50 border border-yellow-200' : 'bg-muted/40'}`}
                >
                  <span className="w-6 text-base">{team.flag}</span>
                  <span className="w-28 truncate font-medium">{team.name}</span>
                  <span className="text-xs text-muted-foreground w-12">
                    {pts > 0 ? `${pts} pts` : ''}
                  </span>
                  <div className="flex gap-1 ml-auto">
                    {ADV_KEYS.map((key) => (
                      <button
                        key={key}
                        onClick={() => toggle(team.id, key, !adv[key])}
                        className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                          adv[key]
                            ? 'bg-green-500 text-white border-green-600'
                            : 'bg-background text-muted-foreground border-border'
                        }`}
                      >
                        {ADV_LABELS[key]}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Entries Tab ---
const TIERS = [1, 2, 3, 4, 5, 6]
type Picks = Record<number, [string, string]>
const EMPTY_PICKS: Picks = { 1: ['', ''], 2: ['', ''], 3: ['', ''], 4: ['', ''], 5: ['', ''], 6: ['', ''] }

function EntriesPanel() {
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [editingEntry, setEditingEntry] = useState<EntryRow | null>(null)
  const [editPicks, setEditPicks] = useState<Picks>(EMPTY_PICKS)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data, error }, { data: t }] = await Promise.all([
      supabase
        .from('entries')
        .select(
          'id, entry_name, created_at, participant:participants(id, name, access_code, created_at), entry_teams(id, team:teams(id, name, flag, level, created_at))',
        )
        .order('created_at'),
      supabase.from('teams').select('*').order('level').order('name'),
    ])
    if (!error) setEntries((data ?? []) as unknown as EntryRow[])
    setAllTeams(t ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const openEdit = (entry: EntryRow) => {
    const picks: Picks = { 1: ['', ''], 2: ['', ''], 3: ['', ''], 4: ['', ''], 5: ['', ''], 6: ['', ''] }
    const byTier: Record<number, string[]> = {}
    for (const et of entry.entry_teams) {
      if (!byTier[et.team.level]) byTier[et.team.level] = []
      byTier[et.team.level].push(et.team.id)
    }
    for (const tier of TIERS) {
      picks[tier] = [byTier[tier]?.[0] ?? '', byTier[tier]?.[1] ?? ''] as [string, string]
    }
    setEditPicks(picks)
    setEditingEntry(entry)
  }

  const setEditPick = (tier: number, slot: 0 | 1, value: string) => {
    setEditPicks((prev) => {
      const pair: [string, string] = [...prev[tier]] as [string, string]
      pair[slot] = value
      return { ...prev, [tier]: pair }
    })
  }

  const saveEdit = async () => {
    if (!editingEntry) return
    for (const tier of TIERS) {
      const [a, b] = editPicks[tier]
      if (!a || !b) { toast({ title: `Select 2 teams for Tier ${tier}`, variant: 'destructive' }); return }
      if (a === b) { toast({ title: `Pick 2 different teams in Tier ${tier}`, variant: 'destructive' }); return }
    }
    setSaving(true)
    try {
      const { error: de } = await supabase.from('entry_teams').delete().eq('entry_id', editingEntry.id)
      if (de) throw de
      const newTeams = TIERS.flatMap((tier) =>
        editPicks[tier].map((teamId) => ({ entry_id: editingEntry.id, team_id: teamId })),
      )
      const { error: ie } = await supabase.from('entry_teams').insert(newTeams)
      if (ie) throw ie
      toast({ title: 'Entry updated', variant: 'success' })
      setEditingEntry(null)
      void load()
    } catch (err) {
      toast({ title: 'Error saving', description: err instanceof Error ? err.message : 'Unknown', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

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
    <>
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
                  {entry.entry_name && (
                    <p className="text-sm text-muted-foreground">{entry.entry_name}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEdit(entry)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => void deleteEntry(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {TIERS.map((tier) => {
                  const tierTeams = sorted.filter((et) => et.team.level === tier)
                  return (
                    <div key={tier} className="bg-muted/50 rounded-md px-2 py-1.5">
                      <p className="text-xs text-muted-foreground mb-1">Tier {tier}</p>
                      {tierTeams.map(({ team }) => (
                        <p key={team.id} className="text-xs">
                          {team.flag} {team.name}
                        </p>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(o) => { if (!o) setEditingEntry(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Entry — {editingEntry?.participant?.name}
              {editingEntry?.entry_name ? ` · ${editingEntry.entry_name}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {TIERS.map((tier) => (
              <div key={tier} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {LEVEL_LABELS[tier]}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {([0, 1] as const).map((slot) => (
                    <Select key={slot} value={editPicks[tier][slot]} onValueChange={(v) => setEditPick(tier, slot, v)}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder={`Team ${slot + 1}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {allTeams.filter((t) => t.level === tier).map((team) => (
                          <SelectItem
                            key={team.id}
                            value={team.id}
                            disabled={editPicks[tier][slot === 0 ? 1 : 0] === team.id}
                          >
                            {team.flag} {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditingEntry(null)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => void saveEdit()} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// --- Matches Tab ---
function MatchesPanel() {
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Add match form
  const [homeTeamId, setHomeTeamId] = useState('')
  const [awayTeamId, setAwayTeamId] = useState('')
  const [stage, setStage] = useState<Stage>('group')
  const [matchDate, setMatchDate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: m }, { data: t }] = await Promise.all([
      supabase
        .from('matches')
        .select(
          'id, stage, home_goals, away_goals, is_completed, match_date, home_team:teams!matches_home_team_id_fkey(id, name, flag, level, created_at), away_team:teams!matches_away_team_id_fkey(id, name, flag, level, created_at)',
        )
        .order('match_date', { ascending: false }),
      supabase.from('teams').select('*').order('level').order('name'),
    ])
    setMatches((m ?? []) as unknown as MatchRow[])
    setTeams(t ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const addMatch = async () => {
    if (!homeTeamId || !awayTeamId) {
      toast({ title: 'Select both teams', variant: 'destructive' })
      return
    }
    if (homeTeamId === awayTeamId) {
      toast({ title: 'Teams must be different', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    const { error } = await supabase.from('matches').insert({
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      stage,
      match_date: matchDate || null,
    })
    setSubmitting(false)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Match added', variant: 'success' })
    setOpen(false)
    setHomeTeamId('')
    setAwayTeamId('')
    setStage('group')
    setMatchDate('')
    void load()
  }

  const updateScore = async (matchId: string, homeGoals: number, awayGoals: number) => {
    const { error } = await supabase
      .from('matches')
      .update({ home_goals: homeGoals, away_goals: awayGoals, is_completed: true })
      .eq('id', matchId)
    if (error) {
      toast({ title: 'Error updating score', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Score updated', variant: 'success' })
      void load()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Match
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Match</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Home Team</Label>
                <Select value={homeTeamId} onValueChange={setHomeTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select home team…" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.flag} {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Away Team</Label>
                <Select value={awayTeamId} onValueChange={setAwayTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select away team…" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.flag} {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Match Date (optional)</Label>
                <Input
                  type="datetime-local"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => void addMatch()} disabled={submitting}>
                {submitting ? 'Adding…' : 'Add Match'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : matches.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">No matches recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} onUpdateScore={updateScore} />
          ))}
        </div>
      )}
    </div>
  )
}

function MatchCard({
  match,
  onUpdateScore,
}: {
  match: MatchRow
  onUpdateScore: (id: string, home: number, away: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [homeGoals, setHomeGoals] = useState(String(match.home_goals ?? ''))
  const [awayGoals, setAwayGoals] = useState(String(match.away_goals ?? ''))

  return (
    <div className="p-3 rounded-lg border bg-card text-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{STAGE_LABELS[match.stage]}</span>
        {match.match_date && (
          <span className="text-xs text-muted-foreground">
            {new Date(match.match_date).toLocaleDateString()}
          </span>
        )}
        {match.is_completed && (
          <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
            Final
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <span className="flex-1 text-right">
          {match.home_team.flag} {match.home_team.name}
        </span>
        {match.is_completed ? (
          <span className="font-bold text-base">
            {match.home_goals} – {match.away_goals}
          </span>
        ) : editing ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              className="w-14 h-7 text-center"
              value={homeGoals}
              onChange={(e) => setHomeGoals(e.target.value)}
            />
            <span>–</span>
            <Input
              type="number"
              min={0}
              className="w-14 h-7 text-center"
              value={awayGoals}
              onChange={(e) => setAwayGoals(e.target.value)}
            />
            <Button
              size="sm"
              className="h-7 px-2"
              onClick={() => {
                onUpdateScore(match.id, Number(homeGoals), Number(awayGoals))
                setEditing(false)
              }}
            >
              Save
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="h-7" onClick={() => setEditing(true)}>
            Set Score
          </Button>
        )}
        <span className="flex-1">
          {match.away_team.flag} {match.away_team.name}
        </span>
      </div>
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

      <Tabs defaultValue="advancement">
        <TabsList>
          <TabsTrigger value="advancement">Team Advancement</TabsTrigger>
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
        </TabsList>
        <TabsContent value="advancement" className="mt-4">
          <AdvancementPanel />
        </TabsContent>
        <TabsContent value="entries" className="mt-4">
          <EntriesPanel />
        </TabsContent>
        <TabsContent value="matches" className="mt-4">
          <MatchesPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
