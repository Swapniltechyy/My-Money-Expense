import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const text = readFileSync(filePath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env) || !process.env[key]) process.env[key] = value
  }
}

const root = resolve(import.meta.dirname, '..')
loadEnvFile(resolve(root, '.env.local'))
loadEnvFile(resolve(root, '.env'))

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl || !databaseUrl.startsWith('postgres')) {
  console.error(
    'DATABASE_URL is missing.\n' +
      '1. Open Neon Console → your project → Connect\n' +
      '2. Copy the pooled connection string (postgresql://...)\n' +
      '3. Paste it in .env.local on the DATABASE_URL= line\n' +
      '4. Run: npm run db:setup\n\n' +
      'Or paste sql/schema.sql into Neon Console → SQL Editor and click Run.',
  )
  process.exit(1)
}

async function sqlQuery(query) {
  const parsed = new URL(databaseUrl)
  const endpoint = `https://${parsed.hostname}/sql`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Neon-Connection-String': databaseUrl,
    },
    body: JSON.stringify({ query, params: [] }),
  })
  const body = await res.text()
  let parsedBody = {}
  try {
    parsedBody = JSON.parse(body)
  } catch {
    parsedBody = { message: body.slice(0, 400) }
  }
  if (!res.ok) {
    const message = parsedBody.message || parsedBody.error || res.statusText
    throw new Error(`${message}\n--- SQL ---\n${query.slice(0, 240)}`)
  }
  return parsedBody
}

const schemaPath = resolve(root, 'sql/schema.sql')
const raw = readFileSync(schemaPath, 'utf8')
const statements = raw
  .split(';')
  .map((s) =>
    s
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim(),
  )
  .filter(Boolean)

for (const statement of statements) {
  await sqlQuery(statement)
}

const list = await sqlQuery(`
  SELECT tablename
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
`)
const rows = list.rows ?? list
console.log('Created / verified public tables:')
for (const row of rows) console.log(`- ${row.tablename ?? row[0]}`)
