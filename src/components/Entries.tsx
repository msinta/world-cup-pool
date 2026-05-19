import { useEffect, useState, useCallback } from 'react'
import { Plus, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LEVEL_LABELS } from '@/types'
import type { Team, Participant } from '@/types'
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

export function Entries() {
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [participantName, setParticipantName] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [entryName, setEntryName] = useState('')
  const [picks, setPicks] = useState<Record<number, string>>({})

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

  useEffect(() => {
    void load()
  }, [load])

  const teamsByTier = (tier: number) => teams.filter((t) => t.level === tier)

  const resetForm = () => {
    setParticipantName('')
    setAccessCode('')
    setEntryName('')
    setPicks({})
  }

  const handleSubmit = async () => {
    if (!participantName.trim()) {
      toast({ title: 'Name required', variant: 'destructive' })
      return
    }
    if (!accessCode.trim()) {
      toast({ title: 'Access code required', variant: 'destructive' })
      return
    }
    const missingTiers = TIERS.filter((t) => !picks[t])
    if (missingTiers.length > 0) {
      toast({
        title: 'Select one team per tier',
        description: `Missing: ${missingTiers.map((t) => `Tier ${t}`).join(', ')}`,
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      // Upsert participant
      const { data: existing } = await supabase
        .from('participants')
        .select('id')
        .eq('name', participantName.trim())
        .maybeSingle()

      let participantId: string
      if (existing) {
        participantId = existing.id as string
      } else {
        const { data: created, error: pe } = await supabase
          .from('participants')
          .insert({ name: participantName.trim(), access_code: accessCode.trim() })
          .select('id')
          .single()
        if (pe) throw pe
        participantId = (created as { id: string }).id
      }

      // Create entry
      const { data: entry, error: ee } = await supabase
        .from('entries')
        .insert({ participant_id: participantId, entry_name: entryName.trim() })
        .select('id')
        .single()
      if (ee) throw ee

      // Create entry_teams
      const entryTeams = TIERS.map((tier) => ({
        entry_id: (entry as { id: string }).id,
        team_id: picks[tier],
      }))
      const { error: ete } = await supabase.from('entry_teams').insert(entryTeams)
      if (ete) throw ete

      toast({ title: 'Entry submitted!', variant: 'success' })
      setOpen(false)
      resetForm()
      void load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {entries.length} {entries.length === 1 ? 'Entry' : 'Entries'}
        </h2>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Submit Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submit Your Entry</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pname">Your Name *</Label>
                  <Input
                    id="pname"
                    placeholder="John Smith"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acode">Access Code *</Label>
                  <Input
                    id="acode"
                    placeholder="Save to edit later"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ename">Entry Name (optional)</Label>
                <Input
                  id="ename"
                  placeholder="e.g. The Champions"
                  value={entryName}
                  onChange={(e) => setEntryName(e.target.value)}
                />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Pick one team from each tier:</p>
                <div className="space-y-3">
                  {TIERS.map((tier) => (
                    <div key={tier} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {LEVEL_LABELS[tier]}
                      </Label>
                      <Select
                        value={picks[tier] ?? ''}
                        onValueChange={(v) => setPicks((p) => ({ ...p, [tier]: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a team…" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamsByTier(tier).map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.flag} {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => void handleSubmit()} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Entry'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading entries…</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No entries yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {entries.map((entry) => {
            const sorted = [...entry.entry_teams].sort(
              (a, b) => a.team.level - b.team.level,
            )
            return (
              <Card key={entry.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {entry.participant?.name ?? '—'}
                  </CardTitle>
                  {entry.entry_name && (
                    <p className="text-sm text-muted-foreground">{entry.entry_name}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {sorted.map(({ team }) => (
                      <div key={team.id} className="flex items-center gap-2 text-sm">
                        <span className="text-xs text-muted-foreground w-14 shrink-0">
                          T{team.level}
                        </span>
                        <span>{team.flag}</span>
                        <span>{team.name}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
