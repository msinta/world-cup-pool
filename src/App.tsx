import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/toaster'
import { Leaderboard } from '@/components/Leaderboard'
import { Entries } from '@/components/Entries'
import { Admin } from '@/components/Admin'

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">⚽ World Cup Pool 2026</h1>
              <p className="text-sm text-muted-foreground">Guardian Capital</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue="leaderboard">
          <TabsList className="mb-6">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="entries">Entries</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            <Leaderboard />
          </TabsContent>

          <TabsContent value="entries">
            <Entries />
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
