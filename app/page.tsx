// app/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Download, FileUp, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

// Dependencias de tu proyecto que sí deben existir:
import { sha256OfFile } from '@/lib/hash';
import { repoDexie } from '@/lib/repo-dexie';
import type { ConsolidatedRow } from '@/lib/repo';
import { readOfficialXlsx } from '@/lib/import-excel';

// Componentes locales estables
import ReceiptsFilters from '@/components/ReceiptsFilters';
import ControlTables from '@/components/Control/ControlTables';

// ---------------- Error Boundary (evita pantalla blanca) ----------------
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; err?: unknown }> {
  constructor(props: { children: React.ReactNode }) {
    super(props); this.state = { hasError: false };
  }
  static getDerivedStateFromError(err: unknown) { return { hasError: true, err }; }
  componentDidCatch(err: unknown) { console.error('UI error:', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="rounded-xl border border-destructive p-4 bg-destructive/10">
            <h2 className="font-semibold text-destructive mb-2">Ocurrió un error en la UI</h2>
            <pre className="text-xs overflow-auto">{String(this.state.err ?? 'desconocido')}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------- Tipos mínimos locales ----------------
type UploadItem = { name: string; status: 'pending' | 'ok' | 'error' };

type ControlSummary = {
  key: string;
  legajo: string;
  periodo: string;
  totalOficial: number;
  totalRecibo: number;
  difs: Record<string, { oficial: string; recibo: string }>; // solo los que difieren
};

const LS_KEY = 'recibos_v1';
const BASE_COLS = ['LEGAJO', 'PERIODO', 'NOMBRE', 'ARCHIVO'] as const;

// Helpers
function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e);
}
function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 0);
}
function toFixed2(n: unknown): string {
  const num = typeof n === 'number' ? n : Number(n ?? 0);
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

// ---------------- Página ----------------
export default function Page(): JSX.Element {
  const [consolidated, setConsolidated] = useState<ConsolidatedRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  // filtros (compartidos entre Agregada y Control)
  const [periodoFiltro, setPeriodoFiltro] = useState<string | null>(null);
  const [empresaFiltro, setEmpresaFiltro] = useState<string | null>(null);

  // control
  const [controlLoading, setControlLoading] = useState(false);
  const [controlSummaries, setControlSummaries] = useState<ControlSummary[]>([]);
  const [controlOKs, setControlOKs] = useState<Array<{ key: string; legajo: string; periodo: string }>>([]);
  const [controlMissing, setControlMissing] = useState<Array<{ key: string; legajo: string; periodo: string }>>([]);
  const [openDetail, setOpenDetail] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const officialInputRef = useRef<HTMLInputElement>(null);

  // Cols visibles dinámicas: base + todos los códigos (5 dígitos) que aparezcan
  const visibleCols = useMemo<string[]>(() => {
    const codes = new Set<string>();
    for (const r of consolidated) {
      for (const k of Object.keys(r.data ?? {})) {
        if (/^\d{5}$/.test(k)) codes.add(k);
      }
    }
    return [...BASE_COLS, ...Array.from(codes).sort()];
  }, [consolidated]);

  const nameByKey = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const r of consolidated) {
      const nm = r.nombre || r.data?.NOMBRE;
      if (nm) m[r.key] = nm;
    }
    return m;
  }, [consolidated]);

  // Cargar datos locales
  useEffect(() => {
    void loadConsolidated();
    try {
      // best-effort: request persistent storage si existe
      if (typeof navigator !== 'undefined' && (navigator as unknown as { storage?: { persist?: () => Promise<boolean> } }).storage?.persist) {
        ((navigator as unknown as { storage: { persist: () => Promise<boolean> } }).storage).persist().catch(() => {});
      }
    } catch {}
  }, []);

  async function loadConsolidated(): Promise<void> {
    const count = await repoDexie.countConsolidated();
    setTotalRows(count);
    const page = await repoDexie.getConsolidatedPage({ offset: 0, limit: Math.max(1, count) });
    setConsolidated(page);
  }

  // ---------- Agregada ----------
  const periodosList = useMemo(
    () => Array.from(new Set(consolidated.map((r) => r.periodo))).filter(Boolean).sort().reverse(),
    [consolidated]
  );
  const empresasList = useMemo(
    () => Array.from(new Set(consolidated.map((r) => r.empresa ?? ''))).filter(Boolean).sort(),
    [consolidated]
  );

  const filteredRows = useMemo<ConsolidatedRow[]>(() => {
    let rows = consolidated;
    if (periodoFiltro) rows = rows.filter((r) => r.periodo === periodoFiltro);
    if (empresaFiltro) {
      const f = empresaFiltro.toLowerCase();
      rows = rows.filter((r) => (r.empresa ?? r.data?.EMPRESA ?? '').toLowerCase().includes(f));
    }
    return [...rows];
  }, [consolidated, periodoFiltro, empresaFiltro]);

  // CSV agregado (local, sin dependencia externa)
  const csvAgregado = useMemo(() => {
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n;]/.test(s) ? `\"${s.replace(/\"/g, '\"\"')}\"` : s;
    };
    const cols = visibleCols;
    const header = cols.join(';');
    const body = filteredRows.map((r) => {
      const cells = cols.map((c) => {
        if (c === 'LEGAJO') return esc(r.legajo ?? '');
        if (c === 'PERIODO') return esc(r.periodo ?? '');
        if (c === 'NOMBRE') return esc(r.nombre ?? r.data?.NOMBRE ?? '');
        if (c === 'ARCHIVO') return esc(r.filename ?? r.data?.ARCHIVO ?? '');
        return esc(r.data?.[c] ?? '');
      });
      return cells.join(';');
    });
    return [header, ...body].join('\n');
  }, [filteredRows, visibleCols]);

  // ---------- Subida de PDFs ----------
  const handleFiles = useCallback(async (files: FileList): Promise<void> => {
    const arr = Array.from(files).filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (arr.length === 0) { toast.info('Sin PDFs', { description: 'Seleccioná al menos un archivo PDF.' }); return; }
    setUploads(arr.map((f) => ({ name: f.name, status: 'pending' as const })));

    const { parsePdfReceiptToRecord } = await import('@/lib/pdf-parser');

    let ok = 0, skip = 0, fail = 0;
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      const tid = toast.loading(`Procesando ${file.name} (${i + 1}/${arr.length})`);
      try {
        const hash = await sha256OfFile(file);
        if (await repoDexie.hasFileHash(hash)) { skip++; toast.info(`Omitido (duplicado): ${file.name}`, { id: tid }); continue; }

        // Parse PDF -> KV
        const res = await parsePdfReceiptToRecord(file);
        const parsed = (res?.data ?? {}) as Record<string, string>;
        const legajo = String(parsed.LEGAJO ?? '').trim();
        const periodo = String(parsed.PERIODO ?? '').trim();
        let nombre = String(parsed.NOMBRE ?? '').trim();
        const empresa = String((parsed.EMPRESA ?? '').trim() || 'LIMPAR');
        const key = `${legajo}||${periodo}`;

        // Upload físico (server puede bloquear por empresa)
        let uploadedName = file.name;
        try {
          const fd = new FormData();
          fd.append('file', file, file.name);
          fd.append('key', key);
          const r = await fetch('/api/upload', { method: 'POST', body: fd });
          if (r.status === 409) {
            try {
              const j = await r.json();
              if ((j as Record<string, unknown>)?.['blockedByEmpresa']) {
                toast.warning(`Archivo omitido (empresa no permitida): ${file.name}`, { id: tid, duration: 6000 });
                setUploads((p) => p.map((u, idx) => (idx === i ? { ...u, status: 'ok' } : u)));
                continue;
              }
            } catch {}
          }
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error((j as Record<string, unknown>)?.['error'] as string || 'Upload error');
          uploadedName = (j as Record<string, unknown>)?.['name'] as string || uploadedName;
        } catch { /* seguimos igual */ }

        if (!nombre) nombre = (parsed.NOMBRE_ALT ?? '').toString();

        const data: Record<string, string> = {
          ARCHIVO: uploadedName,
          PERIODO: periodo,
          NOMBRE: nombre,
          CUIL: parsed.CUIL ?? '',
          EMPRESA: empresa,
          ...parsed,
        };

        await repoDexie.addReceipt({
          legajo, periodo, nombre, cuil: data.CUIL, empresa, data, filename: uploadedName, fileHash: hash,
        });

        ok++; setUploads((p) => p.map((u, idx) => (idx === i ? { ...u, status: 'ok' } : u)));
        toast.success(`Listo: ${file.name}`, { id: tid });
      } catch (err) {
        fail++; setUploads((p) => p.map((u, idx) => (idx === i ? { ...u, status: 'error' } : u)));
        toast.error(`Error en ${file.name}`, { description: errorMessage(err), id: tid });
      }
      await new Promise((r) => setTimeout(r, 0)); // ceder a la UI
    }
    toast.info(`Completado: ${ok} ok · ${skip} omitidos · ${fail} error`, { duration: 4000 });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setUploads([]), 2000);
    await loadConsolidated();
  }, [loadConsolidated]);

  // ---------- Excel oficial + Control ----------
  async function handleOfficialExcel(file: File): Promise<void> {
    if (!empresaFiltro || !periodoFiltro) { toast.error('Seleccioná empresa y período antes de cargar el Excel oficial'); return; }
    try {
      setControlLoading(true);
      const rows = await readOfficialXlsx(file); // -> [{ key, valores, meta }]
      // persistimos en Dexie como control oficial
      await repoDexie.upsertControl(rows.map((r) => ({ key: r.key, valores: r.valores })));
      await computeControl(rows.map((r) => r.key));
      toast.success(`Oficial cargado (${rows.length} filas)`);
    } catch (e) {
      toast.error('Error importando oficial', { description: errorMessage(e) });
    } finally {
      setControlLoading(false);
      if (officialInputRef.current) officialInputRef.current.value = '';
    }
  }

  async function computeControl(keys: string[]): Promise<void> {
    // Para cada key, comparamos valores oficiales vs recibos cargados (consolidated)
    const nameByK = nameByKey;
    const rowByK = new Map(consolidated.map((r) => [r.key, r]));
    const summaries: ControlSummary[] = [];
    const oks: Array<{ key: string; legajo: string; periodo: string }> = [];
    const missing: Array<{ key: string; legajo: string; periodo: string }> = [];

    for (const k of keys) {
      const row = rowByK.get(k);
      const ctl = await repoDexie.getControl(k); // { valores }
      const [legajo = '', periodo = ''] = k.split('||');
      if (!row) {
        missing.push({ key: k, legajo, periodo });
        continue;
      }
      const difs: ControlSummary['difs'] = {};
      let totalOfi = 0, totalRec = 0;
      for (const [code, vOfi] of Object.entries(ctl?.valores ?? {})) {
        const vRec = row.data?.[code] ?? '0';
        const nOfi = Number(vOfi ?? 0), nRec = Number(vRec ?? 0);
        totalOfi += Number.isFinite(nOfi) ? nOfi : 0;
        totalRec += Number.isFinite(nRec) ? nRec : 0;
        if (Math.abs(nOfi - nRec) > 0.009) {
          difs[code] = { oficial: toFixed2(nOfi), recibo: toFixed2(nRec) };
        }
      }
      if (Object.keys(difs).length === 0) {
        oks.push({ key: k, legajo, periodo });
      } else {
        summaries.push({ key: k, legajo, periodo, totalOficial: totalOfi, totalRecibo: totalRec, difs });
      }
    }

    summaries.sort((a, b) => a.legajo.localeCompare(b.legajo) || a.periodo.localeCompare(b.periodo));
    oks.sort((a, b) => a.legajo.localeCompare(b.legajo) || a.periodo.localeCompare(b.periodo));
    setControlSummaries(summaries);
    setControlOKs(oks);
    setControlMissing(missing);
  }

  function downloadAggregated(): void {
    downloadText('todos.csv', csvAgregado);
  }

  function downloadControlCsv(): void {
    // CSV resumido de control (solo difs)
    const esc = (v: unknown) => {
      const s = String(v ?? ''); return /[",\n;]/.test(s) ? `\"${s.replace(/\"/g,'\"\"')}\"` : s;
    };
    const rows = controlSummaries;
    const codes = Array.from(new Set(rows.flatMap((s) => Object.keys(s.difs)))).sort();
    const header = ['LEGAJO', 'PERIODO', 'TOTAL_OFICIAL', 'TOTAL_RECIBO', ...codes].join(';');
    const body = rows.map((s) => {
      const cells: string[] = [
        esc(s.legajo), esc(s.periodo), esc(toFixed2(s.totalOficial)), esc(toFixed2(s.totalRecibo)),
        ...codes.map((c) => {
          const d = s.difs[c]; return d ? esc(`${d.oficial} vs ${d.recibo}`) : '';
        })
      ];
      return cells.join(';');
    });
    downloadText('control.csv', [header, ...body].join('\n'));
  }

  // ---------- UI ----------
  return (
    <ErrorBoundary>
      <main data-testid="app-mounted" className="container mx-auto px-4 py-6">
        <Tabs defaultValue="agregada" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="agregada">Agregada</TabsTrigger>
            <TabsTrigger value="control">Control</TabsTrigger>
          </TabsList>

          {/* --- Agregada --- */}
          <TabsContent value="agregada">
            <Card>
              <CardHeader className="flex items-center justify-between gap-2 sm:flex-row sm:items-center">
                <div className="md:col-span-2 min-w-0">
                  <CardTitle>Tabla agregada</CardTitle>
                  <div className="mt-2 text-xs text-muted-foreground">Filas: {totalRows}</div>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button onClick={downloadAggregated}><Download className="mr-2 h-4 w-4" /> Descargar CSV</Button>
                  <Button variant={showDebug ? 'destructive' : 'outline'} onClick={() => setShowDebug((v) => !v)}>
                    {showDebug ? <XCircle className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    {showDebug ? 'Ocultar debug' : 'Mostrar debug'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ReceiptsFilters
                  periodos={periodosList}
                  empresas={empresasList}
                  valuePeriodo={periodoFiltro}
                  onPeriodo={setPeriodoFiltro}
                  valueEmpresa={empresaFiltro}
                  onEmpresa={setEmpresaFiltro}
                />
                <Separator className="my-4" />
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        {visibleCols.map((c) => (<th key={c} className="text-left px-2 pb-2 whitespace-nowrap">{c}</th>))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r) => (
                        <tr key={r.key} className="border-t">
                          {visibleCols.map((c) => {
                            const v = c === 'LEGAJO' ? r.legajo
                              : c === 'PERIODO' ? r.periodo
                              : c === 'NOMBRE' ? (r.nombre ?? r.data?.NOMBRE ?? '')
                              : c === 'ARCHIVO' ? (r.filename ?? r.data?.ARCHIVO ?? '')
                              : (r.data?.[c] ?? '');
                            return <td key={c} className="px-2 py-1 whitespace-nowrap">{v}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {showDebug && (
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-2">Uploads</div>
                    <ul className="list-disc pl-6 text-sm">
                      {uploads.map((u) => (
                        <li key={u.name}>
                          {u.name} — {u.status === 'pending' ? <Loader2 className="inline h-4 w-4 animate-spin" /> : u.status === 'ok' ? <CheckCircle2 className="inline h-4 w-4 text-green-600" /> : <XCircle className="inline h-4 w-4 text-red-600" />}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Control --- */}
          <TabsContent value="control">
            <Card>
              <CardHeader className="flex items-center justify-between gap-2 sm:flex-row sm:items-center">
                <div className="md:col-span-2 min-w-0">
                  <CardTitle>Control</CardTitle>
                  <div className="mt-2 text-xs text-muted-foreground">Compara valores oficiales vs calculados</div>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="text-sm flex items-center gap-2">
                    Excel oficial
                    <Input ref={officialInputRef} type="file" accept=".xlsx,.xls" onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const f = e.target.files?.[0]; if (f) void handleOfficialExcel(f);
                    }} />
                  </label>
                  <Button variant="outline" onClick={downloadControlCsv}>
                    <Download className="mr-2 h-4 w-4" /> Descargar CSV de control
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ReceiptsFilters
                  periodos={periodosList}
                  empresas={empresasList}
                  valuePeriodo={periodoFiltro}
                  onPeriodo={setPeriodoFiltro}
                  valueEmpresa={empresaFiltro}
                  onEmpresa={setEmpresaFiltro}
                />
                <Separator className="my-4" />
                <ControlTables
                  summaries={controlSummaries}
                  oks={controlOKs}
                  missing={controlMissing}
                  openDetail={openDetail}
                  onToggleDetail={(k) => setOpenDetail((prev) => ({ ...prev, [k]: !prev[k] }))}
                  nameByKey={nameByKey}
                />
                {controlLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Procesando Excel...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <input ref={fileInputRef} type="file" className="hidden" accept="application/pdf" multiple
          onChange={(e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) void handleFiles(e.target.files); }} />
        <Button className="fixed bottom-6 right-6 shadow-lg" onClick={() => fileInputRef.current?.click()}>
          <FileUp className="mr-2 h-4 w-4" /> Subir PDFs
        </Button>
      </main>
    </ErrorBoundary>
  );
}
