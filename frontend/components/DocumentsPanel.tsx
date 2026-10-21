"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, FileText, Loader2, ScanLine, Trash2, UploadCloud, XCircle } from "lucide-react";
import { candidateFileUrl, deleteCandidate, uploadDocument } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Candidate } from "@/lib/types";

const ACCEPT = ".pdf,.docx,.txt,.md";
const MAX_MB = 20;

type Item = { name: string; status: "waiting" | "processing" | "done" | "failed"; error?: string };

/** อัปโหลดทีละไฟล์ตามลำดับ — central จำกัดงานหนักต่อ license อยู่แล้ว ส่งพร้อมกันก็ไม่เร็วขึ้น */
export function DocumentsPanel({
  jobId,
  candidates,
  disabled,
  onChanged,
}: {
  jobId: string;
  candidates: Candidate[];
  disabled?: boolean;
  onChanged: () => void;
}) {
  const { t, errorText } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const busy = queue.some((q) => q.status === "waiting" || q.status === "processing");

  async function upload(files: File[]) {
    if (!files.length) return;
    const start = queue.length;
    setQueue((q) => [...q, ...files.map((f) => ({ name: f.name, status: "waiting" as const }))]);
    for (let i = 0; i < files.length; i++) {
      const at = start + i;
      setQueue((q) => q.map((it, idx) => (idx === at ? { ...it, status: "processing" } : it)));
      try {
        await uploadDocument(jobId, files[i]);
        setQueue((q) => q.map((it, idx) => (idx === at ? { ...it, status: "done" } : it)));
        onChanged();
      } catch (e) {
        setQueue((q) => q.map((it, idx) => (idx === at ? { ...it, status: "failed", error: errorText(e) } : it)));
      }
    }
  }

  async function remove(c: Candidate) {
    if (!window.confirm(t("res.delete_confirm", { name: c.name }))) return;
    try {
      await deleteCandidate(c.id);
      onChanged();
    } catch (e) {
      window.alert(errorText(e));
    }
  }

  const done = queue.filter((q) => q.status === "done" || q.status === "failed").length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-accent-500">{t("res.subtitle", { mb: MAX_MB })}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) upload(Array.from(e.dataTransfer.files));
        }}
        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors disabled:opacity-50 ${
          dragging ? "border-brand-400 bg-brand-50/50" : "border-accent-300 hover:border-brand-300 hover:bg-brand-50/20"
        }`}
      >
        <UploadCloud size={22} className="text-brand-600" />
        <span className="text-sm font-medium text-accent-800">{t("res.drop")}</span>
        <span className="text-xs text-accent-400">{t("res.drop_hint")}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          upload(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />

      {queue.length > 0 && (
        <div className="rounded-xl bg-accent-50/70 p-3 ring-1 ring-accent-200/70">
          <p className="mb-2 text-xs font-medium text-accent-600">{t("res.progress", { done, total: queue.length })}</p>
          <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-xs">
            {queue.map((q, i) => (
              <li key={i} className="flex items-start gap-2">
                {q.status === "done" ? (
                  <CheckCircle2 size={14} className="mt-px shrink-0 text-emerald-600" />
                ) : q.status === "failed" ? (
                  <XCircle size={14} className="mt-px shrink-0 text-rose-600" />
                ) : q.status === "processing" ? (
                  <Loader2 size={14} className="mt-px shrink-0 animate-spin text-brand-600" />
                ) : (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-300" />
                )}
                <span className="min-w-0 flex-1 truncate text-accent-700">{q.name}</span>
                <span className={`shrink-0 ${q.status === "failed" ? "text-rose-600" : "text-accent-400"}`}>
                  {q.status === "failed" ? q.error : t(`res.status_${q.status}`)}
                </span>
              </li>
            ))}
          </ul>
          {!busy && (
            <button type="button" onClick={() => setQueue([])} className="mt-2 text-xs text-accent-500 underline hover:text-accent-800">
              {t("common.close")}
            </button>
          )}
        </div>
      )}

      {candidates.length === 0 ? (
        <p className="rounded-lg bg-accent-50 px-3 py-3 text-center text-xs text-accent-500">{t("res.empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-accent-100 overflow-hidden rounded-xl bg-white ring-1 ring-accent-200">
          {candidates.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <FileText size={16} className="shrink-0 text-accent-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-accent-900">{c.name}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-accent-400">
                  <span className="truncate">{c.filename}</span>
                  {typeof c.chunk_count === "number" && <span>{t("res.sections", { n: c.chunk_count })}</span>}
                  {c.extraction_method && c.extraction_method !== "text_layer" && (
                    <span className="flex items-center gap-0.5 text-amber-700">
                      <ScanLine size={11} /> {t("res.ocr")}
                    </span>
                  )}
                </p>
              </div>
              <a href={candidateFileUrl(c.id)} className="rounded-lg p-1.5 text-accent-400 hover:bg-accent-100 hover:text-accent-700" title={t("res.download")} aria-label={t("res.download")}>
                <Download size={15} />
              </a>
              <button type="button" onClick={() => remove(c)} className="rounded-lg p-1.5 text-accent-400 hover:bg-rose-50 hover:text-rose-600" aria-label={t("common.delete")}>
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
