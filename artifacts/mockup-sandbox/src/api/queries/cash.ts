import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob, withIdempotencyKey } from "../client";
import type {
  CashCustodyLedger,
  CashCustodyPage,
  CashTransaction,
  CashTransactionInput,
} from "../types/company";
import { getErrorMessage } from "../errors";
import {
  assertDirectCashTransaction,
  executeCashDisbursementFlow,
  type DirectDebitSafetyContext,
} from "./cashTransactionContract.ts";
import type { FinancialIntent } from "../idempotencyIntent.ts";
import { queryKeys, type CashFilter } from "./keys";

// ─── B1. List — GET /company/me/cash-custody ({data, meta.kpis}) ──────────────
// status is server-derived from the balance; usage bar red > 85%.
export function useCashCustody(filter: CashFilter = {}) {
  const clean = Object.fromEntries(
    Object.entries(filter).filter(([, v]) => v !== undefined && v !== "" && v !== "all"),
  );
  return useQuery({
    queryKey: queryKeys.cashCustody(filter),
    queryFn: async () => {
      const res = await api.get<CashCustodyPage>("/company/me/cash-custody", {
        params: clean,
      });
      return res.data;
    },
  });
}

// ─── B2. Monthly ledger — GET …/cash-custody/{id}/transactions?month= ─────────
// Newest-first; only approved txns move the balance (pending rows carry it flat).
export function useCashTransactions(
  custodyId: string | null | undefined,
  month?: string,
) {
  const params = Object.fromEntries(
    Object.entries({ month }).filter(([, v]) => v !== undefined && v !== ""),
  );
  return useQuery({
    queryKey: queryKeys.cashTransactions(custodyId ?? "", month),
    enabled: Boolean(custodyId),
    queryFn: async () => {
      const res = await api.get<CashCustodyLedger>(
        `/company/me/cash-custody/${custodyId}/transactions`,
        { params },
      );
      return res.data;
    },
  });
}

// ─── B3. Direct disbursement — POST …/{id}/transactions ─────────────────────
// Funding uses the separate approved request and branch receipt workflow.
export interface CreateCashTransactionParams {
  custodyId: string;
  payload: CashTransactionInput;
  context?: DirectDebitSafetyContext;
  intent?: FinancialIntent<any>;
  idempotencyKey?: string;
}

export async function executeCashTransaction({
  custodyId,
  payload,
  context,
  intent,
  idempotencyKey,
}: CreateCashTransactionParams): Promise<CashTransaction> {
  return executeCashDisbursementFlow(
    { custodyId, payload, context, intent, idempotencyKey },
    async (url, body, headers) => {
      const res = await api.post<CashTransaction>(url, body, {
        headers: headers ? { ...headers } : undefined,
      });
      return res.data;
    },
  );
}

export function useCreateCashTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: executeCashTransaction,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["cash-custody", vars.custodyId] });
      qc.invalidateQueries({ queryKey: ["cash-custody"] });
      toast.success("تم تسجيل المعاملة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── B4. Approve a txn — POST …/transactions/{txnId}/approve ──────────────────
export function useApproveCashTxn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      custodyId,
      txnId,
    }: {
      custodyId: string;
      txnId: string;
    }) => {
      const res = await api.post<CashTransaction>(
        `/company/me/cash-custody/${custodyId}/transactions/${txnId}/approve`,
      );
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["cash-custody", vars.custodyId] });
      qc.invalidateQueries({ queryKey: ["cash-custody"] });
      toast.success("تم اعتماد الحركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── B4. Reject a txn — POST …/transactions/{txnId}/reject (reason required) ──
export function useRejectCashTxn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      custodyId,
      txnId,
      reason,
    }: {
      custodyId: string;
      txnId: string;
      reason: string;
    }) => {
      const res = await api.post<CashTransaction>(
        `/company/me/cash-custody/${custodyId}/transactions/${txnId}/reject`,
        { reason },
      );
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["cash-custody", vars.custodyId] });
      qc.invalidateQueries({ queryKey: ["cash-custody"] });
      toast.success("تم رفض الحركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── B5a. Settlement request — POST …/cash-custody/{id}/settlement-request ────
export function useRequestCashSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ custodyId }: { custodyId: string }) => {
      const res = await api.post(
        `/company/me/cash-custody/${custodyId}/settlement-request`,
      );
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["cash-custody", vars.custodyId] });
      qc.invalidateQueries({ queryKey: ["cash-custody"] });
      toast.success("تم إرسال طلب التسوية");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── B5b. Settle — POST …/cash-custody/{id}/settle ({ newDepositHalalas? }) ───
// Closing is metadata only; funding requires the request and receipt workflow.
export function useSettleCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      custodyId,
      newDepositHalalas,
    }: {
      custodyId: string;
      newDepositHalalas?: number;
    }) => {
      if (newDepositHalalas !== undefined && newDepositHalalas > 0) {
        throw new Error("New deposit requires the approved funding request workflow");
      }
      const res = await api.post(
        `/company/me/cash-custody/${custodyId}/settle`,
        newDepositHalalas !== undefined ? { newDepositHalalas } : {},
      );
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["cash-custody", vars.custodyId] });
      qc.invalidateQueries({ queryKey: ["cash-custody"] });
      toast.success("تمت تسوية العهدة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── B6a. Custody summary export ──────────────────────────────────────────────
export function useExportCash() {
  return useMutation({
    mutationFn: async (filter: CashFilter = {}) => {
      const fmt = filter.format ?? "xlsx";
      await downloadBlob(
        "/company/me/cash-custody/export",
        `cash-custody.${fmt}`,
        { ...filter, format: fmt },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── B6b. Per-custody monthly ledger export ──────────────────────────────────
export function useExportCashLedger() {
  return useMutation({
    mutationFn: async ({
      custodyId,
      month,
      format = "xlsx",
    }: {
      custodyId: string;
      month?: string;
      format?: "xlsx" | "csv";
    }) => {
      await downloadBlob(
        `/company/me/cash-custody/${custodyId}/transactions/export`,
        `custody-${custodyId}${month ? `-${month}` : ""}.${format}`,
        { month, format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
