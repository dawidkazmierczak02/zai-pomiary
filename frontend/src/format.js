// tabeele formatoawnie po polsku
const dateTimeFormat = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function formatDateTime(isoString) {
  return dateTimeFormat.format(new Date(isoString))
}

export function formatValue(value) {
  return value.toLocaleString('pl-PL', { maximumFractionDigits: 2 })
}