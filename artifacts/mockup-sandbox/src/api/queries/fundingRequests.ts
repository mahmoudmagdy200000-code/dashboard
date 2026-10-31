import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client.ts";
import {
  fundingExecutionPayload,
  requirePendingReceipt,
  executeFundingTransferFlow,
} from "./fundingExecutionContract.ts";
import type { FinancialIntent } from "../idempotencyIntent.ts";

export type FundingRequest = {
  id: string;
  branchName: string | null;
  submittedBy: string | null;
  status: "approved" | "completed";
  amount: string;
  preferredReceiptMethod: string | null;
  purpose: string | null;
  executedAt: string | null;
  receivedAt: string | null;
  transferReference: string | null;
  canExecute: boolean;
};

const key = ["cash-custody", "funding-requests", "accountant"] as const;

export async function fetchAccountantFundingRequests(): Promise<FundingRequest[]> {
  const response = await api.get<{ data: { requests: FundingRequest[] } }>("/custody/requests");
  return response.data.data.requests;
}

export async function executeFundingRequest({
  id,
  reference,
  proof,
  intent,
  idempotencyKey,
  proofHash,
  currentActorId,
  companyId,
}: {
  id: string;
  reference: string;
  proof: File;
  intent?: FinancialIntent<any>;
  idempotencyKey?: string;
  proofHash?: string;
  currentActorId?: string;
  companyId?: string;
}) {
  return executeFundingTransferFlow(
    { id, reference, proof, intent, idempotencyKey, proofHash, currentActorId, companyId },
    async (url, form, headers) => {
      const response = await api.post<{ data: { financiallyPosted: false; executedAt: string } }>(
        url,
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            ...headers,
          },
        },
      );
      return requirePendingReceipt(response.data.data);
    },
  );
}

export function useAccountantFundingRequests(enabled: boolean) {
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: fetchAccountantFundingRequests,
  });
}

export function useExecuteFundingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: executeFundingRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
