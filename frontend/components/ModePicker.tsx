"use client";

import { CheckCircle2, Scale } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { JobMode } from "@/lib/types";

const MODES: { id: JobMode; icon: typeof Scale }[] = [
  { id: "compliance", icon: CheckCircle2 },
  { id: "compare", icon: Scale },
];

/** how documents are judged: pass/fail completeness check, or ranking several documents against each other */
export function ModePicker({ value, onChange, compact = false }: { value: JobMode; onChange: (m: JobMode) => void; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("mode.label")} className={`grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
      {MODES.map(({ id, icon: Icon }) => {
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(id)}
            className={`flex items-start gap-3 rounded-xl p-3 text-left ring-1 ring-inset transition ${
              on ? "bg-brand-50 ring-brand-400" : "bg-white ring-accent-200 hover:ring-brand-300"
            }`}
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${on ? "text-brand-600" : "text-accent-400"}`} />
            <span className="min-w-0">
              <span className={`block text-sm font-semibold ${on ? "text-brand-700" : "text-accent-800"}`}>{t(`mode.${id}`)}</span>
              {!compact && <span className="mt-0.5 block text-xs leading-relaxed text-accent-500">{t(`mode.${id}_desc`)}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
