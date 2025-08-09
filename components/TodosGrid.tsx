// /components/TodosGrid.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

export default function TodosGrid() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<'fecha'|'archivo'|'legajo'|'periodo'>('fecha');
  const [asc, setAsc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false); // toggle debug (cerrado por defecto)

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/todos', { cache: 'no-store' });
      const json = await res.json();
      if (json?.ok) setRows(json.rows || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term
      ? rows.filter((r) =>
          [r.fecha, r.archivo, r.legajo, r.periodo]
            .filter(Boolean)
            .some((v: string) => String(v).toLowerCase().includes(term))
        )
      : rows;

    const sorted = [...base].sort((a, b) => {
      const va = String(a[sortKey] ?? '');
      const vb = String(b[sortKey] ?? '');
      return asc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return sorted;
  }, [rows, q, sortKey, asc]);

  function toggleSort(k: 'fecha'|'archivo'|'legajo'|'periodo') {
    if (sortKey === k) setAsc(!asc); else { setSortKey(k); setAsc(true); }
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en fecha/archivo/legajo/periodo"
          className="border rounded-xl px-3 py-2 grow min-w-[260px]"
        />
        <a
          href="/api/todos?format=csv"
          download="todos.csv"
          className="border px-3 py-2 rounded-xl"
        >Descargar CSV</a>
        <button onClick={load} className="border px-3 py-2 rounded-xl">{loading ? '...' : 'Refrescar'}</button>
        <label className="inline-flex items-center gap-2 border px-3 py-2 rounded-xl">
          <input type="checkbox" checked={showDebug} onChange={(e)=>setShowDebug(e.target.checked)} />
          Debug
        </label>
      </div>

      <div className="overflow-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <Th onClick={() => toggleSort('fecha')} active={sortKey==='fecha'} asc={asc}>Fecha</Th>
              <Th onClick={() => toggleSort('archivo')} active={sortKey==='archivo'} asc={asc}>Archivo</Th>
              <Th onClick={() => toggleSort('legajo')} active={sortKey==='legajo'} asc={asc}>Legajo</Th>
              <Th onClick={() => toggleSort('periodo')} active={sortKey==='periodo'} asc={asc}>Periodo</Th>
              <th className="text-left p-2">Códigos</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              let resumen = '';
              try {
                const obj = JSON.parse(r.codigos_json || '{}');
                const pairs = Object.entries(obj).slice(0, 6).map(([k, v]) => `${k}: ${v}`);
                resumen = pairs.join(' · ');
                if (Object.keys(obj).length > 6) resumen += ' · …';
              } catch {}
              return (
                <tr key={r.fecha + r.legajo + r.periodo + i} className={i % 2 ? 'bg-gray-50' : ''}>
                  <td className="p-2 whitespace-nowrap font-mono">{r.fecha}</td>
                  <td className="p-2">{r.archivo}</td>
                  <td className="p-2">{r.legajo}</td>
                  <td className="p-2">{r.periodo}</td>
                  <td className="p-2 font-mono text-xs max-w-[520px] truncate" title={r.codigos_json}>{resumen}</td>
                </tr>
              );
            })}
            {(!loading && filtered.length === 0) && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={5}>Sin datos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showDebug && (
        <pre className="bg-gray-100 rounded-xl p-3 text-xs overflow-auto max-h-64">
{JSON.stringify({ total: rows.length, muestra: rows[0] }, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Th({ children, onClick, active, asc }:{ children: any, onClick: ()=>void, active?: boolean, asc?: boolean }) {
  return (
    <th className="text-left p-2 select-none cursor-pointer">
      <div className="inline-flex items-center gap-1" onClick={onClick}>
        <span>{children}</span>
        <span className={`text-xs ${active ? '' : 'opacity-30'}`}>{asc ? '▲' : '▼'}</span>
      </div>
    </th>
  );
}