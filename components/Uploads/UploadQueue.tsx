// components/Uploads/UploadQueue.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";

export type UploadStage =
  | "queued"
  | "hashing"
  | "parsing"
  | "uploading"
  | "saving"
  | "skipped"
  | "done"
  | "error";

export type QueueItem = {
  id: string;
  name: string;
  size: number;
  stage: UploadStage;
  progress: number; // 0..100
  statusText: string;
};

type Props = {
  queue: QueueItem[];
  onClear: () => void; // lo mantenemos por compatibilidad, pero no se muestra como "Ocultar visor"
};

function stageLabel(s: UploadStage): string {
  switch (s) {
    case "queued":
      return "En cola";
    case "hashing":
      return "Calculando hash";
    case "parsing":
      return "Parseando PDF";
    case "uploading":
      return "Subiendo";
    case "saving":
      return "Guardando";
    case "skipped":
      return "Omitido";
    case "done":
      return "OK";
    case "error":
      return "Error";
  }
}

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded bg-muted">
      <div className="h-full bg-primary transition-all" style={{ width: `${v}%` }} />
    </div>
  );
}

function Pill({ stage }: { stage: UploadStage }) {
  const base = "rounded-full px-2 py-0.5 text-xs font-medium";
  const cls =
    stage === "error"
      ? "bg-red-600 text-white"
      : stage === "done"
      ? "bg-emerald-600 text-white"
      : stage === "skipped"
      ? "bg-amber-500 text-white"
      : "bg-neutral-200 text-neutral-800";
  return <span className={base + " " + cls}>{stageLabel(stage)}</span>;
}

export default function UploadQueue({ queue, onClear }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (queue.length === 0) return null;

  const avg =
    queue.reduce((acc, q) => acc + Math.max(0, Math.min(100, q.progress || 0)), 0) /
    Math.max(1, queue.length);
  const done = queue.filter((q) => q.stage === "done").length;
  const skipped = queue.filter((q) => q.stage === "skipped").length;
  const errors = queue.filter((q) => q.stage === "error").length;

  return (
    <div className="mb-4 rounded-lg border bg-muted/30 p-3">
      {/* Cabecera compacta siempre visible */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-medium">
          Subidas: {done}/{queue.length} listas · {skipped} omitidas · {errors} con error
        </div>
        <div className="flex items-center gap-2">
          <div className="w-40 sm:w-64">
            <ProgressBar value={avg} />
          </div>
          <Button variant="outline" size="sm" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Ocultar detalle" : "Mostrar detalle"}
          </Button>
        </div>
      </div>

      {/* Listado detallado – solo si está expandido */}
      {expanded && (
        <>
          <div className="mb-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
              Limpiar lista
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {queue.map((q) => (
              <div key={q.id} className="rounded border bg-white p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium" title={q.name}>
                    {q.name}
                  </div>
                  <Pill stage={q.stage} />
                </div>
                <div className="mb-1 truncate text-xs text-muted-foreground" title={q.statusText}>
                  {q.statusText}
                </div>
                <ProgressBar value={q.progress} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
