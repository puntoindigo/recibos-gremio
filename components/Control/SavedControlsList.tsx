// components/Control/SavedControlsList.tsx
import { useState, useEffect } from "react";
import { Download, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SavedControlDB } from "@/lib/data-manager-singleton";
// import { repoDexie } from "@/lib/repo-dexie"; // ELIMINADO
import { exportControlErrors } from "@/lib/export-control";
import { toast } from "sonner";

type Props = {
  empresas: string[];
  refreshKey?: number;
  onViewDetails?: (control: SavedControlDB) => void;
  onCloseDetails?: () => void;
  onEmpresaChange?: (empresa: string) => void;
  onResetFields?: () => void;
  selectedEmpresa?: string;
  selectedControlId?: string | null;
  showDebug?: boolean;
};

export default function SavedControlsList({ empresas, refreshKey, onViewDetails, onCloseDetails, onEmpresaChange, onResetFields, selectedEmpresa: externalSelectedEmpresa, selectedControlId, showDebug = false }: Props) {
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("");
  
  // Sincronizar con la empresa seleccionada externamente
  useEffect(() => {
    if (externalSelectedEmpresa && externalSelectedEmpresa !== selectedEmpresa) {
      setSelectedEmpresa(externalSelectedEmpresa);
    }
  }, [externalSelectedEmpresa, selectedEmpresa]);



  // Manejar cambio de empresa en el desplegable
  const handleEmpresaChange = (empresa: string) => {
    setSelectedEmpresa(empresa);
    if (onEmpresaChange) {
      onEmpresaChange(empresa);
    }
  };
  const [savedControls, setSavedControls] = useState<SavedControlDB[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar controles guardados cuando se selecciona una empresa o cuando cambia refreshKey
  useEffect(() => {
    if (!selectedEmpresa) {
      setSavedControls([]);
      return;
    }

    const loadSavedControls = async () => {
      setLoading(true);
      try {
        const controls = await repoDexie.getSavedControlsByEmpresa(selectedEmpresa, showDebug);
        if (showDebug) {
          console.log(`🔍 SavedControlsList - Controles encontrados para ${selectedEmpresa}:`, controls.map(c => ({ periodo: c.periodo, empresa: c.empresa, filterKey: c.filterKey })));
        }
        setSavedControls(controls);
      } catch (error) {
        console.error("Error cargando controles guardados:", error);
        toast.error("Error al cargar los controles guardados");
      } finally {
        setLoading(false);
      }
    };

    void loadSavedControls();
  }, [selectedEmpresa, refreshKey]);

  // Exportar errores y faltantes de un control específico
  const handleExport = async (control: SavedControlDB) => {
    try {
      // Transformar summaries para que coincida con ControlSummary
      const transformedSummaries = control.summaries.map(summary => ({
        ...summary,
        difs: summary.difs.map(dif => ({
          ...dif,
          dir: dif.dir as "a favor" | "en contra"
        }))
      }));
      
      await exportControlErrors(transformedSummaries, control.oks, control.missing, control.nameByKey || {}, control.officialNameByKey, control.empresa, control.periodo);
      toast.success(`Control exportado: ${control.periodo}`);
    } catch (error) {
      console.error("Error exportando control:", error);
      toast.error("Error al exportar el control");
    }
  };

  // Eliminar un control guardado
  const handleDelete = async (control: SavedControlDB) => {
    if (!control.id) {
      toast.error("No se puede eliminar este control");
      return;
    }

    try {
      await repoDexie.deleteSavedControlById(control.id);
      // Actualizar la lista
      setSavedControls(prev => prev.filter(c => c.id !== control.id));
      toast.success(`Control eliminado: ${control.periodo}`);
      
      // Cerrar el panel de detalles si está abierto
      if (onCloseDetails) {
        onCloseDetails();
      }
      
      // Resetear campos del upload
      if (onResetFields) {
        onResetFields();
      }
    } catch (error) {
      console.error("Error eliminando control:", error);
      toast.error("Error al eliminar el control");
    }
  };

  // Cargar un control específico para ver sus detalles
  const handleViewDetails = async (control: SavedControlDB) => {
    try {
      // Si ya está activo, cerrar detalles
      if (selectedControlId === control.id?.toString()) {
        if (onCloseDetails) {
          onCloseDetails();
        }
        return;
      }
      
      if (onViewDetails) {
        onViewDetails(control);
      } else {
        toast.success(`Control ${control.periodo} - ${control.stats.comps} comparaciones, ${control.stats.compDif} diferencias`);
      }
    } catch (error) {
      console.error("Error cargando detalles del control:", error);
      toast.error("Error al cargar los detalles del control");
    }
  };

  // Ordenar controles por timestamp descendente (más reciente primero)
  const sortedControls = [...savedControls].sort((a, b) => {
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Controles Guardados</CardTitle>
        <CardDescription>
          Selecciona una empresa para ver los controles guardados ordenados por período
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selector de empresa */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Empresa:</label>
          <Select value={selectedEmpresa} onValueChange={handleEmpresaChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Seleccionar empresa" />
            </SelectTrigger>
            <SelectContent>
              {empresas.map((empresa) => (
                <SelectItem key={empresa} value={empresa}>
                  {empresa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista de controles */}
        {selectedEmpresa && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">Cargando controles...</div>
              </div>
            ) : sortedControls.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">
                  No hay controles guardados para {selectedEmpresa}
                </div>
              </div>
            ) : (
              <div className="w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PERIODO</TableHead>
                      <TableHead>FECHA</TableHead>
                      <TableHead className="text-center">ERRORES</TableHead>
                      <TableHead className="text-center">OK</TableHead>
                      <TableHead className="text-center">FALTANTES</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedControls.map((control) => (
                      <TableRow key={control.id}>
                        <TableCell className="font-medium">
                          {control.periodo}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {control.createdAt ? new Date(control.createdAt).toLocaleString('es-AR') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center text-red-600 font-medium">
                          {control.summaries.length}
                        </TableCell>
                        <TableCell className="text-center text-green-600 font-medium">
                          {control.oks.length}
                        </TableCell>
                        <TableCell className="text-center text-orange-600 font-medium">
                          {control.missing.length}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant={selectedControlId === control.id?.toString() ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleViewDetails(control)}
                              title="Ver detalles del control"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExport(control)}
                              disabled={control.summaries.length === 0 && control.missing.length === 0}
                              title="Exportar errores y faltantes"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(control)}
                              title="Eliminar control"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
