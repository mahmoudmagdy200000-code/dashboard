import { createContext, useContext, useRef, type ReactNode } from "react";
import {
  useAssetDrafts,
  useConvertToAssetDraft,
  useConfirmAssetDraft,
  useDiscardAssetDraft,
} from "../../../../api/queries";

export type AssetCatType = "معدات" | "تقنية" | "أثاث" | "مركبات" | "أخرى";

export interface AssetDraft {
  draftId: string;
  expenseOpId: string;
  invNum: string;
  vendor: string;
  desc: string;
  amount: number;
  expenseBranch: string;
  expenseDate: string;
  assetName: string;
  cat: AssetCatType;
  usefulLife: number;
  targetBranches: string[];
  custodian: string;
  qty: number;
  notes: string;
  convertedAt: string;
  status: "draft" | "confirmed" | "discarded";
  invoiceIndex?: number;
}

export interface AssetDraftCtxType {
  drafts: AssetDraft[];
  addDraft: (d: AssetDraft) => void;
  discardDraft: (draftId: string) => void;
  confirmDraft: (draftId: string) => void;
  getConvertedInvNums: () => Set<string>;
  navigateToAssets?: () => void;
  setNavigateToAssets: (fn: () => void) => void;
}

export const AssetDraftContext = createContext<AssetDraftCtxType>({
  drafts: [],
  addDraft: () => {},
  discardDraft: () => {},
  confirmDraft: () => {},
  getConvertedInvNums: () => new Set(),
  navigateToAssets: undefined,
  setNavigateToAssets: () => {},
});

export const ASSET_CAT_KEY_TO_LABEL: Record<string, AssetCatType> = {
  kitchen: "معدات",
  tech: "تقنية",
  furniture: "أثاث",
  vehicles: "مركبات",
  construction: "أخرى",
  other: "أخرى",
};

export const ASSET_CAT_LABEL_TO_KEY: Record<string, string> = {
  "معدات": "kitchen",
  "تقنية": "tech",
  "أثاث": "furniture",
  "مركبات": "vehicles",
  "أخرى": "other",
};

export function AssetDraftProvider({ children }: { children: ReactNode }) {
  const navRef = useRef<(() => void) | undefined>(undefined);
  // Server-backed drafts (T05 §7/§8): GET /company/me/asset-drafts + convert/confirm/discard.
  const { data: serverDrafts = [] } = useAssetDrafts();
  const convertMut = useConvertToAssetDraft();
  const confirmMut = useConfirmAssetDraft();
  const discardMut = useDiscardAssetDraft();

  const drafts: AssetDraft[] = serverDrafts.map((d): AssetDraft => ({
    draftId: d.draftId,
    expenseOpId: d.expenseOpId,
    invNum: d.invNum,
    vendor: d.vendor,
    desc: d.desc,
    amount: d.amountHalalas / 100,
    expenseBranch: d.expenseBranch,
    expenseDate: d.expenseDate,
    assetName: d.assetName,
    cat: ASSET_CAT_KEY_TO_LABEL[d.category] ?? "أخرى",
    usefulLife: d.usefulLifeMonths,
    targetBranches: d.targetBranches,
    custodian: d.custodian,
    qty: d.qty,
    notes: "",
    convertedAt: d.createdAt,
    status: d.status,
    invoiceIndex: (d as any).invoiceIndex ?? 0,
  }));

  const addDraft = (d: AssetDraft) => {
    convertMut.mutate({
      invoiceId: d.expenseOpId,
      invoiceIndex: d.invoiceIndex ?? 0,
      assetName: d.assetName,
      category: ASSET_CAT_LABEL_TO_KEY[d.cat] ?? "other",
      usefulLifeMonths: d.usefulLife,
      targetBranches: d.targetBranches,
      custodian: d.custodian,
      qty: d.qty,
      notes: d.notes || undefined,
    });
  };
  const discardDraft = (id: string) => { discardMut.mutate(id); };
  const confirmDraft = (id: string) => { confirmMut.mutate(id); };
  const getConvertedInvNums = () => new Set(drafts.filter(d => d.status === "draft" || d.status === "confirmed").map(d => d.invNum));
  const setNavigateToAssets = (fn: () => void) => { navRef.current = fn; };

  return (
    <AssetDraftContext.Provider value={{ drafts, addDraft, discardDraft, confirmDraft, getConvertedInvNums, navigateToAssets: navRef.current, setNavigateToAssets }}>
      {children}
    </AssetDraftContext.Provider>
  );
}

export function useAssetDraft() {
  return useContext(AssetDraftContext);
}
