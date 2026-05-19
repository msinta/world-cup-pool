import { useEffect, useState, useCallback } from 'react'
import { Plus, Users, ChevronDown, ChevronUp, Info, History } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LEVEL_LABELS, TEAMS_PER_TIER, MAX_ENTRIES_PER_PERSON, ENTRY_FEE } from '@/types'
import type { Team, Participant } from '@/types'
import { EditEntry } from '@/components/EditEntry'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const TIERS = [1, 2, 3, 4, 5, 6]
type Picks = Record<number, [string, string]>
const EMPTY_PICKS: Picks = { 1: ['', ''], 2: ['', ''], 3: ['', ''], 4: ['', ''], 5: ['', ''], 6: ['', ''] }

export function Entries() {
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [participantName, setParticipantName] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [entryName, setEntryName] = useState('')
  const [picks, setPicks] = useState<Picks>(EMPTY_PICKS)

  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLabel, setHistoryLabel] = useState('')
  const [historyData, setHistoryData] = useState<{ id: string; changed_at: string; changed_by: string; previous_teams: { team_id: string; team_name: string; flag: string; level: number }[]; new_teams: { team_id: string; team_name: string; flag: string; level: number }[] }[]>([])

  const loadHistory = useCallback(async (entryId: string, label: string) => {
    const { data } = await supabase
      .from('entry_changes')
      .select('*')
      .eq('entry_id', entryId)
      .order('changed_at', { ascending: false })
    setHistoryData((data ?? []) as typeof historyData)
    setHistoryLabel(label)
    setHistoryOpen(true)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: e, error: e1 }, { data: t, error: e2 }] = await Promise.all([
        supabase
          .from('entries')
          .select(
            'id, entry_name, created_at, participant:participants(id, name, access_code, created_at), entry_teams(id, team:teams(id, name, flag, level, created_at))',
          )
          .order('created_at'),
        supabase.from('teams').select('*').order('level').order('name'),
      ])
      if (e1) throw e1
      if (e2) throw e2
      setEntries((e ?? []) as unknown as EntryRow[])
      setTeams(t ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const byTier = (tier: number) => teams.filter((t) => t.level === tier)

  const setPick = (tier: number, slot: 0 | 1, value: string) => {
    setPicks((prev) => {
      const pair: [string, string] = [...prev[tier]] as [string, string]
      pair[slot] = value
      return { ...prev, [tier]: pair }
    })
  }

  const resetForm = () => {
    setParticipantName('')
    setAccessCode('')
    setEntryName('')
    setPicks(EMPTY_PICKS)
  }

  const validate = () => {
    if (!participantName.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return false }
    if (!accessCode.trim()) { toast({ title: 'Access code required', variant: 'destructive' }); return false }
    for (const tier of TIERS) {
      const [a, b] = picks[tier]
      if (!a || !b) { toast({ title: `Select 2 teams from Tier ${tier}`, variant: 'destructive' }); return false }
      if (a === b) { toast({ title: `Pick 2 different teams in Tier ${tier}`, variant: 'destructive' }); return false }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const { data: existing } = await supabase
        .from('participants')
        .select('id')
        .eq('name', participantName.trim())
        .maybeSingle()

      let participantId: string
      if (existing) {
        participantId = existing.id as string
        const { count } = await supabase
          .from('entries')
          .select('id', { count: 'exact', head: true })
          .eq('participant_id', participantId)
        if ((count ?? 0) >= MAX_ENTRIES_PER_PERSON) {
          toast({ title: 'Maximum entries reached', description: `Max ${MAX_ENTRIES_PER_PERSON} entries per person.`, variant: 'destructive' })
          return
        }
      } else {
        const { data: created, error: pe } = await supabase
          .from('participants')
          .insert({ name: participantName.trim(), access_code: accessCode.trim() })
          .select('id')
          .single()
        if (pe) throw pe
        participantId = (created as { id: string }).id
      }

      const { data: entry, error: ee } = await supabase
        .from('entries')
        .insert({ participant_id: participantId, entry_name: entryName.trim() })
        .select('id')
        .single()
      if (ee) throw ee

      const entryTeams = TIERS.flatMap((tier) =>
        picks[tier].map((teamId) => ({ entry_id: (entry as { id: string }).id, team_id: teamId })),
      )
      const { error: ete } = await supabase.from('entry_teams').insert(entryTeams)
      if (ete) throw ete

      toast({ title: '🎉 Entry submitted!', variant: 'success' })
      setOpen(false)
      resetForm()
      void load()
    } catch (err) {
      toast({ title: 'Error submitting entry', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const grouped = entries.reduce<Record<string, { name: string; entries: EntryRow[] }>>((acc, entry) => {
    const name = entry.participant?.name ?? 'Unknown'
    if (!acc[name]) acc[name] = { name, entries: [] }
    acc[name].entries.push(entry)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{entries.length} {entries.length === 1 ? 'Entry' : 'Entries'}</p>
          <p className="text-sm text-muted-foreground">
            2 teams per tier · 12 teams total · C${ENTRY_FEE} cash to Ed Akkawi
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Submit Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submit Your Entry</DialogTitle>
              <DialogDescription>
                Pick <strong>2 teams from each tier</strong> (12 total). Entry fee: C${ENTRY_FEE} cash to Ed Akkawi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pname">Your Name *</Label>
                  <Input id="pname" placeholder="Jane Smith" value={participantName} onChange={(e) => setParticipantName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acode">Access Code *</Label>
                  <Input id="acode" placeholder="Choose a password" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} />
                </div>
              </div>

              {/* Access code info box */}
              <div className="flex gap-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-2.5 text-sm text-blue-800">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Remember your access code!</p>
                  <p className="text-blue-700 text-xs mt-0.5">
                    You'll need it to edit your picks before the tournament starts. Treat it like a password — if you forget it you won't be able to make changes.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ename">Entry Nickname (optional)</Label>
                <Input id="ename" placeholder="e.g. The Dark Horses" value={entryName} onChange={(e) => setEntryName(e.target.value)} />
              </div>

              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-semibold">Pick 2 teams from each tier:</p>
                {TIERS.map((tier) => (
                  <div key={tier} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {LEVEL_LABELS[tier]}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {([0, 1] as const).map((slot) => (
                        <Select key={slot} value={picks[tier][slot]} onValueChange={(v) => setPick(tier, slot, v)}>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder={`Team ${slot + 1}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {byTier(tier).map((team) => (
                              <SelectItem key={team.id} value={team.id} disabled={picks[tier][slot === 0 ? 1 : 0] === team.id}>
                                <span className="flex items-center gap-2">
                                  <FlagImg emoji={team.flag} size={18} />
                                  {team.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={() => void handleSubmit()} disabled={submitting} className="w-full">
                {submitting ? 'Submitting…' : `Submit Entry (C$${ENTRY_FEE} cash to Ed Akkawi)`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <EditEntry allTeams={teams} onDone={load} />

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No entries yet</p>
          <p className="text-sm">Be the first to submit!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.values(grouped).map(({ name, entries: pEntries }) => (
            <Card key={name}>
              <button className="w-full text-left" onClick={() => setExpanded(expanded === name ? null : name)}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">{name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {pEntries.length} {pEntries.length === 1 ? 'entry' : 'entries'}
                      </span>
                      {expanded === name ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </CardHeader>
              </button>

              {expanded === name && (
                <CardContent className="pt-0 px-4 pb-4 space-y-5">
                  {pEntries.map((entry) => {
                    const sorted = [...entry.entry_teams].sort((a, b) => a.team.level - b.team.level)
                    return (
                      <div key={entry.id}>
                        {entry.entry_name && (
                          <p className="text-sm font-medium mb-2 text-muted-foreground">📋 {entry.entry_name}</p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {TIERS.map((tier) => {
                            const tierTeams = sorted.filter((et) => et.team.level === tier)
                            return (
                              <div key={tier} className="bg-muted/50 rounded-lg px-2.5 py-2">
                                <p className="text-xs text-muted-foreground mb-1.5">Tier {tier}</p>
                                {tierTeams.map(({ team }) => (
                                  <div key={team.id} className="flex items-center gap-1.5 mb-1">
                                    <FlagImg emoji={team.flag} size={20} />
                                    <span className="text-sm">{team.name}</span>
                                  </div>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            Submitted {new Date(entry.created_at).toLocaleDateString()}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-muted-foreground"
                            onClick={() => void loadHistory(entry.id, `${name}${entry.entry_name ? ` · ${entry.entry_name}` : ''}`)}
                          >
                            <History className="h-3 w-3 mr-1" />
                            History
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
      <p className="text-xs text-center text-muted-foreground pb-4">
        Max {MAX_ENTRIES_PER_PERSON} entries per person · {TEAMS_PER_TIER} teams per tier
      </p>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change History</DialogTitle>
            <DialogDescription>{historyLabel}</DialogDescription>
          </DialogHeader>
          {historyData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No changes recorded — original picks still active.</p>
          ) : (
            <div className="space-y-3">
              {historyData.map((change) => {
                const changedTiers = TIERS.filter((tier) => {
                  const prev = change.previous_teams.filter((t) => t.level === tier).map((t) => t.team_id).sort().join(',')
                  const next = change.new_teams.filter((t) => t.level === tier).map((t) => t.team_id).sort().join(',')
                  return prev !== next
                })
                return (
                  <div key={change.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(change.changed_at).toLocaleString()}</span>
                      <span>{change.changed_by === 'admin' ? '⚙️ Admin' : '👤 User'}</span>
                    </div>
                    {changedTiers.map((tier) => {
                      const prev = change.previous_teams.filter((t) => t.level === tier)
                      const next = change.new_teams.filter((t) => t.level === tier)
                      return (
                        <div key={tier} className="text-xs">
                          <p className="font-medium text-muted-foreground mb-0.5">Tier {tier}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-red-500 line-through">{prev.map((t) => `${t.flag} ${t.team_name}`).join(', ')}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-green-600">{next.map((t) => `${t.flag} ${t.team_name}`).join(', ')}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
