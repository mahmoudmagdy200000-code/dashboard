import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob, type Page } from "../../client";
import { ApiError, getErrorMessage } from "../../errors";
import type {
  AdminAuditLogEntry,
  AdminBrand,
  AdminBranch,
  AdminUnlinkedBranchesResponse,
  AdminBranchUploadStatus,
  AdminBrandUploadStatus,
  AdminBrandUploadType,
  AdminBrandBranchesUploadStatus,
  AdminAccountantModulesResponse,
  AdminRestaurantUploadStatus,
  AdminUploadResult,
  AdminCompany,
  AdminDistribution,
  AdminPermission,
  AdminPermissionsMatrix,
  AdminReportItem,
  AdminRestaurant,
  AdminRestaurantSubscription,
  AdminSettings,
  AdminSubscription,
  AdminUserRow,
  AdminErpSummary,
  AdminErpExportResult,
  ErpBatchRow,
  PlatformAdminOverview,
} from "../../types/platform";
import {
  queryKeys,
  type AdminAuditLogsFilter,
  type AdminBranchesFilter,
  type AdminBranchRequestsFilter,
  type AdminBrandsFilter,
  type AdminCompaniesFilter,
  type AdminErpFilter,
  type AdminSubscriptionsFilter,
  type AdminUsersFilter,
} from "../keys";

// ─── Overview ────────────────────────────────────────────────────────────────
export function useAdminOverview(opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.platformAdminOverview,
    enabled: opts.enabled,
    queryFn: async () => {
      const res = await api.get<PlatformAdminOverview>("/admin/overview");
      return res.data;
    },
    staleTime: 15_000,
  });
}

// ─── Companies ───────────────────────────────────────────────────────────────
export function useAdminCompanies(filter: AdminCompaniesFilter = {}, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.platformAdminCompanies(filter),
    enabled: opts.enabled,
    queryFn: async () => {
      const res = await api.get<Page<AdminCompany> | AdminCompany[]>(
        "/admin/companies",
        { params: filter },
      );
      const d = res.data as Page<AdminCompany> | AdminCompany[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useAdminCompany(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.platformAdminCompany(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<AdminCompany>(`/admin/companies/${id}`);
      return res.data;
    },
  });
}

export function useCreateAdminCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<AdminCompany> & {
      name: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      city: string;
      plan: "Basic" | "Professional" | "Enterprise";
      modules: string[];
      adminEmail: string;
    }) => {
      const res = await api.post<AdminCompany>("/admin/companies", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "companies"] });
      toast.success("تم إنشاء الشركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateAdminCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<AdminCompany>) => {
      const res = await api.patch<AdminCompany>(
        `/admin/companies/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "companies"] });
      toast.success("تم تحديث الشركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteAdminCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/companies/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "companies"] });
      toast.success("تم حذف الشركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useSuspendAdminCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<AdminCompany>(
        `/admin/companies/${id}/suspend`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "companies"] });
      toast.success("تم تعليق الشركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useActivateAdminCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<AdminCompany>(
        `/admin/companies/${id}/activate`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "companies"] });
      toast.success("تم تفعيل الشركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpgradeAdminCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      plan,
    }: {
      id: string;
      plan: "Basic" | "Professional" | "Enterprise";
    }) => {
      const res = await api.post<AdminCompany>(
        `/admin/companies/${id}/upgrade`,
        { plan },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "companies"] });
      toast.success("تم ترقية خطة الشركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAdminCompanyModules(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.platformAdminCompanyModules(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<{ data?: unknown[] } | unknown[]>(
        `/admin/companies/${id}/modules`,
      );
      const d = res.data as { data?: unknown[] } | unknown[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useUpdateAdminCompanyModules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      modules,
    }: {
      id: string;
      modules: Array<{ moduleKey: string; isActive: boolean }> | string[];
    }) => {
      const res = await api.patch(`/admin/companies/${id}/modules`, {
        modules,
      });
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.platformAdminCompanyModules(vars.id),
      });
      toast.success("تم تحديث وحدات الشركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAdminCompanyUsage(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.platformAdminCompanyUsage(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<Record<string, unknown>>(
        `/admin/companies/${id}/usage`,
      );
      return res.data;
    },
  });
}

// ─── Brands ──────────────────────────────────────────────────────────────────
export function useAdminBrands(filter: AdminBrandsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformAdminBrands(filter),
    queryFn: async () => {
      const res = await api.get<Page<AdminBrand> | AdminBrand[]>(
        "/admin/brands",
        { params: filter },
      );
      const d = res.data as Page<AdminBrand> | AdminBrand[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useCreateAdminBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      /** Backend contract 1.2: owner display name + companyId are required. */
      owner?: string;
      companyId?: string;
      abbr?: string;
      color?: string;
      ownerEmail?: string;
      plan: string;
      modules?: string[];
    }) => {
      const res = await api.post<AdminBrand>("/admin/brands", body);
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      // B-A6: surface owner-provisioning outcome so the admin knows the
      // owner's login credentials were (or weren't) emailed.
      if (data?.ownerEmail) {
        if (data.emailSent) {
          toast.success("تم إنشاء العلامة وإرسال بيانات الدخول لبريد المالك");
        } else {
          toast.warning("تم إنشاء العلامة وحساب المالك، لكن تعذّر إرسال البريد");
        }
      } else {
        toast.success("تم إضافة العلامة التجارية");
      }
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

/** B-A6: re-send / reset the brand owner's password by email. */
export function useResetBrandOwnerPassword() {
  return useMutation({
    mutationFn: async ({
      brandId,
      notify = true,
    }: {
      brandId: string;
      notify?: boolean;
    }) => {
      const res = await api.post<{
        ok: boolean;
        emailedTo: string;
        resetAt: string;
        emailSent?: boolean;
      }>(`/admin/brands/${brandId}/owner/reset-password`, { notify });
      return res.data;
    },
    // emailSent is meaningful now — credential mail is refused outright when the
    // mailer is misconfigured, so don't claim delivery that did not happen.
    onSuccess: (data) => {
      if (data?.emailSent === false) {
        toast.warning("تم إعادة تعيين الباسورد، لكن لم يصل البريد للمالك.");
        return;
      }
      toast.success(
        data?.emailedTo
          ? `تم إرسال باسورد جديد إلى ${data.emailedTo}`
          : "تم إعادة تعيين باسورد المالك",
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateAdminBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<AdminBrand>) => {
      const res = await api.patch<AdminBrand>(`/admin/brands/${id}`, patch);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم تحديث العلامة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteAdminBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/brands/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم حذف العلامة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useCreateAdminRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      brandId,
      ...body
    }: {
      brandId: string;
      name: string;
      city: string;
      status?: "active" | "suspended";
    }) => {
      const res = await api.post<AdminRestaurant>(
        `/admin/brands/${brandId}/restaurants`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم إضافة المطعم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Restaurants ─────────────────────────────────────────────────────────────
export function useUpdateAdminRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<AdminRestaurant>) => {
      const res = await api.patch<AdminRestaurant>(
        `/admin/restaurants/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      qc.invalidateQueries({
        queryKey: queryKeys.platformAdminRestaurantSubs,
      });
      toast.success("تم تحديث المطعم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteAdminRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/restaurants/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم حذف المطعم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAdminRestaurantSubscriptions() {
  return useQuery({
    queryKey: queryKeys.platformAdminRestaurantSubs,
    queryFn: async () => {
      const res = await api.get<
        Page<AdminRestaurantSubscription> | AdminRestaurantSubscription[]
      >("/admin/restaurants/subscriptions");
      const d = res.data as
        | Page<AdminRestaurantSubscription>
        | AdminRestaurantSubscription[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// ─── Branches ────────────────────────────────────────────────────────────────
export function useAdminBranches(filter: AdminBranchesFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformAdminBranches(filter),
    queryFn: async () => {
      const res = await api.get<Page<AdminBranch> | AdminBranch[]>(
        "/admin/branches",
        { params: filter },
      );
      const d = res.data as Page<AdminBranch> | AdminBranch[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// ─── Branch-request review queue (T14.1) ─────────────────────────────────────
// A company-admin's add-branch creates a pending_review branch; a platform admin
// approves/rejects it here. Only pending_review ids match approve/reject (else 404).
export function useAdminBranchRequests(filter: AdminBranchRequestsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformAdminBranchRequests(filter),
    queryFn: async () => {
      const res = await api.get<Page<AdminBranch> | AdminBranch[]>(
        "/admin/branch-requests",
        { params: filter },
      );
      const d = res.data as Page<AdminBranch> | AdminBranch[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
    staleTime: 15_000,
  });
}

const invalidateBranchRequests = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["platform", "admin", "branch-requests"] });
  qc.invalidateQueries({ queryKey: ["platform", "admin", "branches"] });
};

export function useApproveBranchRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<AdminBranch>(
        `/admin/branch-requests/${id}/approve`,
      );
      return res.data;
    },
    onSuccess: () => {
      invalidateBranchRequests(qc);
      toast.success("تم اعتماد الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useRejectBranchRequest() {
  const qc = useQueryClient();
  return useMutation({
    // reason is required (T14.1).
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.post<AdminBranch>(
        `/admin/branch-requests/${id}/reject`,
        { reason },
      );
      return res.data;
    },
    onSuccess: () => {
      invalidateBranchRequests(qc);
      toast.success("تم رفض الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useCreateAdminBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      restaurantId,
      ...body
    }: {
      restaurantId: string;
      name: string;
      manager?: string;
      managerUserId?: string;
      city?: string;
      address?: string;
      phone?: string;
    }) => {
      const res = await api.post<AdminBranch>(
        `/admin/restaurants/${restaurantId}/branches`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "branches"] });
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم إضافة الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateAdminBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<AdminBranch>) => {
      const res = await api.patch<AdminBranch>(`/admin/branches/${id}`, patch);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "branches"] });
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم تحديث الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteAdminBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/branches/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "branches"] });
      toast.success("تم حذف الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Link unlinked branches to a restaurant (2026-07-27) ──────────────────────
// Candidates + the restaurant picker options come back in ONE call: rows in
// `data`, dropdown options in `meta.restaurants`.
export function useAdminUnlinkedBranches(
  brandId: string | null | undefined,
  opts: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "admin", "brands", brandId ?? "", "unlinked-branches"],
    enabled: Boolean(brandId) && (opts.enabled ?? true),
    queryFn: async () => {
      const res = await api.get<AdminUnlinkedBranchesResponse>(
        `/admin/brands/${brandId}/branches`,
        { params: { linked: "false" } },
      );
      return res.data;
    },
  });
}

// Link one branch to a restaurant. The backend derives brand/company from the
// restaurant, so only restaurantId is sent. No per-call toast — the caller drives
// a bulk loop and aggregates the outcome. Brands tree is invalidated on success.
export function useLinkBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, restaurantId }: { id: string; restaurantId: string }) => {
      const res = await api.patch<AdminBranch>(`/admin/branches/${id}`, { restaurantId });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      qc.invalidateQueries({ queryKey: ["platform", "admin", "branches"] });
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────
export function useAdminUsers(filter: AdminUsersFilter = {}, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.platformAdminUsers(filter),
    enabled: opts.enabled,
    queryFn: async () => {
      const res = await api.get<Page<AdminUserRow> | AdminUserRow[]>(
        "/admin/users",
        { params: filter },
      );
      const d = res.data as Page<AdminUserRow> | AdminUserRow[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// Backend validation (enforced now — send the right fields or get 422):
//  role "branch"     → `branches` array of EXACTLY one branch id (size:1)
//  role "accountant" → `brands`   array of at least one brand id (min:1)
//  For both, the backend fixes `scope` itself — no need to send `scope`.
export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<AdminUserRow> & {
      name: string;
      email: string;
      role: string;
      brands?: string[];
      restaurants?: string[];
      branches?: string[];
      modules?: string[];
      // Must be the head's userId — a display name is rejected with 422.
      reportsTo?: string;
      // Required in practice for role "branch" (provisions the mobile login);
      // must be omitted for platform supplier / procurement accounts.
      companyId?: string;
      // Only for a company-scoped supplier; omit for a platform supplier.
      supplierId?: string;
      scope?: "all" | "brand" | "restaurant" | "branch";
      status?: "active" | "inactive";
      credentialMode?: "manual" | "email";
      password?: string;
      passwordConfirmation?: string;
      sendLoginEmail?: boolean;
    }) => {
      const res = await api.post<AdminUserRow & { credentialMode?: "manual" | "email"; emailSent?: boolean | null }>(
        "/admin/users",
        body,
      );
      return res.data;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "users"] });
      if (created?.emailSent === false) {
        toast.warning("تم إنشاء المستخدم، لكن تعذر إرسال بريد كلمة المرور.");
      } else if (created?.credentialMode === "manual") {
        toast.success("تم إنشاء المستخدم؛ سيُطلب منه تغيير كلمة المرور عند أول دخول.");
      } else {
        toast.success("تم إنشاء المستخدم وإرسال كلمة المرور بالبريد.");
      }
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useImportAdminUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      assertUploadFile(file);
      const res = await api.post<{
        imported: number;
        skipped: number;
        // Imported users are emailed their password; a non-zero count means
        // those accounts exist but nobody received credentials.
        emailFailed?: number;
        errors: Array<{ row: number; field: string; message: string }>;
      }>("/admin/users/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "users"] });
      toast.success(`تم استيراد ${data.imported} مستخدم`);
      if (data?.skipped) toast.warning(`تم تخطي ${data.skipped} صف`);
      if (data?.emailFailed) {
        toast.warning(
          `${data.emailFailed} حساب لم تصله كلمة المرور — استخدم «إعادة تعيين كلمة المرور» لهم.`,
        );
      }
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<AdminUserRow>) => {
      const res = await api.patch<AdminUserRow>(`/admin/users/${id}`, patch);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "users"] });
      toast.success("تم تحديث المستخدم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "users"] });
      toast.success("تم حذف المستخدم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useResetAdminUserPassword() {
  return useMutation({
    mutationFn: async (input: {
      id: string;
      mode: "manual" | "email";
      password?: string;
      passwordConfirmation?: string;
    }) => {
      const { id, ...body } = input;
      const res = await api.post<{ ok: boolean; mode: "manual" | "email"; emailSent: boolean | null }>(
        `/admin/users/${id}/reset-password`,
        body,
      );
      return res.data;
    },
    // Manual mode never attempts email; email mode reports transport outcome.
    onSuccess: (d) => {
      if (d?.emailSent === false) {
        toast.warning("تم إعادة تعيين كلمة المرور، لكن تعذر إرسال البريد الإلكتروني للمستخدم.");
        return;
      }
      toast.success(
        d?.mode === "email"
          ? "تم إرسال كلمة مرور جديدة إلى بريد المستخدم"
          : "تم تعيين كلمة المرور المؤقتة؛ سيُطلب من المستخدم تغييرها عند الدخول",
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useResetCompanyAdminPassword() {
  return useMutation({
    mutationFn: async ({ id, notify = true }: { id: string; notify?: boolean }) => {
      const res = await api.post<{
        ok: boolean;
        emailedTo: string;
        emailSent?: boolean;
        resetAt: string;
      }>(
        `/admin/companies/${id}/admin/reset-password`,
        { notify },
      );
      return res.data;
    },
    onSuccess: (d) => {
      if (d?.emailSent === false) {
        toast.warning("تم إعادة تعيين كلمة مرور أدمن الشركة، لكن تعذر إرسال البريد الإلكتروني.");
        return;
      }
      toast.success(
        d?.emailedTo
          ? `تم إرسال كلمة المرور إلى ${d.emailedTo}`
          : "تم إعادة تعيين كلمة مرور أدمن الشركة",
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useActivateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<AdminUserRow>(`/admin/users/${id}/activate`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "users"] });
      toast.success("تم تفعيل المستخدم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeactivateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<AdminUserRow>(
        `/admin/users/${id}/deactivate`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "users"] });
      toast.success("تم إيقاف المستخدم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Suppliers (admin-scoped picker for role=supplier user create) ────────────
export interface AdminSupplierRow {
  id: string;
  name: string;
  contactEmail: string | null;
  companyId?: string;
  status?: string;
  /** true when a login already exists — picking it would 422 SUPPLIER_LOGIN_AMBIGUOUS. */
  hasLogin?: boolean;
}
export interface AdminSuppliersFilter {
  companyId?: string;
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}
export function useAdminSuppliers(
  filter: AdminSuppliersFilter = {},
  opts: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "admin", "suppliers", filter] as const,
    enabled: opts.enabled,
    queryFn: async () => {
      const res = await api.get<Page<AdminSupplierRow> | AdminSupplierRow[]>(
        "/admin/suppliers",
        { params: filter },
      );
      const d = res.data as Page<AdminSupplierRow> | AdminSupplierRow[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// ─── Distribution ────────────────────────────────────────────────────────────
export function useAdminDistribution() {
  return useQuery({
    queryKey: queryKeys.platformAdminDistribution,
    queryFn: async () => {
      const res = await api.get<AdminDistribution>("/admin/distribution");
      return res.data;
    },
  });
}

export function useAssignRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      accountantId: string;
      restaurantId: string;
    }) => {
      const res = await api.post(
        "/admin/distribution/assign-restaurant",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminDistribution });
      toast.success("تم تعيين المطعم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUnassignRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      accountantId: string;
      restaurantId: string;
    }) => {
      await api.delete("/admin/distribution/assign-restaurant", { data: body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminDistribution });
      toast.success("تم إلغاء تعيين المطعم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAssignModules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      accountantId: string;
      restaurantId: string;
      modules: string[];
    }) => {
      const res = await api.post("/admin/distribution/assign-modules", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminDistribution });
      toast.success("تم تعيين الوحدات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useMoveToHead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { accountantId: string; headId: string }) => {
      const res = await api.post("/admin/distribution/move-to-head", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminDistribution });
      toast.success("تم نقل المحاسب");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Accountant assignments — consolidated (contract 1.8 / 1.9) ──────────────
// Meeting rule: an accountant is assigned to a BRAND (not a restaurant/branch).
// Send `brands` → backend sets scope=brand and clears any legacy restaurant ids.
// `restaurants` is still accepted for backward compatibility.
export function useUpdateAccountantAssignments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      accId,
      ...body
    }: {
      accId: string;
      headId?: string | null;
      brands?: string[];
      restaurants?: string[];
    }) => {
      const res = await api.patch(`/admin/accountants/${accId}/assignments`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminDistribution });
      toast.success("تم تحديث التوزيع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useSetAccountantRestaurantModules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      accId,
      restaurant,
      modules,
    }: {
      accId: string;
      restaurant: string;
      modules: string[];
    }) => {
      const res = await api.put(
        `/admin/accountants/${accId}/restaurants/${restaurant}/modules`,
        { modules },
      );
      return res.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminDistribution });
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "accountants", variables.accId, "modules"],
      });
      toast.success("تم تحديث الوحدات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Subscriptions ───────────────────────────────────────────────────────────
export function useAdminSubscriptions(filter: AdminSubscriptionsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformAdminSubscriptions(filter),
    queryFn: async () => {
      const res = await api.get<Page<AdminSubscription> | AdminSubscription[]>(
        "/admin/subscriptions",
        { params: filter },
      );
      const d = res.data as Page<AdminSubscription> | AdminSubscription[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useRenewSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      months,
    }: {
      id: string;
      months?: number;
    }) => {
      const res = await api.post<AdminSubscription>(
        `/admin/subscriptions/${id}/renew`,
        { months },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "subscriptions"],
      });
      toast.success("تم تجديد الاشتراك");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useChangeSubscriptionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      plan,
    }: {
      id: string;
      plan: string;
    }) => {
      const res = await api.post<AdminSubscription>(
        `/admin/subscriptions/${id}/change-plan`,
        { plan },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "subscriptions"],
      });
      toast.success("تم تغيير الخطة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

/** Update the modules enabled on a subscription — PATCH /admin/subscriptions/{id}/modules. */
export function useUpdateSubscriptionModules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, modules }: { id: string; modules: string[] }) => {
      const res = await api.patch<AdminSubscription>(
        `/admin/subscriptions/${id}/modules`,
        { modules },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "subscriptions"],
      });
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم تحديث الموديولات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useToggleAutoReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      enabled,
    }: {
      id: string;
      enabled: boolean;
    }) => {
      const res = await api.post<AdminSubscription>(
        `/admin/subscriptions/${id}/toggle-auto-reminder`,
        { enabled },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "subscriptions"],
      });
      toast.success("تم تحديث التذكير التلقائي");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useSuspendSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<AdminSubscription>(
        `/admin/subscriptions/${id}/suspend`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "subscriptions"],
      });
      toast.success("تم تعليق الاشتراك");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useActivateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<AdminSubscription>(
        `/admin/subscriptions/${id}/activate`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "subscriptions"],
      });
      toast.success("تم تفعيل الاشتراك");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Permissions ─────────────────────────────────────────────────────────────
export function useAdminPermissions() {
  return useQuery({
    queryKey: queryKeys.platformAdminPermissions,
    queryFn: async () => {
      const res = await api.get<AdminPermissionsMatrix>("/admin/permissions");
      return res.data;
    },
  });
}

export function useUpdateAdminPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (matrix: AdminPermissionsMatrix["matrix"]) => {
      const res = await api.put<AdminPermissionsMatrix>(
        "/admin/permissions",
        { matrix },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminPermissions });
      toast.success("تم حفظ الصلاحيات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function usePatchPermissionCell() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      module: string;
      roleKey: string;
      permission: AdminPermission;
    }) => {
      const res = await api.patch("/admin/permissions/cell", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminPermissions });
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useClonePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { fromRole: string; toRole: string }) => {
      const res = await api.post("/admin/permissions/clone", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminPermissions });
      toast.success("تم نسخ الصلاحيات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Audit ───────────────────────────────────────────────────────────────────
export function useAdminAuditLogs(filter: AdminAuditLogsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformAdminAuditLogs(filter),
    queryFn: async () => {
      const res = await api.get<Page<AdminAuditLogEntry>>(
        "/admin/audit-logs",
        { params: filter },
      );
      return res.data;
    },
  });
}

// ─── Settings ────────────────────────────────────────────────────────────────
export function useAdminSettings() {
  return useQuery({
    queryKey: queryKeys.platformAdminSettings,
    queryFn: async () => {
      const res = await api.get<AdminSettings>("/admin/settings");
      return res.data;
    },
  });
}

export function useUpdateAdminSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AdminSettings>) => {
      const res = await api.patch<AdminSettings>("/admin/settings", patch);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminSettings });
      toast.success("تم حفظ الإعدادات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Modules lookup (admin-scoped; replaces /company/me/lookups/modules) ──────
export interface AdminModuleLookup {
  value: string;
  key: string;
  labelAr: string;
  labelEn: string;
  icon?: string;
}
export function useAdminModules() {
  return useQuery({
    queryKey: ["platform", "admin", "lookups", "modules"] as const,
    queryFn: async () => {
      const res = await api.get<{ data: AdminModuleLookup[] }>(
        "/admin/lookups/modules",
      );
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Users lookup (shared /lookups/users) ─────────────────────────────────────
// 2026-08-03: `GET /lookups/users?role=head` now returns a display-ready `label`
// ("حسن رشدي — رئيس حسابات") + `roleLabel`/`status`, and drops the empty name of
// an incomplete invite onto its email — so the «يرفع تقريره إلى» picker can tell
// same-named heads apart instead of showing blank/ambiguous rows.
export interface LookupUserRow {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  roleKey?: string;
  roleLabel?: string;
  status?: string;
  label?: string;
}
export function useLookupUsers(
  params: { role?: string; status?: string } = {},
  opts: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["lookups", "users", params] as const,
    enabled: opts.enabled,
    queryFn: async () => {
      const res = await api.get<Page<LookupUserRow> | LookupUserRow[]>(
        "/lookups/users",
        { params },
      );
      const d = res.data as Page<LookupUserRow> | LookupUserRow[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
    staleTime: 60_000,
  });
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export function useAdminReportsCatalog() {
  return useQuery({
    queryKey: queryKeys.platformAdminReportsCatalog,
    queryFn: async () => {
      const res = await api.get<
        { data: AdminReportItem[] } | AdminReportItem[]
      >("/admin/reports/catalog");
      const d = res.data as { data?: AdminReportItem[] } | AdminReportItem[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useGenerateAdminReport() {
  return useMutation({
    // T15.6 — scope by brand/restaurant/branch (resolved to branches server-side);
    // format=pdf|xlsx streams a binary, json returns the report object.
    mutationFn: async (body: {
      reportKey: string;
      period?: { from: string; to: string };
      brandIds?: string[];
      restaurantIds?: string[];
      branchIds?: string[];
      format?: "json" | "pdf" | "xlsx";
    }) => {
      if (body.format === "pdf" || body.format === "xlsx") {
        await downloadBlob(
          "/admin/reports/generate",
          `admin-report-${body.reportKey}.${body.format}`,
          body,
        );
        return null;
      }
      const res = await api.post("/admin/reports/generate", body);
      return res.data;
    },
    onSuccess: () => toast.success("تم توليد التقرير"),
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Report distribution (T15.3) ─────────────────────────────────────────────
export interface AdminReportSendResult {
  reportKey: string;
  sentAt: string;
  sentCount: number;
  recipients: Array<{
    restaurantId: string;
    owner: string;
    email: string;
    sent: boolean;
    sentDate?: string | null;
  }>;
}

export function useSendAdminReport() {
  const qc = useQueryClient();
  return useMutation({
    // T15.3 — email/in-app delivery to the brand owner. `restaurantIds` omitted
    // → all active restaurants (bulk «إرسال الكل»). Prefer `method`; `channels`
    // is a legacy alias. `format` default pdf. Idempotent per (key, restaurant, from).
    mutationFn: async ({
      reportKey,
      ...body
    }: {
      reportKey: string;
      period: { from: string; to: string };
      restaurantIds?: string[];
      method?: "email" | "inApp" | "both";
      channels?: Array<"email" | "inApp">;
      format?: "pdf" | "excel" | "both";
      coverMessage?: string;
    }) => {
      const res = await api.post<AdminReportSendResult>(
        `/admin/reports/${reportKey}/send`,
        body,
      );
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminReportsCatalog });
      qc.invalidateQueries({ queryKey: ["platform", "admin", "reports", "status"] });
      toast.success(`تم إرسال التقرير${data?.sentCount != null ? ` (${data.sentCount})` : ""}`);
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// T15.1 — parse dry-run result. status "verified" → wizard may advance to step ③;
// "failed" → block, show errors[]. Extension guard is server-side (422).
export interface AdminReportUploadResult {
  uploadId: string;
  reportKey: string;
  status: "verified" | "failed";
  rowCount: number;
  errors: string[];
}

export function useUploadAdminReport() {
  return useMutation({
    mutationFn: async ({ reportKey, file }: { reportKey: string; file: File }) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<AdminReportUploadResult>(
        `/admin/reports/${reportKey}/upload`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return res.data;
    },
    // The dry-run may report `failed`; surface that instead of a blanket success.
    onSuccess: (data) => {
      if (data?.status === "failed") {
        toast.error(data.errors?.[0] ?? "فشل التحقق من الملف");
      } else {
        toast.success(`تم التحقق من الملف${data?.rowCount != null ? ` (${data.rowCount} صف)` : ""}`);
      }
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Report preview / status / periods (backend batch-1 A9/A10/A11) ──────────
export interface AdminReportPreviewRow {
  label: string;
  value: string;
  type: "number" | "string";
  header?: boolean;
}

/** A9 — preview the parsed rows of an uploaded report file. */
export function useAdminReportPreview(
  reportKey: string,
  uploadId?: string,
  period?: string,
) {
  return useQuery({
    queryKey: ["platform", "admin", "reports", "preview", reportKey, uploadId, period],
    enabled: !!reportKey && !!uploadId,
    queryFn: async () => {
      const res = await api.get<{ rows: AdminReportPreviewRow[] }>(
        `/admin/reports/${reportKey}/preview`,
        { params: { uploadId, period } },
      );
      return res.data;
    },
  });
}

export interface AdminReportStatusRow {
  restaurantId: string;
  restaurantName: string;
  owner: string;
  email: string;
  sent: boolean;
  sentDate: string | null;
  viewed: boolean;
  viewedDate: string | null;
}

/** A10 — per-restaurant sent/viewed status for a report + period. */
export function useAdminReportStatus(reportKey: string, period?: string) {
  return useQuery({
    queryKey: ["platform", "admin", "reports", "status", reportKey, period],
    enabled: !!reportKey,
    queryFn: async () => {
      const res = await api.get<{
        reportKey: string;
        period: string;
        summary: { sent: number; notSent: number; viewed: number; notViewed: number };
        rows: AdminReportStatusRow[];
      }>(`/admin/reports/${reportKey}/status`, { params: { period } });
      return res.data;
    },
  });
}

/** A11 — available report periods (YYYY-MM). */
export function useAdminReportPeriods() {
  return useQuery({
    queryKey: ["platform", "admin", "reports", "periods"],
    queryFn: async () => {
      const res = await api.get<{ periods: string[] }>("/admin/reports/periods");
      return res.data?.periods ?? [];
    },
  });
}

// ─── Create subscription (backend batch-1 A4) ────────────────────────────────
export function useCreateAdminSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      brandId: string;
      plan: string; // silver | gold | platinum
      months: number;
      startDate?: string;
      monthlyPrice?: number; // integer halalas
      reminderEnabled?: boolean;
      modules?: string[];
    }) => {
      const res = await api.post<AdminSubscription>("/admin/subscriptions", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "subscriptions"] });
      toast.success("تم إنشاء الاشتراك");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Bulk uploads (multipart) ────────────────────────────────────────────────

/** Server cap is 2 MB and `.xlsx|.xls|.csv|.txt`; fail fast instead of round-tripping a 422. */
export const ADMIN_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
const ADMIN_UPLOAD_EXTS = [".xlsx", ".xls", ".csv", ".txt"];

export function assertUploadFile(file: File): void {
  const name = (file.name ?? "").toLowerCase();
  if (!ADMIN_UPLOAD_EXTS.some((e) => name.endsWith(e))) {
    throw new ApiError(
      {
        error: {
          code: "INVALID_INPUT",
          message: "Unsupported file type",
          messageAr: "صيغة الملف غير مدعومة — استخدم xlsx أو xls أو csv",
        },
      },
      422,
    );
  }
  if (file.size > ADMIN_UPLOAD_MAX_BYTES) {
    throw new ApiError(
      {
        error: {
          code: "INVALID_INPUT",
          message: "File too large",
          messageAr: "حجم الملف أكبر من 2 ميجابايت",
        },
      },
      422,
    );
  }
}

export function useAdminUploadBrand() {
  const qc = useQueryClient();
  return useMutation({
    // `fixed-assets` is now a valid brand-level upload (lands with branch_id null).
    mutationFn: async ({
      brandId,
      type,
      file,
    }: {
      brandId: string;
      type: Exclude<AdminBrandUploadType, "employees">;
      file: File;
    }) => {
      assertUploadFile(file);
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<AdminUploadResult>(
        `/admin/brands/${brandId}/upload/${type}`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.platformAdminBrandUploadStatus(vars.brandId),
      });
      toast.success("تم رفع الملف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAdminUploadEmployees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      restaurantId,
      file,
    }: {
      restaurantId: string;
      file: File;
    }) => {
      assertUploadFile(file);
      const fd = new FormData();
      fd.append("file", file);
      // Per restaurant, not per brand — each restaurant keeps its own roster.
      const res = await api.post<AdminUploadResult>(
        `/admin/restaurants/${restaurantId}/upload/employees`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return res.data;
    },
    // Refresh the restaurant's own status too, else the «حالة الرفع» column and
    // the brand summary keep showing the pre-upload state.
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "restaurants", vars.restaurantId, "upload-status"],
      });
      toast.success("تم رفع الموظفين");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// 2026-08-04: employees upload per BRANCH (not just per restaurant) so a newly
// built branch has a place to upload its roster, mirroring fixed-assets.
export function useAdminUploadBranchEmployees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchId,
      file,
    }: {
      branchId: string;
      file: File;
    }) => {
      assertUploadFile(file);
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<
        AdminUploadResult & { employeeCount?: number }
      >(`/admin/branches/${branchId}/upload/employees`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "branches"] });
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "branches", vars.branchId, "upload-status"],
      });
      // Refresh the whole-column endpoint + the brand summary (keyed under brands).
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم رفع موظفي الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAdminUploadFixedAssets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchId,
      file,
    }: {
      branchId: string;
      file: File;
    }) => {
      assertUploadFile(file);
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<
        AdminUploadResult & { branchGroups?: Record<string, number>; notifications?: number }
      >(`/admin/branches/${branchId}/upload/fixed-assets`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "branches"] });
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "branches", vars.branchId, "upload-status"],
      });
      // The «حالة الرفع» column reads GET /admin/brands/{id}/branches/upload-status
      // and the summary reads GET /admin/brands/{id}/upload-status — both keyed
      // under ["platform","admin","brands",…]. Without this the column stayed on
      // «لم يُرفع» after a successful asset upload until a manual refresh.
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم رفع الأصول الثابتة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAdminUploadTemplate() {
  return useMutation({
    // 2026-08-03: passing an owner id makes the endpoint ship that owner's SAVED
    // rows (filename `{type}-data.xlsx`) instead of the blank sheet — re-download
    // is now an edit surface, not a reset. No id → the blank template as before.
    mutationFn: async ({
      type,
      filename,
      brandId,
      branchId,
      restaurantId,
    }: {
      type: AdminBrandUploadType;
      filename?: string;
      brandId?: string;
      branchId?: string;
      restaurantId?: string;
    }) => {
      const params: Record<string, string> = {};
      if (brandId) params.brandId = brandId;
      if (branchId) params.branchId = branchId;
      if (restaurantId) params.restaurantId = restaurantId;
      const hasOwner = Object.keys(params).length > 0;
      await downloadBlob(
        `/admin/upload/templates/${type}`,
        filename ?? `${type}-${hasOwner ? "data" : "template"}.xlsx`,
        hasOwner ? params : undefined,
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAdminBrandUploadStatus(brandId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.platformAdminBrandUploadStatus(brandId ?? ""),
    enabled: Boolean(brandId),
    queryFn: async () => {
      const res = await api.get<AdminBrandUploadStatus>(
        `/admin/brands/${brandId}/upload-status`,
      );
      return res.data;
    },
  });
}

// The branch-level status endpoint was missing entirely, so a per-branch
// fixed-assets upload was written but unreadable — the column could never
// leave «لم يُرفع». Now published.
export function useAdminBranchUploadStatus(branchId: string | null | undefined) {
  return useQuery({
    queryKey: ["platform", "admin", "branches", branchId ?? "", "upload-status"],
    enabled: Boolean(branchId),
    queryFn: async () => {
      const res = await api.get<AdminBranchUploadStatus>(
        `/admin/branches/${branchId}/upload-status`,
      );
      return res.data;
    },
  });
}

export function useAdminRestaurantUploadStatus(
  restaurantId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["platform", "admin", "restaurants", restaurantId ?? "", "upload-status"],
    enabled: Boolean(restaurantId),
    queryFn: async () => {
      const res = await api.get<AdminRestaurantUploadStatus>(
        `/admin/restaurants/${restaurantId}/upload-status`,
      );
      return res.data;
    },
  });
}

/**
 * Batch per-restaurant employee upload state, keyed by restaurantId.
 * Employees are NOT a brand-owner step, so the brand upload-status never
 * reports them — the authoritative source is the per-restaurant endpoint
 * (`GET /admin/restaurants/{id}/upload-status`, `employees: boolean`). One
 * query per restaurant via useQueries so the whole brand's grid resolves.
 */
export function useAdminRestaurantEmployeeStatus(
  restaurantIds: string[],
): Record<string, boolean> {
  const results = useQueries({
    queries: restaurantIds.map((rid) => ({
      queryKey: ["platform", "admin", "restaurants", rid, "upload-status"],
      enabled: Boolean(rid),
      queryFn: async () => {
        const res = await api.get<AdminRestaurantUploadStatus>(
          `/admin/restaurants/${rid}/upload-status`,
        );
        return res.data;
      },
    })),
  });
  const map: Record<string, boolean> = {};
  restaurantIds.forEach((rid, i) => {
    map[rid] = Boolean(results[i]?.data?.employees);
  });
  return map;
}

/**
 * The whole per-branch fixed-assets column in one call. Per-branch assets aren't
 * a brand-owner step, so the brand upload-status never reported them — this
 * endpoint carries `fixedAssetsStatus` (done/failed/not_uploaded) per branch.
 */
export function useAdminBrandBranchesUploadStatus(
  brandId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["platform", "admin", "brands", brandId ?? "", "branches-upload-status"],
    enabled: Boolean(brandId),
    queryFn: async () => {
      const res = await api.get<AdminBrandBranchesUploadStatus>(
        `/admin/brands/${brandId}/branches/upload-status`,
      );
      return res.data;
    },
  });
}

/**
 * Per-restaurant module matrix for one accountant, with restaurant NAMES and the
 * full moduleCatalog. `reason: "NO_COVERED_RESTAURANTS"` ⇒ accountant has no brand yet.
 */
export function useAdminAccountantModules(
  accId: string | null | undefined,
  opts: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "admin", "accountants", accId ?? "", "modules"],
    enabled: Boolean(accId) && (opts.enabled ?? true),
    queryFn: async () => {
      const res = await api.get<AdminAccountantModulesResponse>(
        `/admin/accountants/${accId}/modules`,
      );
      return res.data;
    },
  });
}

export function useExportAdminAuditLogs() {
  return useMutation({
    mutationFn: async (
      filter: {
        format?: "xlsx" | "csv";
        actionType?: string;
        userFilter?: string;
        dateFrom?: string;
        dateTo?: string;
      } = {},
    ) => {
      const fmt = filter.format ?? "xlsx";
      await downloadBlob(
        "/admin/audit-logs/export",
        `admin-audit-logs.${fmt}`,
        { ...filter, format: fmt },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export interface AdminAuditLogFilterOption {
  value: string;
  labelAr: string;
  labelEn: string;
}

export function useAdminAuditLogFilters() {
  return useQuery({
    queryKey: ["platform", "admin", "audit-logs", "filters"] as const,
    queryFn: async () => {
      const res = await api.get<{ actionTypes: AdminAuditLogFilterOption[] }>(
        "/admin/audit-logs/filters",
      );
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Section 1.1: Per-restaurant subscription renewal ──────────────────────
export function useRenewRestaurantSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      restaurantId,
      months,
    }: { restaurantId: string; months?: number }) => {
      const res = await api.post(
        `/admin/restaurants/${restaurantId}/subscription/renew`,
        months !== undefined ? { months } : {},
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "restaurants"] });
      qc.invalidateQueries({ queryKey: ["platform", "admin", "subscriptions"] });
      toast.success("تم تجديد الاشتراك");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Section 1.2: Brand auto-reminder toggle ───────────────────────────────
export function useToggleBrandAutoReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      brandId,
      enabled,
    }: { brandId: string; enabled: boolean }) => {
      const res = await api.post<{ brandId: string; enabled: boolean; updatedAt: string }>(
        `/admin/brands/${brandId}/auto-reminder`,
        { enabled },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      qc.invalidateQueries({ queryKey: ["platform", "admin", "subscriptions"] });
      toast.success("تم تحديث تفعيل التذكير التلقائي");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Section 1.3: Audit-log entry detail (before/after diff) ──────────────
export interface AdminAuditLogDetail {
  id: string;
  action: string;
  actorName: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  description?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
  occurredAt: string;
}

export function useAdminAuditLogEntry(id: string | null | undefined) {
  return useQuery({
    queryKey: ["platform", "admin", "audit-logs", id] as const,
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<AdminAuditLogDetail>(`/admin/audit-logs/${id}`);
      return res.data;
    },
  });
}

// ─── Section 2.3: Permission matrix versioning ────────────────────────────
export interface PermissionsHistoryRow {
  id: string;
  savedBy: { id: string; name: string };
  savedAt: string;
  changesCount: number;
  summaryAr: string;
}

export interface PermissionsHistoryPage {
  data: PermissionsHistoryRow[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useAdminPermissionsHistory(
  filter: { page?: number; pageSize?: number } = {},
) {
  return useQuery({
    queryKey: ["platform", "admin", "permissions", "history", filter] as const,
    queryFn: async () => {
      const res = await api.get<PermissionsHistoryPage>(
        "/admin/permissions/history",
        { params: filter },
      );
      return res.data;
    },
  });
}

export function useAdminPermissionsSnapshot(snapshotId: string | null | undefined) {
  return useQuery({
    queryKey: ["platform", "admin", "permissions", "history", snapshotId] as const,
    enabled: Boolean(snapshotId),
    queryFn: async () => {
      const res = await api.get(`/admin/permissions/history/${snapshotId}`);
      return res.data;
    },
  });
}

export function useRestoreAdminPermissionsSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (snapshotId: string) => {
      const res = await api.post(
        `/admin/permissions/history/${snapshotId}/restore`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "permissions"] });
      toast.success("تم استرجاع المصفوفة من النسخة المختارة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Section 3.6: Background-job monitoring ───────────────────────────────
export type AdminJobStatus = "queued" | "running" | "done" | "failed" | "retrying";
export type AdminJobType =
  | "erp.batch" | "asset.import" | "report.export"
  | "users.import" | "brand.upload";

export interface AdminJob {
  id: string;
  type: AdminJobType | string;
  status: AdminJobStatus | string;
  companyId?: string;
  branchId?: string;
  triggeredBy: { userId: string; name: string };
  progressPct: number;
  attemptCount: number;
  lastError?: string;
  queuedAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export function useAdminJobs(
  filter: {
    status?: string; type?: string;
    page?: number; pageSize?: number;
  } = {},
) {
  return useQuery({
    queryKey: ["platform", "admin", "jobs", filter] as const,
    queryFn: async () => {
      const res = await api.get<{
        data: AdminJob[];
        meta: { page: number; pageSize: number; total: number; totalPages: number };
      }>("/admin/jobs", { params: filter });
      return res.data;
    },
    refetchInterval: 15_000,
  });
}

export function useRetryAdminJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ ok: true; requeuedAt: string }>(
        `/admin/jobs/${id}/retry`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "jobs"] });
      toast.success("تم إعادة جدولة المهمة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useCancelAdminJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ ok: true; cancelledAt: string }>(
        `/admin/jobs/${id}/cancel`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "jobs"] });
      toast.success("تم إلغاء المهمة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Admin ERP (T10 §C — cross-company, admin only) ───────────────────────────
export function useAdminErpSummary() {
  return useQuery({
    queryKey: queryKeys.adminErpSummary,
    queryFn: async () => {
      const res = await api.get<AdminErpSummary>("/admin/erp/summary");
      return res.data;
    },
    staleTime: 15_000,
  });
}

export function useAdminErpBatches(filter: AdminErpFilter = {}) {
  const clean = Object.fromEntries(
    Object.entries(filter).filter(([, v]) => v !== undefined && v !== "" && v !== "all"),
  );
  return useQuery({
    queryKey: queryKeys.adminErpBatches(filter),
    queryFn: async () => {
      const res = await api.get<Page<ErpBatchRow> | ErpBatchRow[]>(
        "/admin/erp/batches",
        { params: clean },
      );
      const d = res.data;
      return Array.isArray(d) ? { data: d, meta: undefined } : d;
    },
  });
}

// One of batchIds / allReady is required (else 422).
export function useAdminErpExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { batchIds?: string[]; allReady?: boolean }) => {
      const res = await api.post<AdminErpExportResult>("/admin/erp/export", body);
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "erp"] });
      if ((data.failed?.length ?? 0) === 0) {
        toast.success(`تم تصدير ${data.count} دفعة`);
      } else {
        toast.warning(
          `تم تصدير ${data.exported.length} وفشل ${data.failed.length}`,
        );
      }
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
