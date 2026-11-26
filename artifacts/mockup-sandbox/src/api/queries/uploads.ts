import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import { getErrorMessage } from "../errors";
import { getSiteLang } from "../../auth/siteLang";
import { queryKeys } from "./keys";

const tr = (ar: string, en: string) => (getSiteLang() === "en" ? en : ar);

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url?: string;
  verified?: boolean;
  uploadedAt: string;
  uploadedById?: string;
}

export interface PresignedUrlResponse {
  attachmentId: string;
  uploadUrl: string;
  fields?: Record<string, string>;
  expiresAt?: string;
}

// ─── Mutations & queries ─────────────────────────────────────────────────────
export function useRequestPresignedUrl() {
  return useMutation({
    mutationFn: async (body: {
      filename: string;
      mimeType: string;
      sizeBytes: number;
      refType?: string;
      refId?: string;
    }) => {
      const res = await api.post<PresignedUrlResponse>(
        "/uploads/presigned-url",
        body,
      );
      return res.data;
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDirectUpload() {
  return useMutation({
    mutationFn: async ({
      file,
      refType,
      refId,
    }: {
      file: File;
      refType?: string;
      refId?: string;
    }) => {
      const fd = new FormData();
      fd.append("file", file);
      if (refType) fd.append("refType", refType);
      if (refId) fd.append("refId", refId);
      const res = await api.post<Attachment>("/uploads/direct", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => toast.success("تم رفع الملف"),
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useConfirmUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const res = await api.post<Attachment>(
        `/uploads/${attachmentId}/confirm`,
      );
      return res.data;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.attachment(id) });
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAttachment(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.attachment(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<Attachment>(`/attachments/${id}`);
      return res.data;
    },
  });
}

export function useDownloadAttachment() {
  return useMutation({
    mutationFn: async ({
      id,
      filename,
    }: {
      id: string;
      filename?: string;
    }) => {
      await downloadBlob(
        `/attachments/${id}/download`,
        filename ?? `attachment-${id}`,
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useVerifyAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<Attachment>(`/attachments/${id}/verify`);
      return res.data;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.attachment(id) });
      toast.success(tr("تم التحقق من المرفق", "Attachment verified"));
    },
    onError: (e) => toast.error(getErrorMessage(e, getSiteLang())),
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/attachments/${id}`);
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.attachment(id) });
      toast.success(tr("تم حذف المرفق", "Attachment deleted"));
    },
    onError: (e) => toast.error(getErrorMessage(e, getSiteLang())),
  });
}
