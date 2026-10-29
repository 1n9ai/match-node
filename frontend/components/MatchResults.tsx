"use client";

import { useState } from "react";
import { Check, CheckCircle2, ChevronDown, ClipboardList, Copy, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { CandidateResult, MatchResult, MatchStatus } from "@/lib/types";

const STATUS_STYLE: Record<MatchStatus, { dot: string; pill: string; key: string }> = {
  found: { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", key: "match.found" },
  uncertain: { dot: "bg-amber-400", pill: "bg-amber-50 text-amber-700 ring-amber-200", key: "match.uncertain" },
  missing: { dot: "bg-accent-300", pill: "bg-accent-100 text-accent-500 ring-accent-200", key: "match.missing" },
  failed: { dot: "bg-rose-500", pill: "bg-rose-50 text-rose-700 ring-rose-200", key: "match.failed" },
};

/** รายการ "ยังขาดอะไร" ของเอกสารหนึ่งฉบับ — ข้อที่ไม่เจอ/ไม่ชัด ข้อบังคับขึ้นก่อน (สร้างจากผลตรวจ ไม่เรียก AI เพิ่ม) */
function GapList({ r }: { r: CandidateResult }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const gaps = r.requirements
    .filter((q) => q.status !== "found")
    .sort((a, b) => Number(b.kind === "required") - Number(a.kind === "required") || a.index - b.index);

  async function copy() {
    const lines = gaps.map((q) => `- ${q.text} (${t(STATUS_STYLE[q.status].key)}${q.kind === "required" ? `, ${t("req.kind_required")}` : ""})`);
    try {
      await navigator.clipboard.writeText([`${t("gap.title")}: ${r.candidate.name}`, ...lines].join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* เบราว์เซอร์ไม่ให้คัดลอก — ผู้ใช้เลือกข้อความเองได้ */
    }
  }

  return (
    <div data-ui="gap-list" className="mx-4 mb-1 mt-3 rounded-lg bg-amber-50/60 px-3 py-2.5 ring-1 ring-inset ring-amber-200/70">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
          <ClipboardList size={13} /> {gaps.length ? t("gap.title_n", { n: gaps.length }) : t("gap.none")}
        </p>
        {gaps.length > 0 && (
          <button type="button" onClick={copy} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100">
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? t("gap.copied") : t("gap.copy")}
          </button>
        )}
      </div>
      {gaps.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-1">
          {gaps.map((q) => (
            <li key={q.index} className="flex items-start gap-2 text-xs text-accent-800">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${STATUS_STYLE[q.status].dot}`} />
              <span>
                {q.text}
                {q.kind === "required" && <span className="ml-1 text-[10px] font-semibold uppercase text-accent-400">{t("req.kind_required")}</span>}
                <span className="ml-1 text-[10px] text-accent-400">· {t(STATUS_STYLE[q.status].key)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ rank, r, compliance, gapList }: { rank: number; r: CandidateResult; compliance: boolean; gapList: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(rank === 1);
  return (
    <li className={`rounded-xl bg-white ring-1 ${r.passed_hard_filters ? "ring-accent-200" : "ring-rose-200"}`}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 p-4 text-left">
        {compliance ? (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
              r.passed_hard_filters ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}
          >
            {r.passed_hard_filters ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          </span>
        ) : (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
              rank <= 3 && r.passed_hard_filters ? "bg-ink bg-ink-grad text-brand-300 shadow-ink" : "bg-accent-100 text-accent-500"
            }`}
          >
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-accent-900">{r.candidate.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-medium text-accent-800">{t("match.required", { found: r.required_found, total: r.required_total })}</span>
            {r.preferred_total > 0 && <span className="text-accent-500">{t("match.preferred", { found: r.preferred_found, total: r.preferred_total })}</span>}
            {r.uncertain_total > 0 && <span className="text-amber-700">{t("match.uncertain_count", { n: r.uncertain_total })}</span>}
            {!r.passed_hard_filters && (
              <span className="flex items-center gap-1 font-medium text-rose-700">
                <ShieldAlert size={12} />
                {compliance ? t("match.verdict_fail", { n: r.failed_hard_filters.length }) : t("match.hard_failed")}
              </span>
            )}
            {r.passed_hard_filters && r.requirements.some((q) => q.hard_filter) && (
              <span className="flex items-center gap-1 font-medium text-emerald-700">
                <ShieldCheck size={12} /> {compliance ? t("match.verdict_pass") : t("match.hard_ok")}
              </span>
            )}
            {(r.failed_total ?? 0) > 0 && <span className="text-rose-700">{t("match.failed_count", { n: r.failed_total ?? 0 })}</span>}
          </div>
          {/* แถบสถานะรายข้อ — ดูภาพรวมได้ในแวบเดียว */}
          <div className="mt-2 flex flex-wrap gap-1">
            {r.requirements.map((q) => (
              <span key={q.index} title={`${q.index + 1}. ${q.text}`} className={`h-2 w-5 rounded-full ${STATUS_STYLE[q.status].dot}`} />
            ))}
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs text-accent-400">
          {open ? t("match.hide_details") : t("match.show_details")}
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && gapList && <GapList r={r} />}
      {open && (
        <ol className="flex flex-col gap-2 border-t border-accent-100 px-4 py-3">
          {r.requirements.map((q) => {
            const s = STATUS_STYLE[q.status];
            return (
              <li key={q.index} className="grid gap-1 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-3">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${s.pill}`}>{t(s.key)}</span>
                  <span className="text-xs text-accent-800">
                    {q.text}
                    {q.kind === "required" && <span className="ml-1 text-[10px] font-semibold uppercase text-accent-400">{t("req.kind_required")}</span>}
                    {q.hard_filter && <span className="ml-1 text-[10px] font-semibold uppercase text-rose-600">{t("req.hard")}</span>}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  {q.reason && (
                    <p className={`text-xs font-medium ${q.status === "failed" ? "text-rose-700" : q.status === "found" ? "text-emerald-700" : "text-amber-700"}`}>
                      {t("match.reason")}: {q.reason}
                    </p>
                  )}
                  <p className="whitespace-pre-line break-words rounded-lg bg-accent-50 px-2.5 py-1.5 text-xs leading-relaxed text-accent-600">
                    {q.evidence ? (
                      <>
                        <span className="mr-1 font-medium text-accent-400">{t("match.evidence")}:</span>
                        {q.evidence}
                      </>
                    ) : (
                      <span className="text-accent-400">{t("match.no_evidence")}</span>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </li>
  );
}

export function MatchResults({ result, gapList = false }: { result: MatchResult; gapList?: boolean }) {
  const { t } = useI18n();
  const compliance = (result.mode ?? "compare") === "compliance";
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-accent-500">{t(result.scorer === "cross-encoder" ? "match.scorer_rerank" : "match.scorer_cosine")}</p>
      <ol className="flex flex-col gap-2.5">
        {result.candidates.map((r, i) => (
          <Row key={r.candidate.id} rank={i + 1} r={r} compliance={compliance} gapList={gapList} />
        ))}
      </ol>
      <p className="text-[11px] text-accent-400">{t("match.disclaimer")}</p>
    </div>
  );
}
