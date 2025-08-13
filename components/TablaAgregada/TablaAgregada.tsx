// components/TablaAgregada/TablaAgregada.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ArchivosCell from "@/components/TablaAgregada/ArchivosCell";
import type { ConsolidatedRow } from "@/lib/repo";
import { labelFor } from "@/lib/code-labels";

type Props = {
  rows: ConsolidatedRow[];
  visibleCols: string[];
  nameByKey: Record<string, string>;
};

export default function TablaAgregada({ rows, visibleCols, nameByKey }: Props) {
  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {visibleCols.map((c) => (
              <TableHead key={c} className="whitespace-nowrap">
                {/^\d{5}$/.test(c) ? labelFor(c) : c}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.key}>
              {visibleCols.map((c) => (
                <TableCell key={c} className="text-xs">
                  {c === "ARCHIVO" ? (
                    <ArchivosCell
                      value={
                        r.archivos && r.archivos.length
                          ? r.archivos.map((n) => ({ name: n }))
                          : r.data.ARCHIVO ?? ""
                      }
                    />
                  ) : c === "NOMBRE" ? (
                    r.nombre || r.data.NOMBRE || nameByKey[r.key] || ""
                  ) : c === "LEGAJO" ? (
                    r.legajo
                  ) : c === "PERIODO" ? (
                    r.periodo
                  ) : (
                    r.data[c] ?? ""
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
