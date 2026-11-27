const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const saoPaulo = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })

function parts(day: string) {
  const [year = '', month = '', date = ''] = day.split('-')

  return { year, month: MONTHS[Number(month) - 1] ?? '', date }
}

function formatDay(day: string) {
  const { year, month, date } = parts(day)

  return `${date} ${month} ${year}`
}

export function formatPublished(publishedAt: string | null) {
  return publishedAt ? formatDay(saoPaulo.format(new Date(publishedAt))) : null
}

export function formatStudied(from: string | null, to: string | null) {
  if (!from || !to || from === to) {
    const day = from ?? to

    return day ? formatDay(day) : null
  }

  const start = parts(from)

  const end = parts(to)

  if (start.year !== end.year) return `${formatDay(from)} – ${formatDay(to)}`

  if (start.month !== end.month) return `${start.date} ${start.month} – ${formatDay(to)}`

  return `${start.date}–${formatDay(to)}`
}

export const twoDigits = (value: number) => String(value).padStart(2, '0')
