"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { repoDexie } from "@/lib/repo-dexie";

interface DescuentosPanelProps {
  showDebug?: boolean;
  consolidatedData?: any[];
}

export function DescuentosPanel({ showDebug = false, consolidatedData = [] }: DescuentosPanelProps) {
  const [empresaFiltro, setEmpresaFiltro] = useState<string>("Todas");
  const [nombreFiltro, setNombreFiltro] = useState<string>("");
  const [legajoFiltro, setLegajoFiltro] = useState<string>("");

  // Obtener empresas únicas
  const empresas = useMemo(() => {
    const empresasSet = new Set(consolidatedData.map(item => String(item.data?.EMPRESA ?? "LIMPAR").trim()).filter(Boolean));
    const empresasArray = Array.from(empresasSet).sort();
    
    if (showDebug) {
      console.log("🔍 DescuentosPanel - Datos consolidados:", consolidatedData.length);
      console.log("🔍 DescuentosPanel - Empresas encontradas:", empresasArray);
    }
    
    return empresasArray;
  }, [consolidatedData, showDebug]);

  // Filtrar datos
  const datosFiltrados = useMemo(() => {
    let filtrados = consolidatedData;

    // Filtrar por empresa
    if (empresaFiltro !== "Todas") {
      filtrados = filtrados.filter(item => String(item.data?.EMPRESA ?? "LIMPAR").trim() === empresaFiltro);
    }

    // Filtrar por nombre
    if (nombreFiltro.trim()) {
      const nombreLower = nombreFiltro.toLowerCase().trim();
      filtrados = filtrados.filter(item => 
        item.nombre && item.nombre.toLowerCase().includes(nombreLower)
      );
    }

    // Filtrar por legajo
    if (legajoFiltro.trim()) {
      const legajoLower = legajoFiltro.toLowerCase().trim();
      filtrados = filtrados.filter(item => 
        item.legajo && item.legajo.toLowerCase().includes(legajoLower)
      );
    }

    if (showDebug) {
      console.log("🔍 DescuentosPanel - Filtros aplicados:", {
        empresa: empresaFiltro,
        nombre: nombreFiltro,
        legajo: legajoFiltro,
        resultados: filtrados.length
      });
    }

    return filtrados;
  }, [consolidatedData, empresaFiltro, nombreFiltro, legajoFiltro, showDebug]);

  return (
    <div className="space-y-4">
      {/* Filtros inline */}
      <div className="flex flex-wrap gap-4 items-end">
        {/* Filtro por empresa */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Empresa</label>
          <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas</SelectItem>
              {empresas.map(empresa => (
                <SelectItem key={empresa} value={empresa}>
                  {empresa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por nombre */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Nombre</label>
          <Input
            placeholder="Buscar por nombre..."
            value={nombreFiltro}
            onChange={(e) => setNombreFiltro(e.target.value)}
            className="w-[200px]"
          />
        </div>

        {/* Filtro por legajo */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Legajo</label>
          <Input
            placeholder="Buscar por legajo..."
            value={legajoFiltro}
            onChange={(e) => setLegajoFiltro(e.target.value)}
            className="w-[150px]"
          />
        </div>
      </div>

      {/* Tabla de resultados */}
      <Card>
        <CardHeader>
          <CardTitle>
            Resultados ({datosFiltrados.length} registros)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>LEGAJO</TableHead>
                  <TableHead>NOMBRE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No se encontraron registros con los filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  datosFiltrados.map((item, index) => (
                    <TableRow key={`${item.legajo}-${item.periodo}-${index}`}>
                      <TableCell className="font-mono">{item.legajo}</TableCell>
                      <TableCell>{item.nombre}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
