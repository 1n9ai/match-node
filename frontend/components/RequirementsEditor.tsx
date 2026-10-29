"use client";

import { useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { parseRequirements } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Requirement, RequirementKind } from "@/lib/types";

export const emptyRequirement = (): Requirement => ({ text: "", kind: "required", tags: [], hard_filter: false });

/** แก้รายการข้อกำหนด + วางประกาศรับสมัครให้ AI แยกเป็นข้อ (เพิ่มต่อท้ายรายการเดิม) */
export function RequirementsEditor({
  value,
  onChange,
  withPaste = true,
  compliance = false,
  withHard = true,
}: {
  value: Requirement[];
  onChange: (next: Requirement[]) => void;
  withPaste?: boolean;
  compliance?: boolean;
  /** pack เปิดเกณฑ์ตกทันทีไหม */
  withHard?: boolean;
}) {
  const { t, errorText } = useI18n();
  const [paste, setPaste] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const update = (i: number, patch: Partial<Requirement>) => onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  async function extract() {
    setExtracting(true);
    setNote(null);
    try {
      const res = await parseRequirements(paste);
      onChange([...value.filter((r) => r.text.trim()), ...res.requirements]);
      setPaste("");
      setNote({ ok: true, text: t("req.extract_done", { n: res.requirements.length }) + (res.method === "format" ? ` ${t("req.extract_format")}` : "") });
    } catch (e) {
      setNote({ ok: false, text: errorText(e) });
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {withPaste && (
        <div className="rounded-xl bg-accent-50/70 p-3 ring-1 ring-accent-200/70">
          <label className="field-label">{t("req.paste_label")}</label>
          <textarea className="field h-24 resize-y" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={t("req.paste_ph")} />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {note ? (
              <p className={`text-xs ${note.ok ? "text-emerald-700" : "text-rose-700"}`}>{note.text}</p>
            ) : (
              <span />
            )}
            <Button variant="secondary" onClick={extract} disabled={extracting || !paste.trim()} className="px-3 py-1.5 text-xs">
              {extracting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {extracting ? t("req.extracting") : t("req.extract")}
            </Button>
          </div>
        </div>
      )}

      {value.length === 0 && <p className="rounded-lg bg-accent-50 px-3 py-3 text-center text-xs text-accent-500">{t("req.empty")}</p>}

      <ol className="flex flex-col gap-2">
        {value.map((r, i) => (
          <li key={i} className="rounded-xl bg-white p-3 ring-1 ring-accent-200">
            <div className="flex items-start gap-2">
              <span className="mt-2 w-5 shrink-0 text-right text-xs font-semibold text-accent-400">{i + 1}</span>
              <input className="field min-w-0 flex-1" value={r.text} onChange={(e) => update(i, { text: e.target.value })} placeholder={t("req.text_ph")} />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="mt-1 rounded-lg p-1.5 text-accent-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label={t("common.remove")}
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="ml-7 mt-2 flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-lg ring-1 ring-inset ring-accent-200">
                {(["required", "preferred"] as RequirementKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => update(i, { kind: k })}
                    className={`px-2.5 py-1 text-xs font-medium ${r.kind === k ? "bg-ink bg-ink-grad text-white" : "bg-white text-accent-500 hover:text-accent-800"}`}
                  >
                    {t(k === "required" ? "req.kind_required" : "req.kind_preferred")}
                  </button>
                ))}
              </div>
              {!compliance && withHard && (
              <label className="flex items-center gap-1.5 text-xs text-accent-600" title={t("req.hard_hint")}>
                <input
                  type="checkbox"
                  checked={r.hard_filter}
                  onChange={(e) => update(i, { hard_filter: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-accent-300 text-brand-600 focus:ring-brand-500"
                />
                {t("req.hard")}
              </label>
              )}
              <input
                className="field min-w-[10rem] flex-1 !py-1 !text-xs"
                value={r.tags.join(", ")}
                onChange={(e) => update(i, { tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder={t("req.tags_ph")}
              />
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => onChange([...value, emptyRequirement()])}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-accent-300 py-2.5 text-sm font-medium text-accent-600 hover:border-brand-400 hover:bg-brand-50/30 hover:text-brand-700"
      >
        <Plus size={15} /> {t("req.add")}
      </button>
    </div>
  );
}

/** ข้อกำหนดที่มีข้อความเท่านั้น (ทิ้งแถวว่าง) */
export const cleanRequirements = (list: Requirement[]) => list.filter((r) => r.text.trim()).map((r) => ({ ...r, text: r.text.trim() }));
