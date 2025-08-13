// lib/db.ts
import Dexie, { Table } from "dexie";

/** Valor JSON serializable (sin `any`). */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JSONValue }
  | JSONValue[];

/** Registro crudo por PDF subido. */
export type ReceiptRowDB = {
  id?: number;
  key: string;                  // `${legajo}||${periodo}`
  legajo: string;
  periodo: string;              // mm/yyyy
  nombre?: string;              // NOMBRE (tal cual)
  cuil?: string;                // con guiones
  cuilNorm?: string;            // solo dígitos
  filename: string;
  createdAt: number;
  data: Record<string, string>; // base + códigos
  hashes: string[];             // SHA-256 de archivos fuente
};

/** Fila consolidada por LEGAJO+PERIODO. */
export type ConsolidatedEntity = {
  key: string;
  legajo: string;
  periodo: string;
  nombre?: string;
  cuil?: string;
  cuilNorm?: string;
  archivos: string[];               // nombres de archivos mergeados
  data: Record<string, string>;     // base + sumatoria de códigos
};

/** Dataset oficial importado desde Excel. */
export type ControlRow = {
  key: string;                        // `${legajo}||${periodo}`
  valores: Record<string, string>;    // códigos normalizados (punto decimal)
  meta?: Record<string, JSONValue>;   // metadatos opcionales (serializables)
};

export class RecibosDB extends Dexie {
  receipts!: Table<ReceiptRowDB, number>;
  consolidated!: Table<ConsolidatedEntity, string>;
  control!: Table<ControlRow, string>;
  settings!: Table<{ k: string; v: JSONValue }, string>;

  constructor() {
    super("recibosDB-v1");
    // Nota: *hashes => índice multiEntry para búsquedas por hash.
    this.version(1).stores({
      receipts: "++id, key, legajo, periodo, cuilNorm, createdAt, *hashes",
      consolidated: "key, legajo, periodo, cuilNorm",
      control: "key",
      settings: "k",
    });
  }
}

export const db = new RecibosDB();

// utils de normalización
export const normalizePeriodo = (s: unknown) => String(s ?? "").trim();
export const normalizeCuilDigits = (s?: string) => (s ?? "").replace(/\D/g, "");
export const makeKey = (legajo: string, periodo: string) =>
  `${String(legajo ?? "").trim()}||${String(periodo ?? "").trim()}`;
