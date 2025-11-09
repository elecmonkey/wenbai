export type Repo = {
  id: number;
  name: string;
};

export type RecordSummary = {
  id: number;
  source: string;
  target?: string | null;
  meta?: string | null;
};

export type Token = {
  id: number;
  word: string;
  pos?: string | null;
  syntax_role?: string | null;
  annotation?: string | null;
};

export type Alignment = {
  source_id: number;
  target_id: number;
  relation_type: string;
};

export type RecordDetailPayload = {
  id: number;
  source: string;
  target: string | null;
  meta: string | null;
  source_tokens: Token[];
  target_tokens: Token[];
  alignment: Alignment[];
};

export type DashboardInitialData = {
  repos: Repo[];
  openRepoIds: number[];
  activeRepoId: number | null;
  activeRecordId: number | null;
  records: {
    repoId: number;
    items: RecordSummary[];
  } | null;
  recordDetail: {
    repoId: number;
    recordId: number;
    data: RecordDetailPayload;
  } | null;
};
