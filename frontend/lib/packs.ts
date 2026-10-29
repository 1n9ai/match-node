"use client";

import { useCallback, useEffect, useState } from "react";
import { listPacks } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Pack, PackFunction, PackText } from "@/lib/types";

type Params = Record<string, string | number | undefined | null>;

/** pack ทั้งหมดจากเซิร์ฟเวอร์ (โหลดครั้งเดียวต่อหน้า) */
export function usePacks() {
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [broken, setBroken] = useState<string[]>([]);
  const reload = useCallback(
    () =>
      listPacks()
        .then((r) => {
          setPacks(r.packs);
          setBroken(r.broken);
        })
        .catch(() => setPacks([])),
    [],
  );
  useEffect(() => {
    reload();
  }, [reload]);
  return { packs, broken, reload, setPacks };
}

/** ข้อความของ pack: key ในไฟล์ภาษา หรือ {ภาษา: ข้อความ} (ไม่มีภาษาที่เลือก → อังกฤษ → ตัวแรก) */
export function usePackText(pack?: Pack | null) {
  const { t, lang } = useI18n();
  const text = useCallback(
    (v: PackText | null | undefined, params?: Params): string => {
      if (!v) return "";
      if (typeof v === "string") return t(v, params);
      const raw = v[lang] ?? v.en ?? Object.values(v)[0] ?? "";
      return raw.replace(/\{(\w+)\}/g, (m, k) => (params?.[k] === undefined || params?.[k] === null ? m : String(params[k])));
    },
    [t, lang],
  );
  /** ข้อความบนหน้าจอ: pack แทนได้ทุก key ถ้าไม่แทนใช้ของเดิม */
  const tp = useCallback((key: string, params?: Params) => (pack?.text[key] ? text(pack.text[key], params) : t(key, params)), [pack, text, t]);
  const has = useCallback((fn: PackFunction) => !pack || pack.functions.includes(fn), [pack]);
  return { text, tp, has };
}

export const findPack = (packs: Pack[] | null, id?: string | null) => packs?.find((p) => p.id === (id || "general")) ?? null;
