// app/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Download, FileUp, Loader2, CheckCircle2, XCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { CODE_LABELS, CODE_KEYS } from '@/lib/code-labels';
import { sha256OfFile } from '@/lib/hash';
import { repoDexie } from '@/lib/repo-dexie';
import type { ConsolidatedRow } from '@/lib/repo';
import { readOfficialXlsx, type OfficialRow } from '@/lib/import-excel';
import TablaAgregada from '@/components/TablaAgregada/TablaAgregada';
import ControlTables from '@/components/Control/ControlTables';
import { buildControlCsvSummary, type ControlOk as ControlOkRow } from '@/lib/export-control';
import type { ControlSummary } from '@/lib/control-types';
import { buildAggregatedCsv } from '@/lib/export-aggregated';
import ReceiptsFilters from '@/components/ReceiptsFilters';

type UploadItem = { name: string; status: 'pending' | 'ok' | 'error' };

const LS_KEY = 'recibos_v1';
const BASE_COLS = ['LEGAJO', 'PERIODO', 'NOMBRE', 'ARCHIVO'] as const;

function periodoToNum(p: string): number {
  const [mm = '00', yyyy = '0000'] = p.split('/');
  return Number(yyyy) * 100 + Number(mm);
}
function compareByKey(a: { legajo: string; periodo: string }, b: { legajo: string; periodo: string }): number {
  const la = Number(a.legajo) || 0;
  const lb = Number(b.legajo) || 0;
  if (la !== lb) return la - lb;
  return periodoToNum(a.periodo) - periodoToNum(b.periodo);
}
function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try { return JSON.stringify(e); } catch { return String(e); }
}

type CleanupResponse = { ok?: boolean; deleted?: number; error?: string };
function parseCleanupResponse(u: unknown): CleanupResponse {
  if (typeof u !== 'object' || u === null) return {};
  const o = u as Record<string, unknown>;
  return {
    ok: typeof o.ok === 'boolean' ? o.ok : undefined,
    deleted: typeof o.deleted === 'number' ? o.deleted : undefined,
    error: typeof o.error === 'string' ? o.error : undefined,
  };
}

export default function Page() {
  const [consolidated, setConsolidated] = useState<ConsolidatedRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  useEffect(() => { void repoDexie.backfillEmpresaIfMissing?.('LIMPAR'); }, []);


  // filtros (compartidos entre Agregada y Control)
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('');
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('');

  // control
  const [controlLoading, setControlLoading] = useState(false);
  const [controlSummaries, setControlSummaries] = useState<ControlSummary[]>([]);
  const [controlOKs, setControlOKs] = useState<ControlOkRow[]>([]);
  const [showOks, setShowOks] = useState(false);
  const [openDetail, setOpenDetail] = useState<Record<string, boolean>>({});
  const [controlMissing, setControlMissing] = useState<Array<{ key: string; legajo: string; periodo: string }>>([]);
  const [officialKeys, setOfficialKeys] = useState<string[]>([]);
  const [tolerance, setTolerance] = useState(0.01);
  const [controlStats, setControlStats] = useState({ comps: 0, compOk: 0, compDif: 0, okReceipts: 0, difReceipts: 0 });
  const [officialNameByKey, setOfficialNameByKey] = useState<Record<string, string>>({});
  const [officialFileName, setOfficialFileName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const officialInputRef = useRef<HTMLInputElement>(null);
  const visibleCols = useMemo<string[]>(() => [...BASE_COLS, ...CODE_KEYS], []);

  const nameByKey = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const r of consolidated) {
      const nm = r.nombre || r.data.NOMBRE;
      if (nm) m[r.key] = nm;
    }
    for (const [k, v] of Object.entries(officialNameByKey)) {
      if (!m[k] && v) m[k] = v;
    }
    return m;
  }, [consolidated, officialNameByKey]);

  useEffect(() => { void loadConsolidated(); if (navigator?.storage?.persist) navigator.storage.persist().catch(() => {}); }, []);

  async function loadConsolidated(): Promise<void> {
    const count = await repoDexie.countConsolidated();
    setTotalRows(count);
    const page = await repoDexie.getConsolidatedPage({ offset: 0, limit: Math.max(1, count) });
    setConsolidated(page);
  }

  function adaptConsolidatedToOfficial(rows: ConsolidatedRow[]): OfficialRow[] {
    return rows.map((r) => {
      const valores: Record<string, string> = {};
      for (const [k, v] of Object.entries(r.data ?? {})) {
        if (/^\d{4,5}$/.test(k) || (CODE_KEYS as readonly string[]).includes(k)) {
          const num = Number(v ?? 0);
          valores[String(k)] = Number.isFinite(num) ? num.toFixed(2) : '0.00';
        }
      }
      return {
        key: r.key,
        valores,
        meta: {
          legajo: String(r.legajo ?? ''),
          periodo: String(r.periodo ?? ''),
          nombre: (r.nombre || r.data?.NOMBRE || '').toString(),
          cuil: (r.cuil || r.data?.CUIL || '').toString(),
          archivo: (r.filename || r.data?.ARCHIVO || '').toString(),
          empresa: r.empresa ?? r.data?.EMPRESA ?? '',
        },
      };
    });
  }

  const filteredOfficialRows: OfficialRow[] = useMemo(() => {
    let rows = consolidated;
    if (periodoFiltro) rows = rows.filter((r) => r.periodo === periodoFiltro);
    if (empresaFiltro) {
      const f = empresaFiltro.toLowerCase();
      rows = rows.filter((r) => (r.empresa ?? r.data?.EMPRESA ?? '').toLowerCase().includes(f));
    }
    rows = [...rows].sort(compareByKey);
    return adaptConsolidatedToOfficial(rows);
  }, [consolidated, periodoFiltro, empresaFiltro]);

  const periodosList = useMemo(
    () => Array.from(new Set(consolidated.map((r) => r.periodo))).filter(Boolean).sort().reverse(),
    [consolidated]
  );
  const empresasList = useMemo(
    () => Array.from(new Set(consolidated.map((r) => r.empresa ?? ''))).filter(Boolean).sort(),
    [consolidated]
  );

  const handleFiles = useCallback(async (files: FileList): Promise<void> => {
    const arr = Array.from(files).filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (arr.length === 0) { toast.info('Sin PDFs', { description: 'Selecciona al menos un archivo PDF.' }); return; }
    setUploads(arr.map((f) => ({ name: f.name, status: 'pending' as const })));
    const { parsePdfReceiptToRecord } = await import('@/lib/pdf-parser');

    let ok = 0, skip = 0, fail = 0;
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i]; const tid = toast.loading(`Procesando ${file.name} (${i + 1}/${arr.length})`);
      try {
        const hash = await sha256OfFile(file);
        if (await repoDexie.hasFileHash(hash)) { skip++; setUploads((p) => p.map((u, idx) => idx === i ? { ...u, status: 'ok' } : u)); toast.info(`Omitido (duplicado): ${file.name}`, { id: tid }); continue; }
        const res = await parsePdfReceiptToRecord(file);
        const parsed = (res?.data ?? {}) as Record<string, string>;
        const legajo = String(parsed.LEGAJO ?? '').trim();
        const periodo = String(parsed.PERIODO ?? '').trim();
        if (!legajo || !periodo) throw new Error('No se pudo detectar LEGAJO o PERIODO');
        const key = `${legajo}||${periodo}`;
        let nombre = (parsed.NOMBRE ?? '').trim();

        // upload a /recibos
        let uploadedName = file.name;
        try {
          const fd = new FormData(); fd.append('file', file, file.name); fd.append('key', key);
          const r = await fetch('/api/upload', { method: 'POST', body: fd });
          const j = (await r.json()) as { name?: string; error?: string };
          if (!r.ok) throw new Error(j?.error || 'Upload error');
          uploadedName = j.name || uploadedName;
        } catch {}

        const empresa = ((parsed.EMPRESA ?? '').trim() || 'LIMPAR');
        const data: Record<string, string> = { ARCHIVO: uploadedName, LEGAJO: legajo, PERIODO: periodo, NOMBRE: nombre, CUIL: parsed.CUIL ?? '', ...parsed };
        await repoDexie.addReceipt({ legajo, periodo, nombre, cuil: data.CUIL, empresa, data, filename: uploadedName, fileHash: hash });

        ok++; setUploads((p) => p.map((u, idx) => idx === i ? { ...u, status: 'ok' } : u)); toast.success(`Listo: ${file.name}`, { id: tid });
      } catch (err: unknown) {
        fail++; setUploads((p) => p.map((u, idx) => idx === i ? { ...u, status: 'error' } : u)); toast.error(`Error en ${file.name}`, { description: errorMessage(err), id: tid });
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    toast.info(`Completado: ${ok} ok · ${skip} omitidos · ${fail} error`, { duration: 4000 });
    if (fileInputRef.current) fileInputRef.current.value = ''; setTimeout(() => setUploads([]), 2000); await loadConsolidated();
  }, []);

  async function handleRefresh(): Promise<void> { try { await loadConsolidated(); toast.success('Tabla refrescada'); } catch (e: unknown) { toast.error('No se pudo refrescar', { description: errorMessage(e) }); } }

  async function handleWipeAll(): Promise<void> {
    try {
      const files = Array.from(new Set(consolidated.map((r) => (r.filename || r.data?.ARCHIVO || '').toString()).filter(Boolean)));
      const resp = await fetch('/api/cleanup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ files }) });
      await resp.json().catch(() => ({}));

      await repoDexie.wipe();
      localStorage.removeItem(LS_KEY);
      setConsolidated([]); setTotalRows(0); setControlSummaries([]); setControlOKs([]); setControlMissing([]); setOfficialKeys([]); setOpenDetail({}); setControlStats({ comps: 0, compOk: 0, compDif: 0, okReceipts: 0, difReceipts: 0 }); setOfficialNameByKey({});
      toast.success('Memoria borrada');
    } catch (e: unknown) { toast.error('No se pudo limpiar todo', { description: errorMessage(e) }); }
  }

  // ------- Excel oficial + Control -------
  async function handleOfficialExcel(file: File): Promise<void> {
    if (!empresaFiltro || !periodoFiltro) { toast.error('Seleccioná empresa y período antes de cargar el Excel oficial'); return; }
    try {
      setOfficialFileName(file.name);
      setControlLoading(true);
      const rows: OfficialRow[] = await readOfficialXlsx(file);
      // guardamos todos los valores del Excel; el filtro se aplica al comparar
      await repoDexie.upsertControl(rows.map((r) => ({ key: r.key, valores: r.valores })));

      setOfficialKeys(rows.map((r) => r.key));
      setOfficialNameByKey(Object.fromEntries(rows.map((r) => [r.key, r.nombre || ''])));

      await computeControl(rows.map((r) => r.key));
      toast.success(`Oficial cargado (${rows.length} filas)`);
    } catch (e: unknown) {
      toast.error('Error importando oficial', { description: errorMessage(e) });
      setOfficialFileName('');
    } finally {
      setControlLoading(false);
      if (officialInputRef.current) officialInputRef.current.value = '';
    }
  }

  const filteredConsolidatedForControl = useMemo(() => {
    let rows = consolidated;
    if (periodoFiltro) rows = rows.filter((r) => r.periodo === periodoFiltro);
    if (empresaFiltro) {
      const f = empresaFiltro.toLowerCase();
      rows = rows.filter((r) => (r.empresa ?? r.data?.EMPRESA ?? '').toLowerCase().includes(f));
    }
    return rows;
  }, [consolidated, periodoFiltro, empresaFiltro]);

  async function computeControl(keysFromExcel?: string[]): Promise<void> {
    const rows = filteredConsolidatedForControl;
    if (!rows.length) {
      setControlSummaries([]); setControlOKs([]); setControlMissing([]);
      setControlStats({ comps: 0, compOk: 0, compDif: 0, okReceipts: 0, difReceipts: 0 });
      return;
    }

    const pairs = await Promise.all(
      rows.map(async (r: ConsolidatedRow) => ({ r, ctl: await repoDexie.getControl(r.key) })),
    );

    const summaries: ControlSummary[] = [];
    const oks: ControlOkRow[] = [];
    let comps = 0, compOk = 0, compDif = 0;

    for (const { r, ctl } of pairs) {
      if (!ctl) continue;
      const difs: ControlSummary['difs'] = [];
      for (const [code, label] of CODE_LABELS) {
        const calc = Number(r.data[code] ?? 0);
        const off = Number(ctl.valores[code] ?? 0);
        const delta = off - calc;
        const dentro = Math.abs(delta) <= tolerance;
        comps += 1;
        if (dentro) { compOk += 1; continue; }
        compDif += 1;
        difs.push({ codigo: code, label, oficial: off.toFixed(2), calculado: calc.toFixed(2), delta: delta.toFixed(2), dir: delta > 0 ? 'a favor' : 'en contra' });
      }
      if (difs.length > 0) summaries.push({ key: r.key, legajo: r.legajo, periodo: r.periodo, difs });
      else oks.push({ key: r.key, legajo: r.legajo, periodo: r.periodo });
    }

    summaries.sort(compareByKey);
    oks.sort(compareByKey);

    setControlSummaries(summaries);
    setControlOKs(oks);

    const official = new Set<string>(keysFromExcel ?? officialKeys);
    const consKeys = new Set(rows.map((r) => r.key));
    const missing: Array<{ key: string; legajo: string; periodo: string }> = [];
    if (official.size > 0) {
      for (const k of official) if (!consKeys.has(k)) {
        const [legajo = '', periodo = ''] = k.split('||'); missing.push({ key: k, legajo, periodo });
      }
    }
    setControlMissing(missing);
    setControlStats({ comps, compOk, compDif, okReceipts: oks.length, difReceipts: summaries.length });
  }

  function downloadCsvAggregated(): void {
    const csv = buildAggregatedCsv(consolidated, visibleCols);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'recibos_agregado.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function downloadControlCsv(): void {
    const csv = buildControlCsvSummary(controlSummaries, controlOKs, showOks, nameByKey);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'control_por_clave.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Gestor de Recibos <span className="ml-2 text-sm text-muted-foreground">({totalRows})</span></h1>
      </header>

      {uploads.length > 0 && (
        <div className="mb-4 rounded-lg border p-3 bg-muted/30">
          <div className="mb-2 text-sm font-medium">
            Procesando {uploads.filter((u) => u.status === 'pending').length} pendiente(s) · {uploads.filter((u) => u.status === 'ok').length} ok · {uploads.filter((u) => u.status === 'error').length} error
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {uploads.map((u, i) => (
              <div key={`${u.name}-${i}`} className="flex items-center gap-2 rounded border bg-white px-3 py-2">
                {u.status === 'pending' && <Loader2 className="h-4 w-4 animate-spin" />}
                {u.status === 'ok' && <CheckCircle2 className="h-4 w-4" />}
                {u.status === 'error' && <XCircle className="h-4 w-4" />}
                <span className="truncate text-sm">{u.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={handleRefresh}>Refrescar</Button>
        <Button variant="outline" size="sm" onClick={handleWipeAll}>Limpiar memoria</Button>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showDebug} onChange={(e: ChangeEvent<HTMLInputElement>) => setShowDebug(e.target.checked)} /> Mostrar debug
        </label>
      </div>

      {showDebug && consolidated[0] && (
        <div className="mb-6 rounded-lg border p-4 bg-amber-50/40">
          <div className="rounded-lg border p-4 bg-white">
            <div className="text-sm text-muted-foreground">Filas consolidadas: {totalRows}</div>
            <Separator className="my-3" />
            <pre className="text-xs overflow-auto">{JSON.stringify(consolidated[0], null, 2)}</pre>
          </div>
        </div>
      )}

      <Tabs defaultValue="agregado" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agregado">Tabla agregada</TabsTrigger>
          <TabsTrigger value="control">Control</TabsTrigger>
          <TabsTrigger value="export">Exportación</TabsTrigger>
        </TabsList>

        {/* TABLA AGREGADA */}
        <TabsContent value="agregado" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Tabla agregada</CardTitle>
              <ReceiptsFilters
                periodos={periodosList}
                empresas={empresasList}
                valuePeriodo={periodoFiltro || null}
                onPeriodo={(v) => setPeriodoFiltro(v ?? '')}
                valueEmpresa={empresaFiltro || null}
                onEmpresa={(v) => setEmpresaFiltro(v ?? '')}
              />
              <div className="flex gap-2">
                <Button variant="secondary" disabled={consolidated.length === 0} onClick={downloadCsvAggregated}>
                  <Download className="mr-2 h-4 w-4" /> Descargar CSV agregado
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {consolidated.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay datos.</p>
              ) : (
                <TablaAgregada data={filteredOfficialRows} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTROL */}
        <TabsContent value="control" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Control</CardTitle>
                <div className="mt-2 text-xs text-muted-foreground">
                  Comparaciones: {controlStats.comps} · OK: {controlStats.compOk} · DIF: {controlStats.compDif}
                </div>
                <div className="text-xs text-muted-foreground">
                  Recibos — OK: {controlStats.okReceipts} · Con diferencias: {controlStats.difReceipts}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Filtros reutilizados en Control */}
                <ReceiptsFilters
                  periodos={periodosList}
                  empresas={empresasList}
                  valuePeriodo={periodoFiltro || null}
                  onPeriodo={(v) => setPeriodoFiltro(v ?? '')}
                  valueEmpresa={empresaFiltro || null}
                  onEmpresa={(v) => setEmpresaFiltro(v ?? '')}
                />
                <Button variant="outline" onClick={() => officialInputRef.current?.click()} disabled={controlLoading}>
                  <Upload className="mr-2 h-4 w-4" />
                  {officialFileName ? `Cargar otro (actual: ${officialFileName})` : 'Cargar Excel oficial'}
                </Button>
                <input
                  ref={officialInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void handleOfficialExcel(f); }}
                />
                <Button variant="outline" onClick={async () => { setControlLoading(true); await computeControl(); setControlLoading(false); }} disabled={controlLoading}>
                  {controlLoading ? '...' : 'Recalcular'}
                </Button>
                <Button variant="secondary" onClick={downloadControlCsv} disabled={controlSummaries.length === 0 && !showOks}>
                  <Download className="mr-2 h-4 w-4" /> Descargar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ControlTables
                summaries={controlSummaries}
                oks={showOks ? controlOKs : []}
                missing={controlMissing}
                openDetail={openDetail}
                onToggleDetail={(k) => setOpenDetail((prev) => ({ ...prev, [k]: !prev[k] }))}
                nameByKey={nameByKey}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPORT */}
        <TabsContent value="export" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Exportación</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm"><span className="font-medium">recibos_agregado.csv</span></div>
                  <div className="flex gap-2">
                    <Button variant="secondary" disabled={consolidated.length === 0} onClick={downloadCsvAggregated}>
                      <Download className="mr-2 h-4 w-4" /> Descargar
                    </Button>
                  </div>
                </div>
              </div>
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
  );
}
