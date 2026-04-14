"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const list = [...e.dataTransfer.files].filter((f) => f.type === "application/pdf");
    setFiles((f) => [...f, ...list]);
  }, []);

  async function uploadOne(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/statements/upload", { method: "POST", body: fd });
    return res.json();
  }

  async function submit() {
    if (files.length === 0) {
      setStatus("Choose at least one PDF.");
      return;
    }
    setLoading(true);
    setStatus(null);
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      setPct(Math.round(((i + 0.5) / files.length) * 100));
      const r = await uploadOne(files[i]);
      if (r.ok) ok++;
      else setStatus(r.error ?? "A file failed to parse.");
      setPct(Math.round(((i + 1) / files.length) * 100));
    }
    setLoading(false);
    if (ok > 0) {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingComplete: true, skippedDebtOnboarding: false }),
      });
      router.push("/debts?new=1");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Upload statements</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          PDF only. Files are parsed in memory and not stored—only transaction rows are saved.
        </p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Drag and drop PDFs here, or</p>
        <label className="mt-3 inline-block cursor-pointer rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Browse files
          <input
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])}
          />
        </label>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          {files.map((f) => (
            <li key={f.name + f.size} className="flex justify-between rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
              {f.name}
              <button
                type="button"
                className="text-red-600"
                onClick={() => setFiles(files.filter((x) => x !== f))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {loading && (
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-zinc-500">Processing… {pct}%</p>
        </div>
      )}

      {status && <p className="text-sm text-amber-700 dark:text-amber-400">{status}</p>}

      <button
        type="button"
        disabled={loading || files.length === 0}
        onClick={submit}
        className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        Parse & continue
      </button>
    </div>
  );
}
