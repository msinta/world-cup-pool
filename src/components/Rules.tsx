import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ENTRY_FEE, MAX_ENTRIES_PER_PERSON, TEAMS_PER_TIER } from '@/types'

export function Rules() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            ⚽ Guardian Capital 2026 World Cup Pool — Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">

          <div>
            <h3 className="font-semibold text-base mb-1">1. Team Selection</h3>
            <p className="text-muted-foreground">
              The 48 teams are divided into <strong>6 tiers</strong> based on FIFA World Rankings.
              Each entry must select <strong>{TEAMS_PER_TIER} teams from each tier</strong> for a
              total of <strong>12 teams per entry</strong>. You may submit up
              to <strong>{MAX_ENTRIES_PER_PERSON} entries</strong>.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-2">2. Points System</h3>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-muted-foreground uppercase text-xs tracking-wide mb-1.5">Match Results</p>
                <div className="grid grid-cols-1 gap-1">
                  <PointRow icon="✅" label="Team wins a game" value="+3 pts" positive />
                  <PointRow icon="🤝" label="Team draws a game" value="+1 pt" positive />
                  <PointRow icon="⚽" label="Per goal scored (incl. penalty shootout)" value="+1 pt" positive />
                  <PointRow icon="🔴" label="Per goal conceded (incl. penalty shootout)" value="−1 pt" negative />
                </div>
              </div>
              <div>
                <p className="font-medium text-muted-foreground uppercase text-xs tracking-wide mb-1.5">Advancement Bonuses</p>
                <div className="grid grid-cols-1 gap-1">
                  <PointRow icon="🔵" label="Advances to Round of 32" value="+2 pts" positive />
                  <PointRow icon="🔵" label="Advances to Round of 16" value="+2 pts" positive />
                  <PointRow icon="🟡" label="Advances to Quarter-Finals" value="+3 pts" positive />
                  <PointRow icon="🟠" label="Advances to Semi-Finals" value="+4 pts" positive />
                  <PointRow icon="🔴" label="Advances to the Final" value="+5 pts" positive />
                  <PointRow icon="🏆" label="Wins the World Cup" value="+10 pts" positive />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-1">3. Tiebreaker</h3>
            <p className="text-muted-foreground">
              If two or more entrants are tied on points, the entrant whose teams scored the most
              total goals wins. If still tied, winnings are split equally.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-2">4. Prize Distribution</h3>
            <div className="grid grid-cols-3 gap-3">
              <PrizeCard place="1st" emoji="🥇" pct="60%" />
              <PrizeCard place="2nd" emoji="🥈" pct="30%" />
              <PrizeCard place="3rd" emoji="🥉" pct="10%" />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-1">5. Entry Fee</h3>
            <p className="text-muted-foreground">
              C${ENTRY_FEE}.00 per entry (cash only). Please send <strong>Ed Akkawi</strong> cash to participate.
            </p>
          </div>

          <p className="text-center text-lg font-bold pt-2">ENJOY THE FOOTIE!!!!!!!!! 🎉</p>
        </CardContent>
      </Card>
    </div>
  )
}

function PointRow({
  icon,
  label,
  value,
  positive,
  negative,
}: {
  icon: string
  label: string
  value: string
  positive?: boolean
  negative?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-muted/50">
      <span className="flex items-center gap-2">
        <span>{icon}</span>
        <span>{label}</span>
      </span>
      <span
        className={`font-bold text-sm ${positive ? 'text-green-600' : ''} ${negative ? 'text-red-600' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}

function PrizeCard({ place, emoji, pct }: { place: string; emoji: string; pct: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50 text-center">
      <span className="text-2xl">{emoji}</span>
      <span className="font-bold text-lg">{pct}</span>
      <span className="text-xs text-muted-foreground">{place} place</span>
    </div>
  )
}
