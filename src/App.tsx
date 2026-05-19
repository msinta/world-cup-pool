import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/toaster'
import { Leaderboard } from '@/components/Leaderboard'
import { Entries } from '@/components/Entries'
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
          <TabsList className="mb-6 w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
            <TabsTrigger value="leaderboard">🏆 Standings</TabsTrigger>
            <TabsTrigger value="entries">📋 Entries</TabsTrigger>
            <TabsTrigger value="rules">📖 Rules</TabsTrigger>
            <TabsTrigger value="admin">⚙️ Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            <Leaderboard />
          </TabsContent>
          <TabsContent value="entries">
            <Entries />
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
