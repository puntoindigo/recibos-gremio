"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, FileUp, Trash2, Eye, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { buildCsvFromRecord, buildCsvFromMany } from "@/lib/to-csv"

type ReceiptRow = {
  id: string
  filename: string
  createdAt: number
  data: Record<string, string>
  csv: string
}

type UploadItem = { name: string; status: "pending" | "ok" | "error" }

const LS_KEY = "recibos_v1"

export default function Page() {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([])
  const [previewCsvId, setPreviewCsvId] = useState<string | null>(null)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cargar desde localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setReceipts(JSON.parse(raw))
    } catch {}
  }, [])

  // Persistir en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(receipts))
    } catch {}
  }, [receipts])

  const allColumns = useMemo(() => {
    const set = new Set<string>(["LEGAJO", "PERIODO", "ARCHIVO"])
    for (const r of receipts) Object.keys(r.data).forEach((k) => set.add(k))
    return Array.from(set)
  }, [receipts])

  function removeReceipt(id: string) {
    setReceipts((prev) => prev.filter((r) => r.id !== id))
  }

  // Procesamiento EN SERIE + progreso visual
  async function handleFiles(files: FileList) {
    const arr = Array.from(files).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    )
    if (arr.length === 0) {
      toast.info("Sin PDFs", { description: "Selecciona al menos un archivo PDF." })
      return
    }

    // Mostrar cola inicial
    setUploads(arr.map((f) => ({ name: f.name, status: "pending" as const })))

    const { parsePdfReceiptToRecord } = await import("@/lib/pdf-parser")

    let ok = 0
    let fail = 0

    // PROCESAR UNO POR VEZ
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i]
      const tid = toast.loading(`Procesando ${file.name} (${i + 1}/${arr.length})`)
      try {
        // Llamada directa (sin toast.promise para evitar wrappers raros)
        const res = await parsePdfReceiptToRecord(file)
        const parsed = (res?.data ?? {}) as Record<string, string>

        // Merge de datos: dejamos base y el parser encima (para incluir 20xxx)
        const data: Record<string, string> = {
          ARCHIVO: parsed.ARCHIVO ?? file.name,
          LEGAJO: parsed.LEGAJO ?? "-",
          PERIODO: parsed.PERIODO ?? "-",
          ...parsed,
        }

        const csv = buildCsvFromRecord(data)
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`
        setReceipts((prev) => [{ id, filename: file.name, createdAt: Date.now(), data, csv }, ...prev])

        // marcar ok
        setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "ok" } : u)))
        ok++
        toast.success(`Listo: ${file.name}`, { id: tid })
      } catch (err: any) {
        console.error("PDF error:", err)
        setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "error" } : u)))
        fail++
        toast.error(`Error en ${file.name}`, { description: err?.message ?? "Desconocido", id: tid })
      }

      // Ceder el hilo para bajar warnings de "Violation"
      await new Promise((r) => setTimeout(r, 0))
    }

    // Resumen final
    toast.info(`Completado: ${ok} ok · ${fail} error`, { duration: 4000 })

    // Limpiar input para volver a subir lo mismo
    if (fileInputRef.current) fileInputRef.current.value = ""

    // Ocultar panel luego de un ratito
    setTimeout(() => setUploads([]), 3000)
  }

  function downloadText(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const aggregatedCsv = useMemo(() => buildCsvFromMany(receipts.map((r) => r.data)), [receipts])

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          Gestor de Recibos
          <span className="ml-2 text-sm text-muted-foreground">({receipts.length})</span>
        </h1>
        <p className="text-muted-foreground">
          Sube un PDF de recibo. El sistema lo lee y genera un CSV único por recibo. También puedes ver una tabla
          agregada con todos los datos.
        </p>
      </header>

      {/* Panel de progreso de subidas */}
      {uploads.length > 0 && (
        <div className="mb-4 rounded-lg border p-3 bg-muted/30">
          <div className="mb-2 text-sm font-medium">
            Procesando {uploads.filter((u) => u.status === "pending").length} pendiente(s) ·{" "}
            {uploads.filter((u) => u.status === "ok").length} ok ·{" "}
            {uploads.filter((u) => u.status === "error").length} error
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {uploads.map((u, i) => (
              <div key={`${u.name}-${i}`} className="flex items-center gap-2 rounded border bg-white px-3 py-2">
                {u.status === "pending" && <Loader2 className="h-4 w-4 animate-spin" />}
                {u.status === "ok" && <CheckCircle2 className="h-4 w-4" />}
                {u.status === "error" && <XCircle className="h-4 w-4" />}
                <span className="truncate text-sm">{u.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Subir recibos</CardTitle>
          <CardDescription>Selecciona uno o varios PDF. La lectura se realiza localmente en tu navegador.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="pdfs">Seleccionar archivos PDF</Label>
              <Input
                id="pdfs"
                type="file"
                accept="application/pdf"
                multiple
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="mr-2 h-4 w-4" />
                Subir PDFs
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vista rápida (puedes ocultarla con NODE_ENV si quieres) */}
      {receipts.length > 0 && (
        <div className="mb-6 rounded-lg border p-4 bg-amber-50/40">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold">Vista rápida (debug)</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem(LS_KEY)
                setReceipts([])
              }}
            >
              Limpiar memoria
            </Button>
          </div>
          {(() => {
            const r = receipts[0]
            const codeKeys = Object.keys(r.data).filter((k) => /^20\d{3}$/.test(k))
            return (
              <div className="rounded-lg border p-4 bg-white">
                <div className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
                <div className="font-medium">{r.filename}</div>
                <div className="text-sm">
                  <b>LEGAJO:</b> {r.data.LEGAJO ?? "-"}
                </div>
                <div className="text-sm">
                  <b>PERIODO:</b> {r.data.PERIODO ?? "-"}
                </div>
                <div className="text-sm">
                  <b>Códigos:</b> {codeKeys.length}
                </div>
                <Separator className="my-3" />
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Clave</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(r.data)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([k, v]) => (
                          <TableRow key={k}>
                            <TableCell className="font-mono text-xs">{k}</TableCell>
                            <TableCell className="text-xs">{v}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      <Tabs defaultValue="recibos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recibos">Recibos</TabsTrigger>
          <TabsTrigger value="agregado">Tabla agregada</TabsTrigger>
          <TabsTrigger value="export">Exportación</TabsTrigger>
        </TabsList>

        <TabsContent value="recibos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recibos procesados</CardTitle>
              <CardDescription>Cada item corresponde a un CSV independiente.</CardDescription>
            </CardHeader>
            <CardContent>
              {receipts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay recibos procesados.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {receipts.map((r) => {
                    const codeKeys = Object.keys(r.data).filter((k) => /^20\d{3}$/.test(k)).sort()
                    return (
                      <div key={r.id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">
                              {new Date(r.createdAt).toLocaleString()}
                            </div>
                            <div className="font-medium">{r.filename}</div>
                            <div className="text-sm">
                              <b>LEGAJO:</b> {r.data.LEGAJO ?? "-"}
                            </div>
                            <div className="text-sm">
                              <b>PERIODO:</b> {r.data.PERIODO ?? "-"}
                            </div>
                            <div className="text-sm">
                              <b>Códigos:</b> {codeKeys.length}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setPreviewCsvId((id) => (id === r.id ? null : r.id))}
                              title="Ver CSV"
                              aria-label="Ver CSV"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => downloadText(r.filename.replace(/\.pdf$/i, ".csv"), r.csv)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              CSV
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => removeReceipt(r.id)}
                              aria-label="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {previewCsvId === r.id && (
                          <>
                            <Separator className="my-3" />
                            <ScrollArea className="h-48 rounded border p-3">
                              <pre className="text-xs">{r.csv}</pre>
                            </ScrollArea>
                          </>
                        )}

                        <Separator className="my-3" />
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Clave</TableHead>
                                <TableHead>Valor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(r.data)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([k, v]) => (
                                  <TableRow key={k}>
                                    <TableCell className="font-mono text-xs">{k}</TableCell>
                                    <TableCell className="text-xs">{v}</TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agregado" className="mt-4">
          <Card>
            <CardHeader className="flex items-center justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <CardTitle>Tabla agregada</CardTitle>
                <CardDescription>Vista unificada de todos los recibos (unión de columnas).</CardDescription>
              </div>
              <Button
                variant="secondary"
                disabled={receipts.length === 0}
                onClick={() => downloadText("recibos_agregado.csv", aggregatedCsv)}
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar CSV agregado
              </Button>
            </CardHeader>
            <CardContent>
              {receipts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay datos.</p>
              ) : (
                <div className="w-full overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {allColumns.map((c) => (
                          <TableHead key={c} className="whitespace-nowrap">
                            {c}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receipts.map((r) => (
                        <TableRow key={r.id}>
                          {allColumns.map((c) => (
                            <TableCell key={c} className="text-xs">
                              {(r.data[c] ?? "").toString()}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Exportación</CardTitle>
              <CardDescription>Descarga individual o vista previa del CSV por recibo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {receipts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay archivos para exportar.</p>
              ) : (
                receipts.map((r) => (
                  <div key={r.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm">
                        <span className="font-medium">{r.filename.replace(/\.pdf$/i, ".csv")}</span>{" "}
                        <span className="text-muted-foreground">({new Blob([r.csv]).size} bytes)</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => downloadText(r.filename.replace(/\.pdf$/i, ".csv"), r.csv)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Descargar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setPreviewCsvId((id) => (id === r.id ? null : r.id))}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {previewCsvId === r.id ? "Ocultar" : "Ver"}
                        </Button>
                      </div>
                    </div>
                    {previewCsvId === r.id && (
                      <ScrollArea className="mt-3 h-48 rounded border p-3">
                        <pre className="text-xs">{r.csv}</pre>
                      </ScrollArea>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}
