export function formatINR(value: number, options?: { signed?: boolean }): string {
  const signed = options?.signed ?? false
  const negative = value < 0
  const abs = Math.abs(value)
  const rounded = Math.round(abs * 100) / 100
  const [intPart, decPart] = rounded.toFixed(2).split('.')
  const grouped = formatIndianInteger(intPart)
  const decimals = decPart === '00' ? '' : `.${decPart}`
  const prefix = negative ? '−' : signed && value > 0 ? '+' : ''
  return `${prefix}₹${grouped}${decimals}`
}

export function formatIndianInteger(intPart: string): string {
  if (intPart.length <= 3) return intPart
  const last3 = intPart.slice(-3)
  const rest = intPart.slice(0, -3)
  const withCommas = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${withCommas},${last3}`
}

export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, '').replace(/−/g, '-')
  if (!cleaned) return null
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100) / 100
}
