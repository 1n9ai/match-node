"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { cleanRequirements, RequirementsEditor } from "@/components/RequirementsEditor";
import { ErrorNote, Loading, PageHeader } from "@/components/Shell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createTemplate, deleteTemplate, listTemplates, updateTemplate } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Requirement, Template } from "@/lib/types";

function TemplateModal({ template, onClose, onSaved }: { template: Template | null; onClose: () => void; onSaved: () => void }) {
  const { t, errorText } = useI18n();
  const [name, setName] = useState(template?.name ?? "");
  const [requirements, setRequirements] = useState<Requirement[]>(template?.requirements.map((r) => ({ ...r })) ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const body = { name, requirements: cleanRequirements(requirements) };
      if (template) await updateTemplate(template.id, body);
      else await createTemplate(body);
      onSaved();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={t(template ? "tpl.edit_title" : "tpl.new_title")} onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        <div>
          <label className="field-label">{t("tpl.name")}</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <p className="field-label">{t("req.title")}</p>
          <RequirementsEditor value={requirements} onChange={setRequirements} />
        </div>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy || !name.trim() || !cleanRequirements(requirements).length}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {t("common.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function TemplatesPage() {
  const { t, errorText } = useI18n();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [editing, setEditing] = useState<Template | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    listTemplates()
      .then((r) => setTemplates(r.templates))
      .catch((e) => setError(errorText(e)));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(tpl: Template) {
    if (!window.confirm(t("tpl.delete_confirm", { name: tpl.name }))) return;
    try {
      await deleteTemplate(tpl.id);
      load();
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <div>
      <PageHeader
        title={t("tpl.title")}
        description={t("tpl.subtitle")}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus size={15} /> {t("tpl.new")}
          </Button>
        }
      />
      <ErrorNote message={error} />

      {templates === null ? (
        !error && <Loading />
      ) : templates.length === 0 ? (
        <div className="surface flex flex-col items-center px-6 py-14 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink bg-ink-grad text-brand-300 shadow-ink">
            <ClipboardList size={22} />
          </span>
          <p className="max-w-md text-sm text-accent-500">{t("tpl.empty")}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <div key={tpl.id} className="surface flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold text-accent-900">{tpl.name}</p>
                  <p className="text-xs text-accent-500">{t("tpl.count", { n: tpl.requirements.length })}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => setEditing(tpl)} className="rounded-lg p-1.5 text-accent-400 hover:bg-accent-100 hover:text-accent-700" aria-label={t("common.edit")}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" onClick={() => remove(tpl)} className="rounded-lg p-1.5 text-accent-400 hover:bg-rose-50 hover:text-rose-600" aria-label={t("common.delete")}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <ul className="flex flex-col gap-1 text-xs text-accent-600">
                {tpl.requirements.slice(0, 4).map((r, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${r.kind === "required" ? "bg-brand-500" : "bg-accent-300"}`} />
                    <span className="line-clamp-1">{r.text}</span>
                  </li>
                ))}
                {tpl.requirements.length > 4 && <li className="pl-3 text-accent-400">…</li>}
              </ul>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TemplateModal
          template={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
