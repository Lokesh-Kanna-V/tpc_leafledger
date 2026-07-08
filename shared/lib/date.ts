/** DATE/timestamp columns are stored as ISO strings; display as DD/MM/YYYY. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-")
  return `${day}/${month}/${year}`
}

export function dateIsoLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
