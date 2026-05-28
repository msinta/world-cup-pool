import { ENTRY_FEE, MAX_ENTRIES_PER_PERSON, TEAMS_PER_TIER } from '@/types'

export function Rules() {
  return (
    <div className="max-w-2xl mx-auto space-y-2">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Guardian Capital 2026 World Cup Pool — Rules</h2>
          <p className="text-sm text-muted-foreground mt-0.5">THE GUARDIAN CAPITAL 2026 WORLD CUP POOL</p>
        </div>

        <div className="divide-y divide-border">
          {/* Team Selection */}
          <Section number="⚽" title="Team Selection">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The 48 teams are divided into <strong className="text-foreground">6 tiers</strong> based on FIFA World Rankings.
              Each entry must select <strong className="text-foreground">{TEAMS_PER_TIER} teams from each tier</strong> for a total of{' '}
              <strong className="text-foreground">12 teams per entry</strong>. You may submit up to{' '}
              <strong className="text-foreground">{MAX_ENTRIES_PER_PERSON} entries</strong>.
            </p>
          </Section>

          {/* Points System */}
          <Section number="📊" title="Points System">
            <div className="space-y-4">
              <PointGroup label="⚽  Match Results">
                <PointRow emoji="✅" label="Team wins a game" value="+2 pts" />
                <PointRow emoji="🤝" label="Team draws a game" value="+1 pt" />
              </PointGroup>
              <PointGroup label="📋  Group Stage">
                <PointRow emoji="➡️" label="Advances to Round of 32" value="+3 pts" />
                <PointRow emoji="🥈" label="Finishes 2nd in group" value="+4 pts" />
                <PointRow emoji="🥇" label="Finishes 1st in group" value="+6 pts" />
              </PointGroup>
              <PointGroup label="🏆  Knockout Rounds">
                <PointRow emoji="⚡" label="Advances to Round of 16" value="+8 pts" />
                <PointRow emoji="🔥" label="Advances to Quarter-Finals" value="+10 pts" />
                <PointRow emoji="⭐" label="Advances to Semi-Finals" value="+12 pts" />
                <PointRow emoji="🌟" label="Advances to the Final" value="+15 pts" />
                <PointRow emoji="🏆" label="Wins the World Cup" value="+25 pts" accent />
              </PointGroup>
            </div>
          </Section>

          {/* Tiebreaker */}
          <Section number="⚖️" title="Tiebreaker">
            <p className="text-sm text-muted-foreground leading-relaxed">
              If two or more entrants are tied on points, the entrant whose teams scored the most total goals wins.
              If still tied, winnings are split equally among those tied.
            </p>
          </Section>

          {/* Prize Distribution */}
          <Section number="💰" title="Prize Distribution">
            <div className="grid grid-cols-3 gap-2">
              <PrizeCard place="1st" emoji="🥇" pct="60%" color="text-amber-600 bg-amber-50 border-amber-200" />
              <PrizeCard place="2nd" emoji="🥈" pct="30%" color="text-slate-500 bg-slate-50 border-slate-200" />
              <PrizeCard place="3rd" emoji="🥉" pct="10%" color="text-orange-600 bg-orange-50 border-orange-200" />
            </div>
          </Section>

          {/* Entry Fee */}
          <Section number="💵" title="Entry Fee & Deadline">
            <p className="text-sm text-muted-foreground leading-relaxed">
              C${ENTRY_FEE}.00 per entry (cash only). Entry form and fee must be received by{' '}
              <strong className="text-foreground">Ben Lavallee</strong>{' '}
              (<a href="mailto:BLavallee@guardiancapital.com" className="text-blue-600 hover:underline">BLavallee@guardiancapital.com</a>){' '}
              no later than <strong className="text-foreground">5 p.m. on Monday, June 8, 2026</strong>.
              Ben reserves the right, in his sole discretion, to reject any entry.
            </p>
          </Section>

          {/* Rule Interpretations */}
          <Section number="📜" title="Rule Interpretations">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Any rule interpretations not covered here will be dealt with by <strong className="text-foreground">Edward Akkawi</strong>.
              All decisions by Edward are final. Participation is open only to employees of Guardian Capital and its affiliates.
            </p>
          </Section>
        </div>

        <div className="px-6 py-5 text-center border-t border-border">
          <p className="font-bold text-foreground">ENJOY THE FOOTIE!!!!!!!!!!! ⚽</p>
        </div>
      </div>
    </div>
  )
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5">
      <div className="flex items-start gap-3">
        <span className="text-base shrink-0 mt-0.5">{number}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
          {children}
        </div>
      </div>
    </div>
  )
}

function PointGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  )
}

function PointRow({ emoji, label, value, accent }: { emoji: string; label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-card hover:bg-muted/30 transition-colors">
      <span className="flex items-center gap-2 text-sm text-foreground">
        <span>{emoji}</span>
        {label}
      </span>
      <span className={`text-sm font-bold ${accent ? 'text-amber-600' : 'text-emerald-600'}`}>{value}</span>
    </div>
  )
}

function PrizeCard({ place, emoji, pct, color }: { place: string; emoji: string; pct: string; color: string }) {
  return (
    <div className={`rounded-lg border p-3 text-center ${color}`}>
      <p className="text-xl mb-1">{emoji}</p>
      <p className="font-bold text-lg">{pct}</p>
      <p className="text-xs opacity-70">{place} place</p>
    </div>
  )
}
