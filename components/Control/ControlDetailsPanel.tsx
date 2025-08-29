// components/Control/ControlDetailsPanel.tsx
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  if (!control) return null;

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                {control.summaries.map((summary, index) => (
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
              </div>
            )}
          </TabsContent>

          <TabsContent value="ok" className="mt-4">
            {control.oks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay registros OK
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Legajo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Período</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {control.oks.map((ok) => (
                    <TableRow key={ok.key}>
                      <TableCell className="font-mono">{ok.legajo}</TableCell>
                      <TableCell>{nameByKey[ok.key] || "N/A"}</TableCell>
                      <TableCell>{ok.periodo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="faltantes" className="mt-4">
            {control.missing.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay registros faltantes
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Legajo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Período</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {control.missing.map((missing) => (
                    <TableRow key={missing.key}>
                      <TableCell className="font-mono">{missing.legajo}</TableCell>
                      <TableCell>{officialNameByKey?.[missing.key] || "N/A"}</TableCell>
                      <TableCell>{missing.periodo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
