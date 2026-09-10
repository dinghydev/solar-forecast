const fmtDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', weekday: 'short' })

export function labelForDay(iso: string): string {
  const parts = fmtDay.formatToParts(new Date(iso + 'T00:00:00'))
  const day = parts.find((p) => p.type === 'day')!.value
  const weekday = parts.find((p) => p.type === 'weekday')!.value
  return `${day} ${weekday}`
}

export function fmtLocalStamp(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
      hour12: false,
    }).format(new Date())
  } catch (e) {
    return new Date().toISOString()
  }
}

export function todayIsoDate(timeZone: string): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (k: string) => parts.find((p) => p.type === k)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function nowHourKey(timeZone: string): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const get = (k: string) => parts.find((p) => p.type === k)!.value
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:00`
}

export function fmt1(v: number | null | undefined): string {
  if (v == null) return ''
  const s = (+v).toFixed(1)
  return s === '0.0' || s === '-0.0' ? '' : s
}
