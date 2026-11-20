import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import type { AuditEvent, Operation, Page } from "../types";
import type { OperationAttachment } from "../types/company";
import { getErrorMessage, isApiError } from "../errors";
import { queryKeys, type OperationsFilter } from "./keys";

// 2026-08-14 — a brand owner may approve/reject a quick-cash expense on the mobile
// app; the mirrored operation is then closed in the same transaction, so the
// portal's approve/reject/final-approve answer 409 OP_NOT_PENDING / OP_ALREADY_FINAL.
// Turn that into a clear message instead of a raw error.
function decidedElsewhereMessage(e: unknown): string | null {
  if (
    isApiError(e) &&
    e.status === 409 &&
    (e.code === "OP_NOT_PENDING" || e.code === "OP_ALREADY_FINAL")
  ) {
    return "تم البتّ في هذه العملية بالفعل (اعتمدها أو رفضها مالك العلامة من تطبيق الموبايل).";
  }
  return null;
}

// ─── List operations ─────────────────────────────────────────────────────────
// Canonical path per T03: bare `/operations` (the `/company/me/operations`
// copy is an accountant-surface alias to the same handler — prefer canonical).
export function useOperations(filter: OperationsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.operations(filter),
    queryFn: async () => {
      const res = await api.get<Page<Operation>>("/operations", {
        params: cleanFilter(filter),
      });
      return res.data;
    },
  });
}

// ─── Single operation + audit trail ──────────────────────────────────────────
export function useOperation(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.operation(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<Operation>(`/operations/${id}`);
      return res.data;
    },
  });
}

export function useAuditTrail(operationId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.operationAudit(operationId ?? ""),
    enabled: Boolean(operationId),
    queryFn: async () => {
      const res = await api.get<AuditEvent[]>(
        `/operations/${operationId}/audit-trail`,
      );
      return res.data;
    },
  });
}

// ─── Approve / Reject / Bulk approve / Final approve ─────────────────────────
export function useApproveOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note, workdayConfirmation }: { id: string; note?: string; workdayConfirmation?: string }) => {
      const res = await api.post<Operation>(`/operations/${id}/approve`, { note, workdayConfirmation });
      return res.data;
    },
    onSuccess: (op) => {
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: queryKeys.accDashboard });
      qc.invalidateQueries({ queryKey: queryKeys.operationAudit(op.id) });
      toast.success("تم اعتماد العملية");
    },
    onError: (e) => {
      const decided = decidedElsewhereMessage(e);
      if (decided) {
        qc.invalidateQueries({ queryKey: ["operations"] });
        toast.error(decided);
      } else toast.error(getErrorMessage(e, "ar"));
    },
  });
}

// 2026-08-14 — role-aware reject route (accountant + head). The portal previously
// had no reject endpoint (approve only); the canonical bare path 404/403'd for the
// accountant. This handler also implements: a head rejecting an already-approved
// record returns it to the accountant (returned_to_accountant), not to the branch.
export function useRejectOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
      notes,
    }: {
      id: string;
      reason: string;
      notes?: string;
    }) => {
      const res = await api.post<Operation>(
        `/company/me/operations/${id}/reject`,
        { reason, notes },
      );
      return res.data;
    },
    onSuccess: (op) => {
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: queryKeys.accDashboard });
      qc.invalidateQueries({ queryKey: queryKeys.operationAudit(op.id) });
      toast.success("تم رفض العملية");
    },
    onError: (e) => {
      const decided = decidedElsewhereMessage(e);
      if (decided) {
        qc.invalidateQueries({ queryKey: ["operations"] });
        toast.error(decided);
      } else toast.error(getErrorMessage(e, "ar"));
    },
  });
}

// ─── Request clarification (non-terminal — status is unchanged) ─────────────
// 2026-08-14 — role-aware company-scoped route (accountant + head).
export function useRequestClarification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, message, shiftId }: { id: string; message: string; shiftId?: string }) => {
      const res = await api.post<Operation>(
        `/operations/${id}/request-clarification`,
        { message, shiftId },
      );
      return res.data;
    },
    onSuccess: (op, { id }) => {
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: queryKeys.operationAudit(op.id) });
      qc.invalidateQueries({ queryKey: queryKeys.operation(id) });
      toast.success("تم إرسال طلب التوضيح");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useReturnWorkday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.post(`/operations/${id}/return-workday`, { reason }),
    onSuccess: async (_result, { id }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["operations"] }),
        qc.invalidateQueries({ queryKey: queryKeys.operation(id) }),
        qc.invalidateQueries({ queryKey: queryKeys.operationAudit(id) }),
        qc.invalidateQueries({ queryKey: ["platform", "accountant"] }),
      ]);
      toast.success("أُعيد تقرير اليوم لمدير الفرع");
    },
  });
}

export function useBulkApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      operationIds,
      note,
      workdayConfirmations,
    }: {
      operationIds: string[];
      note?: string;
      workdayConfirmations?: Record<string, string>;
    }) => {
      const res = await api.post<{
        approved: string[];
        failed: Array<{ id: string; code: string }>;
      }>("/operations/bulk-approve", { operationIds, note, workdayConfirmations });
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: queryKeys.accDashboard });
      if (data.failed.length === 0) {
        toast.success(`تم اعتماد ${data.approved.length} عملية`);
      } else {
        toast.warning(
          `تم اعتماد ${data.approved.length} وفشلت ${data.failed.length}`,
        );
      }
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useFinalApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      isConditional,
      conditionalNote,
      conditions,
    }: {
      id: string;
      isConditional?: boolean;
      conditionalNote?: string;
      conditions?: Array<{ text: string; dueAt?: string }>;
    }) => {
      const res = await api.post<Operation>(`/operations/${id}/final-approve`, {
        isConditional,
        conditionalNote,
        conditions,
      });
      return res.data;
    },
    onSuccess: (op) => {
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: queryKeys.accDashboard });
      qc.invalidateQueries({ queryKey: queryKeys.operationAudit(op.id) });
      toast.success("تم الاعتماد النهائي");
    },
    onError: (e) => {
      const decided = decidedElsewhereMessage(e);
      if (decided) {
        qc.invalidateQueries({ queryKey: ["operations"] });
        toast.error(decided);
      } else toast.error(getErrorMessage(e, "ar"));
    },
  });
}

// ─── Bulk final-approve (head) — T10 §A4 ─────────────────────────────────────
// Non-approved ids come back in `failed` with code OP_NOT_APPROVED.
export function useBulkFinalApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      operationIds,
      isConditional,
      conditionalNote,
    }: {
      operationIds: string[];
      isConditional?: boolean;
      conditionalNote?: string;
    }) => {
      const res = await api.post<{
        finalApproved: string[];
        failed: Array<{ id: string; code: string }>;
      }>("/operations/bulk-final-approve", {
        operationIds,
        isConditional,
        conditionalNote,
      });
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: ["head"] });
      qc.invalidateQueries({ queryKey: ["platform", "operations"] });
      if (data.failed.length === 0) {
        toast.success(`تم الاعتماد النهائي لـ ${data.finalApproved.length} عملية`);
      } else {
        toast.warning(
          `اعتُمد نهائياً ${data.finalApproved.length} وفشل ${data.failed.length}`,
        );
      }
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Return for review (head) — T10 §A4 — op → pending, accountant notified ───
export function useReturnForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const res = await api.post<Operation>(
        `/operations/${id}/return-for-review`,
        { note },
      );
      return res.data;
    },
    onSuccess: (op) => {
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: ["head"] });
      qc.invalidateQueries({ queryKey: ["platform", "operations"] });
      qc.invalidateQueries({ queryKey: queryKeys.operationAudit(op.id) });
      toast.success("تم إرجاع العملية للمراجعة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Bulk return for review (head) — T10 §A4 ─────────────────────────────────
export function useBulkReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      operationIds,
      note,
    }: {
      operationIds: string[];
      note?: string;
    }) => {
      const res = await api.post<{
        returned: string[];
        failed: Array<{ id: string; code: string }>;
      }>("/operations/bulk-return", { operationIds, note });
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: ["head"] });
      qc.invalidateQueries({ queryKey: ["platform", "operations"] });
      toast.success(`تم إرجاع ${data.returned.length} عملية للمراجعة`);
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Corrective operation (create a new op linked to a rejected/posted one) ──
export function useCorrectOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & Record<string, unknown>) => {
      const res = await api.post<Operation>(
        `/operations/${id}/correction`,
        body,
      );
      return res.data;
    },
    onSuccess: (op) => {
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: queryKeys.operationAudit(op.id) });
      toast.success("تم إنشاء عملية تصحيح");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Attachments (T04 §9) ────────────────────────────────────────────────────
export function useOperationAttachments(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.operationAttachments(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<
        { data: OperationAttachment[]; meta?: { total: number } } | OperationAttachment[]
      >(`/operations/${id}/attachments`);
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function cleanFilter<T extends object>(f: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v !== undefined && v !== null && v !== "" && v !== "all") {
      out[k] = v;
    }
  }
  return out as Partial<T>;
}

const SALES_HISTORY_PAGE_SIZE = 50;
const SALES_HISTORY_MAX_PAGES = 20;

function hasSalesActorName(op: Pick<Operation, "payload" | "submittedBy">): boolean {
  const payloadName = (op.payload as { managerName?: unknown } | undefined)?.managerName;
  if (typeof payloadName === "string" && payloadName.trim().length > 0) return true;
  const sub = op.submittedBy?.name?.trim();
  return Boolean(sub && sub !== "—");
}

/** Loads all daily sales report operations for a branch, hydrating actor details only when needed. */
export async function loadBranchSalesOperations(
  branchId: string,
  loadPage: (page: number) => Promise<Page<Operation>>,
  loadDetail?: (operationId: string) => Promise<Operation>,
): Promise<Operation[]> {
  const rows: Operation[] = [];
  for (let page = 1; page <= SALES_HISTORY_MAX_PAGES; page++) {
    const res = await loadPage(page);
    for (const op of res.data ?? []) {
      if (op.moduleKey === "sales" && op.branchId === branchId) {
        rows.push(op);
      }
    }
    const totalPages = Math.max(1, res.meta?.totalPages ?? 1);
    if (page >= totalPages) break;
  }

  if (!loadDetail) return rows;

  return Promise.all(
    rows.map(async (op) => {
      if (op.status === "rejected" || hasSalesActorName(op)) return op;
      const detail = await loadDetail(op.id);
      return {
        ...op,
        payload: detail.payload ?? op.payload,
        submittedBy: detail.submittedBy ?? op.submittedBy,
      };
    }),
  );
}

/** Per-branch map of daily sales operations delivered by branch managers. */
export function useBranchSalesOperations(
  branchIds: readonly string[],
  resolveDetailsByBranch: Readonly<Record<string, boolean>> = {},
) {
  const uniqueBranchIds = Array.from(new Set(branchIds.filter(Boolean)));
  const queries = useQueries({
    queries: uniqueBranchIds.map((branchId) => {
      const resolveDetails = Boolean(resolveDetailsByBranch[branchId]);
      return {
        queryKey: ["operations", "branch-sales", branchId, resolveDetails ? "detail" : "list"] as const,
        queryFn: () =>
          loadBranchSalesOperations(
            branchId,
            async (page) => {
              const res = await api.get<Page<Operation>>("/operations", {
                params: {
                  moduleKey: "sales",
                  branchId,
                  page,
                  pageSize: SALES_HISTORY_PAGE_SIZE,
                },
              });
              return res.data;
            },
            resolveDetails
              ? async (id) => {
                  const res = await api.get<Operation>(`/operations/${id}`);
                  return res.data;
                }
              : undefined,
          ),
        staleTime: 30_000,
      };
    }),
  });

  return new Map(uniqueBranchIds.map((id, index) => [id, queries[index]]));
}
