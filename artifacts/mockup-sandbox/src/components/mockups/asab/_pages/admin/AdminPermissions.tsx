import { useState, useEffect } from "react";
import { useAdminPermissions, useUpdateAdminPermissions } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { Badge } from "../../components/Badge";
import { CheckCircle2, Copy, X, Edit2 } from "lucide-react";
import type { PageProps } from "../../_shared/types";

export function AdminPermissions({ }: PageProps) {
  const { data: permsApi } = useAdminPermissions();
  const updatePermsMut = useUpdateAdminPermissions();
  const { t, lang, dir } = useLang(); const en = lang === "en";
  type Permission = "view" | "submit" | "review" | "approve" | "final" | "none";
  const PERM_CYCLE: Permission[] = ["none", "view", "submit", "review", "approve", "final"];
  const permCls: Record<Permission, string> = {
    view: "bg-blue-50 text-blue-600 border-blue-200",
    submit: "bg-cyan-50 text-cyan-600 border-cyan-200",
    review: "bg-amber-50 text-amber-600 border-amber-200",
    approve: "bg-emerald-50 text-emerald-600 border-emerald-200",
    final: "bg-purple-50 text-purple-600 border-purple-200",
    none: "bg-gray-50 text-gray-300 border-gray-100",
  };
  const permLabel: Record<Permission, string> = { view: t("عرض", "View"), submit: t("إدخال", "Enter"), review: t("مراجعة", "Review"), approve: t("اعتماد", "Approve"), final: t("نهائي", "Final"), none: "—" };
  const apiRoles = Array.isArray((permsApi as any)?.roles) ? (permsApi as any).roles as string[] : null;
  const roles = apiRoles ?? [t("محاسب", "Accountant"), t("رئيس حسابات", "Head Acc"), t("مدير فرع", "Branch Mgr"), t("مدير مشتريات", "Proc Mgr"), t("مورد", "Supplier"), t("أدمن", "Admin")];
  const scopeRow: Record<string, string> = {
    [t("محاسب", "Accountant")]: t("علامة/مطعم محدد", "Specific brand/restaurant"),
    [t("رئيس حسابات", "Head Acc")]: t("علامة محددة", "Specific brand"),
    [t("مدير فرع", "Branch Mgr")]: t("فرع واحد", "One branch"),
    [t("مدير مشتريات", "Proc Mgr")]: t("علامات محددة", "Specific brands"),
    [t("مورد", "Supplier")]: t("نطاق المورد", "Supplier scope"),
    [t("أدمن", "Admin")]: t("كامل", "Full"),
  };
  const roleBadgeCls: Record<string, string> = {
    [t("محاسب", "Accountant")]: "bg-blue-50 text-blue-700",
    [t("رئيس حسابات", "Head Acc")]: "bg-amber-50 text-amber-700",
    [t("مدير فرع", "Branch Mgr")]: "bg-emerald-50 text-emerald-700",
    [t("مدير مشتريات", "Proc Mgr")]: "bg-purple-50 text-purple-700",
    [t("مورد", "Supplier")]: "bg-orange-50 text-orange-700",
    [t("أدمن", "Admin")]: "bg-red-50 text-red-700",
  };

  // Permission matrix is driven by GET /admin/permissions. No static fallback.
  const [matrix, setMatrix] = useState<{ module: string; perms: Permission[] }[]>([]);
  useEffect(() => {
    const m = (permsApi as any)?.matrix;
    if (Array.isArray(m)) setMatrix(m as { module: string; perms: Permission[] }[]);
  }, [permsApi]);
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [changes, setChanges] = useState(0);
  const [cloneFrom, setCloneFrom] = useState("");
  const [cloneTo, setCloneTo] = useState("");
  const [showClone, setShowClone] = useState(false);
  const [cloneDone, setCloneDone] = useState(false);

  const handleClone = () => {
    if (!cloneFrom || !cloneTo || cloneFrom === cloneTo) return;
    const fromIdx = roles.indexOf(cloneFrom);
    const toIdx = roles.indexOf(cloneTo);
    if (fromIdx < 0 || toIdx < 0) return;
    setMatrix(prev => prev.map(row => ({
      ...row,
      perms: row.perms.map((p, j) => j === toIdx ? row.perms[fromIdx] : p)
    })));
    setCloneDone(true);
    setChanges(c => c + 3);
    setTimeout(() => { setShowClone(false); setCloneDone(false); setCloneFrom(""); setCloneTo(""); }, 1000);
  };

  const cyclePermission = (rowIdx: number, colIdx: number) => {
    if (!editMode) return;
    setMatrix(prev => {
      const next = prev.map((r, i) => i !== rowIdx ? r : {
        ...r,
        perms: r.perms.map((p, j) => {
          if (j !== colIdx) return p;
          const idx = PERM_CYCLE.indexOf(p);
          return PERM_CYCLE[(idx + 1) % PERM_CYCLE.length];
        })
      });
      return next;
    });
    setChanges(c => c + 1);
    setSaved(false);
  };

  const saveChanges = () => {
    // Hook wraps the array in { matrix } itself — pass the bare array, not { matrix }
    // (double-wrapping produced body { matrix: { matrix: [...] } } → 422).
    updatePermsMut.mutate(matrix as any, {
      onSuccess: () => {
        setSaved(true);
        setChanges(0);
      },
      onError: () => {
        setSaved(false);
      }
    });
  };
  const resetAll = () => {
    const orig = (permsApi as any)?.matrix;
    if (Array.isArray(orig)) {
      setMatrix(JSON.parse(JSON.stringify(orig)));
    }
    setSaved(false);
    setChanges(0);
  };

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("مصفوفة الصلاحيات", "Permissions Matrix")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{t("صلاحيات الأدوار", "Role Permissions")} — {editMode ? t("وضع التعديل نشط · اضغط على أي خلية لتغيير الصلاحية", "Edit mode active · click any cell to change permission") : t("للتعديل فعّل وضع التحرير", "Enable edit mode to modify")}</p>
        </div>
        <div className="flex items-center gap-2">
          {editMode && changes > 0 && (
            <>
              <Badge className="bg-amber-50 text-amber-700 border border-amber-200">{changes} {t("تعديل معلّق", "pending changes")}</Badge>
              <button onClick={saveChanges} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> {t("حفظ التعديلات", "Save Changes")}
              </button>
            </>
          )}
          {saved && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">✓ {t("تم الحفظ", "Saved")}</Badge>}
          <button onClick={() => setShowClone(!showClone)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
            <Copy size={12} /> {t("نسخ دور", "Clone Role")}
          </button>
          <button onClick={() => { setEditMode(!editMode); if (editMode) resetAll(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${editMode ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" : "bg-purple-600 text-white hover:bg-purple-700"}`}>
            {editMode ? <><X size={12} /> {t("إلغاء التعديل", "Cancel Edit")}</> : <><Edit2 size={12} /> {t("تعديل الصلاحيات", "Edit Permissions")}</>}
          </button>
        </div>
      </div>

      {/* Clone role panel */}
      {showClone && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2"><Copy size={14} /> {t("نسخ صلاحيات دور إلى دور آخر", "Clone role permissions to another role")}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="text-[11px] font-semibold text-blue-700 block mb-1">{t("من دور", "From Role")}</label>
              <select value={cloneFrom} onChange={e => setCloneFrom(e.target.value)} className="text-sm border border-blue-200 rounded-lg px-3 py-2 bg-white">
                <option value="">{t("اختر الدور المصدر", "Select source role")}</option>
                {roles.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="text-blue-400 mt-4">←</div>
            <div>
              <label className="text-[11px] font-semibold text-blue-700 block mb-1">{t("إلى دور", "To Role")}</label>
              <select value={cloneTo} onChange={e => setCloneTo(e.target.value)} className="text-sm border border-blue-200 rounded-lg px-3 py-2 bg-white">
                <option value="">{t("اختر الدور الهدف", "Select target role")}</option>
                {roles.filter(r => r !== cloneFrom).map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="mt-4">
              <button onClick={handleClone} disabled={!cloneFrom || !cloneTo}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${cloneDone ? "bg-emerald-600 text-white" : cloneFrom && cloneTo ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                {cloneDone ? t("✓ تم النسخ", "✓ Cloned") : t("تطبيق النسخ", "Apply Clone")}
              </button>
            </div>
            <div className="mt-4">
              <button onClick={() => setShowClone(false)} className="text-xs text-gray-500 hover:underline">{t("إلغاء", "Cancel")}</button>
            </div>
          </div>
          <p className="text-[11px] text-blue-600 mt-2">⚠ {t("سيتم استبدال صلاحيات الدور الهدف بصلاحيات الدور المصدر", "Target role permissions will be replaced with source role permissions")}</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-500 font-semibold">{t("الصلاحيات:", "Permissions:")}</span>
        {(Object.keys(permCls) as Permission[]).filter(p => p !== "none").map(p => (
          <span key={p} className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${permCls[p]}`}>{permLabel[p]}</span>
        ))}
        {editMode && <span className="text-[10px] px-2.5 py-1 rounded-full border bg-gray-50 text-gray-500 border-gray-200 font-semibold animate-pulse">{t("اضغط على الخلايا للتعديل ←", "← Click cells to change")}</span>}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        {editMode && (
          <div className="px-4 py-2.5 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
            <Edit2 size={13} className="text-purple-600" />
            <p className="text-xs text-purple-700 font-semibold">{t("وضع التعديل نشط — اضغط على أي خلية لتدوير الصلاحية (—→عرض→إدخال→مراجعة→اعتماد→نهائي)", "Edit mode active — click any cell to cycle permission (—→View→Enter→Review→Approve→Final)")}</p>
          </div>
        )}
        <table className="w-full text-xs" dir="rtl">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-right font-semibold text-gray-500 bg-gray-50 w-44">{t("الموديول", "Module")}</th>
              {roles.map(r => (
                <th key={r} className="px-3 py-3 text-center bg-gray-50 min-w-[110px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${roleBadgeCls[r]}`}>{r}</span>
                    <span className="text-[9px] text-gray-400 font-normal">{scopeRow[r]}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {matrix.map((row, i) => (
              <tr key={i} className={`${i % 2 === 0 ? "" : "bg-gray-50/20"} ${editMode ? "" : "hover:bg-gray-50/50"}`}>
                <td className="px-4 py-2.5 font-semibold text-gray-700">{row.module}</td>
                {row.perms.map((p, j) => (
                  <td key={j} className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => cyclePermission(i, j)}
                      disabled={!editMode}
                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full border text-[10px] font-semibold min-w-[56px] transition-all ${permCls[p]} ${editMode ? "cursor-pointer hover:scale-110 hover:shadow-sm active:scale-95" : "cursor-default"}`}>
                      {permLabel[p]}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-amber-700 text-xs">
          <span className="flex-shrink-0 mt-0.5">ℹ️</span>
          <p>{t("اضغط على أي خلية لتدوير مستوى الصلاحية. تسري التغييرات فور حفظها. صلاحيات", "Click any cell to cycle the permission level. Changes take effect upon saving. It is not recommended to reduce")} <strong>{t("الأدمن", "Admin")}</strong> {t("لا يُنصح بتخفيضها.", "permissions.")}</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-bold text-blue-700 mb-2">{t("ملاحظة حول نطاق الوصول", "Note on Access Scope")}</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-600">
          <p>• {t("المحاسب: يرى فقط المطاعم والعلامات التجارية المخصصة له في إعدادات حسابه", "Accountant: sees only restaurants/brands assigned in their account settings")}</p>
          <p>• {t("رئيس الحسابات: يرى كل المحاسبين ضمن العلامات التجارية المخصصة له", "Head Accountant: sees all accountants within their assigned brands")}</p>
          <p>• {t("مدير الفرع: يرى فقط فرعه المخصص ولا يتجاوزه", "Branch Manager: sees only their assigned branch")}</p>
          <p>• {t("مدير المشتريات: يرى طلبات الشراء لجميع الفروع ضمن علاماته التجارية", "Procurement Manager: sees purchase requests across all branches within their brands")}</p>
        </div>
      </div>
    </div>
  );
}
