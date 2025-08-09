function escapeCsv(value: string): string {
  const needsQuotes = /[",\n;]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

export function buildCsvFromRecord(data: Record<string, string>): string {
  const orderedKeys = [
    "LEGAJO",
    "PERIODO",
    "ARCHIVO",
    ...Object.keys(data)
      .filter((k) => /^20\d{3}$/.test(k))
      .sort(),
    ...Object.keys(data).filter((k) => !/^20\d{3}$/.test(k) && !["LEGAJO", "PERIODO", "ARCHIVO"].includes(k)).sort(),
  ]
  const uniqueKeys = Array.from(new Set(orderedKeys))
  const header = uniqueKeys.join(";")
  const row = uniqueKeys.map((k) => escapeCsv((data[k] ?? "").toString())).join(";")
  return header + "\n" + row + "\n"
}

export function buildCsvFromMany(rows: Record<string, string>[]): string {
  if (rows.length === 0) return ""
  const allKeys = new Set<string>(["LEGAJO", "PERIODO", "ARCHIVO"])
  for (const r of rows) Object.keys(r).forEach((k) => allKeys.add(k))
  const headerKeys = Array.from(allKeys).sort((a, b) => {
    const pri = (k: string) => (k === "LEGAJO" ? 0 : k === "PERIODO" ? 1 : k === "ARCHIVO" ? 2 : /^20\d{3}$/.test(k) ? 3 : 4)
    if (pri(a) !== pri(b)) return pri(a) - pri(b)
    return a.localeCompare(b)
  })
  const header = headerKeys.join(";")
  const lines = rows.map((r) => headerKeys.map((k) => escapeCsv((r[k] ?? "").toString())).join(";"))
  return header + "\n" + lines.join("\n") + "\n"
}
