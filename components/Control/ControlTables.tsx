'use client';
import React, { Fragment } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Missing = { key: string; legajo: string; periodo: string };
type Diff = { oficial: string; recibo: string };
type Summary = {
  key: string;
  legajo: string;
  periodo: string;
  totalOficial: number;
  totalRecibo: number;
  difs: Record<string, Diff>;
};

type Props = {
  summaries: Summary[];
  oks: Array<{ key: string; legajo: string; periodo: string }>;
  missing: Missing[];
  openDetail: Record<string, boolean>;
  onToggleDetail: (key: string) => void;
  nameByKey: Record<string, string>;
};

const HEADERS: readonly string[] = ['LEGAJO','PERIODO','NOMBRE','TOTAL OFICIAL','TOTAL RECIBO','DIFERENCIAS','DETALLE'];

export default function ControlTables({ summaries, oks, missing, openDetail, onToggleDetail, nameByKey }: Props): JSX.Element {
  const Row = ({ s }: { s: Summary }) => {
    const difKeys = Object.keys(s.difs).sort();
    const difCount = difKeys.length;
    const isOpen = !!openDetail[s.key];
    return (
      <Fragment>
        <TableRow className="hover:bg-muted/30 cursor-pointer" onClick={() => onToggleDetail(s.key)}>
          <TableCell className="whitespace-nowrap">{s.legajo}</TableCell>
          <TableCell className="whitespace-nowrap">{s.periodo}</TableCell>
          <TableCell className="whitespace-nowrap">{nameByKey[s.key] ?? ''}</TableCell>
          <TableCell className="whitespace-nowrap">{s.totalOficial.toFixed(2)}</TableCell>
          <TableCell className="whitespace-nowrap">{s.totalRecibo.toFixed(2)}</TableCell>
          <TableCell className="whitespace-nowrap">{difCount}</TableCell>
          <TableCell className="whitespace-nowrap text-muted-foreground">{isOpen ? <ChevronDown /> : <ChevronRight />}</TableCell>
        </TableRow>
        {isOpen && (
          <TableRow className="bg-muted/10">
            <TableCell colSpan={7}>
              <div className="overflow-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left px-2 py-1">Código</th>
                      <th className="text-left px-2 py-1">Oficial</th>
                      <th className="text-left px-2 py-1">Recibo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {difKeys.map((code) => {
                      const d = s.difs[code];
                      const ofi = Number(d.oficial), rec = Number(d.recibo);
                      const color = Number.isFinite(ofi) && Number.isFinite(rec) ? (rec > ofi ? 'text-green-700' : rec < ofi ? 'text-red-700' : '') : '';
                      return (
                        <tr key={code} className="border-t">
                          <td className="px-2 py-1">{code}</td>
                          <td className="px-2 py-1">{d.oficial}</td>
                          <td className={`px-2 py-1 ${color}`}>{d.recibo}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TableCell>
          </TableRow>
        )}
      </Fragment>
    );
  };

  return (
    <div className="space-y-6">
      {/* Fila de faltantes */}
      {missing.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Faltantes en recibos: {missing.length} — {missing.slice(0, 5).map((m) => `${m.legajo}/${m.periodo}`).join(', ')}{missing.length > 5 ? '…' : ''}
        </div>
      )}

      {/* OKs */}
      {oks.length > 0 && (
        <div className="text-sm text-green-700">
          Coincidencias sin diferencias: {oks.length}
        </div>
      )}

      {/* Tabla de diferencias */}
      <Table>
        <TableHeader>
          <TableRow>
            {HEADERS.map((h) => <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {summaries.map((s) => <Row key={s.key} s={s} />)}
          {summaries.length === 0 && (
            <TableRow><TableCell colSpan={HEADERS.length} className="text-center text-sm text-muted-foreground">Sin diferencias</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
