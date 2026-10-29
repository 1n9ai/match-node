"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, BarChart3, BookmarkPlus, FileText, ListChecks, Loader2, Pencil, Save, Trash2 } from "lucide-react";
import { MatchResults } from "@/components/MatchResults";
import { cleanRequirements, RequirementsEditor } from "@/components/RequirementsEditor";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { ModePicker } from "@/components/ModePicker";
import { ErrorNote, Loading } from "@/components/Shell";
import { Button } from "@/components/ui/Button";
import { createTemplate, deleteJob, getJob, listTemplates, runMatch, updateJob } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { findPack, usePacks, usePackText } from "@/lib/packs";
import type { Job, JobMode, Requirement, Template } from "@/lib/types";

function Panel({ icon, title, subtitle, action, children }: { icon: ReactNode; title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="surface min-w-0">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-t-2xl border-b border-accent-100 bg-gradient-to-r from-brand-50/70 via-white/0 to-white/0 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink bg-ink-grad text-brand-300 shadow-ink">{icon}</span>
          <div className="min-w-0">
            <h2 className="pt-0.5 text-sm font-semibold text-accent-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-accent-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  );
}

const same = (a: Requirement[], b: Requirement[]) => JSON.stringify(cleanRequirements(a)) === JSON.stringify(cleanRequirements(b));

function JobDetail({ id }: { id: string }) {
  const { t, errorText, fmtDateTime } = useI18n();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState<Requirement[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState("");
  const { packs } = usePacks();
  const pack = findPack(packs, job?.pack);
  const { text, tp, has } = usePackText(pack);

  const load = useCallback(
    async (resetDraft = false) => {
      try {
        const j = await getJob(id);
        setJob(j);
        setTitle(j.title);
        if (resetDraft) setDraft(j.requirements);
      } catch (e) {
        if ((e as { code?: string }).code === "job_not_found") setMissing(true);
        else setError(errorText(e));
      }
    },
    [id, errorText],
  );

  useEffect(() => {
    load(true);
    listTemplates()
      .then((r) => setTemplates(r.templates))
      .catch(() => setTemplates([]));
  }, [load]);

  if (missing) {
    return (
      <div className="surface px-6 py-10 text-center text-sm text-accent-500">
        {t("job.not_found")}{" "}
        <Link href="/" className="font-semibold text-brand-700 underline">
          {t("job.back")}
        </Link>
      </div>
    );
  }
  if (!job) return error ? <ErrorNote message={error} /> : <Loading />;

  const dirty = !same(draft, job.requirements);
  const packTemplates = has("templates") ? templates.filter((tpl) => !tpl.pack || tpl.pack === job.pack) : [];
  const canMatch = job.requirements.length > 0 && job.candidate_count > 0 && !dirty;

  async function saveRequirements() {
    setSaving(true);
    setError(null);
    try {
      const j = await updateJob(id, { requirements: cleanRequirements(draft) });
      setJob(j);
      setDraft(j.requirements);
      setSavedNote(t("req.saved"));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplate() {
    const name = window.prompt(t("req.template_name"), job?.title ?? "");
    if (!name?.trim()) return;
    try {
      const tpl = await createTemplate({ name, requirements: cleanRequirements(draft), pack: job?.pack });
      setTemplates((list) => [...list, tpl]);
      setSavedNote(t("req.template_saved"));
    } catch (e) {
      setError(errorText(e));
    }
  }

  function loadTemplate(tid: string) {
    const tpl = templates.find((x) => x.id === tid);
    if (!tpl) return;
    if (draft.length && !window.confirm(t("req.load_confirm"))) return;
    setDraft(tpl.requirements.map((r) => ({ ...r })));
    setSavedNote(null);
  }

  async function changeMode(mode: JobMode) {
    if (!job || mode === (job.mode ?? "compliance")) return;
    try {
      setJob(await updateJob(id!, { mode }));
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function rename() {
    try {
      const j = await updateJob(id, { title });
      setJob(j);
      setRenaming(false);
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function remove() {
    if (!job || !window.confirm(t("job.delete_confirm", { name: job.title }))) return;
    try {
      await deleteJob(id);
      router.push("/");
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function match() {
    setMatching(true);
    setError(null);
    try {
      await runMatch(id);
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setMatching(false);
    }
  }

  return (
    <div>
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-accent-500 hover:text-accent-800">
        <ArrowLeft size={14} /> {t("job.back")}
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        {renaming ? (
          <div className="flex min-w-0 flex-1 gap-2">
            <input className="field max-w-md text-lg font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            <Button onClick={rename} disabled={!title.trim()}>
              <Save size={15} /> {t("common.save")}
            </Button>
            <Button variant="secondary" onClick={() => setRenaming(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        ) : (
          <div className="min-w-0">
            {pack && (packs?.length ?? 0) > 1 && (
              <p data-ui="job-pack" className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
                {text(pack.name)}
              </p>
            )}
            <h1 className="title-grad break-words text-2xl font-semibold tracking-tight">{job.title}</h1>
            {job.description && <p className="mt-1 max-w-2xl text-sm text-accent-500">{job.description}</p>}
            {(pack?.modes.length ?? 2) > 1 && (
              <div className="mt-3 max-w-md">
                <ModePicker value={job.mode ?? "compliance"} onChange={changeMode} compact modes={pack?.modes} />
              </div>
            )}
          </div>
        )}
        {!renaming && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setRenaming(true)} className="px-3 py-1.5 text-xs">
              <Pencil size={13} /> {t("job.rename")}
            </Button>
            <Button variant="ghost" onClick={remove} className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50">
              <Trash2 size={13} /> {t("job.delete")}
            </Button>
          </div>
        )}
      </div>

      <ErrorNote message={error} />
      {!job.embedding_available && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {t("job.embedding_missing")}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel
          icon={<ListChecks size={18} />}
          title={tp("req.title")}
          subtitle={tp((job.mode ?? "compliance") === "compliance" ? "req.subtitle_compliance" : "req.subtitle")}
          action={
            packTemplates.length > 0 ? (
              <select className="field !w-auto !py-1.5 !text-xs" value="" onChange={(e) => loadTemplate(e.target.value)} aria-label={t("req.load_template")}>
                <option value="">{t("req.load_template")}</option>
                {packTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            ) : undefined
          }
        >
          <RequirementsEditor
            compliance={(job.mode ?? "compliance") === "compliance"}
            withPaste={has("ai_parse")}
            withHard={has("hard_filter")}
            value={draft}
            onChange={(v) => {
              setDraft(v);
              setSavedNote(null);
            }}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-accent-100 pt-4">
            <span className={`text-xs ${dirty ? "font-medium text-amber-700" : "text-emerald-700"}`}>{dirty ? t("req.unsaved") : savedNote}</span>
            <div className="flex gap-2">
              {has("templates") && (
                <Button variant="secondary" onClick={saveTemplate} disabled={!cleanRequirements(draft).length} className="px-3 py-1.5 text-xs">
                  <BookmarkPlus size={14} /> {t("req.save_template")}
                </Button>
              )}
              <Button onClick={saveRequirements} disabled={saving || !dirty} className="px-3 py-1.5 text-xs">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {t("req.save")}
              </Button>
            </div>
          </div>
        </Panel>

        <Panel icon={<FileText size={18} />} title={tp("res.title")}>
          <DocumentsPanel jobId={id} candidates={job.candidates ?? []} disabled={!job.embedding_available} onChanged={() => load()} />
        </Panel>
      </div>

      <div className="mt-5">
        <Panel
          icon={<BarChart3 size={18} />}
          title={tp("match.title")}
          subtitle={job.last_match_at ? t("match.last_run", { time: fmtDateTime(job.last_match_at) }) : undefined}
          action={
            <Button onClick={match} disabled={matching || !canMatch}>
              {matching ? <Loader2 size={15} className="animate-spin" /> : <BarChart3 size={15} />}
              {matching ? t("match.running") : job.last_match ? t("match.rerun") : t("match.run")}
            </Button>
          }
        >
          {!canMatch && !job.last_match && <p className="text-sm text-accent-500">{dirty ? t("req.unsaved") : t("match.need")}</p>}
          {job.match_stale && job.last_match && (
            <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-px shrink-0" /> {t("match.stale")}
            </p>
          )}
          {job.last_match ? <MatchResults result={job.last_match} gapList={has("gap_list")} /> : canMatch && <p className="text-sm text-accent-500">{t("match.empty")}</p>}
        </Panel>
      </div>
    </div>
  );
}

function JobPageInner() {
  const id = useSearchParams().get("id");
  const { t } = useI18n();
  if (!id) {
    return (
      <Link href="/" className="text-sm font-semibold text-brand-700 underline">
        {t("job.back")}
      </Link>
    );
  }
  return <JobDetail id={id} />;
}

export default function JobPage() {
  return (
    <Suspense fallback={null}>
      <JobPageInner />
    </Suspense>
  );
}
