import path from 'node:path';
import { promises as fs } from 'node:fs';
import { parseCSV, stringifyCSV, Row } from './csv';
import { ArchivoRecibo, mergeArchivos } from './archivos';

const CSV_PATH = path.join(process.cwd(), process.env.TODOS_CSV_PATH || 'data/todos.csv');

type UpsertArgs = {
  key?: string;
  legajo?: string;
  periodo?: string; // mm/yyyy
  archivo: ArchivoRecibo;
};

const BASE_HEADERS = ['KEY', 'LEGAJO', 'PERIODO', 'ARCHIVOS'];

async function readCsv(): Promise<Row[]> {
  try {
    const txt = await fs.readFile(CSV_PATH, 'utf8');
    const rows = parseCSV(txt);
    return rows;
  } catch {
    return [];
  }
}

async function writeCsv(rows: Row[]): Promise<void> {
  await fs.mkdir(path.dirname(CSV_PATH), { recursive: true });
  // Aseguramos mismas columnas en todas las filas
  const headers = ensureHeaders(rows);
  const normalized = rows.map(r => {
    const out: Row = {};
    for (const h of headers) out[h] = r[h] ?? '';
    return out;
  });
  const csv = stringifyCSV(normalized);
  await fs.writeFile(CSV_PATH, csv, 'utf8');
}

function ensureHeaders(rows: Row[]): string[] {
  const set = new Set<string>(BASE_HEADERS);
  for (const r of rows) for (const k of Object.keys(r)) set.add(k);
  return Array.from(set);
}

function buildKey(legajo?: string, periodo?: string) {
  return `${(legajo || '').trim()}||${(periodo || '').trim()}`;
}

export async function upsertArchivoEnTodos({ key, legajo, periodo, archivo }: UpsertArgs) {
  const k = (key && key.includes('||')) ? key : buildKey(legajo, periodo);
  const [kLegajo, kPeriodo] = k.split('||');

  if (!kLegajo || !kPeriodo) {
    return { updated: false, reason: 'Falta key o legajo+periodo (mm/yyyy)' };
  }

  const rows = await readCsv();
  const idx = rows.findIndex(r => (r['KEY'] || '') === k);

  if (idx >= 0) {
    // merge archivos
    const prevArchivos = rows[idx]['ARCHIVOS'] ?? '';
    const merged = mergeArchivos(prevArchivos, archivo);
    rows[idx]['ARCHIVOS'] = JSON.stringify(merged);
  } else {
    // crear fila mínima
    const nuevo: Row = {
      KEY: k,
      LEGAJO: kLegajo,
      PERIODO: kPeriodo,
      ARCHIVOS: JSON.stringify([archivo]),
    };
    rows.push(nuevo);
  }

  await writeCsv(rows);
  return { updated: true, key: k };
}
