// components/Control/ControlTables.tsx
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ControlSummary } from "@/lib/control-types";
import type { ControlOk } from "@/lib/export-control";

type Missing = { key: string; legajo: string; periodo: string };

type Props = {
  summaries: ControlSummary[];
  oks: ControlOk[];
  missing: Missing[];
  openDetail: Record<string, boolean>;
  onToggleDetail: (key: string) => void;
  nameByKey: Record<string, string>;
};

export default function ControlTables({
  summaries,
  oks,
  missing,
  openDetail,
  onToggleDetail,
  nameByKey,
}: Props) {
  return (
    <div className="space-y-8">
      {/* Diferencias */}
      <div>
        <div className="mb-2 font-medium">Claves con diferencias</div>
        {summaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay claves con diferencias fuera de tolerancia.</p>
        ) : (
          <div className="w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Legajo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead># Diferencias</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((s) => (
                  <TableRow key={s.key}>
                    <TableCell className="font-mono text-xs">{s.legajo}</TableCell>
                    <TableCell className="text-xs">{nameByKey[s.key] || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{s.periodo}</TableCell>
                    <TableCell className="text-xs">{s.difs.length}</TableCell>
                    <TableCell className="text-xs">
                      <Button size="sm" variant="outline" onClick={() => onToggleDetail(s.key)}>
                        {openDetail[s.key] ? "Ocultar detalle" : "Ver detalle"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Detalle (toggle) */}
      {summaries.map(
        (s) =>
          openDetail[s.key] && (
            <div key={`${s.key}-detail`} className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-medium">
                Detalle — Legajo {s.legajo} · {nameByKey[s.key] || "-"} · Período {s.periodo}
              </div>
              <div className="w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Oficial</TableHead>
                      <TableHead>Calculado</TableHead>
                      <TableHead>Δ</TableHead>
                      <TableHead>Dirección</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {s.difs.map((d, i) => (
                      <TableRow key={s.key + d.codigo + i}>
                        <TableCell className="font-mono text-xs">{d.codigo}</TableCell>
                        <TableCell className="text-xs">{d.label}</TableCell>
                        <TableCell className="text-xs">{d.oficial}</TableCell>
                        <TableCell className="text-xs">{d.calculado}</TableCell>
                        <TableCell className="text-xs">{d.delta}</TableCell>
                        <TableCell className="text-xs">{d.dir}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ),
      )}

      {/* OKs */}
      <div>
        <div className="mb-2 font-medium">Claves OK (dentro de tolerancia)</div>
        {oks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay claves OK para mostrar.</p>
        ) : (
          <div className="w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Legajo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {oks.map((o) => (
                  <TableRow key={o.key}>
                    <TableCell className="font-mono text-xs">{o.legajo}</TableCell>
                    <TableCell className="text-xs">{nameByKey[o.key] || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{o.periodo}</TableCell>
                    <TableCell className="text-xs">OK</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Oficiales sin recibo */}
      <div>
        <div className="mb-2 font-medium">Registros oficiales sin recibo</div>
        {missing.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay registros del Excel sin su recibo correspondiente.</p>
        ) : (
          <div className="w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Legajo</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {missing.map((m) => (
                  <TableRow key={m.key}>
                    <TableCell className="font-mono text-xs">{m.legajo}</TableCell>
                    <TableCell className="font-mono text-xs">{m.periodo}</TableCell>
                    <TableCell className="text-xs">oficial sin recibo</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
