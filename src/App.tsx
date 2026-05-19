import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/toaster'
import { Leaderboard } from '@/components/Leaderboard'
import { Entries } from '@/components/Entries'
import { Matches } from '@/components/Matches'
import { Admin } from '@/components/Admin'
import { Rules } from '@/components/Rules'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center gap-3">
          <div className="text-3xl">⚽</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-tight">World Cup Pool 2026</h1>
            <p className="text-sm text-muted-foreground">Guardian Capital</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Tabs defaultValue="leaderboard">
          <TabsList className="mb-6 w-full grid grid-cols-5 sm:inline-flex bg-transparent p-0 gap-1">
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">🏆 Standings</TabsTrigger>
            <TabsTrigger value="matches" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">⚽ Matches</TabsTrigger>
            <TabsTrigger value="entries" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">📋 Entries</TabsTrigger>
            <TabsTrigger value="rules" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">📖 Rules</TabsTrigger>
            <TabsTrigger value="admin" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">⚙️ Admin</TabsTrigger>
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
