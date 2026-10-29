"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Boxes, Briefcase, FileText, ListChecks, Loader2, Plus } from "lucide-react";
import { cleanRequirements, RequirementsEditor } from "@/components/RequirementsEditor";
import { ErrorNote, Loading, PageHeader } from "@/components/Shell";
import { Button } from "@/components/ui/Button";
import { ModePicker } from "@/components/ModePicker";
import { Modal } from "@/components/ui/Modal";
import { createJob, getSettings, listJobs, listTemplates } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { findPack, usePacks, usePackText } from "@/lib/packs";
import type { Job, JobMode, Pack, Requirement, Template } from "@/lib/types";

/** เลือกประเภทงาน (pack) — แสดงเมื่อเปิดไว้มากกว่าหนึ่ง */
function PackPicker({ packs, value, onChange }: { packs: Pack[]; value: string; onChange: (id: string) => void }) {
  const { t } = useI18n();
  const { text } = usePackText();
  return (
    <div role="radiogroup" aria-label={t("pack.label")} data-ui="pack-picker" className="grid gap-2 sm:grid-cols-2">
      {packs.map((p) => {
        const on = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(p.id)}
            className={`flex items-start gap-3 rounded-xl p-3 text-left ring-1 ring-inset transition ${
              on ? "bg-brand-50 ring-brand-400" : "bg-white ring-accent-200 hover:ring-brand-300"
            }`}
          >
            <Boxes size={18} className={`mt-0.5 shrink-0 ${on ? "text-brand-600" : "text-accent-400"}`} />
            <span className="min-w-0">
              <span className={`block text-sm font-semibold ${on ? "text-brand-700" : "text-accent-800"}`}>{text(p.name)}</span>
              {p.description && <span className="mt-0.5 block text-xs leading-relaxed text-accent-500">{text(p.description)}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function NewJobModal({ packs, initialPack, templates, onClose }: { packs: Pack[]; initialPack: string; templates: Template[]; onClose: () => void }) {
  const { t, errorText } = useI18n();
  const router = useRouter();
  const [packId, setPackId] = useState(initialPack);
  const pack = findPack(packs, packId) ?? packs[0];
  const { tp, has } = usePackText(pack);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [mode, setMode] = useState<JobMode>(pack?.default_mode ?? "compliance");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const packTemplates = templates.filter((tpl) => !tpl.pack || tpl.pack === pack?.id);

  function pickPack(id: string) {
    const next = findPack(packs, id);
    if (!next) return;
    setPackId(id);
    setMode(next.default_mode);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const job = await createJob({ title, description, requirements: cleanRequirements(requirements), mode, pack: pack?.id });
      router.push(`/job/?id=${job.id}`);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={tp("jobform.title")} onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        {packs.length > 1 && (
          <div>
            <p className="field-label">{t("pack.label")}</p>
            <PackPicker packs={packs} value={pack?.id ?? ""} onChange={pickPack} />
            <Link href="/packs/" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
              <Plus size={12} /> {t("pack.make_own")}
            </Link>
          </div>
        )}
        <div>
          <label className="field-label">{tp("jobform.name")}</label>
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("jobform.name_ph")} autoFocus />
        </div>
        <div>
          <label className="field-label">{t("jobform.description")}</label>
          <textarea className="field h-16 resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("jobform.description_ph")} />
        </div>
        {(pack?.modes.length ?? 2) > 1 && (
          <div>
            <p className="field-label">{t("mode.label")}</p>
            <ModePicker value={mode} onChange={setMode} modes={pack?.modes} />
          </div>
        )}
        {has("templates") && packTemplates.length > 0 && (
          <div>
            <label className="field-label">{t("jobform.template")}</label>
            <select
              className="field"
              defaultValue=""
              onChange={(e) => {
                const tpl = packTemplates.find((x) => x.id === e.target.value);
                setRequirements(tpl ? tpl.requirements.map((r) => ({ ...r })) : []);
              }}
            >
              <option value="">{t("jobform.no_template")}</option>
              {packTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} · {t("tpl.count", { n: tpl.requirements.length })}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <p className="field-label">{tp("req.title")}</p>
          <RequirementsEditor
            value={requirements}
            onChange={setRequirements}
            compliance={mode === "compliance"}
            withPaste={has("ai_parse")}
            withHard={has("hard_filter")}
          />
        </div>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy || !title.trim() || !pack}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {t("jobform.create")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function JobsPage() {
  const { t, errorText, fmtDateTime } = useI18n();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [ready, setReady] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { packs } = usePacks();
  const { text } = usePackText();
  const [filter, setFilter] = useState<string>("all");
  const enabledPacks = useMemo(() => (packs ?? []).filter((p) => p.enabled), [packs]);
  // แท็บกรอง: pack ที่เปิดอยู่ + pack ที่ปิดแล้วแต่ยังมีงานค้าง
  const tabs = useMemo(() => (packs ?? []).filter((p) => p.enabled || (jobs ?? []).some((j) => j.pack === p.id)), [packs, jobs]);
  const shownJobs = filter === "all" ? jobs : (jobs ?? []).filter((j) => j.pack === filter);
  const packName = (id: string) => {
    const p = findPack(packs, id);
    return p ? text(p.name) : id;
  };

  useEffect(() => {
    listJobs()
      .then((r) => setJobs(r.jobs))
      .catch((e) => setError(errorText(e)));
    listTemplates()
      .then((r) => setTemplates(r.templates))
      .catch(() => setTemplates([]));
    // ยังไม่มี LLM หรือ embedding ค่าเริ่มต้น → ชวนไปตั้งค่าก่อน
    getSettings()
      .then(({ settings }) => setReady(!!settings.defaults.embedding && !!settings.defaults.llm))
      .catch(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader
        title={t("jobs.title")}
        description={t("jobs.subtitle")}
        actions={
          <Button onClick={() => setCreating(true)} disabled={!ready}>
            <Plus size={15} /> {t("jobs.new")}
          </Button>
        }
      />
      <ErrorNote message={error} />

      {!ready && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} /> {t("jobs.setup_needed")}
          </span>
          <Link href="/settings/" className="font-semibold underline">
            {t("jobs.go_settings")}
          </Link>
        </div>
      )}

      {tabs.length > 1 && (jobs?.length ?? 0) > 0 && (
        <div data-ui="pack-tabs" role="tablist" className="mb-4 flex flex-wrap gap-1.5">
          {[{ id: "all", label: t("pack.all") }, ...tabs.map((p) => ({ id: p.id, label: text(p.name) }))].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                filter === tab.id ? "bg-ink bg-ink-grad text-white ring-transparent" : "bg-white text-accent-600 ring-accent-200 hover:text-accent-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {jobs === null || shownJobs === null ? (
        !error && <Loading />
      ) : shownJobs.length === 0 ? (
        <div className="surface flex flex-col items-center px-6 py-14 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink bg-ink-grad text-brand-300 shadow-ink">
            <Briefcase size={22} />
          </span>
          <p className="text-base font-semibold text-accent-900">{t("jobs.empty_title")}</p>
          <p className="mt-1 max-w-md text-sm text-accent-500">{t("jobs.empty_body")}</p>
          <Button onClick={() => setCreating(true)} disabled={!ready} className="mt-5">
            <Plus size={15} /> {t("jobs.new")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shownJobs.map((job) => (
            <Link key={job.id} href={`/job/?id=${job.id}`} className="surface group flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft-lg">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 break-words text-base font-semibold text-accent-900">{job.title}</p>
                <ArrowRight size={16} className="mt-1 shrink-0 text-accent-300 transition-colors group-hover:text-brand-600" />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-accent-500">
                {tabs.length > 1 && (
                  <span className="flex items-center gap-1 font-medium text-brand-700">
                    <Boxes size={13} /> {packName(job.pack)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FileText size={13} /> {t("jobs.candidates", { n: job.candidate_count })}
                </span>
                <span className="flex items-center gap-1">
                  <ListChecks size={13} /> {t("jobs.requirements", { n: job.requirements.length })}
                </span>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 text-[11px]">
                {!job.embedding_available ? (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700">{t("jobs.embedding_missing")}</span>
                ) : job.last_match_at ? (
                  <>
                    <span className="text-accent-400">{t("jobs.matched_at", { time: fmtDateTime(job.last_match_at) })}</span>
                    {job.match_stale && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">{t("jobs.stale")}</span>}
                  </>
                ) : (
                  <span className="text-accent-400">{t("jobs.never_matched")}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && enabledPacks.length > 0 && (
        <NewJobModal
          packs={enabledPacks}
          initialPack={findPack(enabledPacks, filter)?.id ?? enabledPacks[0].id}
          templates={templates}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
