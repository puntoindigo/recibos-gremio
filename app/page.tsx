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
import { buildCsvFromRecord } from "@/lib/to-csv"
import { CODE_LABELS, CODE_KEYS, labelFor } from "@/lib/code-labels";

type ReceiptRow = {
  id: string
  filename: string
  createdAt: number
  data: Record<string, string>
  hash?: string
  hashes?: string[]
}

type UploadItem = { name: string; status: "pending" | "ok" | "error" }

const LS_KEY = "recibos_v1"
const LS_WARNED_KEY = "recibos_lswarn_v1"
const MAX_LS_ROWS = 200

const BASE_COLS = ["LEGAJO", "PERIODO", "ARCHIVO"] as const

// --- helpers de consolidación / números ---
const CODE_RE = /^\d{5}$/

function toNumber(v: unknown): number {
  if (typeof v === "number") return v
  const s = String(v ?? "").replace(/\s/g, "").trim()
  if (!s) return 0
  if (/,\d{1,2}$/.test(s)) return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0
  return parseFloat(s.replace(/,/g, "")) || 0
}
function sumAsString(a: unknown, b: unknown): string {
  return (toNumber(a) + toNumber(b)).toFixed(2)
}
function mergeRecords(base: Record<string, string>, incoming: Record<string, string>) {
  const out: Record<string, string> = { ...base }
  for (const [k, v] of Object.entries(incoming)) {
    if (CODE_RE.test(k)) out[k] = sumAsString(base[k], v)
    else out[k] = String(v ?? base[k] ?? "")
  }
  return out
}
function mergeFilenames(a?: string, b?: string) {
  const A = a?.trim() ?? ""
  const B = b?.trim() ?? ""
  if (!A) return B
  if (!B) return A
  if (A === B || A.includes(` + ${B}`) || B.includes(` + ${A}`)) return A
  return `${A} + ${B}`
}
async function sha256HexOfFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf)
  const arr = Array.from(new Uint8Array(hashBuffer))
  return arr.map(b => b.toString(16).padStart(2, "0")).join("")
}
// --- fin helpers ---

export default function Page() {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([])
  const [previewCsvId, setPreviewCsvId] = useState<string | null>(null)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [showDebug, setShowDebug] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isCode = (k: string) => /^\d{5}$/.test(k)
  const prettyKey = (k: string) => (isCode(k) ? labelFor(k) : k)
  const visibleCols = useMemo(() => [...BASE_COLS, ...CODE_KEYS], [])

  // cargar / persistir
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setReceipts(JSON.parse(raw))
    } catch {}
  }, [])
  useEffect(() => {
    try {
      if (receipts.length > MAX_LS_ROWS) {
        if (!sessionStorage.getItem(LS_WARNED_KEY)) {
          toast.warning(
            `Se dejaron de persistir datos en este punto (>${MAX_LS_ROWS} recibos) para evitar agotar memoria.`
          )
          sessionStorage.setItem(LS_WARNED_KEY, "1")
        }
        return // no persistimos más allá del límite
      }
      localStorage.setItem(LS_KEY, JSON.stringify(receipts))
    } catch {}
  }, [receipts])

  function removeReceipt(id: string) {
    setReceipts(prev => prev.filter(r => r.id !== id))
  }

  // subir y procesar
  async function handleFiles(files: FileList) {
    const arr = Array.from(files).filter(
      f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    )
    if (arr.length === 0) {
      toast.info("Sin PDFs", { description: "Selecciona al menos un archivo PDF." })
      return
    }

    setUploads(arr.map(f => ({ name: f.name, status: "pending" as const })))

    // hashes ya vistos (para dedupe)
    const seenHashes = new Set<string>(
      receipts.flatMap(r => r.hashes ?? (r.hash ? [r.hash] : []))
    )

    const { parsePdfReceiptToRecord } = await import("@/lib/pdf-parser")

    let ok = 0, fail = 0

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i]
      const tid = toast.loading(`Procesando ${file.name} (${i + 1}/${arr.length})`)

      try {
        // 1) dedupe por hash
        const fileHash = await sha256HexOfFile(file)
        if (seenHashes.has(fileHash)) {
          setUploads(prev => prev.map((u, idx) => (idx === i ? { ...u, status: "ok" } : u)))
          ok++
          toast.info(`Omitido (duplicado): ${file.name}`, { id: tid })
          continue
        }

        // 2) parsear y consolidar
        const res = await parsePdfReceiptToRecord(file)
        const parsed = (res?.data ?? {}) as Record<string, string>

        const data: Record<string, string> = {
          ARCHIVO: parsed.ARCHIVO ?? file.name,
          LEGAJO: parsed.LEGAJO ?? "-",
          PERIODO: parsed.PERIODO ?? "-",
          ...parsed,
        }

        setReceipts(prev => {
          const idx = prev.findIndex(
            r => (r.data.LEGAJO ?? "") === (data.LEGAJO ?? "") &&
                 (r.data.PERIODO ?? "") === (data.PERIODO ?? "")
          )

          if (idx === -1) {
            const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`
            seenHashes.add(fileHash)
            return [{ id, filename: file.name, createdAt: Date.now(), data, hashes: [fileHash] }, ...prev]
          }

          const current = prev[idx]
          const mergedData = mergeRecords(current.data, data)
          mergedData.ARCHIVO = mergeFilenames(current.data.ARCHIVO, data.ARCHIVO)

          const mergedHashes = Array.from(
            new Set([...(current.hashes ?? (current.hash ? [current.hash] : [])), fileHash])
          )

          const merged: ReceiptRow = {
            ...current,
            filename: mergeFilenames(current.filename, file.name),
            createdAt: Date.now(),
            data: mergedData,
            hashes: mergedHashes,
          }
          const next = [...prev]
          next[idx] = merged
          seenHashes.add(fileHash)
          return next
        })

        setUploads(prev => prev.map((u, idx2) => (idx2 === i ? { ...u, status: "ok" } : u)))
        ok++
        toast.success(`Listo: ${file.name}`, { id: tid })
      } catch (err: unknown) {
        console.error("PDF error:", err)
        setUploads(prev => prev.map((u, idx2) => (idx2 === i ? { ...u, status: "error" } : u)))
        fail++
        const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "Desconocido"
        toast.error(`Error en ${file.name}`, { description: msg, id: tid })
      }

      await new Promise(r => setTimeout(r, 0))
    }

    toast.info(`Completado: ${ok} ok · ${fail} error`, { duration: 4000 })
    if (fileInputRef.current) fileInputRef.current.value = ""
    setTimeout(() => setUploads([]), 3000)
  }

  function downloadText(filename: string, content: string) {
    const bom = "\ufeff"
    const sep = "sep=,"
    const blob = new Blob([bom, sep, "\n", content], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const aggregatedCsv = useMemo(() => {
    if (receipts.length === 0) return "LEGAJO,PERIODO,ARCHIVO\n"
    const headers = visibleCols.map(c => (isCode(c) ? labelFor(c) : c))
    const escape = (v: unknown) => {
      const s = String(v ?? "")
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = receipts.map(r =>
      visibleCols.map(c => r.data[c] ?? "").map(escape).join(",")
    )
    return [headers.map(escape).join(","), ...rows].join("\n")
  }, [receipts, visibleCols])

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

      {uploads.length > 0 && (
        <div className="mb-4 rounded-lg border p-3 bg-muted/30">
          <div className="mb-2 text-sm font-medium">
            Procesando {uploads.filter(u => u.status === "pending").length} pendiente(s) ·{" "}
            {uploads.filter(u => u.status === "ok").length} ok ·{" "}
            {uploads.filter(u => u.status === "error").length} error
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

      <label className="mb-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showDebug} onChange={(e) => setShowDebug(e.target.checked)} />
        Mostrar debug
      </label>

      {receipts.length > 0 && showDebug && (
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
            return (
              <div className="rounded-lg border p-4 bg-white">
                <div className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
                <div className="font-medium">{r.filename}</div>
                <div className="text-sm"><b>LEGAJO:</b> {r.data.LEGAJO ?? "-"}</div>
                <div className="text-sm"><b>PERIODO:</b> {r.data.PERIODO ?? "-"}</div>
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
                      {CODE_LABELS
                        .filter(([code]) => (r.data[code] ?? "") !== "")
                        .map(([code, label]) => (
                          <TableRow key={code}>
                            <TableCell className="font-mono text-xs">{label}</TableCell>
                            <TableCell className="text-xs">{r.data[code]}</TableCell>
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

      <Tabs defaultValue="agregado" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agregado">Tabla agregada</TabsTrigger>
          <TabsTrigger value="recibos">Recibos</TabsTrigger>
          <TabsTrigger value="export">Exportación</TabsTrigger>
        </TabsList>

        <TabsContent value="agregado" className="mt-4">
          <Card>
            <CardHeader className="flex items-center justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <CardTitle>Tabla agregada</CardTitle>
                <CardDescription>Vista unificada (solo columnas etiquetadas).</CardDescription>
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
                        {visibleCols.map(c => (
                          <TableHead key={c} className="whitespace-nowrap">
                            {prettyKey(c)}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receipts.map(r => (
                        <TableRow key={r.id}>
                          {visibleCols.map(c => (
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
                  {receipts.map(r => {
                    const csvText = buildCsvFromRecord(r.data)
                    const sizeBytes = new Blob([csvText]).size
                    return (
                      <div key={r.id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
                            <div className="font-medium">{r.filename}</div>
                            <div className="text-sm"><b>LEGAJO:</b> {r.data.LEGAJO ?? "-"}</div>
                            <div className="text-sm"><b>PERIODO:</b> {r.data.PERIODO ?? "-"}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setPreviewCsvId(id => (id === r.id ? null : r.id))}
                              title="Ver CSV"
                              aria-label="Ver CSV"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => downloadText(r.filename.replace(/\.pdf$/i, ".csv"), csvText)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              CSV
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => removeReceipt(r.id)} aria-label="Eliminar">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {previewCsvId === r.id && (
                          <>
                            <Separator className="my-3" />
                            <ScrollArea className="h-48 rounded border p-3">
                              <pre className="text-xs">{csvText}</pre>
                            </ScrollArea>
                          </>
                        )}

                        <Separator className="my-3" />
                        <div className="text-xs text-muted-foreground mb-2">
                          Tamaño CSV: {sizeBytes} bytes
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Clave</TableHead>
                                <TableHead>Valor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {CODE_LABELS
                                .filter(([code]) => (r.data[code] ?? "") !== "")
                                .map(([code, label]) => (
                                  <TableRow key={code}>
                                    <TableCell className="font-mono text-xs">{label}</TableCell>
                                    <TableCell className="text-xs">{r.data[code]}</TableCell>
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
                receipts.map(r => {
                  const csvText = buildCsvFromRecord(r.data)
                  const sizeBytes = new Blob([csvText]).size
                  return (
                    <div key={r.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm">
                          <span className="font-medium">{r.filename.replace(/\.pdf$/i, ".csv")}</span>{" "}
                          <span className="text-muted-foreground">({sizeBytes} bytes)</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => downloadText(r.filename.replace(/\.pdf$/i, ".csv"), csvText)}>
                            <Download className="mr-2 h-4 w-4" />
                            Descargar
                          </Button>
                          <Button variant="outline" onClick={() => setPreviewCsvId(id => (id === r.id ? null : r.id))}>
                            <Eye className="mr-2 h-4 w-4" />
                            {previewCsvId === r.id ? "Ocultar" : "Ver"}
                          </Button>
                        </div>
                      </div>
                      {previewCsvId === r.id && (
                        <ScrollArea className="mt-3 h-48 rounded border p-3">
                          <pre className="text-xs">{csvText}</pre>
                        </ScrollArea>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}
