// Standalone sync script — runs server-side in GitHub Actions
// Fetches WC 2026 matches from football-data.org and upserts into Supabase
const API_BASE = 'https://api.football-data.org/v4'
const API_KEY = process.env.VITE_FOOTBALL_API_KEY
const SUPABASE_URL = 'https://upzuvpogdracavcmxakp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwenV2cG9nZHJhY2F2Y214YWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODkzNzMsImV4cCI6MjA5NDc2NTM3M30._akzEANRa-ohHspeIzOF8lkn_--3eRLBL_YzpDLswFc'

const STAGE_MAP = {
  GROUP_STAGE: 'group',
  ROUND_OF_32: 'round_of_32',
  ROUND_OF_16: 'round_of_16',
  QUARTER_FINALS: 'quarter_final',
  SEMI_FINALS: 'semi_final',
  FINAL: 'final',
}

const ALIASES = {
  'united states': 'usa',
  'republic of ireland': 'ireland',
  'ir iran': 'iran',
  'cote divoire': 'ivory coast',
  'czech republic': 'czechia',
  'dr congo': 'congo dr',
  'congo': 'congo dr',
  'bosnia and herzegovina': 'bosnia-herzegovina',
  'south korea': 'korea republic',
}

function norm(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim()
}

function resolveTeamId(name, shortName, nameMap) {
  for (const candidate of [name, shortName ?? '']) {
    const n = norm(candidate)
    const alias = ALIASES[n] ?? n
    const id = nameMap.get(alias) ?? nameMap.get(n)
    if (id) return id
  }
  return null
}

async function supabase(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase ${res.status} ${path}: ${text}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function main() {
  if (!API_KEY) throw new Error('VITE_FOOTBALL_API_KEY is not set')

  console.log('Fetching WC 2026 matches from football-data.org…')
  const apiRes = await fetch(`${API_BASE}/competitions/WC/matches?season=2026`, {
    headers: { 'X-Auth-Token': API_KEY },
  })
  if (!apiRes.ok) throw new Error(`API ${apiRes.status}: ${apiRes.statusText}`)
  const { matches: apiMatches } = await apiRes.json()
  console.log(`  Got ${apiMatches.length} matches from API`)

  const teams = await supabase('/teams?select=id,name')
  const nameMap = new Map(teams.map((t) => [norm(t.name), t.id]))

  const matchRecords = []
  const advancement = new Map()
  const finalWinners = []
  const unresolved = []

  for (const m of apiMatches) {
    const stage = STAGE_MAP[m.stage]
    if (!stage) continue

    const homeId = resolveTeamId(m.homeTeam.name, m.homeTeam.shortName, nameMap)
    const awayId = resolveTeamId(m.awayTeam.name, m.awayTeam.shortName, nameMap)

    if (!homeId || !awayId) {
      unresolved.push(`${m.homeTeam.name} vs ${m.awayTeam.name} (stage: ${m.stage})`)
      continue
    }

    const isFinished = m.status === 'FINISHED'
    matchRecords.push({
      external_id: String(m.id),
      home_team_id: homeId,
      away_team_id: awayId,
      stage,
      match_date: m.utcDate,
      is_completed: isFinished,
      home_goals: m.score.fullTime.home,
      away_goals: m.score.fullTime.away,
      home_penalty_goals: m.score.penalties?.home ?? 0,
      away_penalty_goals: m.score.penalties?.away ?? 0,
    })

    if (stage !== 'group') {
      for (const tid of [homeId, awayId]) {
        if (!advancement.has(tid)) advancement.set(tid, new Set())
        advancement.get(tid).add(stage)
      }
    }

    if (stage === 'final' && isFinished) {
      if (m.score.winner === 'HOME_TEAM') finalWinners.push(homeId)
      else if (m.score.winner === 'AWAY_TEAM') finalWinners.push(awayId)
    }
  }

  if (unresolved.length > 0) {
    console.warn(`  Could not resolve ${unresolved.length} matches (TBD teams are normal in early stages):`)
    unresolved.slice(0, 5).forEach((u) => console.warn(`    - ${u}`))
  }

  // Batch upsert all matches
  await supabase('/matches?on_conflict=external_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(matchRecords),
  })
  console.log(`  Upserted ${matchRecords.length} matches`)

  // Upsert team advancement
  const advRecords = []
  for (const [teamId, stages] of advancement) {
    const inFinal = stages.has('final')
    const inSF = stages.has('semi_final') || inFinal
    const inQF = stages.has('quarter_final') || inSF
    const inR16 = stages.has('round_of_16') || inQF
    const inR32 = stages.has('round_of_32') || inR16
    advRecords.push({
      team_id: teamId,
      advanced_to_round_32: inR32,
      advanced_to_round_16: inR16,
      advanced_to_quarters: inQF,
      advanced_to_semis: inSF,
      advanced_to_final: inFinal,
      won_world_cup: finalWinners.includes(teamId),
      updated_at: new Date().toISOString(),
    })
  }

  if (advRecords.length > 0) {
    await supabase('/team_advancement?on_conflict=team_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(advRecords),
    })
    console.log(`  Updated advancement for ${advRecords.length} teams`)
  }

  console.log('✅ Sync complete')
}

main().catch((err) => {
  console.error('❌ Sync failed:', err.message)
  process.exit(1)
})
