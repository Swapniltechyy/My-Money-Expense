export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function nowTime(): string {
  const d = new Date()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function currentMonthBounds(): { startDate: string; endDate: string } {
  const now = new Date()
  return {
    startDate: toISODate(startOfMonth(now)),
    endDate: toISODate(endOfMonth(now)),
  }
}

export function fromTodayBounds(): { startDate: string; endDate: string } {
  const startDate = todayISO()
  const monthEnd = toISODate(endOfMonth())
  return {
    startDate,
    endDate: monthEnd < startDate ? startDate : monthEnd,
  }
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function daysBetweenInclusive(startISO: string, endISO: string): number {
  const start = startOfDay(parseISODate(startISO)).getTime()
  const end = startOfDay(parseISODate(endISO)).getTime()
  return Math.floor((end - start) / 86400000) + 1
}

export function daysLeftInPeriod(endISO: string, fromISO = todayISO()): number {
  const end = startOfDay(parseISODate(endISO)).getTime()
  const from = startOfDay(parseISODate(fromISO)).getTime()
  if (from > end) return 0
  return Math.floor((end - from) / 86400000) + 1
}

export function monthLabel(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

export function shortDate(iso: string, today = todayISO()): string {
  if (iso === today) return 'Today'
  const y = parseISODate(today)
  y.setDate(y.getDate() - 1)
  if (iso === toISODate(y)) return 'Yesterday'
  return parseISODate(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

export function formatTime(time: string): string {
  const [hStr, mStr] = time.split(':')
  let h = Number(hStr)
  const m = mStr ?? '00'
  const suffix = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${suffix}`
}

export function purchaseStamp(date: string, time: string): string {
  return `${date}T${time}`
}

export function weekStartISO(from = todayISO()): string {
  const d = parseISODate(from)
  const day = d.getDay()
  const offset = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - offset)
  return toISODate(d)
}

export function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}
