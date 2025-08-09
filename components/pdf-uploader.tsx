'use client'

import React, { useState } from "react"
import { toast } from "sonner"
import { parsePdfReceiptToRecord } from "@/lib/pdf-parser"

export default function PdfUploader({ className = "" }: { className?: string }) {
  const [file, setFile] = useState<File | null>(null)

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) setFile(e.target.files[0])
  }

  const onProcess = async () => {
    if (!file) return toast.error("Seleccioná un PDF primero")
    try {
      await toast.promise(parsePdfReceiptToRecord(file), {
        loading: "Procesando PDF...",
        success: (res) => {
          console.log("Resultado PDF:", res)
          return "PDF procesado"
        },
        error: "Error procesando PDF",
      })
    } catch (e: any) {
      toast.error("Fallo inesperado", { description: e?.message })
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <input type="file" accept="application/pdf" onChange={onChange} />
        <button onClick={onProcess} className="px-3 py-2 border rounded">
          Procesar
        </button>
      </div>
    </div>
  )
}
