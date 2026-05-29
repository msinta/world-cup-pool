import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/toaster'
import { Leaderboard } from '@/components/Leaderboard'
import { Entries } from '@/components/Entries'
import { Matches } from '@/components/Matches'
import { Admin } from '@/components/Admin'
import { Rules } from '@/components/Rules'

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl leading-none">⚽</span>
            <h1 className="text-base font-semibold tracking-tight text-foreground">World Cup Pool 2026</h1>
          </div>
          <img src="/guardian-capital-logo.png" alt="Guardian Capital" className="h-6 object-contain" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        <Tabs defaultValue="leaderboard">
          <TabsList className="mb-6 border-b border-border rounded-none bg-transparent p-0 w-full justify-start gap-0">
            <TabsTrigger value="leaderboard" className="rounded-none border-b-2 border-transparent -mb-px px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors">
              Standings
            </TabsTrigger>
            <TabsTrigger value="matches" className="rounded-none border-b-2 border-transparent -mb-px px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors">
              Matches
            </TabsTrigger>
            <TabsTrigger value="entries" className="rounded-none border-b-2 border-transparent -mb-px px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors">
              Entries
            </TabsTrigger>
            <TabsTrigger value="rules" className="rounded-none border-b-2 border-transparent -mb-px px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors">
              Rules
            </TabsTrigger>
            <TabsTrigger value="admin" className="rounded-none border-b-2 border-transparent -mb-px px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors">
              Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            <Leaderboard />
          </TabsContent>
          <TabsContent value="entries">
            <Entries />
          </TabsContent>
          <TabsContent value="matches">
            <Matches />
          </TabsContent>
          <TabsContent value="rules">
            <Rules />
          </TabsContent>
          <TabsContent value="admin">
            <Admin />
          </TabsContent>
        </Tabs>
      </main>

      <Toaster />
    </div>
  )
}
