import { useState, useCallback } from 'react'
import { Pencil, Lock, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LEVEL_LABELS, TEAMS_PER_TIER } from '@/types'
import type { Team, Participant } from '@/types'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

// Entries lock when the tournament begins
const LOCK_DATE = new Date('2026-06-11T00:00:00Z')
const isLocked = () => new Date() >= LOCK_DATE

const TIERS = [1, 2, 3, 4, 5, 6]
type Picks = Record<number, [string, string]>

interface EntryTeamRow { id: string; team: Team }
interface ChangeRecord {
  id: string
  changed_at: string
  changed_by: string
  previous_teams: { team_id: string; team_name: string; flag: string; level: number }[]
  new_teams: { team_id: string; team_name: string; flag: string; level: number }[]
}
interface EntryRow {
  id: string
  entry_name: string
  created_at: string
  participant: Participant | null
  entry_teams: EntryTeamRow[]
}

export function EditEntry({ allTeams, onDone }: { allTeams: Team[]; onDone: () => void }) {
  const locked = isLocked()

  // Step 1 — identity verification
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [vName, setVName] = useState('')
  const [vCode, setVCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  // Step 2 — entry selection & editing
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [editingEntry, setEditingEntry] = useState<EntryRow | null>(null)
  const [editPicks, setEditPicks] = useState<Picks>({ 1: ['',''], 2: ['',''], 3: ['',''], 4: ['',''], 5: ['',''], 6: ['',''] })
  const [saving, setSaving] = useState(false)

  // Change history
  const [historyEntry, setHistoryEntry] = useState<string | null>(null)
  const [history, setHistory] = useState<ChangeRecord[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  const verify = async () => {
    if (!vName.trim() || !vCode.trim()) {
      toast({ title: 'Enter your name and access code', variant: 'destructive' })
      return
    }
    setVerifying(true)
    try {
      const { data: p, error } = await supabase
        .from('participants')
        .select('id, name, access_code, created_at')
        .eq('name', vName.trim())
        .maybeSingle()

      if (error) throw error
      if (!p) {
        toast({ title: 'Name not found', description: 'No participant with that name exists.', variant: 'destructive' })
        return
      }
      if ((p as Participant).access_code !== vCode.trim()) {
        toast({ title: 'Wrong access code', variant: 'destructive' })
        return
      }

      const { data: e, error: ee } = await supabase
        .from('entries')
        .select('id, entry_name, created_at, participant:participants(id, name, access_code, created_at), entry_teams(id, team:teams(id, name, flag, level, created_at))')
        .eq('participant_id', (p as Participant).id)
        .order('created_at')
      if (ee) throw ee

      setParticipant(p as Participant)
      setEntries((e ?? []) as unknown as EntryRow[])
      setVerifyOpen(false)
      setVName('')
      setVCode('')
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown', variant: 'destructive' })
    } finally {
      setVerifying(false)
    }
  }

  const openEdit = (entry: EntryRow) => {
    const picks: Picks = { 1: ['',''], 2: ['',''], 3: ['',''], 4: ['',''], 5: ['',''], 6: ['',''] }
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
    setEditPicks(prev => {
      const pair = [...prev[tier]] as [string, string]
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
      // Snapshot previous teams for history
      const previousTeams = editingEntry.entry_teams.map(et => ({
        team_id: et.team.id, team_name: et.team.name, flag: et.team.flag, level: et.team.level,
      }))
      const newTeams = TIERS.flatMap(tier =>
        editPicks[tier].map(teamId => {
          const team = allTeams.find(t => t.id === teamId)!
          return { team_id: teamId, team_name: team.name, flag: team.flag, level: team.level }
        })
      )

      // Delete old picks, insert new ones
      const { error: de } = await supabase.from('entry_teams').delete().eq('entry_id', editingEntry.id)
      if (de) throw de
      const { error: ie } = await supabase.from('entry_teams').insert(
        TIERS.flatMap(tier => editPicks[tier].map(teamId => ({ entry_id: editingEntry.id, team_id: teamId })))
      )
      if (ie) throw ie

      // Record the change
      await supabase.from('entry_changes').insert({
        entry_id: editingEntry.id,
        changed_by: 'user',
        previous_teams: previousTeams,
        new_teams: newTeams,
      })

      toast({ title: '✅ Entry updated!', variant: 'success' })
      setEditingEntry(null)

      // Reload entries
      const { data: e } = await supabase
        .from('entries')
        .select('id, entry_name, created_at, participant:participants(id, name, access_code, created_at), entry_teams(id, team:teams(id, name, flag, level, created_at))')
        .eq('participant_id', participant!.id)
        .order('created_at')
      setEntries((e ?? []) as unknown as EntryRow[])
      onDone()
    } catch (err) {
      toast({ title: 'Error saving', description: err instanceof Error ? err.message : 'Unknown', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const loadHistory = useCallback(async (entryId: string) => {
    const { data } = await supabase
      .from('entry_changes')
      .select('*')
      .eq('entry_id', entryId)
      .order('changed_at', { ascending: false })
    setHistory((data ?? []) as ChangeRecord[])
    setHistoryEntry(entryId)
    setHistoryOpen(true)
  }, [])

  // ---- If locked ----
  if (locked) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="py-5 flex items-center gap-3">
          <Lock className="h-5 w-5 text-orange-500 shrink-0" />
          <div>
            <p className="font-semibold text-orange-800">Entries are locked</p>
            <p className="text-sm text-orange-700">The tournament has started — picks can no longer be changed.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ---- Not yet verified ----
  if (!participant) {
    return (
      <>
        <Card className="border-dashed">
          <CardContent className="py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium">Want to change your picks?</p>
                <p className="text-sm text-muted-foreground">
                  Entries can be edited until <strong>June 11, 2026</strong>. You'll need your name and access code.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setVerifyOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit My Entry
            </Button>
          </CardContent>
        </Card>

        <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Verify Your Identity</DialogTitle>
              <DialogDescription>Enter the name and access code you used when submitting.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label>Your Name</Label>
                <Input placeholder="Jane Smith" value={vName} onChange={e => setVName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Access Code</Label>
                <Input type="password" placeholder="Your access code" value={vCode} onChange={e => setVCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && void verify()} />
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={() => void verify()} disabled={verifying}>
                {verifying ? 'Verifying…' : 'View My Entries'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // ---- Verified — show entries ----
  return (
    <>
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-green-800">
              ✅ Logged in as <strong>{participant.name}</strong>
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-green-700 h-7" onClick={() => { setParticipant(null); setEntries([]) }}>
              Sign out
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {entries.map(entry => {
          const sorted = [...entry.entry_teams].sort((a, b) => a.team.level - b.team.level)
          return (
            <Card key={entry.id}>
              <CardHeader className="py-3 px-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{entry.entry_name || 'Entry'}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void loadHistory(entry.id)}>
                      History
                    </Button>
                    <Button size="sm" className="h-7" onClick={() => openEdit(entry)}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TIERS.map(tier => {
                    const tierTeams = sorted.filter(et => et.team.level === tier)
                    return (
                      <div key={tier} className="bg-muted/50 rounded-lg px-2.5 py-2">
                        <p className="text-xs text-muted-foreground mb-1.5">Tier {tier}</p>
                        {tierTeams.map(({ team }) => (
                          <div key={team.id} className="flex items-center gap-1.5 mb-1">
                            <FlagImg emoji={team.flag} size={18} />
                            <span className="text-xs">{team.name}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingEntry} onOpenChange={o => { if (!o) setEditingEntry(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit — {editingEntry?.entry_name || 'Entry'}</DialogTitle>
            <DialogDescription>Pick {TEAMS_PER_TIER} teams from each tier. Locked June 11.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {TIERS.map(tier => (
              <div key={tier} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{LEVEL_LABELS[tier]}</p>
                <div className="grid grid-cols-2 gap-2">
                  {([0, 1] as const).map(slot => (
                    <Select key={slot} value={editPicks[tier][slot]} onValueChange={v => setEditPick(tier, slot, v)}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder={`Team ${slot + 1}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {allTeams.filter(t => t.level === tier).map(team => (
                          <SelectItem key={team.id} value={team.id} disabled={editPicks[tier][slot === 0 ? 1 : 0] === team.id}>
                            <span className="flex items-center gap-2">
                              <FlagImg emoji={team.flag} size={16} />
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
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditingEntry(null)}>Cancel</Button>
            <Button className="flex-1" onClick={() => void saveEdit()} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change History</DialogTitle>
            <DialogDescription>All edits made to this entry.</DialogDescription>
          </DialogHeader>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No changes recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {history.map(change => (
                <ChangeEntry key={change.id} change={change} />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dummy use of historyEntry to avoid lint error */}
      <span className="hidden">{historyEntry}</span>
    </>
  )
}

function ChangeEntry({ change }: { change: ChangeRecord }) {
  const [open, setOpen] = useState(false)
  const date = new Date(change.changed_at).toLocaleString()
  const changedTeams = change.new_teams.filter(nt => {
    const prev = change.previous_teams.find(pt => pt.level === nt.level && pt.team_id !== nt.team_id)
    return prev !== undefined || !change.previous_teams.find(pt => pt.team_id === nt.team_id)
  })

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <button className="w-full flex items-center justify-between text-left" onClick={() => setOpen(!open)}>
        <div>
          <p className="text-sm font-medium">{date}</p>
          <p className="text-xs text-muted-foreground">
            {change.changed_by === 'admin' ? '⚙️ Admin edit' : '👤 User edit'}
            {changedTeams.length > 0 && ` · ${changedTeams.length} team${changedTeams.length > 1 ? 's' : ''} changed`}
          </p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="space-y-2 pt-1 border-t">
          {TIERS.map(tier => {
            const prev = change.previous_teams.filter(t => t.level === tier)
            const next = change.new_teams.filter(t => t.level === tier)
            const prevIds = prev.map(t => t.team_id).sort().join(',')
            const nextIds = next.map(t => t.team_id).sort().join(',')
            if (prevIds === nextIds) return null
            return (
              <div key={tier} className="text-xs">
                <p className="font-medium text-muted-foreground mb-0.5">Tier {tier}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-red-600 line-through">{prev.map(t => `${t.flag} ${t.team_name}`).join(', ')}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-green-600">{next.map(t => `${t.flag} ${t.team_name}`).join(', ')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
