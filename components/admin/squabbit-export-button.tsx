"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { exportSquabbitPlayersCsv } from "@/lib/actions/squabbit";

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SquabbitExportButton({ roundId, roundName }: { roundId: string; roundName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const result = await exportSquabbitPlayersCsv(roundId);
      if (result.error) {
        setError(result.error);
        return;
      }
      downloadCsv(`${roundName.replace(/\s+/g, "_")}_squabbit_players.csv`, result.csv!);
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={handleExport}
        className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 shadow-sm hover:bg-stone-50 disabled:opacity-60"
      >
        <Download className="h-3.5 w-3.5" />
        {pending ? "Exporting…" : "Export Squabbit CSV"}
      </button>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
