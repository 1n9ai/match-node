export type VectorType = "local" | "qdrant" | "pgvector" | "pinecone";
export type SecretMask = { set: boolean; hint: string };
export type ModelRole = "llm" | "embedding" | "rerank";
export type ProtocolId = "openai_compatible" | "google" | "ollama";

export interface ProtocolInfo {
  label: string;
}

export interface ProviderConn {
  id: string;
  name: string;
  type: ProtocolId;
  base_url: string;
  api_key: SecretMask;
  configured: boolean;
}

export interface RegistryModel {
  id: string;
  name: string;
  kind: ModelRole;
  provider: string;
  provider_name: string;
  model: string;
  dim?: number;
  params?: Record<string, unknown>;
  is_default: boolean;
  used_by: { jobs: string[] };
}

export interface NodeSettings {
  providers: ProviderConn[];
  models: RegistryModel[];
  defaults: Record<ModelRole, string | null>;
  vector: { type?: VectorType; url: string; api_key: SecretMask; tunnel?: { status: string; error?: string | null } | null };
  central: { url: string; license_key: SecretMask };
}

export type ProviderModel = { id: string; kinds: string[] };

export type CheckItem = {
  ok?: boolean | null;
  message?: string;
  error_code?: string;
  code?: string;
  dim?: number;
  latency_ms?: number;
  reasoning_tokens?: number;
  [key: string]: unknown;
};

export interface LicenseInfo extends CheckItem {
  status?: string;
  valid_until?: string | null;
  plan?: string;
  displaced?: boolean;
  warnings?: { code: string; message: string }[];
}

export interface CheckResult {
  central?: CheckItem & { url?: string };
  license?: LicenseInfo;
  llm?: CheckItem;
  embedding?: CheckItem;
  vector?: CheckItem;
  rerank?: CheckItem;
}

export interface AdminStatus {
  central: CheckItem & { url: string };
  license: LicenseInfo;
  counts: { jobs: number; candidates: number; templates: number };
}

// ── ตรวจเอกสารเทียบเกณฑ์ ──

export type RequirementKind = "required" | "preferred";

export interface Requirement {
  text: string;
  kind: RequirementKind;
  tags: string[];
  hard_filter: boolean;
}

export interface Template {
  id: string;
  name: string;
  requirements: Requirement[];
  created_at: string;
}

export interface Candidate {
  id: string;
  job_id: string;
  name: string;
  filename: string;
  extraction_method?: string;
  chunk_count?: number;
  created_at?: string;
}

export type JobMode = "compliance" | "compare";

export type MatchStatus = "found" | "uncertain" | "missing" | "failed";

export interface RequirementResult {
  index: number;
  text: string;
  kind: RequirementKind;
  hard_filter: boolean;
  score: number;
  status: MatchStatus;
  verdict?: string | null;
  reason?: string;
  evidence: string;
  rank?: number;
}

export interface CandidateResult {
  candidate: Candidate;
  requirements: RequirementResult[];
  required_found: number;
  required_total: number;
  preferred_found: number;
  preferred_total: number;
  uncertain_total: number;
  failed_total?: number;
  passed_hard_filters: boolean;
  failed_hard_filters: string[];
}

export interface MatchResult {
  candidates: CandidateResult[];
  scorer: "cross-encoder" | "cosine";
  mode?: JobMode;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: Requirement[];
  mode?: JobMode;
  created_at: string;
  updated_at?: string;
  last_match_at: string | null;
  candidate_count: number;
  embedding_available: boolean;
  match_stale: boolean;
  candidates?: Candidate[];
  last_match?: MatchResult | null;
}

export type BillingPrice = { amount: number; currency: string };

export interface BillingStatus {
  enabled: boolean;
  message?: string;
  license_type?: string;
  billing_status?: string | null;
  plan?: string;
  has_subscription?: boolean;
  subscription_live?: boolean;
  prices?: Partial<Record<"month" | "year", BillingPrice>>;
}
