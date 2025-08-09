// /lib/todosCsv.ts
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

export type TodoCsvRow = {
  fecha: string;          // ISO datetime
  archivo: string;        // nombre del archivo subido
  legajo: string;         // ej. "000123"
  periodo: string;        // ej. "2024-07" o "Jul-2024"
  codigos_json: string;   // JSON.stringify({ 20530: 123.45, ... })
};

const DATA_DIR = path.join(process.cwd(), 'data');
const TODOS_CSV = path.join(DATA_DIR, 'todos.csv');

const HEADER = 'fecha,archivo,legajo,periodo,codigos_json
';

function csvEscape(value: string): string {
  if (value == null) return '';
  const needsQuotes = /[",
]/.test(value);
  let escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function ensureDirSync(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function ensureCsv(): Promise<void> {
  ensureDirSync(DATA_DIR);
  try {
    await fsp.access(TODOS_CSV, fs.constants.F_OK);
  } catch {
    await fsp.writeFile(TODOS_CSV, HEADER, 'utf8');
  }
}

// Parser CSV simple y seguro (maneja comillas) → array de campos
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let i = 0;
  let inQuotes = false;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        cur += ch;
        i++;
        continue;
      }
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = '';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      cur += ch;
      i++;
    }
  }
  out.push(cur);
  return out;
}

export async function readTodos(): Promise<TodoCsvRow[]> {
  await ensureCsv();
  const raw = await fsp.readFile(TODOS_CSV, 'utf8');
  const lines = raw.split(/
?
/).filter(Boolean);
  const rows: TodoCsvRow[] = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (idx === 0 && line.toLowerCase().startsWith('fecha,')) continue; // skip header
    const cols = parseCsvLine(line);
    if (cols.length < 5) continue;
    const [fecha, archivo, legajo, periodo, codigos_json] = cols;
    rows.push({ fecha, archivo, legajo, periodo, codigos_json });
  }
  return rows;
}

export async function existsByKey(legajo: string, periodo: string): Promise<boolean> {
  const rows = await readTodos();
  return rows.some(r => r.legajo === String(legajo) && r.periodo === String(periodo));
}

export async function appendUnique(row: TodoCsvRow): Promise<{ created: boolean }> {
  await ensureCsv();
  const dup = await existsByKey(row.legajo, row.periodo);
  if (dup) return { created: false };

  const line = [
    csvEscape(row.fecha),
    csvEscape(row.archivo),
    csvEscape(String(row.legajo)),
    csvEscape(String(row.periodo)),
    csvEscape(row.codigos_json),
  ].join(',') + '
';

  await fsp.appendFile(TODOS_CSV, line, 'utf8');
  return { created: true };
}

// NUEVO: devolver el texto completo del CSV para descarga
export async function readCsvText(): Promise<string> {
  await ensureCsv();
  return await fsp.readFile(TODOS_CSV, 'utf8');
}