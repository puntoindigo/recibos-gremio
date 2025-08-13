// lib/repo.ts
import type { ConsolidatedRow, ControlRow } from "./db";

export interface AddReceiptInput {
  legajo: string;
  periodo: string;             // mm/yyyy
  nombre?: string;
  cuil?: string;               // con guiones
  data: Record<string, string>;
  filename: string;
  fileHash: string;
}

export interface Repo {
  addReceipt(rec: AddReceiptInput): Promise<void>;

  // lectura del consolidado
  getConsolidatedPage(opts: { offset: number; limit: number }): Promise<ConsolidatedRow[]>;
  countConsolidated(): Promise<number>;

  // control (oficial)
  upsertControl(rows: Array<{ key: string; valores: Record<string, string> }>): Promise<void>;
  getControl(key: string): Promise<ControlRow | undefined>;
}

export type { ConsolidatedRow, ControlRow };
