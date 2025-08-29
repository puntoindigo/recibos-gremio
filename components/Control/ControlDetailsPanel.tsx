// components/Control/ControlDetailsPanel.tsx
import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SavedControlDB, ControlSummary, ControlOkRow } from "@/lib/db";
import type { DiffItem } from "@/lib/control-types";

type Props = {
  control: SavedControlDB | null;
  onClose: () => void;
  nameByKey: Record<string, string>;
  officialNameByKey?: Record<string, string>;
};

export default function ControlDetailsPanel({ control, onClose, nameByKey, officialNameByKey }: Props) {
  const [activeTab, setActiveTab] = useState("diferencias");
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState<number>(1);

  if (!control) return null;

  // Componente de paginación reutilizable
  const PaginationControls = ({ 
    totalItems, 
    currentItems, 
    currentPage, 
    totalPages, 
    onPageChange, 
    onPageSizeChange 
  }: {
    totalItems: number;
    currentItems: number;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  }) => (
    <div className="flex items-center gap-3">
      <div className="text-sm text-muted-foreground">Mostrando {currentItems} de {totalItems}</div>
      <div className="ml-auto flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Registros por página</span>
        <Select value={String(pageSize)} onValueChange={(v) => { 
          onPageChange(1); 
          onPageSizeChange(Number(v) || 50); 
        }}>
          <SelectTrigger className="w-24"><SelectValue placeholder="50" /></SelectTrigger>
          <SelectContent>
            {[25, 50, 100, 200].map((n: number) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>←</Button>
          <div className="text-sm tabular-nums">{currentPage} / {totalPages}</div>
          <Button size="sm" variant="outline" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>→</Button>
        </div>
      </div>
    </div>
  );

  // Lógica de paginación para diferencias
  const totalDifPages = Math.max(1, Math.ceil(control.summaries.length / pageSize));
  const difPageSummaries = useMemo(() => {
    const start = (page - 1) * pageSize;
    return control.summaries.slice(start, start + pageSize);
  }, [control.summaries, page, pageSize]);

  // Lógica de paginación para OKs
  const totalOkPages = Math.max(1, Math.ceil(control.oks.length / pageSize));
  const okPageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return control.oks.slice(start, start + pageSize);
  }, [control.oks, page, pageSize]);

  // Lógica de paginación para faltantes
  const totalMissingPages = Math.max(1, Math.ceil(control.missing.length / pageSize));
  const missingPageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return control.missing.slice(start, start + pageSize);
  }, [control.missing, page, pageSize]);

  // Resetear página cuando cambia la solapa
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
  };

  // Ajustar página si excede el total
  if (activeTab === "diferencias" && page > totalDifPages) {
    setPage(totalDifPages);
  } else if (activeTab === "ok" && page > totalOkPages) {
    setPage(totalOkPages);
  } else if (activeTab === "faltantes" && page > totalMissingPages) {
    setPage(totalMissingPages);
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">
          Detalles del Control - {control.empresa} - {control.periodo}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="diferencias">
              ERRORES ({control.summaries.length})
            </TabsTrigger>
            <TabsTrigger value="ok">
              OK ({control.oks.length})
            </TabsTrigger>
            <TabsTrigger value="faltantes">
              FALTANTES ({control.missing.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="diferencias" className="mt-4">
            {control.summaries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay diferencias detectadas
              </div>
            ) : (
              <div className="space-y-4">
                {/* Paginación superior */}
                <PaginationControls
                  totalItems={control.summaries.length}
                  currentItems={difPageSummaries.length}
                  currentPage={page}
                  totalPages={totalDifPages}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />

                {/* Listado de diferencias */}
                {difPageSummaries.map((summary, index) => (
                  <Card key={summary.key}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        {summary.legajo} - {nameByKey[summary.key] || "N/A"} - {summary.periodo}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Concepto</TableHead>
                            <TableHead className="text-right">Oficial</TableHead>
                            <TableHead className="text-right">Calculado</TableHead>
                            <TableHead className="text-right">Diferencia</TableHead>
                            <TableHead className="text-center">Dirección</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.difs.map((diff, diffIndex) => (
                            <TableRow key={diffIndex}>
                              <TableCell className="font-mono text-sm">{diff.codigo}</TableCell>
                              <TableCell>{diff.label}</TableCell>
                              <TableCell className="text-right font-mono">{diff.oficial}</TableCell>
                              <TableCell className="text-right font-mono">{diff.calculado}</TableCell>
                              <TableCell className="text-right font-mono">{diff.delta}</TableCell>
                              <TableCell className="text-center">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  diff.dir === "a favor" 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-red-100 text-red-800"
                                }`}>
                                  {diff.dir}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}

                {/* Paginación inferior */}
                <PaginationControls
                  totalItems={control.summaries.length}
                  currentItems={difPageSummaries.length}
                  currentPage={page}
                  totalPages={totalDifPages}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="ok" className="mt-4">
            {control.oks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay registros OK
              </div>
            ) : (
              <div className="space-y-4">
                {/* Paginación superior */}
                <PaginationControls
                  totalItems={control.oks.length}
                  currentItems={okPageItems.length}
                  currentPage={page}
                  totalPages={totalOkPages}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />

                {/* Tabla de OKs */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Legajo</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Período</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {okPageItems.map((ok) => (
                      <TableRow key={ok.key}>
                        <TableCell className="font-mono">{ok.legajo}</TableCell>
                        <TableCell>{nameByKey[ok.key] || "N/A"}</TableCell>
                        <TableCell>{ok.periodo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Paginación inferior */}
                <PaginationControls
                  totalItems={control.oks.length}
                  currentItems={okPageItems.length}
                  currentPage={page}
                  totalPages={totalOkPages}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="faltantes" className="mt-4">
            {control.missing.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay registros faltantes
              </div>
            ) : (
              <div className="space-y-4">
                {/* Paginación superior */}
                <PaginationControls
                  totalItems={control.missing.length}
                  currentItems={missingPageItems.length}
                  currentPage={page}
                  totalPages={totalMissingPages}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />

                {/* Tabla de faltantes */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Legajo</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Período</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missingPageItems.map((missing) => (
                      <TableRow key={missing.key}>
                        <TableCell className="font-mono">{missing.legajo}</TableCell>
                        <TableCell>{officialNameByKey?.[missing.key] || "N/A"}</TableCell>
                        <TableCell>{missing.periodo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Paginación inferior */}
                <PaginationControls
                  totalItems={control.missing.length}
                  currentItems={missingPageItems.length}
                  currentPage={page}
                  totalPages={totalMissingPages}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
