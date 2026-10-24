import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import { getErrorMessage } from "../errors";
import { queryKeys, type CompanyUsersFilter } from "./keys";

// ─── Types (sensible defaults — backend may add more fields) ─────────────────
export interface CompanyAdminDashboard {
  company: { id: string; name: string; logo?: string; plan?: string };
  kpis: Record<string, number | string>;
  brands?: Array<{
    id: string;
    name: string;
    color?: string;
    abbr?: string;
    restaurantsCount: number;
    branchesCount: number;
    monthlySalesHalalas: number;
    monthlyTargetHalalas: number;
  }>;
  totals?: Record<string, number>;
  // T14.4 — real storage quota (summed from namespaced attachment bytes).
  quotas?: {
    storage?: { usedGb: number; maxGb: number | null };
    [k: string]: { usedGb?: number; maxGb?: number | null } | undefined;
  };
}

export interface Plan {
  id: string;
  name: string;
  nameAr?: string;
  priceMonthlyHalalas: number | null;
  priceAnnualHalalas: number | null;
  features?: string[];
  featuresAr?: string[];
  maxBranches?: number | null;
  maxUsers?: number | null;
  isCurrent?: boolean;
}

export interface Subscription {
  id: string;
  companyId: string;
  planId: string;
  planName?: string;
  status: string;
  billingCycle: "monthly" | "annual";
  currentPeriodEnd: string;
  daysRemaining?: number;
  usage?: Record<string, { used: number; max: number | null }>;
}

export interface CompanyUser {
  id: string;
  name: string;
  email: string;
  roleKey: string;
  roleLabel?: string;
  branchIds?: string[];
  brandIds?: string[];
  branchName?: string;
  status: "active" | "inactive" | "invited";
  lastActiveAt?: string;
}

export interface CompanyInvitation {
  id: string;
  email: string;
  roleKey: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  createdAt: string;
  expiresAt?: string;
}

export interface Brand {
  id: string;
  name: string;
  color?: string;
  abbr?: string;
  restaurants?: Restaurant[];
}

export interface Restaurant {
  id: string;
  brandId: string;
  name: string;
  branches?: Branch[];
}

export interface Branch {
  id: string;
  restaurantId: string;
  name: string;
  city?: string;
  managerUserId?: string;
  managerName?: string;
  monthlySalesHalalas?: number;
  monthlyTargetHalalas?: number;
  // T14.1 — add-branch is now pending platform review; the branch stays
  // inactive (status !== "active") until a platform admin approves it.
  status?: string;
  reviewStatus?: "pending_review" | "approved" | "rejected";
  reviewNote?: string;
  messageAr?: string;
}

export interface CompanyModule {
  moduleKey: string;
  isActive: boolean;
  inPlan: boolean;
  nameAr?: string;
  nameEn?: string;
  descAr?: string;
  descEn?: string;
}

export interface CompanySettings {
  name?: string;
  city?: string;
  crNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  vatNumber?: string | null;
  logoUrl?: string | null;
  [k: string]: unknown;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export function useCompanyAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.companyAdminDashboard,
    queryFn: async () => {
      const res = await api.get<CompanyAdminDashboard>("/company/me/dashboard");
      return res.data;
    },
    staleTime: 15_000,
  });
}

// ─── Subscription & Plans ────────────────────────────────────────────────────
export function useCompanySubscription() {
  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: async () => {
      const res = await api.get<Subscription>("/company/me/subscription");
      return res.data;
    },
  });
}

export function useCompanyPlans() {
  return useQuery({
    queryKey: queryKeys.plans,
    queryFn: async () => {
      const res = await api.get<Plan[]>("/plans");
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useUpgradeSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      planId,
      billingCycle,
    }: {
      planId: string;
      billingCycle: "monthly" | "annual";
    }) => {
      const res = await api.post<Subscription>(
        "/company/me/subscription/upgrade",
        { planId, billingCycle },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subscription });
      qc.invalidateQueries({ queryKey: queryKeys.companyAdminDashboard });
      toast.success("تم ترقية الخطة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDowngradeSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId }: { planId: string }) => {
      const res = await api.post<Subscription>(
        "/company/me/subscription/downgrade",
        { planId },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subscription });
      toast.success("تم تخفيض الخطة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { reason?: string; effectiveAt?: string } = {}) => {
      const res = await api.post<Subscription>(
        "/company/me/subscription/cancel",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subscription });
      toast.success("تم إلغاء الاشتراك");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useReactivateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<Subscription>(
        "/company/me/subscription/reactivate",
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subscription });
      toast.success("تم إعادة تفعيل الاشتراك");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useContactSales() {
  return useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      const res = await api.post<{ ticketId?: string }>(
        "/company/me/subscription/contact-sales",
        { message },
      );
      return res.data;
    },
    onSuccess: () => toast.success("تم إرسال طلب التواصل مع المبيعات"),
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useSwitchBillingCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      billingCycle,
    }: {
      billingCycle: "monthly" | "annual";
    }) => {
      const res = await api.post<Subscription>(
        "/company/me/subscription/billing-cycle",
        { billingCycle },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subscription });
      toast.success("تم تغيير دورة الفوترة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Users management ────────────────────────────────────────────────────────
export function useCompanyUsers(filter: CompanyUsersFilter = {}) {
  return useQuery({
    queryKey: queryKeys.companyUsers(filter),
    queryFn: async () => {
      const res = await api.get<{ data: CompanyUser[] } | CompanyUser[]>(
        "/company/me/users",
        { params: filter },
      );
      const d = res.data as { data?: CompanyUser[] } | CompanyUser[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useCreateCompanyUser() {
  const qc = useQueryClient();
  return useMutation({
    // Backend rule: role "branch" needs branchId (exactly one branch),
    // role "accountant" needs brandId (assigned to a brand, not a branch).
    // Missing either → 422 { errors.code: "INVALID_ROLE_SCOPE" }.
    mutationFn: async (body: {
      email: string;
      name: string;
      role: string;
      /** Required when role/roleKey === "accountant". */
      brandId?: string;
      /** Required when role/roleKey === "branch". */
      branchId?: string;
      brandIds?: string[];
      branchIds?: string[];
    }) => {
      const res = await api.post<CompanyUser>("/company/me/users", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-users"] });
      qc.invalidateQueries({ queryKey: queryKeys.companyInvitations });
      toast.success("تم إنشاء المستخدم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateCompanyUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<CompanyUser>) => {
      const res = await api.patch<CompanyUser>(
        `/company/me/users/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-users"] });
      toast.success("تم تحديث المستخدم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteCompanyUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/company/me/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-users"] });
      toast.success("تم حذف المستخدم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useToggleCompanyUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<CompanyUser>(
        `/company/me/users/${id}/toggle-status`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-users"] });
      toast.success("تم تحديث حالة المستخدم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useResendCompanyUserInvite() {
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/company/me/users/${id}/resend-invite`);
    },
    onSuccess: () => toast.success("تم إعادة إرسال الدعوة"),
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Invitations ─────────────────────────────────────────────────────────────
export function useCompanyInvitations() {
  return useQuery({
    queryKey: queryKeys.companyInvitations,
    queryFn: async () => {
      const res = await api.get<
        { data: CompanyInvitation[] } | CompanyInvitation[]
      >("/company/invitations");
      const d = res.data as
        | { data?: CompanyInvitation[] }
        | CompanyInvitation[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export interface CreateCompanyInvitationInput {
  email: string;
  name?: string;
  roleKey: "company-admin" | "head" | "accountant" | "branch" | "procurement";
  brandId?: string;
  branchId?: string;
}

export function buildInvitationPayload(input: CreateCompanyInvitationInput): {
  email: string;
  name?: string;
  roleKey: string;
  brandId?: string;
  branchId?: string;
} {
  const email = input.email?.trim() ?? "";
  if (!email) {
    throw new Error("Email is required");
  }
  const roleKey = input.roleKey;
  if (!roleKey) {
    throw new Error("Role is required");
  }

  const payload: {
    email: string;
    name?: string;
    roleKey: string;
    brandId?: string;
    branchId?: string;
  } = {
    email,
    roleKey,
  };

  if (input.name?.trim()) {
    payload.name = input.name.trim();
  }

  if (roleKey === "accountant") {
    if (!input.brandId?.trim()) {
      throw new Error("Brand selection is required for accountant role");
    }
    payload.brandId = input.brandId.trim();
  } else if (roleKey === "branch") {
    if (!input.branchId?.trim()) {
      throw new Error("Branch selection is required for branch role");
    }
    payload.branchId = input.branchId.trim();
  } else {
    if (input.brandId?.trim()) payload.brandId = input.brandId.trim();
    if (input.branchId?.trim()) payload.branchId = input.branchId.trim();
  }

  return payload;
}

export function useCreateCompanyInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCompanyInvitationInput) => {
      const payload = buildInvitationPayload(input);
      const res = await api.post<CompanyInvitation>(
        "/company/invitations",
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companyInvitations });
      toast.success("تم إرسال الدعوة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// T14.2 — resend a pending invitation: regenerates the token, extends expiry
// +7d, re-queues the email. 202 { resent, expiresAt }. Non-pending → 409.
export function useResendCompanyInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ resent: boolean; expiresAt?: string }>(
        `/company/invitations/${id}/resend`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companyInvitations });
      toast.success("تم إعادة إرسال الدعوة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useRevokeCompanyInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/company/invitations/${id}/revoke`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companyInvitations });
      toast.success("تم إلغاء الدعوة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Brands / Restaurants / Branches ─────────────────────────────────────────
export function useCompanyBrands() {
  return useQuery({
    queryKey: queryKeys.companyBrands,
    queryFn: async () => {
      const res = await api.get<{ data: Brand[] } | Brand[]>(
        "/company/me/brands",
      );
      const d = res.data as { data?: Brand[] } | Brand[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; color?: string; abbr?: string }) => {
      const res = await api.post<Brand>("/company/me/brands", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companyBrands });
      toast.success("تم إضافة العلامة التجارية");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Brand>) => {
      const res = await api.patch<Brand>(`/company/me/brands/${id}`, patch);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companyBrands });
      toast.success("تم تحديث العلامة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/company/me/brands/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companyBrands });
      toast.success("تم حذف العلامة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useCreateRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { brandId: string; name: string }) => {
      const res = await api.post<Restaurant>(
        "/company/me/restaurants",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companyBrands });
      toast.success("تم إضافة المطعم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<Restaurant>) => {
      const res = await api.patch<Restaurant>(
        `/company/me/restaurants/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companyBrands });
      toast.success("تم تحديث المطعم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/company/me/restaurants/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companyBrands });
      toast.success("تم حذف المطعم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      restaurantId: string;
      name: string;
      city?: string;
      managerUserId?: string;
    }) => {
      const res = await api.post<Branch>("/company/me/branches", body);
      return res.data;
    },
    // T14.1 — the branch is created pending_review, not live. Surface the
    // server's messageAr («سيظهر بعد مراجعة الإدارة») rather than "added".
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.companyBrands });
      toast.success(data?.messageAr ?? "تم إرسال طلب الفرع للمراجعة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<Branch>) => {
      const res = await api.patch<Branch>(`/company/me/branches/${id}`, patch);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companyBrands });
      toast.success("تم تحديث الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/company/me/branches/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companyBrands });
      toast.success("تم حذف الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useTransferBranchManager() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      newManagerUserId,
    }: {
      id: string;
      newManagerUserId: string;
    }) => {
      const res = await api.post<Branch>(
        `/company/me/branches/${id}/transfer-manager`,
        { newManagerUserId },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companyBrands });
      toast.success("تم نقل مدير الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Modules toggle ──────────────────────────────────────────────────────────
export function useCompanyModules() {
  return useQuery({
    queryKey: queryKeys.companyModules,
    queryFn: async () => {
      const res = await api.get<{ data: CompanyModule[] } | CompanyModule[]>(
        "/company/me/modules",
      );
      const d = res.data as { data?: CompanyModule[] } | CompanyModule[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useToggleCompanyModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      moduleKey,
      isActive,
    }: {
      moduleKey: string;
      isActive: boolean;
    }) => {
      const res = await api.patch<CompanyModule>(
        `/company/me/modules/${moduleKey}`,
        { isActive },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companyModules });
      toast.success("تم تحديث الوحدة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Settings / preferences / logo ───────────────────────────────────────────
export function useCompanySettings() {
  return useQuery({
    queryKey: queryKeys.companySettings,
    queryFn: async () => {
      const res = await api.get<CompanySettings>("/company/me/settings");
      return res.data;
    },
  });
}

export function useUpdateCompanySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CompanySettings>) => {
      const res = await api.put<CompanySettings>(
        "/company/me/settings",
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companySettings });
      toast.success("تم حفظ الإعدادات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUploadCompanyLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<{ logoUrl: string }>(
        "/company/me/settings/logo",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companySettings });
      toast.success("تم رفع الشعار");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateCompanyPreferences() {
  return useMutation({
    mutationFn: async (body: {
      language?: "ar" | "en";
      theme?: "light" | "dark";
    }) => {
      const res = await api.patch<{
        language?: string;
        theme?: string;
      }>("/company/me/preferences", body);
      return res.data;
    },
    onSuccess: () => toast.success("تم حفظ التفضيلات"),
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// Brand performance breakdown (per-brand sales vs target tiles on CADashboard).
export interface BrandPerformanceEntry {
  id: string;
  name: string;
  abbr?: string;
  color?: string;
  branchesCount: number;
  monthlySalesHalalas: number;
  monthlyTargetHalalas: number;
  achievementPct: number;
  monthlyExpensesHalalas: number;
  netProfitHalalas: number;
}

export interface BrandPerformanceResponse {
  brands: BrandPerformanceEntry[];
  branchCompletionRate: number;
  branchesAboveTarget: number;
  totalBranchesCount: number;
}

export function useCompanyBrandPerformance(
  filter: { dateFrom?: string; dateTo?: string } = {},
) {
  return useQuery({
    queryKey: ["company", "dashboard", "brand-performance", filter] as const,
    queryFn: async () => {
      const res = await api.get<BrandPerformanceResponse>(
        "/company/me/dashboard/brand-performance",
        { params: filter },
      );
      return res.data;
    },
    staleTime: 60_000,
  });
}
