export type Row = Record<string, string>;

export function parseCSV(text: string): Row[] {
  const rows: Row[] = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.length > 0);
  if (lines.length === 0) return rows;

  const header = splitCsvLine(lines[0]);
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row: Row = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = cols[j] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

export function stringifyCSV(rows: Row[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [csvLine(headers)];
  for (const r of rows) {
    const cols = headers.map(h => r[h] ?? '');
    lines.push(csvLine(cols));
  }
  return lines.join('\n') + '\n';
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"') { inQuotes = true; }
      else { cur += ch; }
    }
  }
  out.push(cur);
  return out;
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function csvLine(cols: string[]): string {
  return cols.map(c => csvEscape(String(c ?? ''))).join(',');
}
