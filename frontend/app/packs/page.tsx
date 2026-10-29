"use client";

import { useState } from "react";
import { AlertTriangle, Boxes, FolderOpen, Loader2, Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { ErrorNote, Loading, PageHeader } from "@/components/Shell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createPack, deletePack, resetPack, updatePack } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { usePacks, usePackText } from "@/lib/packs";
import type { JobMode, Pack, PackFunction, PackText } from "@/lib/types";

const FUNCTIONS: PackFunction[] = ["ai_parse", "templates", "hard_filter", "gap_list"];
const MODES: JobMode[] = ["compliance", "compare"];

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
/** ข้อความที่ร้านพิมพ์เอง (เก็บเป็น {"_": ข้อความ}) */
const ownText = (v: PackText | null) => (v && typeof v === "object" ? Object.values(v)[0] ?? "" : "");
// เกณฑ์ตกทันทีมีผลเฉพาะโหมดเทียบหลายเอกสาร
const usableFunctions = (modes: JobMode[]) => FUNCTIONS.filter((fn) => fn !== "hard_filter" || modes.includes("compare"));

function FunctionList({ modes, value, onToggle, disabled }: { modes: JobMode[]; value: PackFunction[]; onToggle: (fn: PackFunction) => void; disabled?: boolean }) {
  const { t } = useI18n();
  return (
    <ul className="flex flex-col gap-2">
      <li className="flex items-start gap-2.5 text-xs text-accent-500">
        <input type="checkbox" checked disabled className="mt-0.5 h-3.5 w-3.5 rounded border-accent-300" />
        <span>
          <span className="font-medium text-accent-800">{t("fn.match")}</span> — {t("fn.match_desc")}
        </span>
      </li>
      {usableFunctions(modes).map((fn) => (
        <li key={fn}>
          <label className="flex cursor-pointer items-start gap-2.5 text-xs text-accent-500">
            <input
              type="checkbox"
              checked={value.includes(fn)}
              disabled={disabled}
              onChange={() => onToggle(fn)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-accent-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              <span className="font-medium text-accent-800">{t(`fn.${fn}`)}</span> — {t(`fn.${fn}_desc`)}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/** สร้าง/แก้ประเภทงานของร้าน: ตั้งชื่อเอง + เลือกโหมดและฟังก์ชัน */
function PackModal({ pack, onClose, onSaved }: { pack: Pack | null; onClose: () => void; onSaved: (p: Pack) => void }) {
  const { t, errorText } = useI18n();
  const [name, setName] = useState(ownText(pack?.name ?? null));
  const [description, setDescription] = useState(ownText(pack?.description ?? null));
  const [modes, setModes] = useState<JobMode[]>(pack?.modes ?? ["compliance"]);
  const [defaultMode, setDefaultMode] = useState<JobMode>(pack?.default_mode ?? "compliance");
  const [functions, setFunctions] = useState<PackFunction[]>(pack?.functions ?? ["ai_parse", "templates", "gap_list"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMode = (m: JobMode) => setModes((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : MODES.filter((x) => x === m || cur.includes(x))));
  const toggleFn = (fn: PackFunction) => setFunctions((cur) => (cur.includes(fn) ? cur.filter((x) => x !== fn) : [...cur, fn]));

  async function submit() {
    setBusy(true);
    setError(null);
    const body = {
      name,
      description,
      modes,
      default_mode: modes.includes(defaultMode) ? defaultMode : modes[0],
      functions: functions.filter((fn) => usableFunctions(modes).includes(fn)),
    };
    try {
      onSaved(pack ? await updatePack(pack.id, body) : await createPack(body));
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={t(pack ? "packs.edit" : "packs.new")} onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        <div>
          <label className="field-label">{t("packs.name")}</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("packs.name_ph")} maxLength={80} autoFocus />
        </div>
        <div>
          <label className="field-label">{t("packs.description")}</label>
          <textarea
            className="field h-16 resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("packs.description_ph")}
            maxLength={300}
          />
        </div>
        <div>
          <p className="field-label">{t("packs.modes")}</p>
          <div className="flex flex-col gap-2">
            {MODES.map((m) => (
              <label key={m} className="flex cursor-pointer items-start gap-2.5 text-xs text-accent-500">
                <input
                  type="checkbox"
                  checked={modes.includes(m)}
                  onChange={() => toggleMode(m)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-accent-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  <span className="font-medium text-accent-800">{t(`mode.${m}`)}</span> — {t(`mode.${m}_desc`)}
                </span>
              </label>
            ))}
          </div>
          {modes.length > 1 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-accent-600">
              <span>{t("packs.default_mode")}</span>
              <select className="field !w-auto !py-1 !text-xs" value={defaultMode} onChange={(e) => setDefaultMode(e.target.value as JobMode)}>
                {modes.map((m) => (
                  <option key={m} value={m}>
                    {t(`mode.${m}`)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div>
          <p className="field-label">{t("packs.functions")}</p>
          <FunctionList modes={modes} value={functions} onToggle={toggleFn} />
        </div>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy || !name.trim() || !modes.length}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : pack ? <Save size={15} /> : <Plus size={15} />}
            {t(pack ? "common.save" : "packs.create")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const SOURCE_BADGE: Record<Pack["source"], string> = { sample: "packs.sample", file: "packs.file", app: "packs.own" };

function PackCard({
  pack,
  onSaved,
  onEdit,
  onDeleted,
  onError,
}: {
  pack: Pack;
  onSaved: (p: Pack) => void;
  onEdit: () => void;
  onDeleted: () => void;
  onError: (e: unknown) => void;
}) {
  const { t } = useI18n();
  const { text } = usePackText(pack);
  const [busy, setBusy] = useState(false);
  const own = pack.source === "app";

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  const save = (body: { enabled?: boolean; functions?: PackFunction[] }) => run(async () => onSaved(await updatePack(pack.id, body)));
  const reset = () => run(async () => onSaved(await resetPack(pack.id)));
  const remove = () => {
    if (!window.confirm(t("packs.delete_confirm", { name: text(pack.name) }))) return;
    run(async () => {
      await deletePack(pack.id);
      onDeleted();
    });
  };
  const toggle = (fn: PackFunction) =>
    save({ functions: pack.functions.includes(fn) ? pack.functions.filter((f) => f !== fn) : [...pack.functions, fn] });

  return (
    <section data-ui="pack-card" className={`surface flex flex-col gap-4 p-5 ${pack.enabled ? "" : "opacity-70"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink bg-ink-grad text-brand-300 shadow-ink">
            <Boxes size={18} />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-accent-900">
              <span className="break-words">{text(pack.name)}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${own ? "bg-brand-50 text-brand-700" : "bg-accent-100 text-accent-500"}`}>
                {t(SOURCE_BADGE[pack.source])}
              </span>
            </p>
            {pack.description && <p className="mt-0.5 break-words text-xs text-accent-500">{text(pack.description)}</p>}
            <p className="mt-1 text-[11px] text-accent-400">
              {t("packs.modes")}: {pack.modes.map((m) => t(`mode.${m}`)).join(" · ")}
            </p>
          </div>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-accent-700">
          <input
            type="checkbox"
            checked={pack.enabled}
            disabled={busy}
            onChange={(e) => save({ enabled: e.target.checked })}
            className="h-4 w-4 rounded border-accent-300 text-brand-600 focus:ring-brand-500"
          />
          {pack.enabled ? t("packs.on") : t("packs.off")}
        </label>
      </div>

      <div className="border-t border-accent-100 pt-3">
        <p className="field-label">{t("packs.functions")}</p>
        <FunctionList modes={pack.modes} value={pack.functions} onToggle={toggle} disabled={busy} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {own && (
            <>
              <button type="button" onClick={onEdit} disabled={busy} className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-900">
                <Pencil size={12} /> {t("packs.edit_short")}
              </button>
              <button type="button" onClick={remove} disabled={busy} className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700">
                <Trash2 size={12} /> {t("packs.delete")}
              </button>
            </>
          )}
          {!own && !sameSet(pack.functions, pack.default_functions) && (
            <button type="button" onClick={reset} disabled={busy} className="flex items-center gap-1 text-xs font-medium text-accent-500 hover:text-accent-800">
              <RotateCcw size={12} /> {t("packs.reset")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default function PacksPage() {
  const { t, errorText } = useI18n();
  const { packs, broken, setPacks, reload } = usePacks();
  const [editing, setEditing] = useState<Pack | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const replace = (p: Pack) => {
    setError(null);
    setPacks((list) => {
      const cur = list ?? [];
      return cur.some((x) => x.id === p.id) ? cur.map((x) => (x.id === p.id ? p : x)) : [...cur, p];
    });
  };

  return (
    <div>
      <PageHeader
        title={t("packs.title")}
        description={t("packs.subtitle")}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus size={15} /> {t("packs.new")}
          </Button>
        }
      />
      <ErrorNote message={error} />
      {broken.length > 0 && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {t("packs.broken", { files: broken.join(", ") })}
        </p>
      )}
      {packs === null ? (
        <Loading />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {packs.map((p) => (
            <PackCard
              key={p.id}
              pack={p}
              onSaved={replace}
              onEdit={() => setEditing(p)}
              onDeleted={() => {
                setError(null);
                reload();
              }}
              onError={(e) => setError(errorText(e))}
            />
          ))}
        </div>
      )}
      <p className="mt-6 flex items-start gap-2 text-xs text-accent-500">
        <FolderOpen size={14} className="mt-px shrink-0" /> {t("packs.own_hint")}
      </p>
      {editing && (
        <PackModal
          pack={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(p) => {
            replace(p);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
