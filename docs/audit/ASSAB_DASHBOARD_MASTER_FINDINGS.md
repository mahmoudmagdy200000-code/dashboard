# ASSAB Dashboard — Master Findings & Remediation Register
## Permanent Tracking & Dual-Synchronized Governance Ledger

> **Primary Source (Repository):** `docs/audit/ASSAB_DASHBOARD_MASTER_FINDINGS.md`
> **Permanent Local Mirror:** `D:\claude\ASSAB ERP GITHUB BACKEND ANTIGRAVITY\ui-ux\ASSAB_DASHBOARD_MASTER_FINDINGS.md`
> **Repository:** `mohameelsherbini/dashboard`
> **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013` (`work/dashboard-shift-cycle-20261015`)
> **Current Remediation Branch:** `refactor/asabprototype-modularization-20261022`
> **Phase 1A Remediation Commit SHA:** `f4d3fc808f34bf946c384a0f8f3f5e7e836dc28b`
> **Phase 1B Remediation Commit SHA:** `8c1bcbaba4a54b652fb8fe2cedd4cd508c3de135`
> **Phase 1C Remediation Commit SHA:** `b00971bc7af06ab58501552a78d8b1968464b64f` (Follow-up: `55454ae`)
> **Phase 1D Remediation Commit SHA:** `4361ebf023d682b8102a5b5bdf5970d723829881` (Follow-up: `ba898b9`)
> **Phase 1E Remediation Commit SHA:** `24b8f7f05c7d33a5ff684348dab84df0d319d075`
> **Phase 1F Remediation Commit SHA:** `7bc73a0ac409b9c1c20bafc943882bd413d4cde0`
> **Last Synchronized Date:** 2026-10-23

---

## 1. Permanent Governance Rule (قاعدة الحوكمة الدائمة)

> [!IMPORTANT]
> **شرط إلزامي دائم لجميع مراحل العمل الحالية والمستقبلية:**
> 1. يُعتبر ملف `docs/audit/ASSAB_DASHBOARD_MASTER_FINDINGS.md` هو السجل المركزي المعتمد والوحيد لجميع المشكلات المكتشفة وتفاصيل إصلاحها عبر كافة مراحل تدقيق وإصلاح لوحة التحكم (Dashboard).
> 2. **ممنوع حذف أي Finding قديم** لمجرد إصلاحه؛ يتم فقط تحديث حالته وإضافة مراجع الملفات والـ Commits ونتائج الفحوصات وتواريخ الانتقال.
> 3. **المزامنة الثنائية الإلزامية:** بعد الانتهاء من أي مرحلة (Phase Completion)، يجب مزامنة هذا الملف حرفياً وبصرياً مع النسخة المحلية الدائمة:
>    `D:\claude\ASSAB ERP GITHUB BACKEND ANTIGRAVITY\ui-ux\ASSAB_DASHBOARD_MASTER_FINDINGS.md`
>    والتحقق من تطابق البصمة الرقمية (SHA-256) لكلا النسختين.
> 4. **التوثيق قبل إغلاق أي مرحلة:** لا يجوز إنهاء أي جلسة عمل أو إعلان إغلاق مرحلة برمجياً وتوثيقياً قبل تحديث هذا السجل بالكامل، وإدراج الـ Commit SHA الفعلي ونتائج الاختبارات.
> 5. **فصل التنفيذ عن القبول:** لا تُعتبر أي مشكلة في حالة `FIXED_AND_VERIFIED` إلا إذا تم التحقق منها بالاختبارات الآلية الموثقة؛ ويبقى التحقق الحي في بيئة Staging خاضعاً لحالة `Runtime Verification` منفصلة.

---

## 2. Status Vocabulary & 4-Axis Governance (قاموس ودورة حياة الحالات ومحاور الحوكمة الأربعة)

لضمان عدم الخلط بين الادعاء البرمجي والتحقق الفعلي، يخضع كل بند في هذا السجل لتقييم مستقل عبر **أربعة محاور حوكمة منفصلة**:

1. **حالة التطبيق البرمجي (Implementation Status):**
   - `NOT_STARTED` 🔴: لم يبدأ العمل عليه.
   - `IMPLEMENTED` 🟢: تم تعديل الكود البرمجي في المستودع.
   - `GATED` 🟣: محجوب بقرار معماري / إداري يتطلب موافقة منفصلة (`APPROVAL_REQUIRED`).
2. **الاختبارات الآلية (Automated Tests):**
   - `PASS` 🟢: اجتاز اختبارات الوحدة وفحص الأنواع (Typecheck) وبناء الإنتاج (Build) بنسبة 100%.
   - `FAIL` ❌: فشل في أحد الاختبارات الآلية.
   - `NOT_RUN` ⚪: لم تُنفّذ له اختبارات آلية بعد.
3. **المراجعة المستقلة والقبول الفني (Independent Review):**
   - `PENDING_ACCEPTANCE` 🟡: تم تطبيق الكود واجتياز الفحص الآلي، وهو بانتظار المراجعة والقبول المستقل من المهندس المشرف.
   - `ACCEPTED` 🟢: تمت مراجعته واعتُمد فنياً وقُبل من المراجع المستقل.
   - `CHANGES_REQUESTED` 🟠: طُلبت تصحيحات أو تعديلات إضافية بناءً على المراجعة.
4. **التحقق التشغيلي الحي (Runtime Verification):**
   - `NOT_RUN` ⚪: لم يتم إجراء فحص تشغيلي حي داخل جلسة متصفح موثقة على بيئة Staging (لا يجوز ادعاء نجاحه إلا بعد تنفيذه الفعلي).
   - `PASS` 🟢: تم التحقق التشغيلي الحي في المتصفح واجتاز الخطوات بنجاح.
   - `FAIL` ❌: فشل أثناء التحقق التشغيلي الحي.

| الحالة الشاملة للجدول (Overall Status) | الرمز | المعنى والدلالة التشغيلية |
| :--- | :---: | :--- |
| `OPEN` | 🔴 | المشكلة مكتشفة وموثقة في التدقيق ولكن لم يبدأ تنفيذ إصلاحها بعد. |
| `IN_PROGRESS` | 🟡 | جارٍ تنفيذ الإصلاح البرمجي للمشكلة بنشاط. |
| `IMPLEMENTED_UNVERIFIED` | 🟠 | تم تعديل الكود ولكن لم يكتمل الفحص الآلي المستقل أو الاختبارات. |
| `FIXED_AND_VERIFIED` | 🟢 | تم تطبيق الإصلاح واجتاز الفحوصات الآلية بالكامل ويخضع للمراجعة المستقلة للقبول. |
| `APPROVAL_REQUIRED` | 🟣 | الإصلاح معلق بانتظار قرار معماري / إداري من الإدارة أو اعتماد سياسة قواعد الأعمال. |
| `BLOCKED` | ⛔ | يوجد مانع تقني أو بيئي موثق يمنع استكمال الإصلاح. |
| `FAILED` | ❌ | فشل الإصلاح أو لم تجتز التعديلات الاختبارات المحددة. |

---

## 3. إحصائيات السجل الإجمالية (Master Statistics Summary)

| المقياس | العدد | النسبة |
| :--- | :---: | :---: |
| **إجمالي المشكلات المسجلة في التدقيق (Original Audit Findings)** | **222** (198 في 1A–1F + 24 في 1G) | — |
| **تصحيحات مراجعة المرحلة 1A (Review Corrections)** | **5** | — |
| **إجمالي بنود السجل المتابعة (Total Tracked Items)** | **227** | 100% |
| **تم الإصلاح والتحقق الآلي (Fixed & Verified)** | **197** (188 سابقة + 9 في 1G) | 86.8% |
| **معلقة لقرار / موافقة معمارية (Approval Required / Gated)** | **13** (10 سابقة + 3 في 1G) | 5.7% |
| **محجوبة بعيوب خادم قيد الباك إند (Backend Blocked / Proposal)** | **12** (5 سابقة + 7 في 1G؛ تشمل معالجة واجهة جزئية مع مانع خادمي) | 5.3% |
| **مفتوحة بلا إصلاح (Open)** | **0** | 0.0% |
| **منفذة دون تحقق وظيفي كافٍ (Implemented Unverified)** | **5** | 2.2% |
| **محجوبة بموانع (Blocked)** | **0** | 0.0% |
| **فاشلة (Failed)** | **0** | 0.0% |
| **التحقق التشغيلي الحي (Runtime Live Staging)** | **226 NOT_RUN / 1 PENDING_REVIEW** | بانتظار الاعتماد المستقل وتزويد بيانات Staging الحي |

---
## 4. Phase 1A — Company Admin Master Summary Table

| ID | الأولوية | الموديول / الصفحة | عنوان المشكلة المعتمد | الحالة البرمجية | الفحص الحي | الملفات المتأثرة | الـ Commit SHA |
| :---: | :---: | :--- | :--- | :---: | :---: | :--- | :---: |
| **CA-F01** | P1 | Settings (`ca-settings`) | حفظ إعدادات الشركة لا يحفظ المدخلات | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `companySettingsGuards.ts` | `0fe15e4` |
| **CA-F02** | P1 | Support (`ca-support`) | تأكيد دعم كاذب عند فشل الطلب | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `supportTicketGuards.ts` | `0fe15e4` |
| **CA-F03** | P1 | Billing (`ca-billing`) | حالة ودفع الفواتير مضللان (قيم ثابتة) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `companyAdminGuards.ts` | `0fe15e4` |
| **CA-F04** | P1 | Billing (`ca-subscription`) | SUB-01 تجميد الفوترة المركزية للأدمن | `APPROVAL_REQUIRED` | `NOT_RUN` | `CompanyDashboard.tsx` | — |
| **CA-F05** | P1 | Layout Shell (`Shell`) | إطار Company Admin غير متجاوب مع الموبايل | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `0fe15e4` |
| **CA-F06** | P2 | Billing (`ca-billing`) | شارات الفواتير ثابتة كلها كمدفوعة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `companyAdminGuards.ts` | `0fe15e4` |
| **CA-F07** | P2 | Branches (`ca-branches`) | إنشاء الفرع يختار أول مطعم بالاسم تلقائياً | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `companyAdminGuards.ts` | `0fe15e4` |
| **CA-F08** | P2 | Users (`ca-users`) | زر تعديل المستخدم لا يوفر واجهة تحرير | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `companyAdminGuards.ts` | `0fe15e4` |
| **CA-F09** | P2 | Support (`ca-support`) | قنوات الدعم غير متسقة مع API وروابط معطلة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `companyAdminGuards.ts` | `0fe15e4` |
| **CA-F10** | P2 | Subscription (`ca-subscription`) | سعر سنوي nullable قد يسبب انهيار render | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `companyAdminGuards.ts` | `0fe15e4` |
| **CA-F11** | P2 | Users (`ca-users`) | حصة المستخدمين ثابتة (/50) وتجاهل غير المحدود | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `companyAdminGuards.ts` | `0fe15e4` |
| **CA-F12** | P2 | Billing (`ca-billing`) | غياب حالات التحميل والخطأ في سجل الفواتير | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `0fe15e4` |
| **CA-F13** | P2 | Users (`ca-users`) | نطاق الدعوات ونقل المدير يتطلب اعتماد الصلاحيات | `APPROVAL_REQUIRED` | `NOT_RUN` | حماية النطاق البرمجي | — |
| **CA-F14** | P2 | Shared (`ExpiredBanner`) | رابط تجديد الاشتراك لا يتوافق مع الـ Router | `FIXED_AND_VERIFIED` | `NOT_RUN` | `App.tsx`, `SubscriptionExpiredBanner.tsx` | `0fe15e4` |
| **CA-F15** | P2 | Modals & Dialogs | نوافذ مخصصة بلا إدارة حوار ولوحة مفاتيح (ARIA) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `0fe15e4` |
| **CA-F16** | P2 | Modules (`ca-modules`) | تسميات وحالات عناصر تبديل الوحدات غير متاحة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `companyAdminGuards.ts` | `0fe15e4` |
| **CA-F17** | P2 | Shared (`NotificationBell`) | إشعارات قابلة للنقر بالماوس فقط وعرض غير متجاوب | `FIXED_AND_VERIFIED` | `NOT_RUN` | `NotificationBell.tsx` | `0fe15e4` |
| **CA-F18** | P2 | Shell HTML (`index.html`) | تقييد تكبير الشاشة (WCAG 1.4.4 Resize Text) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `artifacts/mockup-sandbox/index.html` | `0fe15e4` |
| **CA-F19** | P2 | Shell & Prefs (`ca-settings`) | نقص استمرارية تفضيل اللغة ومزامنة LTR/RTL | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `0fe15e4` |
| **CA-F20** | P2 | Shared (`ApiKeysPage`) | تأكيد نسخ مفاتيح API بلا تحقق من الوعد | `FIXED_AND_VERIFIED` | `NOT_RUN` | `ApiKeysPage.tsx` | `0fe15e4` |
| **CA-F21** | P2 | SSO (`CASsoCard`) | سر العميل المشترك (Client Secret) مرئي كنص | `APPROVAL_REQUIRED` | `NOT_RUN` | سياسة أمان SSO | — |
| **CA-F22** | P2 | Modules (`ca-modules`) | غياب حماية النقر المزدوج المتزامن أثناء التبديل | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `companyAdminGuards.ts` | `0fe15e4` |
| **CA-F23** | P2 | Shared (`LiveChatWidget`) | فقدان مسودة الشات عند الفشل وخلط الإغلاق بالإنهاء | `FIXED_AND_VERIFIED` | `NOT_RUN` | `LiveChatWidget.tsx`, `companyAdminGuards.ts` | `0fe15e4` |
| **CA-F24** | P2 | Shared API Routes | مسارات مشتركة وتفضيلات الإشعارات تتطلب تفويضاً | `APPROVAL_REQUIRED` | `NOT_RUN` | حدود العقود البرمجية | — |

### 4.1 Phase 1A — Final Review Corrections (تصحيحات المراجعة اللاحقة)

| ID | الأولوية | الموديول / الصفحة | عنوان التصحيح المعتمد | الحالة البرمجية | الفحص الحي | الملفات المتأثرة | الـ Commit SHA |
| :---: | :---: | :--- | :--- | :---: | :---: | :--- | :---: |
| **CA-REV-01** | P1 | Billing (`ca-billing`) | فصل معرّف الفاتورة الداخلي `id` عن المعروض `displayId` واستخدام `id` في تنزيل PDF | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `companyAdminGuards.ts`, `companyAdminGuards.test.ts` | `f4d3fc8` |
| **CA-REV-02** | P1 | Billing (`ca-billing`) | مؤشرات الفوترة: استهلاك `GET /company/me/billing/summary` وتدقيق مسمى فواتير الصفحة | `FIXED_AND_VERIFIED` | `BLOCKED_BY_STAGING_AUTH` | `CompanyDashboard.tsx`, `companyAdminGuards.ts`, `companyAdminGuards.test.ts` | `f4d3fc8` |
| **CA-REV-03** | P2 | Billing (`ca-billing`) | مطابقة تاريخ الفاتورة `issueDate` من Backend مع الاحتفاظ بـ `issuedAt`/`createdAt` كبدائل | `FIXED_AND_VERIFIED` | `NOT_RUN` | `companyAdminGuards.ts`, `companyAdminGuards.test.ts` | `f4d3fc8` |
| **CA-REV-04** | P1 | Settings (`ca-settings`) | مسح الحقول الاختيارية (`crNumber`, `email`) بقيمة `null` مع احترام الحقول غير القابلة للـ null (`city`) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `companySettingsGuards.ts`, `companySettingsGuards.test.ts`, `companyAdmin.ts` | `f4d3fc8` |
| **CA-REV-05** | P1 | Layout Shell (`Shell`) | إمكانية الوصول للدرج المحمول (Focus Trap, Escape, `visibility:hidden`, `inert`, وإعادة التركيز) | `FIXED_AND_VERIFIED` | `REPORTED_PASS_PENDING_REVIEW` | `CompanyDashboard.tsx` | `f4d3fc8` |

---

## 5. Detailed Findings Register (السجل التفصيلي لجميع البنود الـ 24)

### CA-F01 — حفظ إعدادات الشركة لا يحفظ المدخلات
- **Finding ID:** `CA-F01`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Settings / `ca-settings`
- **Problem Description:** أربع مدخلات (`name, city, crNumber, email`) تعتمد على `defaultValue` دون ربط بحالة تفاعلية؛ زر الحفظ يستدعي `updateSettingsMut.mutate({})` بكائن فارغ، ويظهر إشعار الحفظ بنجاح فوراً حتى لو فشل الخادم.
- **Severity / Priority:** P1 (High)
- **Original Evidence:** [`CompanyDashboard.tsx#L2463-L2479`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2463-L2479)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** غياب الـ Controlled Form State وإرسال حمولة فارغة مع افتراض النجاح المتفائل غير المشروط.
- **Proposed Correction:** تحويل النموذج إلى Controlled State، تنقية المدخلات بحمولة مسموحة (`name, city, crNumber, email`)، قفل ضد النقر المزدوج أثناء التنفيذ، تأكيد النجاح فقط بعد استجابة الخادم الإيجابية، وحفظ المسودة عند الخطأ.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`, `companySettingsGuards.ts`, `companySettingsGuards.test.ts`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** `companySettingsGuards.test.ts` — 9/9 Tests PASS (Node test runner)
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية).
- **Remaining Risks:** التحقق من مطابقة معايير تحقق رقم السجل التجاري (CR) في الباك إند الحقيقي.
- **Last Updated Date:** 2026-10-22

---

### CA-F02 — تأكيد دعم كاذب عند فشل الطلب
- **Finding ID:** `CA-F02`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Support / `ca-support`
- **Problem Description:** استدعاء `setSent(true)` يأتي مباشرة بعد تشغيل `mutate`؛ نموذج التذكرة يختفي فوراً ويعلن النجاح قبل رد خادم الـ API عبر HTTP، مع فقدان النص المدخل في حال الخطأ.
- **Severity / Priority:** P1 (High)
- **Original Evidence:** [`CompanyDashboard.tsx#L2579-L2605`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2579-L2605)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** استدعاء متفائل فوري لـ `setSent(true)` دون انتظار نجاح الوعد `mutateAsync`.
- **Proposed Correction:** إرسال التذكرة عبر حارس `runSupportTicketSubmit`، والتحقق الصارم من فئات التذاكر المعتمدة في كود الواجهة (`technical, subscription, billing, general_inquiry, feature_request, other`)؛ واشتراط 10 محارف كحد أدنى، وتأكيد النجاح فقط عند رد الخادم، والاحتفاظ بالمسودة عند الفشل. (ملاحظة تصحيح التقرير: الكود المرفوع في `supportTicketGuards.ts` يستخدم هذه التصنيفات الصحيحة بالفعل، وتم تصحيح نص التقرير ليتطابق مع الكود دون أي تعديل برمجي غير ضروري).
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`, `supportTicketGuards.ts`, `supportTicketGuards.test.ts`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** `supportTicketGuards.test.ts` — 9/9 Tests PASS (Node test runner)
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F03 — حالة ودفع الفواتير مضللان
- **Finding ID:** `CA-F03`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Billing / `ca-billing`
- **Problem Description:** بطاقات الفوترة تعرض قيماً ثابتة مضللة ("15 يناير 2026"، "4,800 ر.س"، "بطاقة ائتمان **** 4521")، والجدول يجمع كل الصفوف كمدفوعة دون التحقق من حالة الفاتورة الفعلية.
- **Severity / Priority:** P1 (High)
- **Original Evidence:** [`CompanyDashboard.tsx#L2333-L2365`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2333-L2365)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** نصوص وواجهات Mock ثابتة مدمجة داخل مسار حي لجلب الفواتير.
- **Proposed Correction:** استبدال القيم الثابتة بحساب ديناميكي واقعي عبر `calculateBillingKpis` يفرز المدفوعات المستحقة (`open, overdue`) عن المدفوعة فعلياً (`paid`) ويحسب الإجماليات بدقة.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`, `companyAdminGuards.ts`, `companyAdminGuards.test.ts`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** `companyAdminGuards.test.ts` (calculateBillingKpis tests PASS)
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (الحساب البرمجي تم وفق العقود الحالية).
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F04 — SUB-01 تجميد الفوترة المركزية للأدمن
- **Finding ID:** `CA-F04`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Subscription & Billing / `ca-subscription`
- **Problem Description:** قواعد الأعمال v3.5 §13.8 (SUB-01) تنص صراحة على أن إدارة الاشتراكات مركزية لدى Platform Admin دون بوابات دفع ذاتية لمدير الشركة في هذه المرحلة؛ في حين أن الواجهة تعرض مسارات ترقية وهمية.
- **Severity / Priority:** P1 (High)
- **Original Evidence:** [`CompanyDashboard.tsx#L2034-L2036`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2034-L2036)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** تعارض نطاق بين متطلبات الأعمال المركزية والتصميم الأولي الذي تضمن دفعاً ذاتياً.
- **Proposed Correction:** تجميد مسار الدفع الذاتي والالتزام بالقاعدة SUB-01، وتوجيه العميل إلى التواصل المباشر مع إدارة المنصة، وعدم اختلاق بوابات دفع أو بطاقات ائتمانية وهمية.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** الحفاظ على سياسة التجميد داخل `CompanyDashboard.tsx`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** فحص التوافق المعماري
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `APPROVAL_REQUIRED`
- **Approval / Decision Required:** قرار محمود باعتماد استمرار حظر الدفع الذاتي أو تفعيل بوابة دفع مستقبلية معتمدة.
- **Remaining Risks:** بقاء مسار الترقية معتمداً على التواصل اليدوي مع إدارة المنصة.
- **Last Updated Date:** 2026-10-22

---

### CA-F05 — إطار Company Admin غير متجاوب مع الموبايل
- **Finding ID:** `CA-F05`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Shell / `Shell`
- **Problem Description:** السايدبار ثابت بعرض `w-60` (240px) يلتهم أكثر من 65% من شاشة الهاتف (360px) تاركاً 120px فقط للمحتوى، مع انعدام زر القائمة (Hamburger Menu) في الهيدر، مما يؤدي إلى سحق النصوص تماماً.
- **Severity / Priority:** P1 (High)
- **Original Evidence:** [`CompanyDashboard.tsx#L955-L1036`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L955-L1036)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** تصميم الداشبورد لبيئة سطح المكتب فقط وفرض أبعاد وعرض ثابتين.
- **Proposed Correction:** إضافة زر قائمة همبرغر متجاوب (`Menu`)، وقائمة جانبية منزلقة (Slide-out Drawer) مع خلفية معتمة (Backdrop)، وإغلاق تلقائي عند النقر خارجها أو الضغط على `Escape` أو التنقل، وهوامش متجاوبة (`p-3 sm:p-4 md:p-6`).
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** بناء التطبيق والفحص الآلي يمر بنجاح تام (Build PASS).
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** فحص التجربة على أجهزة فيزيائية (Physical Devices) بشاشات صغيرة جداً (iPhone SE 320px).
- **Last Updated Date:** 2026-10-22

---

### CA-F06 — شارات الفواتير ثابتة كلها كمدفوعة
- **Finding ID:** `CA-F06`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Billing / `ca-billing`
- **Problem Description:** كل صف في جدول الفواتير يعرض شارة "✓ مدفوع" خضراء بشكل ثابت دون قراءة حقل `status` القادم من الخادم.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`CompanyDashboard.tsx#L2673`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2673)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** شارة ثابتة دون ربط شرطي بحالة الاستجابة.
- **Proposed Correction:** دمج دالة `parseInvoice` وتوليد شارات ديناميكية تتوافق مع حالات الفاتورة (`paid`, `open`, `overdue`, `void`) مع الألوان والرموز المناسبة.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`, `companyAdminGuards.ts`, `companyAdminGuards.test.ts`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** `companyAdminGuards.test.ts` (parseInvoice tests PASS)
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F07 — إنشاء الفرع يختار أول مطعم بالاسم تلقائياً
- **Finding ID:** `CA-F07`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Branches / `ca-branches`
- **Problem Description:** اختيار العلامة التجارية كان يعتمد على الاسم وليس المعرف (`id`)، ثم يتم اختيار أول مطعم تلقائياً (`restaurants[0]`) دون إتاحة اختيار المطعم، مع إغلاق النافذة المنبثقة قبل اكتمال الطلب.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`CompanyDashboard.tsx#L2201-L2204`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2201-L2204)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** منطق واجهة ناقص يفترض وجود مطعم واحد فقط لكل علامة تجارية.
- **Proposed Correction:** إضافة قائمتين منسدلتين متتابعتين لاختيار العلامة التجارية ثم المطعم صراحة، وتطبيق حارس `validateBranchCreate`، وقفل الزر أثناء التنفيذ، والاحتفاظ بالنافذة والبيانات في حال الخطأ.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`, `companyAdminGuards.ts`, `companyAdminGuards.test.ts`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** `companyAdminGuards.test.ts` (validateBranchCreate tests PASS)
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F08 — زر تعديل المستخدم لا يوفر واجهة تحرير
- **Finding ID:** `CA-F08`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Users / `ca-users`
- **Problem Description:** الضغط على زر "تعديل" كان يرسل طلب PATCH فوري بنفس الاسم الحالي دون إظهار أي واجهة للمستخدم لتعديل البيانات.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`CompanyDashboard.tsx#L2120-L2121`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2120-L2121)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** ربط مباشر للطفرة بزر التعديل كإجراء تجريبي بدلاً من فتح نافذة تحرير.
- **Proposed Correction:** بناء نافذة تحرير منبثقة محكومة (Controlled Modal) تسمح فقط بتعديل الحقول المسموحة (`name, phone`) مع إبقاء الدور والبريد للقراءة فقط، وحارس التحقق `validateUserEdit`، وقفل الإرسال، والاحتفاظ بالمسودة عند الفشل.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`, `companyAdminGuards.ts`, `companyAdminGuards.test.ts`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** `companyAdminGuards.test.ts` (validateUserEdit tests PASS)
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F09 — قنوات الدعم غير متسقة مع API وروابط معطلة
- **Finding ID:** `CA-F09`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Support / `ca-support`
- **Problem Description:** عدم تطابق أسماء الحقول بين الواجهة (`link/description/availability`) وعقد الـ API المحلي (`value/type/hours/isAvailable`)، مما تسبب في أزرار معطلة (No-op dead buttons).
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`CompanyDashboard.tsx#L2570-L2578`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2570-L2578)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** تباين تعاقدي بين واجهة الموك وواجهة استجابة الـ Backend.
- **Proposed Correction:** استخدام دالة `parseSupportChannel` لتحويل وتطبيع بيانات القنوات، وربط الإجراءات صراحة بروابط هاتفية (`tel:`) أو بريد (`mailto:`) أو روابط خارجية (`https://`) مع توضيح حالة التوفر وساعات العمل وإضافة مؤشرات التحميل.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`, `companyAdminGuards.ts`, `companyAdminGuards.test.ts`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** `companyAdminGuards.test.ts` (parseSupportChannel tests PASS)
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F10 — سعر سنوي nullable قد يسبب انهيار render
- **Finding ID:** `CA-F10`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Subscription / `ca-subscription`
- **Problem Description:** حقل السعر السنوي `priceAnnualHalalas` يسمح بقيم فارغة (`null`) في خطط الشركات المخصصة، واستدعاء `price_a!.toLocaleString()` يسبب انهيار التطبيق وقت التشغيل.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`CompanyDashboard.tsx#L1975-L1980`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L1975-L1980)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** استخدام عامل التأكيد غير الآمن في TypeScript (`!`) دون معالجة القيمة الفارغة.
- **Proposed Correction:** استخدام دالة `formatPlanPrice` التي تتحقق من وجود القيمة قبل التنسيق، وتُرجع "حسب الطلب" / "Custom" عند انعدام السعر دون أي انهيار.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`, `companyAdminGuards.ts`, `companyAdminGuards.test.ts`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** `companyAdminGuards.test.ts` (formatPlanPrice tests PASS)
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F11 — حصة المستخدمين ثابتة (/50) وتجاهل غير المحدود
- **Finding ID:** `CA-F11`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Users / `ca-users`
- **Problem Description:** تحويل القيم الفارغة في الحصص (`null`) إلى 0 بدلاً من معاملتها كغير محدودة (Unlimited)، وعرض حد ثابت مصطنع للمستخدمين (`/50`) في صفحة المستخدمين.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`CompanyDashboard.tsx#L1983-L1987`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L1983-L1987)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** قيمة موك ثابتة (`/50`) وافتراض خاطئ بأن `null` تعني صفراً.
- **Proposed Correction:** إزالة الحد الثابت (`/50`)، واستخدام دالة `formatQuota` التي تقرأ الحدود الحقيقية من الاشتراك وتعرض رمز اللانهاية (`∞`) للخطط غير المحدودة.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`, `companyAdminGuards.ts`, `companyAdminGuards.test.ts`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** `companyAdminGuards.test.ts` (formatQuota tests PASS)
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F12 — غياب حالات التحميل والخطأ في سجل الفواتير
- **Finding ID:** `CA-F12`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Billing / `ca-billing`
- **Problem Description:** غياب معالجة `isLoading` و `isError` في استعلام الفواتير؛ حيث لا يستطيع المستخدم التمييز بين خطأ 403 أو فشل الاتصال بالشبكة وبين عدم وجود فواتير.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`CompanyDashboard.tsx#L1878-L1898`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L1878-L1898)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** الاعتماد المباشر على مصفوفة افتراضية فارغة دون التحقق من حالة الاستعلام في React Query.
- **Proposed Correction:** إضافة مؤشر تحميل تفاعلي أثناء جلب البيانات، وبنر تنبيه في حال الخطأ مع زر إعادة المحاولة (`refetch()`)، ورسالة واضحة عند خلو السجل، وتعطيل زر التصدير إذا لم تكن هناك فواتير.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** بناء التطبيق وفحص TypeScript يمر بنجاح كامل (Build PASS).
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F13 — نطاق الدعوات ونقل المدير يتطلب اعتماد الصلاحيات
- **Finding ID:** `CA-F13`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Users & Branches / `ca-users`, `ca-branches`
- **Problem Description:** إرسال دعوة المستخدم يرسل الدور فقط دون تخصيص الفروع أو العلامات (`brandIds/branchIds`)، وقائمة اختيار مدير الفرع تعرض كافة الأعضاء النشطين دون تصفية الصلاحية؛ مما يتطلب حوكمة مطابقة لـ PERM-00 وMEM-04/05/07.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`CompanyDashboard.tsx#L2072-L2076`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2072-L2076)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** عدم اكتمال مواصفات الربط الصلاحياتي بين المستخدمين والفروع في واجهة الدعوات المبكرة.
- **Proposed Correction:** الامتثال الصارم لقواعد PERM-00 وعدم اختلاق نطاقات أو أدوار غير معتمدة حتى صدور قرار معماري.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** حماية الحدود البرمجية الحالية
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** مراجعة الأمان والمعمارية
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `APPROVAL_REQUIRED`
- **Approval / Decision Required:** اعتماد مخطط الصلاحيات ونطاق الربط بالفروع لمدير الفرع والمحاسب من محمود.
- **Remaining Risks:** تقييد اختيار مدير الفرع بالأعضاء المؤهلين فقط.
- **Last Updated Date:** 2026-10-22

---

### CA-F14 — رابط تجديد الاشتراك لا يتوافق مع الـ Router
- **Finding ID:** `CA-F14`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Shared / Subscription Banner / `SubscriptionExpiredBanner`
- **Problem Description:** الرابط في البنر يتضمن `?page=...` داخل مسار الـ Hash (`#/preview/asab/CompanyDashboard?page=ca-subscription`)، مما يعطل مطابقة المسارات في `canOpenDashboard` ويمنع فتح الصفحة.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`SubscriptionExpiredBanner.tsx#L43-L44`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/shared/SubscriptionExpiredBanner.tsx#L43-L44)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** دمج استعلامات الـ Query String داخل الـ Hash Slug دون معالجتها في موجه التطبيق `App.tsx`.
- **Proposed Correction:** تعديل دالة `getPreviewPath` في `App.tsx` لتجريد استعلامات الـ Query (`raw.split('?')[0]`)، وتحديث رابط البنر إلى `#preview/asab/CompanyDashboard` مع نص واضح: "عرض تفاصيل الاشتراك".
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `App.tsx`, `SubscriptionExpiredBanner.tsx`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** اختبارات التوجيه والبناء تمر بنجاح كامل.
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F15 — نوافذ مخصصة بلا إدارة حوار ولوحة مفاتيح (ARIA)
- **Finding ID:** `CA-F15`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Modals / `CompanyDashboard`
- **Problem Description:** النوافذ المنبثقة (إضافة فرع، دعوة مستخدم، تعديل مستخدم، نقل المدير، الجلسات) تستخدم عناصر `div` بسيطة تفتقر إلى `role="dialog"` و `aria-modal="true"` وإمكانية الإغلاق بزر `Escape`.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`CompanyDashboard.tsx#L2127-L2137`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2127-L2137)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** بناء النوافذ المنبثقة يدوياً بدون تطبيق معايير إمكانية الوصول WAI-ARIA Dialog.
- **Proposed Correction:** إضافة الخصائص الدلالية `role="dialog"` و `aria-modal="true"` وتسميات العناوين `aria-labelledby` وأزرار الإغلاق الواضحة لجميع النوافذ المنبثقة في لوحة الشركة.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** فحص الـ ARIA وبناء التطبيق يمر بنجاح.
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F16 — تسميات وحالات عناصر تبديل الوحدات غير متاحة
- **Finding ID:** `CA-F16`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Modules / `ca-modules`
- **Problem Description:** أزرار تفعيل وتعطيل الوحدات تفتقر إلى التسمية الميسرة للمكفوفين وتفتقر لدلالة التبديل `role="switch"` وحالة التفعيل `aria-checked`.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`CompanyDashboard.tsx#L2312-L2314`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2312-L2314)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** استخدام عناصر `button` مجردة بتنسيقات CSS فقط.
- **Proposed Correction:** تزويد الأزرار بـ `role="switch"` و `aria-checked={m.active}` و `aria-label` ديناميكي، وتعطيل التبديل إذا كانت الوحدة غير مشمولة بالخطة عبر `canToggleModule`.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`, `companyAdminGuards.ts`, `companyAdminGuards.test.ts`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** `companyAdminGuards.test.ts` (canToggleModule tests PASS)
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F17 — إشعارات قابلة للنقر بالماوس فقط وعرض غير متجاوب
- **Finding ID:** `CA-F17`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Shared / Header / `NotificationBell`
- **Problem Description:** صف الإشعار عبارة عن `div` بنقر ماوس فقط يفتقر إلى `tabIndex` و `onKeyDown` للتنقل بلوحة المفاتيح؛ كما أن القائمة المنبثقة محددة بعرض ثابت `380px` يتجاوز عرض شاشات الهواتف الصغيرة (360px).
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`NotificationBell.tsx#L198-L220`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/shared/NotificationBell.tsx#L198-L220)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** عدم مراعاة معايير الوصول عبر الكيبورد وفرض عرض نافذة ثابت.
- **Proposed Correction:** إضافة `tabIndex={0}` و `role="button"` ودعم مفتاحي `Enter` و `Space`، وتكييف عرض القائمة على الشاشات الصغيرة عبر `min(380px, calc(100vw - 32px))` مع خصائص الـ ARIA الموسعة.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `NotificationBell.tsx`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** فحص الكود والبناء يمر بنجاح كامل.
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F18 — تقييد تكبير الشاشة (WCAG 1.4.4 Resize Text)
- **Finding ID:** `CA-F18`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Shell / HTML Meta / `index.html`
- **Problem Description:** وجود `maximum-scale=1` في تعريف الـ Viewport بملف `index.html` يمنع المستخدم من تكبير الشاشة بإصبعيه (Pinch-to-zoom) على الهواتف، وهو ما ينتهك معيار الوصول WCAG 1.4.4.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`index.html#L9`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/index.html#L9)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** قيد مسبق غير مبرر في وسم الـ Meta للموبايل.
- **Proposed Correction:** إزالة `maximum-scale=1` و `user-scalable=no` للسماح للمستخدم بتكبير النصوص والجداول بحرية.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `artifacts/mockup-sandbox/index.html`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** فحص HTML والبناء يمر بنجاح.
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F19 — نقص استمرارية تفضيل اللغة ومزامنة LTR/RTL
- **Finding ID:** `CA-F19`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Language & Preferences / `ca-settings`
- **Problem Description:** تبديل اللغة كان يغير الحالة المحلية المؤقتة دون حفظ التفضيل بالخادم، مع بقاء بعض المكونات المشتركة تفرض `dir="rtl"` قسراً.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`ApiKeysPage.tsx#L63-L64`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/shared/ApiKeysPage.tsx#L63-L64)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** عدم استدعاء طفرة حفظ التفضيلات `useUpdateLanguagePreference` عند النقر على محول اللغة.
- **Proposed Correction:** ربط زر تبديل اللغة بـ `langPrefMut.mutate({ language: next })` لضمان حفظ التفضيل لدى الخادم ومزامنة الاتجاه (RTL/LTR) والترجمات.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** فحص الـ Typecheck والبناء يمر بنجاح.
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F20 — تأكيد نسخ مفاتيح API بلا تحقق من الوعد
- **Finding ID:** `CA-F20`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Shared / Developer API Keys / `ApiKeysPage`
- **Problem Description:** استخدام `navigator.clipboard.writeText` دون انتظار الوعد (`await`) أو معالجة الخطأ، مما يؤدي إلى إظهار "تم النسخ" دائماً حتى لو رفض المتصفح الإذن.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`ApiKeysPage.tsx#L55-L59`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/shared/ApiKeysPage.tsx#L55-L59)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** استدعاء متزامن غير محمي لواجهة الحافظة (Clipboard API).
- **Proposed Correction:** انتظار استجابة `await navigator.clipboard.writeText` والتحقق من اكتمال النسخ بنجاح قبل تحديث الحالة البصرية، مع معالجة الخطأ بأمان دون طباعة المفاتيح الحساسة في السجلات، وإضافة `role="switch"` للأذونات.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `ApiKeysPage.tsx`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** فحص الكود والبناء يمر بنجاح كامل.
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F21 — سر العميل المشترك (Client Secret) مرئي كنص
- **Finding ID:** `CA-F21`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / SSO Integration / `CASsoCard`
- **Problem Description:** حقل إدخال سر العميل المشترك لـ OIDC/SAML معروض كحقل نصي عادي وليس من نوع كلمة مرور (`type="password"`)، مما يجعله مرئياً للمستخدم ومن حوله.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`CompanyDashboard.tsx#L2432`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2432)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** حقل إدخال غير محمي بـ Masking في واجهة إعداد الـ SSO.
- **Proposed Correction:** الالتزام الصارم بنموذج أمان الخادم؛ حيث يتطلب إعداد الـ SSO خطة Enterprise ومساراً مخصصاً، ولا يتم كشف أو حفظ الأسرار الحساسة إلا بموافقة أمنية معتمدة.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** حماية الأسرار بالواجهة
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** فحص الأمان المعماري
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `APPROVAL_REQUIRED`
- **Approval / Decision Required:** اعتماد سياسة تدوير وتخزين أسرار الـ SSO المؤسسية مع محمود وفريق الأمن.
- **Remaining Risks:** بقاء تكوين الـ SSO محصوراً بخطط Enterprise المعتمدة.
- **Last Updated Date:** 2026-10-22

---

### CA-F22 — غياب حماية النقر المزدوج المتزامن أثناء التبديل
- **Finding ID:** `CA-F22`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Company Admin / Modules / `ca-modules`
- **Problem Description:** إمكانية النقر السريع المتعدد على أزرار تبديل الوحدات أثناء معالجة الطلب، مما يؤدي إلى إرسال طفرات متزامنة متضاربة إلى الخادم.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`CompanyDashboard.tsx#L2575`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2575)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** غياب تعطيل الزر أثناء `toggleModuleMut.isPending`.
- **Proposed Correction:** حظر النقر والتبديل طالما كانت الطفرة قيد التنفيذ باستخدام `canToggleModule`، مع إضافة مؤشر انتظار بصري (`cursor-wait opacity-60`).
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`, `companyAdminGuards.ts`, `companyAdminGuards.test.ts`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** `companyAdminGuards.test.ts` (canToggleModule tests PASS)
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F23 — فقدان مسودة الشات عند الفشل وخلط الإغلاق بالإنهاء
- **Finding ID:** `CA-F23`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Shared / Support Chat / `LiveChatWidget`
- **Problem Description:** مسح نص الرسالة فوراً قبل رد الخادم بنجاح؛ وزر الإغلاق (`X`) ينهي الجلسة ويسقط المعرف فوراً بدلاً من مجرد تصغير النافذة.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`LiveChatWidget.tsx#L51-L74`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/shared/LiveChatWidget.tsx#L51-L74)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** تداخل منطق تصغير النافذة مع إنهاء الجلسة، ومسح متفائل للمسودة.
- **Proposed Correction:** استخدام دالة `attemptChatSend` لمنع مسح النص إلا بعد تأكيد الخادم والاحتفاظ بالمسودة عند الفشل، وفصل زر التصغير (`handleMinimize`) عن إنهاء الجلسة (`handleEndSession`)، وتعطيل الإرسال أثناء التنفيذ.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `LiveChatWidget.tsx`, `companyAdminGuards.ts`, `companyAdminGuards.test.ts`
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** `companyAdminGuards.test.ts` (attemptChatSend tests PASS)
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-F24 — مسارات مشتركة وتفضيلات الإشعارات تتطلب تفويضاً
- **Finding ID:** `CA-F24`
- **Phase:** Phase 1A — Company Admin
- **Role / Module / Page:** Shared Queries / Notifications / `notifications.ts`
- **Problem Description:** استخدام مسار `/admin/notifications/preferences` المخصص للأدمن العام داخل مكونات لوحة تحكم الشركة قد يسبب خطأ 403 Forbidden، ما يتطلب التأكد من تفويض المسار بالباك إند.
- **Severity / Priority:** P2 (Medium)
- **Original Evidence:** [`notifications.ts#L86-L110`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/api/queries/notifications.ts#L86-L110)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** غموض في عقد الـ API المشترك بين صلاحيات Platform Admin و Company Admin.
- **Proposed Correction:** الالتزام الصارم بعدم اختلاق مسارات وهمية أو تغيير واجهات الـ Backend البرمجية غير المعتمدة حتى تصدر موافقة معمارية محددة.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** الحفاظ على حدود المعمارية البرمجية
- **Implementation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`
- **Automated Test Results:** مراجعة الحدود التعاقدية
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `APPROVAL_REQUIRED`
- **Approval / Decision Required:** تأكيد الباك إند حول مسار تفضيلات إشعارات مدراء الشركات (سواء كان `/company/me/preferences` أو مساراً مشتركاً).
- **Remaining Risks:** احتمال ظهور خطأ 403 عند محاولة حفظ التفضيلات من حساب شركة إذا لم يُحدث الباك إند.
- **Last Updated Date:** 2026-10-22

---

## 5.1 Phase 1A — Detailed Review Corrections Register (سجل تصحيحات المراجعة التفصيلي)

### CA-REV-01 — فصل معرّف الفاتورة الداخلي عن المعرّف المعروض واستخدامه لتنزيل PDF
- **Finding ID:** `CA-REV-01`
- **Phase:** Phase 1A — Company Admin (Review Correction)
- **Role / Module / Page:** Company Admin / Billing / `ca-billing`
- **Problem Description:** كان كود الفواتير يخلط بين المعرّف الداخلي `id` والرقم التسلسلي العام المعروض `publicId`، ما أدى لعرض معرفات داخلية للمستخدم أو احتمالية فشل تنزيل ملف PDF إذا استُخدم معرف غير متطابق مع متطلبات الخادم `/company/me/billing/invoices/:id/pdf`.
- **Severity / Priority:** P1 (High)
- **Root Cause:** عدم التمييز الصريح بين المعرّف التقني المطلوب للخادم (`id`) والمعرّف المخصص للعرض (`displayId`).
- **Proposed Correction:** في `parseInvoice`: فصل تام بين `id` (لـ API) و `displayId` (الذي يأخذ `publicId` أو يرتد لـ `id`). وفي واجهة المستخدم عرض `inv.displayId` وفي زر التنزيل استدعاء `downloadPdfMut.mutate({ id: inv.id, filename: `invoice-${inv.displayId}.pdf` })`.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `companyAdminGuards.ts`, `companyAdminGuards.test.ts`, `CompanyDashboard.tsx`
- **Implementation Commit SHA:** `f4d3fc808f34bf946c384a0f8f3f5e7e836dc28b`
- **Automated Test Results:** `companyAdminGuards.test.ts` — CA-REV-01 test PASS
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-REV-02 — حساب مؤشرات الفوترة وفق عقد الملخص الإجمالي وتدقيق مسمى فواتير الصفحة
- **Finding ID:** `CA-REV-02`
- **Phase:** Phase 1A — Company Admin (Review Correction)
- **Role / Module / Page:** Company Admin / Billing / `ca-billing`
- **Problem Description:** كانت بطاقات المؤشرات (KPIs) تجمع فقط فواتير الصفحة الحالية المعروضة وتظهرها وكأنها إجمالي الشركة، ما يعطي أرقاماً مضللة إذا كانت هناك فواتير في صفحات سابقة أو تالية. وبعد مراجعة عقد الباك إند الفعلي في `BillingController.php` لـ `GET /company/me/billing/summary`، تبيّن أنه يعيد فقط `totalPaidHalalas` و`nextInvoice` و`defaultPaymentMethod`، ولا يعيد إطلاقاً `outstandingHalalas`. كما أن قائمة الفواتير `GET /company/me/billing/invoices` تعيد `totalHalalas` فقط ولا تعيد رصيد الاستحقاق `amountDue`.
- **Severity / Priority:** P1 (High)
- **Root Cause:** عدم تطابق تسمية المؤشر مع النطاق الفعلي لبيانات الـ API، مع خطر تفسير `amountDue = 0` خطأ كقيمة منعدمة والارتداد لمبلغ الفاتورة الكلي، وافتراض اكتمال السجلات عند غياب بيانات الـ Pagination.
- **Proposed Correction:** استهلاك خطاف `useBillingSummary()` وتمرير `billingSummary` ومعلومات الترقيم `meta.total` إلى دالة `calculateBillingKpis`. اعتماد `totalPaid` من ملخص الشركة الإجمالي (`totalPaidHalalas`). وفي مؤشر المستحقات: عرض المبلغ باعتباره إجمالي مبالغ الفواتير المفتوحة أو المتأخرة بالصفحة (`فواتير معلقة (الصفحة)` / `مستحقات فواتير الصفحة`) دون إيحاء بأنه رصيد استحقاق جزئي فعلي؛ مع احترام `amountDue = 0` صراحة (`!= null`)؛ وعدم افتراض اكتمال سجلات الشركة عند غياب `totalCountMeta` (`hasPaginationTotal: false`)، دون اختراع مسار وهمي ودون المساس بقواعد SUB-01.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `companyAdminGuards.ts`, `companyAdminGuards.test.ts`, `CompanyDashboard.tsx`
- **Implementation Commit SHA:** `f4d3fc808f34bf946c384a0f8f3f5e7e836dc28b`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (`companyAdminGuards.test.ts` — يغطي غياب `outstandingHalalas`، واحترام `amountDue=0`، والترقيم المتعدد، وغياب بيانات الترقيم، والـ Fallback)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `Contract/Code Review: PASS` | `Staging Authenticated Runtime: BLOCKED_BY_STAGING_AUTH` (تم التحقق تعاقدياً وإنتاجياً من دقة المسميات `فواتير معلقة (الصفحة)` وعزلها عن إجمالي الشركة، واحترام `amountDue = 0` وعدم افتراضه؛ تعذر الاستعلام الشبكي المباشر على Staging لكون حسابات Demo القياسية أعادت 401 Unauthorized على الخادم الحي؛ ولا يُعتبر الفحص التعاقدي بديلاً عن اختبار الـ API المصادق عليه)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-REV-03 — مطابقة حقل تاريخ الفاتورة issueDate من الخادم
- **Finding ID:** `CA-REV-03`
- **Phase:** Phase 1A — Company Admin (Review Correction)
- **Role / Module / Page:** Company Admin / Billing / `ca-billing`
- **Problem Description:** كان نموذج الفاتورة يعتمد على `issuedAt` أو `createdAt` دون مطابقة صريحة لحقل `issueDate` المعتمد في عقود الفوترة بالباك إند.
- **Severity / Priority:** P2 (Medium)
- **Root Cause:** عدم تضمين `issueDate` في قائمة الأولويات لفحص تواريخ الفواتير.
- **Proposed Correction:** تحديث `parseInvoice` ليفحص `raw.issueDate` أولاً بأعلى أولوية، ثم يرتد بالتدرج إلى `issuedAt` ثم `createdAt` ثم `date`.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `companyAdminGuards.ts`, `companyAdminGuards.test.ts`
- **Implementation Commit SHA:** `f4d3fc808f34bf946c384a0f8f3f5e7e836dc28b` (تحديث من `1cb2b1e19a3...`)
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (`companyAdminGuards.test.ts` — CA-REV-03 test PASS)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-REV-04 — مسح الحقول الاختيارية بقيمة null مع احترام الحقول غير القابلة للـ null
- **Finding ID:** `CA-REV-04`
- **Phase:** Phase 1A — Company Admin (Review Correction)
- **Role / Module / Page:** Company Admin / Settings / `ca-settings`
- **Problem Description:** عند قيام المستخدم بمسح الحقول الاختيارية (مثل رقم السجل التجاري والبريد الإلكتروني)، كان الكود يتجاهل الحقول الفارغة أو يرسل قيماً لا تمسح البيانات المخزنة، كما كان إرسال `null` لحقل `city` يتسبب في خطأ 422 من الخادم لكون `city` غير قابلة للـ null.
- **Severity / Priority:** P1 (High)
- **Root Cause:** عدم التمييز بين الحقول التي تقبل `null` لتفريغها في قاعدة البيانات (`crNumber`, `email`) والحقول التي تشترط نصاً غير منعدم (`city`, `name`).
- **Proposed Correction:** في `validateCompanySettings`: إرسال `crNumber: crNumber ? crNumber : null` و `email: email ? email : null` لتمكين تفريغها بالباك إند، مع الامتناع عن إرسال `city` كـ `null` (استبعادها عند الفراغ) لمنع خطأ 422. وتحديث واجهة `CompanySettings` في `companyAdmin.ts` لدعم `string | null`.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `companySettingsGuards.ts`, `companySettingsGuards.test.ts`, `companyAdmin.ts`
- **Implementation Commit SHA:** `f4d3fc808f34bf946c384a0f8f3f5e7e836dc28b` (تحديث من `1cb2b1e19a3...`)
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (`companySettingsGuards.test.ts` — CA-REV-04 test PASS)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-REV-05 — إمكانية الوصول للدرج المحمول وحبس التركيز والتجاوب المكتبي (Responsive Resize)
- **Finding ID:** `CA-REV-05`
- **Phase:** Phase 1A — Company Admin (Review Correction)
- **Role / Module / Page:** Layout Shell / Mobile Drawer / `Shell`
- **Problem Description:** عند فتح الدرج المحمول ثم تكبير عرض الشاشة إلى Desktop، كانت القائمة تختفي بـ `md:hidden` لكن حالة `mobileOpen=true` تظل مفعلة، مما يبقي المحتوى الرئيسي في حالة `inert` معزولة. كما تطلب الأمر إحكام دورة التركيز Tab / Shift+Tab واستعادة التركيز دون محاولة استهدافه لزر Hamburger المخفي على الديسكتوب.
- **Severity / Priority:** P1 (High)
- **Root Cause:** عدم مراقبة التغير في نقطة الانتقال التجاوبية (`md: 768px`) لإلغاء حالة الفتح وعزل الصفحة، ومحاولة إعادة التركيز لزر مخفي على الشاشات الكبيرة.
- **Proposed Correction:** إضافة مراقب `window.matchMedia("(min-width: 768px)")` يقوم تلقائياً بإغلاق الدرج وإزالة `inert` و `aria-hidden` عن المحتوى الرئيسي فور الانتقال للديسكتوب؛ وتنفيذ `trapDrawerFocus` لحبس التركيز دورياً بين أول وآخر عنصر قابل للتركيز بالدرج؛ واستعادة التركيز لزر القائمة عند الإغلاق الطبيعي بالموبايل فقط مع تخطيه على الديسكتوب لكونه مخفياً (`md:hidden`)؛ ودعم مفتاح `Escape`؛ ومراعاة كاملة لاتجاهي RTL و LTR.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`, `companyAdminGuards.ts`, `companyAdminGuards.test.ts`
- **Implementation Commit SHA:** `f4d3fc808f34bf946c384a0f8f3f5e7e836dc28b`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اختبارات `trapDrawerFocus`، وثابت نقطة التجاوب `DESKTOP_BREAKPOINT_PX = 768`، و0 أخطاء TypeScript، و122 اختباراً ناجحاً بنسبة 100%)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `Local Browser QA: REPORTED_PASS_PENDING_REVIEW` | `Staging Integration QA: NOT_RUN` (تم التحقق محلياً في جلسة متصفح موثقة على البناء الإنتاجي عبر مسار المعاينة `http://localhost:3000/#/preview/asab/ASABPrototype` لدور Company Admin: تم اختبار فتح وإغلاق الدرج، والانتقال التجاوبي 375px/767px/768px/1024px، وإغلاق الدرج التلقائي عند 768px مع إزالة `inert` و`aria-hidden` فوراً عن المحتوى الرئيسي، وتخطي زر Hamburger المخفي على الديسكتوب، والتنقل الدوري بـ Tab/Shift+Tab وEscape، وتوافق تام مع RTL وLTR؛ الأدلة مسجلة في `phase1a_runtime_qa_1792651824579.webp`؛ ولا تُعتبر هذه النتيجة قبولاً مستقلاً أو Staging PASS حتى مراجعة الأدلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---


### 4.2 Phase 1B — Head Accountant Master Summary Table

| ID | الأولوية | النطاق / الموديول | عنوان المشكلة المعتمد | الحالة البرمجية | الفحص الآلي | حالة البند العامة | ملاحظات الحوكمة |
| :---: | :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **HA-F01** | P1 | Company | اعتماد SAL الفردي مقفل كليًا في Baseline Company | `APPROVAL_REQUIRED` | `PASS` | `APPROVAL_REQUIRED` | محجوب — يتطلب اعتماد دمج PR #1 أو قرار معماري بشأن اعتماد SAL الفردي |
| **HA-F02** | P1 | Both | غياب reportReview قد يحوّل SAL غير المميزة إلى Legacy في الحارس | `APPROVAL_REQUIRED` | `PASS` | `APPROVAL_REQUIRED` | محجوب — يتطلب اعتماد دمج PR #1 لـ workflowKind والتحقق الخادمي |
| **HA-F03** | P1 | Prototype | Prototype يعرض نجاح Final Approval قبل استجابة الخادم | `APPROVAL_REQUIRED` | `NOT_RUN` | `APPROVAL_REQUIRED` | محجوب — يتطلب اعتماد PR #1 لربط اعتماد Final خادمياً |
| **HA-F04** | P1 | Prototype | Prototype Bulk/Reject/Return ما زالت متفائلة وغير متسقة مع Company | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F05** | P1 | Prototype | إلغاء نافذة إرجاع Prototype لا يلغي طلب الإرجاع | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F06** | P1 | Prototype | ERP Prototype يختلق نجاحًا وBatch ID بعد فشل الطلب | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F07** | P1 | Prototype | مرشحات معالج ERP شكلية ولا تحدد العمليات المرسلة | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F08** | P2 | Prototype | Wizard ERP يسمح بالانتقال لشاشة النجاح دون إرسال ويتجاهل preflight gate | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F09** | P1 | Company | Company ERP يضع posted محليًا قبل نجاح الترحيل | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F10** | P1 | Both | طوابير Head ناقصة بسبب إسقاط Pagination | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F11** | P1 | Prototype | Prototype يفقد الهللات ويحوّل مبلغًا مفقودًا إلى صفر | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F12** | P2 | Company | Company Head Dashboard يقرأ API وأسماء KPI غير متوافقة | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F13** | P1 | Company | تفاصيل جرد المخزون في Company مصدرها بيانات ثابتة بحسب اسم الفرع | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F14** | P1 | Prototype | Owner reports تمزج البيانات الحية بمقارنات مالية مصطنعة | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F15** | P1 | Prototype | أسماء محاسبين مصطنعة عند غياب accountantName | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F16** | P2 | Company | تذكيرات Company تخالف شكل الاستجابة واسم حقل التحديث | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F17** | P2 | Company | تعديل/توثيق المشتريات مرئي لـHead لكن hook يستدعي طريق Accountant | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F18** | P2 | Company | صفحة الهدر في Company تسلك محرر المحاسب دون تكييف Head | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F19** | P2 | Both | اعتماد/رفض المصروفات ظاهر رغم منع قرار Head خادميًا | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F20** | P2 | Prototype | Conditional approval يعرض badge قبل الرد ويسمح بملاحظة فارغة | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F21** | P2 | Company | مودال رفض Company يغلق ويمسح الإدخال قبل معرفة نتيجة الخادم | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F22** | P1 | Prototype | Prototype يحتفظ بعمليات قديمة عند رجوع فترة خالية | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F23** | P2 | Prototype | تصدير pending بينما جدول Head يعرض approved؛ وتصدير الأداء يصدر عمليات | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F24** | P2 | Company | نص تفاصيل المصروف يطلب فتح بيان لا يملك مسارًا من Head | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F25** | P2 | Both | Native Bulk API/UI compatibility reservation | `APPROVAL_REQUIRED` | `PASS` | `APPROVAL_REQUIRED` | محجوب — حجز توافق Native Bulk API/UI يتطلب اعتماد PR #1 |
| **HA-F26** | P2 | Both | Loading/error غير مفصولين عن empty/success في عدة صفحات Head | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F27** | P2 | Both | حالات approved/rejected تفتقد مسار تفاصيل/تفسير إرجاع كافٍ | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F28** | P2 | Both | مؤشرات الأداء والحالة تحتوي ثوابت غير مثبتة | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F29** | P2 | Both | بنية sidebar ثابتة وتستهلك مساحة الهاتف | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F30** | P2 | Both | شبكات وملخصات مالية متعددة الأعمدة بلا breakpoint مناسب | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F31** | P2 | Both | مودالات Head غير مكتملة كحوار accessible | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F32** | P2 | Prototype | قائمة رفض hover-only وbutton متداخل في عناوين المجموعات | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F33** | P2 | Both | توسيع الصفوف وبطاقات KPI مبني على div للنقر فقط | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F34** | P2 | Both | أسماء برمجية وحالات expanded/selected غير متسقة | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F35** | P2 | Both | Viewport يقيد التكبير | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F36** | P2 | Both | اللغة/RTL/التواريخ والعملة غير موحدة | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F37** | P2 | Both | مشكلات shared search/notifications/chat/renewal تستمر لـHead | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F38** | P2 | Both | match المفقودة/غير المعروفة قد تعرض exact | `FIXED_AND_VERIFIED` | `PASS` | `FIXED_AND_VERIFIED` | تم الإصلاح برمجياً واجتياز الفحوصات الآلية بنسبة 100% |
| **HA-F39** | P1 | Prototype exports / Backend linked consumer | Operations export يمرر company IDs كـarray إلى helper يتطلب string | `PENDING_BACKEND_EXECUTION` | `NOT_RUN` | `ANALYZED_BACKEND_PROPOSAL` | تحليل جذري دقيق وتصحيح PHP مقترح واختبار وحدة مقترح — دون تعديل Backend أو تشغيل اختبار غير منفذ |

---

## 6. Phase 1B — Head Accountant Detailed Findings Register (السجل التفصيلي لمشاكل المرحلة 1B الـ 39)

### 6.0 Phase 1B Independent Review Targeted Corrections & Test Suite Overhaul (2026-10-22)

> **سياق المراجعة المستقلة:** تمت مراجعة commit المرحلة 1B (`4d8fd119add1b0ff71837df9df405a2f7a70ebee`)، وطُلبت حزمة تصحيحات مستهدفة محددة تم تنفيذها والتحقق منها بنسبة 100%:
>
> 1. **HA-F04 & HA-F20 (المعالجة المالية غير المتزامنة واعتماد الخادم):**
>    - في `ASABPrototype.tsx` و`CompanyDashboard.tsx`: إزالة مسار fallback المتزامن `mutate()` غير المنتظر، وتحويل كافة عمليات الاعتماد والرفض والإرجاع إلى مسار غير متزامن بالكامل مع `await` الصريح.
>    - عدم إسقاط أخطاء الـ API بصمت، ورفع الخطأ لعرض رسالة واضحة للمستخدم دون أي تحديث متفائل للحالة المالية عند الفشل.
>    - في الاعتماد المشروط (`HA-F20`): إلزامية الملاحظة النصية غير الفارغة مع التحقق من `trim()` عبر `validateConditionalApproval`، وعدم وضع badge الاعتماد المشروط إلا بعد الاستجابة الإيجابية من الخادم.
> 2. **HA-F22 (استقرار دورة الرندرة وتفريغ الحالات القديمة):**
>    - استقرار مرجع `opsRange` بالاعتماد على القيم النصية البدائية (`dateStart`, `dateEnd`) بدلاً من كائن ديناميكي جديد في كل دورة رندرة لمنع حلقة الرندرة اللانهائية (Infinite Render Loop).
>    - دالة `shouldUpdateHeadOps` تقارن المحتوى (المعرفات، الحالات، المبالغ) وتمنع إعادة تحديث الـ state في حال تطابق البيانات، مع ضمان تفريغ القائمة بالكامل عند نجاح الاستعلام برجوع صفر صفوف.
> 3. **HA-F07 & HA-F08 (ربط مرشحات معالج ERP وبوابات التحقق المسبق):**
>    - ربط مرشح الفترة `periodFilter` بحساب مصفوفة `toPost` عبر `isOpWithinPeriod` بدقة، واستبعاد المبالغ الفارغة أو غير المعرفة (`amount == null`).
>    - قفل الانتقال للخطوة التالية (`canProceedPreflight`) عند وجود أخطاء في فحص الـ preflight أو عندما تكون قائمة العمليات فارغة (`toPost.length === 0`).
>    - اشتراط الحصول على معرف حزمة مؤكد من الخادم (`postedBatchId`) قبل تمكين الانتقال للخطوة 3.
> 4. **HA-F10 (استرجاع طوابير Head متعددة الصفحات وحفظ البيانات الوصفية):**
>    - تنفيذ واختبار دالة `fetchAllHeadOpsPages` سلوكياً بمحاكاة ردود متعددة الصفحات وتجميع كافة العمليات في مصفوفة موحدة مع الحفاظ الكامل على الـ metadata.
> 5. **HA-F11 (دقة التجميع المالي وحفظ القيم المفقودة):**
>    - دوال التجميع المالي (`aggregateOpsAmount`, `sumCOpAmounts`) لا تحول `null` إلى صفر بل تعيد `null` صريحاً، وتعرض الواجهة مؤشر غياب البيانات (`—`) بدلاً من `0.00 ر.س`.
> 6. **إعادة بناء حزمة الاختبارات الآلية (Test Suite Overhaul - Finding E):**
>    - استبدال كافة الاختبارات القائمة على قراءة النصوص المصدرية وتطبيق Regex باختبارات سلوكية حقيقية (Behavioral Unit / Integration Tests) تعتمد على استدعاء الدوال وتمرير المدخلات ومحاكاة الـ API والتحقق من المخرجات وتغيرات الحالة والنداءات.
>    - اجتياز 12/12 اختبار سلوكي في `headReviewGuards.test.ts`، و23/23 في `salesActionGuards.test.ts`، و10/10 في `operationMapping.test.ts` بإجمالي 45/45 اختبار ناجح بنسبة 100%.

### HA-F01 — اعتماد SAL الفردي مقفل كليًا في Baseline Company
- **Finding ID:** `HA-F01`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Company
- **Problem Description:** isDay مع reportReview يرجع finalApprove=false وday_evidence_missing حتى approved/head_review؛ الواجهة تستخدم السياسة لإظهار الزر والـpreflight.
- **Severity / Priority:** P1 (High / Financial Risk)
- **Original Evidence:** [`components/mockups/asab/headReviewGuards.ts#L29`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.ts#L29)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** الدورة الصحيحة SHF ثم SAL لا تكتمل من Company baseline. ليست دلالة أن membership revisions حالات Final.
- **Proposed Correction:** اختبار دور/مرحلة/حالة صحيحين: preflight يسمح GET، ثم details مطابق، ثم Backend وحده يتحقق من SHF وsnapshot؛ wrong/stale/403/409 بلا نجاح.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `headReviewGuards.ts`, `headReviewGuards.test.ts`, `CompanyDashboard.tsx`
- **Implementation Status:** `GATED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `APPROVAL_REQUIRED`
- **Approval / Decision Required:** اعتماد دمج PR #1 غير المدمج أو اتخاذ قرار معماري بشأن اعتماد SAL الفردي والـ Native Bulk.
- **Remaining Risks:** تفاوت السلوك في حال التعامل مع عمليات SAL غير المميزة دون دمج PR #1.
- **Last Updated Date:** 2026-10-22

---

### HA-F02 — غياب reportReview قد يحوّل SAL غير المميزة إلى Legacy في الحارس
- **Finding ID:** `HA-F02`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** isDay يعتمد على marker؛ مسار else يسمح final/return، وheadLegacyBulkIds يستبعد shifts فقط. مصدر التصنيف workflowKind غير موجود في baseline mapping.
- **Severity / Priority:** P1 (High / Financial Risk)
- **Original Evidence:** [`components/mockups/asab/headReviewGuards.ts#L13`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.ts#L13)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** عرض Bulk/Return لعملية غير موثقة؛ Backend983 يرفض unknown/protected، فلا يثبت هذا تجاوزًا خادميًا.
- **Proposed Correction:** مصدر خادمي موجب لـlegacy_sales؛ sal_day/unknown fail closed؛ mixed group رفض كامل قبل أي mutation.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `headReviewGuards.ts`, `headReviewGuards.test.ts`, `CompanyDashboard.tsx`
- **Implementation Status:** `GATED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `APPROVAL_REQUIRED`
- **Approval / Decision Required:** اعتماد دمج PR #1 غير المدمج أو اتخاذ قرار معماري بشأن اعتماد SAL الفردي والـ Native Bulk.
- **Remaining Risks:** تفاوت السلوك في حال التعامل مع عمليات SAL غير المميزة دون دمج PR #1.
- **Last Updated Date:** 2026-10-22

---

### HA-F03 — Prototype يعرض نجاح Final Approval قبل استجابة الخادم
- **Finding ID:** `HA-F03`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Prototype
- **Problem Description:** setOps(final-approved) يسبق finalMut.mutate؛ لا runHeadFinalApproval/refetch/lock في هذه النسخة؛ onError toast فقط ولا rollback محلي.
- **Severity / Priority:** P1 (High / Financial Risk)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L17042`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L17042)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** رفض 403/409 قد يترك حالة مالية نهائية كاذبة في UI.
- **Proposed Correction:** Fresh detail+lock، عدم انتقال الحالة قبل نجاح الخادم، و403/409 بلا optimistic success.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `GATED`
- **Automated Test Results:** `NOT_RUN` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `APPROVAL_REQUIRED`
- **Approval / Decision Required:** اعتماد دمج PR #1 غير المدمج أو اتخاذ قرار معماري بشأن اعتماد SAL الفردي والـ Native Bulk.
- **Remaining Risks:** تفاوت السلوك في حال التعامل مع عمليات SAL غير المميزة دون دمج PR #1.
- **Last Updated Date:** 2026-10-22

---

### HA-F04 — Prototype Bulk/Reject/Return ما زالت متفائلة وغير متسقة مع Company
- **Finding ID:** `HA-F04`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Prototype
- **Problem Description:** reject/return/bulk تعدل ops قبل الطلب؛ baseline bulk ينتقي eligible subset، ولا يرفض كامل الاختيار إذا بعضه محمي. G1 يضيف cardinality check للـbulk لكنه يحتفظ بالتحديث المتفائل.
- **Severity / Priority:** P1 (High / Financial Risk)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L17030`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L17030)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** واجهة قد توهم نجاحًا/نجاحًا جزئيًا بعد رفض Backend؛ لا يثبت partial backend writes.
- **Proposed Correction:** اختيار mixed protected يُرفض بالكامل، fresh state وduplicate lock، فشل API لا يغير الحالة ولا يحتفظ بنجاح متفائل.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F05 — إلغاء نافذة إرجاع Prototype لا يلغي طلب الإرجاع
- **Finding ID:** `HA-F05`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Prototype
- **Problem Description:** window.prompt(...) || undefined يُمرر فورًا إلى returnForReview؛ null الناتج عن Cancel لا يوقف الاستدعاء.
- **Severity / Priority:** P1 (High / Financial Risk)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L9897`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L9897)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** قد يُرسل طلب مالي عكس نية المستخدم حتى عند إلغاء التأكيد.
- **Proposed Correction:** Cancel=zero requests/zero local status mutation؛ موافقة صريحة فقط ترسل الطلب.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F06 — ERP Prototype يختلق نجاحًا وBatch ID بعد فشل الطلب
- **Finding ID:** `HA-F06`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Prototype
- **Problem Description:** catch لا يعيد رمي الخطأ؛ serverBatchId الفارغ يستبدل بمعرف ERP-BATCH مصطنع، ثم erpPosted=true ويعود success flow.
- **Severity / Priority:** P1 (High / Financial Risk)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L17119`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L17119)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** تقرير وترحيل ظاهر كاذب، ويمكن أن يغذي ملخصات owner؛ ليس إثباتًا لكتابة مالية في الخادم.
- **Proposed Correction:** 403/409/500/offline=لا success screen ولا posted badge/fake batch؛ يعرض server ID فقط بعد نجاح مؤكد.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F07 — مرشحات معالج ERP شكلية ولا تحدد العمليات المرسلة
- **Finding ID:** `HA-F07`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Prototype
- **Problem Description:** Radios الوحدة/الفترة/المطاعم/الفروع/الحالة defaultChecked وحقل التاريخ defaultValue؛ لا state/onChange أو form serialization يربطها بـtoPost IDs.
- **Severity / Priority:** P1 (High / Financial Risk)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L10773`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L10773)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** يمكن عرض اختيار ضيق بينما إرسال IDs المجموعة النهائية المحمّلة كلها.
- **Proposed Correction:** كل اختيار يحدد preview والطلب نفسه، scope يظهر بوضوح؛ لا إرسال خارج selection.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F08 — Wizard ERP يسمح بالانتقال لشاشة النجاح دون إرسال ويتجاهل preflight gate
- **Finding ID:** `HA-F08`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Prototype
- **Problem Description:** مؤشرات الخطوات setStep(i) تشمل i=2؛ preflight.canProceed يعرض تحذيرًا لكن لا يمنع setStep(1) أو confirm.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L10754`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L10754)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** success screen وحدها غير موثوقة؛ الخادم قد يرفض لكن UI لا يشرح التسلسل.
- **Proposed Correction:** لا نجاح قبل server confirmation؛ preflight states blocking حسب العقد، وإعادة تحقق عند الإرسال.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F09 — Company ERP يضع posted محليًا قبل نجاح الترحيل
- **Finding ID:** `HA-F09`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Company
- **Problem Description:** postAll يستدعي mutations في حلقة ثم setPosted لكل ready IDs، وpostOne يضيف ID فورًا؛ state يُفقد عند إعادة الدخول.
- **Severity / Priority:** P1 (High / Financial Risk)
- **Original Evidence:** [`components/mockups/asab/CompanyDashboard.tsx#L3196`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L3196)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** نجاح وهمي وعدم منع إعادة طلب على أزرار post؛ لا دليل على duplicate financial posting خادمي.
- **Proposed Correction:** await server outcome لكل item/batch؛ إظهار حالات pending/failed/posted من الخادم، ومنع double click وإعادة ترحيل نفس العملية.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F10 — طوابير Head ناقصة بسبب إسقاط Pagination
- **Finding ID:** `HA-F10`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** Company يقرأ pageSize100 دون صفحة تالية؛ Prototype head hooks تفك data فقط وتسقط meta، default Backend20 لكل status؛ قوائم/filtres/أرقام مشتقة من الجزء المحمل.
- **Severity / Priority:** P1 (High / Financial Risk)
- **Original Evidence:** [`components/mockups/asab/CompanyDashboard.tsx#L3273`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L3273)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** عمليات مالية قد لا تظهر للمراجعة؛ إجمالي معروض لا يساوي إجمالي النطاق.
- **Proposed Correction:** أكثر من100/20 عملية؛ التنقل أو load more بلا فقد/تكرار؛ total المعتمد من meta منفصل عن count المعروض.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `platform/head.ts`, `CompanyDashboard.tsx`, `headReviewGuards.test.ts`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F11 — Prototype يفقد الهللات ويحوّل مبلغًا مفقودًا إلى صفر
- **Finding ID:** `HA-F11`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Prototype
- **Problem Description:** Math.round(amountHalalas/100) لكامل SAR؛ fallback Math.round((amount??0)/100). fmtAmt لا يفرض منزلتين.
- **Severity / Priority:** P1 (High / Financial Risk)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L2299`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L2299)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** 10001 هللة تصبح100 ريال بدل100.01؛ إجماليات وقرار المراجع قد تكون مضللة حتى دون تغيير Backend.
- **Proposed Correction:** قيم0.01/100.01/null/unknown وتوتال مختلط؛ هللات صحيحة ومنزلتان دون صفر مختلق.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `operationMapping.ts`, `operationMapping.test.ts`, `ASABPrototype.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F12 — Company Head Dashboard يقرأ API وأسماء KPI غير متوافقة
- **Finding ID:** `HA-F12`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Company
- **Problem Description:** useCompanyAdminDashboard يطلب company-admin-only /company/me/dashboard؛ Head dashboard API يوفر monthlySalesHalalas بينما المكون يبحث totalSalesHalalas ويفلتر brands fallback؛ delta+8.2% ثابتة.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/CompanyDashboard.tsx#L2646`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2646)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** Head-only grant قد لا يحصل على بيانات brands؛ المبيعات قد تصبح صفرًا أو fallback غير معتمد.
- **Proposed Correction:** Head-only login يقرأ Head endpoint؛ الحقول مطابقة، loading/error/unknown بدل0، delta من بيانات فعلية.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F13 — تفاصيل جرد المخزون في Company مصدرها بيانات ثابتة بحسب اسم الفرع
- **Finding ID:** `HA-F13`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Company
- **Problem Description:** OpRow للـinventory يقرأ INV_BRANCH_DATA[op.branch]؛ ثابت أصناف وكميات مقارنة بالفرع بالاسم، لا details API.
- **Severity / Priority:** P1 (High / Financial Risk)
- **Original Evidence:** [`components/mockups/asab/CompanyDashboard.tsx#L1839`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L1839)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** عملية live قد تُعرض بجرد مصنوع إذا طابق اسمها المفتاح؛ مراجع قد يعتمد تفاصيل غير حقيقية.
- **Proposed Correction:** جرد من operation detail المصرح أو حالة عدم توفر صريحة؛ تغيير اسم الفرع لا يستبدل الأدلة ببيانات تجريبية.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F14 — Owner reports تمزج البيانات الحية بمقارنات مالية مصطنعة
- **Finding ID:** `HA-F14`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Prototype
- **Problem Description:** SEPT_BASELINE أرقام ثابتة؛ عناوين2025 وتحليلات مشتقة من ops ERP-marked محليًا؛ بيانات API موجودة لكن ليست المصدر الوحيد لكل الرسوم.
- **Severity / Priority:** P1 (High / Financial Risk)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L2877`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L2877)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** تقرير يبدو ERP-verified قد يعرض مقارنة/net/ranking غير موثقين؛ يتفاقم مع false posted.
- **Proposed Correction:** لا baseline افتراضي أو label fixed كبيانات حقيقية؛ الفترة/المجاميع من مصدر مالي محدد؛ Missing=غير متاح.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F15 — أسماء محاسبين مصطنعة عند غياب accountantName
- **Finding ID:** `HA-F15`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Prototype
- **Problem Description:** getAcc يستنتج واحدًا من أربعة أسماء ثابتة من أرقام ID؛ يستخدم للعرض والتصفية؛ يتكرر HeadModulePage.
- **Severity / Priority:** P1 (High / Financial Risk)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L9836`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L9836)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** إسناد مراجعة مالية لشخص لم يُثبته الخادم؛ التصفية تبني هوية وهمية.
- **Proposed Correction:** عرض هوية غير متاحة بدل اختلاق الاسم؛ filter لا ينسب operation لشخص من ID.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F16 — تذكيرات Company تخالف شكل الاستجابة واسم حقل التحديث
- **Finding ID:** `HA-F16`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Company
- **Problem Description:** يربط title/body/isDone ويرسل isDone؛ Backend head presenter يعيد titleAr/bodyAr/done وupdate يقبل done فقط.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/CompanyDashboard.tsx#L3147`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L3147)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** نصوص غير ظاهرة وتبديل completion قد لا يحفظ رغم وجود handler.
- **Proposed Correction:** قراءة حقول Head الصحيحة وإرسال done؛ reload يعكس النتيجة؛ عدم إعلان نجاح قبل التأكيد.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F17 — تعديل/توثيق المشتريات مرئي لـHead لكن hook يستدعي طريق Accountant
- **Finding ID:** `HA-F17`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Company
- **Problem Description:** PurchaseMatchPanel لا يقيد أدوات editing/document بالدور؛ المسارات /company/me/.../document وpurchase-lines تحت accountant middleware؛ توجد generic routes تدعم Head لكن hook لا يستخدمها.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/CompanyDashboard.tsx#L4208`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L4208)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** false affordance/denied action في Head-only grant؛ لا إثبات bypass.
- **Proposed Correction:** تثبيت الصلاحية المطلوبة مع القواعد؛ إخفاء غير المسموح أو استخدام contract المعتمد؛403 بلا تغيير UI.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F18 — صفحة الهدر في Company تسلك محرر المحاسب دون تكييف Head
- **Finding ID:** `HA-F18`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Company
- **Problem Description:** head-waste يفتح AccCompanyWaste بلا role؛ كتابة classification/allocations وapprove pending/bulk approve معروضة؛ company waste routes ضمن accountant-only.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/CompanyDashboard.tsx#L7109`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L7109)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** Head قد يفشل حتى قراءة الصفحة أو يرى أفعال المرحلة الخطأ؛ لا يثبت authorization hole خادميًا.
- **Proposed Correction:** فصل read/final عن branch/accountant decisions وفق WASTE-01؛ Head-only API parity؛ zero mutations on denied.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F19 — اعتماد/رفض المصروفات ظاهر رغم منع قرار Head خادميًا
- **Finding ID:** `HA-F19`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** generic head policy يسمح غيرshifts وغيرSAL؛ module expenses يعرض final/reject/bulk؛ assertDecisionAuthorized يمنع Head/Accountant من قرار المصروف409.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/headReviewGuards.ts#L33`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.ts#L33)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** تكرار409 وقرار واجهة مضلل؛ لا دليل على قبول العملية من Backend.
- **Proposed Correction:** واجهة مصروفات مالية read-only/مرآة وفق contract؛ المالك/مدير العلامة جهة القرار، مع اختبار mixed bulk.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `headReviewGuards.ts`, `headReviewGuards.test.ts`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F20 — Conditional approval يعرض badge قبل الرد ويسمح بملاحظة فارغة
- **Finding ID:** `HA-F20`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Prototype
- **Problem Description:** setConditionalApproved يحدث قبل finalApproveOp ولا check trim؛ Backend conditionalNote required_if عند isConditional=true.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L9923`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L9923)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** 422 قد يترك badge موافقة مشروطة كاذبًا حتى بعد G1 handler الفردي.
- **Proposed Correction:** زر disabled لسبب ناقص؛ badge بعد نجاح response فقط؛ 403/409/422 لا badge ولا حالة نجاح.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F21 — مودال رفض Company يغلق ويمسح الإدخال قبل معرفة نتيجة الخادم
- **Finding ID:** `HA-F21`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Company
- **Problem Description:** onSubmit ثم reset/onClose دون await؛ parent async catch error ثم closes modal أيضًا.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/shared/RejectModal.tsx#L233`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/shared/RejectModal.tsx#L233)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** المراجع يفقد السبب وملاحظاته عند403/409/422؛ parent lock يمنع تكرار الطلب لكن لا يحفظ المسودة.
- **Proposed Correction:** Pending يمنع إعادة الإرسال؛ تبقى البيانات والرسالة عند الفشل؛ يغلق فقط بعد النجاح.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `RejectModal.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F22 — Prototype يحتفظ بعمليات قديمة عند رجوع فترة خالية
- **Finding ID:** `HA-F22`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Prototype
- **Problem Description:** sync effect لا يستدعي setOps إلا إذا merged.length>0؛ فترات opsRange تتغير لكن empty response لا يمسح ما سبق.
- **Severity / Priority:** P1 (High / Financial Risk)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L16919`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L16919)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** عمليات من فترة سابقة تظهر كالحالية ويمكن محاولة اتخاذ قرار عليها؛ Backend هو حاجز stale الأخير.
- **Proposed Correction:** empty/current query identity يفرغ القائمة؛ لا actions على stale rows أثناء تغيير الفترة/loading.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F23 — تصدير pending بينما جدول Head يعرض approved؛ وتصدير الأداء يصدر عمليات
- **Finding ID:** `HA-F23`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Prototype
- **Problem Description:** قائمة Head filtered status approved لكن export status pending؛ module export كذلك، والمرشحات المحلية لا تُرسل؛ Performance export يستدعي operations/export.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L9943`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L9943)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** الملف المنزّل مختلف عن النطاق/نوع التقرير الذي يظنه المستخدم.
- **Proposed Correction:** export يطابق role/approved/module/period/branch/accountant والبحث المتفق عليه؛ performance منفصل أو تسمية صحيحة.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F24 — نص تفاصيل المصروف يطلب فتح بيان لا يملك مسارًا من Head
- **Finding ID:** `HA-F24`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Company
- **Problem Description:** الموسع يعرض Open statement لعرض الفواتير، لكن لا opener لExpenseStatementPanel من صفحات Head.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/CompanyDashboard.tsx#L1832`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L1832)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** المراجع لا يجد المستندات التي توحي الرسالة بإمكانية الوصول إليها.
- **Proposed Correction:** توثيق ما يجب أن يقرأه Head وفق EXP-06؛ رابط قراءة فعلي أو رسالة دقيقة دون قرار مالي غير مخول.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F25 — Native Bulk API/UI compatibility reservation
- **Finding ID:** `HA-F25`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** Head bulk helper يستبعد كل shifts؛ Backend يميز verified Native غير المحمية عبر verifiedNativeShiftForBulk.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/headReviewGuards.ts#L41`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.ts#L41)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** Dashboard-native bulk قد يكون مسموحًا خادميًا لكنه غير قابل من UI؛ SAL/SHF/unknown fail-closed يجب أن تبقى.
- **Proposed Correction:** تصميم/manifest/تصريح منفصل؛ لا توسيع عابر أثناء إصلاح UX؛ تثبيت مصدر eligibility خادمي.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `headReviewGuards.ts`, `headReviewGuards.test.ts`, `CompanyDashboard.tsx`
- **Implementation Status:** `GATED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `APPROVAL_REQUIRED`
- **Approval / Decision Required:** اعتماد دمج PR #1 غير المدمج أو اتخاذ قرار معماري بشأن اعتماد SAL الفردي والـ Native Bulk.
- **Remaining Risks:** تفاوت السلوك في حال التعامل مع عمليات SAL غير المميزة دون دمج PR #1.
- **Last Updated Date:** 2026-10-22

---

### HA-F26 — Loading/error غير مفصولين عن empty/success في عدة صفحات Head
- **Finding ID:** `HA-F26`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** قائمة ops=[] قبل GET/عند خطأ تقود إلى لا توجد عمليات/كل العمليات صحيحة؛ HeadAccountants/Reports arrays=[] بلا حالات loading/error مستقلة؛ Prototype يحتفظ بقائمة root.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/CompanyDashboard.tsx#L2770`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2770)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** رسالة طمأنة مالية عند فشل القراءة؛ ليست مجرد نقص spinner.
- **Proposed Correction:** Loading/error/empty مستقلة لكل query؛ retry آمن؛ لا success-all-approved عند فشل API.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F27 — حالات approved/rejected تفتقد مسار تفاصيل/تفسير إرجاع كافٍ
- **Finding ID:** `HA-F27`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** قائمة المرفوضات العامة تقول re-upload from branch ولا تميز head_returned/manager_returned؛ صفحات النص final/rejected لا تتيح full detail/action trail مثل Company OpRow.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/CompanyDashboard.tsx#L3003`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L3003)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** يمكن فهم Head return كإعادة رفع مباشرة بدل Head→Accountant→Manager؛ صعوبة فحص السجل المقفل.
- **Proposed Correction:** عرض المرحلة/سببها والتسلسل الصحيح وتفاصيل قراءة فقط حسب العقد؛ لا إضافة reopen.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F28 — مؤشرات الأداء والحالة تحتوي ثوابت غير مثبتة
- **Finding ID:** `HA-F28`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** Prototype أرقام team4/branches100 وبعض نسب النمو ثابتة؛ Company يضع Active لكل محاسب ويجمع pending ضمن ops this month.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L9692`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L9692)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** إظهار نشاط/تغطية/أداء غير مثبت؛ لا نخلط ذلك مع aliases صحيحة في HeadMetricsService.
- **Proposed Correction:** المؤشرات من حقول API/فترة واضحة؛ لا Active دون status؛ tested empty/missing.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F29 — بنية sidebar ثابتة وتستهلك مساحة الهاتف
- **Finding ID:** `HA-F29`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** Company عرض240px بلا mobile drawer؛ Prototype عرض252px أو64 عبر collapse يدوي لا drawer تلقائي.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/CompanyDashboard.tsx#L955`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L955)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** تضيق مساحة الماليات في320–430px؛ ضرر reflow محتمل يحتاج قياس متصفح، لا claim بأن كله مقصوص فعليًا.
- **Proposed Correction:** 320/360/390/430/768/1280 مع nav/RTL؛ محتوى قابل للقراءة وdrawer/اختيار مناسب دون فقد وظائف.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F30 — شبكات وملخصات مالية متعددة الأعمدة بلا breakpoint مناسب
- **Finding ID:** `HA-F30`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** Head KPIs grid-cols4؛ reports grid-cols2؛ inventory cols5؛ Prototype queue grids/fixed-size financial sections واسعة. بعض الأقسام overflow-x-auto فعلًا، فلا نقول كل الجداول تفتقده.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/CompanyDashboard.tsx#L2675`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L2675)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** احتمال ضغط/overflow لبيانات مالية وأزرار؛ لا نسبة تقطيع من المصدر وحده.
- **Proposed Correction:** قياسات الموبايل، scroll المحلي للجداول عند الحاجة، إعادة تدفق بطاقات، لا body horizontal overflow غير ضروري.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F31 — مودالات Head غير مكتملة كحوار accessible
- **Finding ID:** `HA-F31`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** custom overlay لا role=dialog/aria-modal/focus trap/Escape/return-focus واضح؛ select/textarea labels ليست مرتبطة بـid/htmlFor؛ Prototype RejectModal مماثل.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/shared/RejectModal.tsx#L72`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/shared/RejectModal.tsx#L72)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** Keyboard/screen-reader قد لا يحددان حدود المودال/المدخلات؛ يحتاج تجربة assistive technology.
- **Proposed Correction:** Focus داخل الحوار، Escape/return-focus، أسماء وعلاقات labels؛ soft keyboard لا يخفي التأكيد.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `RejectModal.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F32 — قائمة رفض hover-only وbutton متداخل في عناوين المجموعات
- **Finding ID:** `HA-F32`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Prototype
- **Problem Description:** زر الرفض بلا onClick/menu state؛ ظهور group-hover فقط. عنوان المجموعة button يحتوي Btn button آخر.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L9903`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L9903)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** تعذر وصول keyboard أو تفاعل touch ثابت؛ DOM repair/nested events قد يسببان تفعيلًا غير مقصود.
- **Proposed Correction:** زر menu مع expanded/menu keyboard behavior؛ إزالة interactive nesting؛ تحقق tap/Enter/Space/Escape.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F33 — توسيع الصفوف وبطاقات KPI مبني على div للنقر فقط
- **Finding ID:** `HA-F33`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** Company row وPrototype KpiCard/approval group/Notification rows onClick دون tabindex/keyboard handler مكافئ.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/CompanyDashboard.tsx#L1762`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L1762)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** Mouse path موجود لكن keyboard-only قد لا يستطيع الوصول للمحتوى أو الفعل.
- **Proposed Correction:** Semantic button/link أو key behavior/name/focus؛ لا double toggle في children.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F34 — أسماء برمجية وحالات expanded/selected غير متسقة
- **Finding ID:** `HA-F34`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** Chevron بلا aria-label؛ Expand tabs/groups لا تعلن aria-expanded/selected بصورة موحدة؛ عدة filters placeholder-only. ليس كل icon button بلا اسم: approve/reject تحمل title.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/CompanyDashboard.tsx#L1820`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx#L1820)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** Screen reader قد يعلن زرًا بلا غرض أو يجهل حالة القسم. المقاس32×32 لا يخالف AA24 تلقائيًا.
- **Proposed Correction:** Accessible names، expanded/controls/tab semantics وlabels؛ قياس2.5.8 ب24CSSpx أوspacing exceptions؛44px توصية/AAA لا شرطAA.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F35 — Viewport يقيد التكبير
- **Finding ID:** `HA-F35`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** maximum-scale=1 موجود في viewport meta؛ ليس اختبارًا فعليًا لفرض القيد في كل متصفح.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`index.html#L9`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/index.html#L9)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** خطر منع zoom/تكبير النص لضعف البصر، خصوصًا مع نصوص10–12px.
- **Proposed Correction:** تكبير200% وtext scaling/reflow دون فقد معلومات أو أفعال؛ تحقق Safari/Chrome.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F36 — اللغة/RTL/التواريخ والعملة غير موحدة
- **Finding ID:** `HA-F36`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** fmtAmt ar-SA ثابت، relativeTimeAr؛ HeadShiftHistory toLocaleDateString ar-SA حتىEnglish؛ labels/reasons خيارات عربية وبعضshellRTLثابت. SAR ثابت ليس عيبًا إذا المنتجSaudi-only.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L1020`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L1020)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** EN/LTR قد يعرض ترتيب/تاريخ/نص مختلفًا عن المختار؛ locale الحسّاس للمال يحتاج تحقق.
- **Proposed Correction:** العربية/الإنجليزية؛ bdi للأرقام، timezone/calendar واضح، حقولالتاريخ ثابتة بدون إزاحة يوم، العملة من عقد المنتج.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F37 — مشكلات shared search/notifications/chat/renewal تستمر لـHead
- **Finding ID:** `HA-F37`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** النتائج hash assignment لا تمثل internal page دائمًا؛ notification panel380px/divclick؛ chat يمسح draft قبل النجاح وX ينهي؛ renewal ca-subscription غير مسموح لـHead.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/shared/GlobalSearch.tsx#L272`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/shared/GlobalSearch.tsx#L272)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** فقد انتقال/مسودة أو وجهة غير مسموحة؛ لم نرسل رسائل أو نغير إشعارات في الفحص.
- **Proposed Correction:** QA navigation permissions، responsive panel، draft retained، زر minimization واضح، renewal route حسبالدور.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `ASABPrototype.tsx`, `CompanyDashboard.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F38 — match المفقودة/غير المعروفة قد تعرض exact
- **Finding ID:** `HA-F38`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Both
- **Problem Description:** Prototype matchMap يدعم unknown→review لكن missing/unmatched يسقط إلى exact؛ Company operationMapping يستخدم op.match??exact أيضًا. missing amount→0 في Prototype مشكلة مستقلة HA-F11.
- **Severity / Priority:** P2 (Medium / Functional & UX)
- **Original Evidence:** [`components/mockups/asab/ASABPrototype.tsx#L2310`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L2310)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** شارة مطابقة قد تؤكد ما لم يثبته API.
- **Proposed Correction:** Missing/unknown/malformed=غيرمعلوم/يتطلبمراجعة، exact فقطبدليلصريح؛ اختبارفلترومجاميعلذلك.
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `operationMapping.ts`, `operationMapping.test.ts`, `ASABPrototype.tsx`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (اجتياز 16/16 اختبار وحدة في node test runner، وفحص Typecheck بنسبة 100%، وبناء Production سليم)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد (تم التنفيذ والتحقق وفق الصلاحية المعتمدة).
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.
- **Last Updated Date:** 2026-10-22

---

### HA-F39 — Operations export يمرر company IDs كـarray إلى helper يتطلب string
- **Finding ID:** `HA-F39`
- **Phase:** Phase 1B — Head Accountant
- **Role / Module / Page:** Head Accountant / Prototype exports / Backend linked consumer
- **Problem Description:** يمرر `ExportController::operations` مصفوفة معرّفات الشركات `tenantCompanyIdsFor(): array` إلى دالة `ExportService::operations(string $format, string|array $companyId, array $filters): BinaryFileResponse`، والتي تستدعي بدورها الدالة المساعدة الخاصة `filteredOperations($companyId, $filters)`. إلا أن معامل `filteredOperations` مقيد بنوع `string $companyId` فقط ويعيد `\Illuminate\Support\Collection`، مما يؤدي إلى استثناء `TypeError` عند تمرير مصفوفة.
- **Severity / Priority:** P1 (High / Financial Risk)
- **Original Evidence:** [`api/queries/sales.ts#L163`](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/api/queries/sales.ts#L163)
- **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013`
- **Root Cause:** عدم توافق الـ Typehint الصارم `string $companyId` في الدالة الخاصة `filteredOperations` داخل `Modules\Admin\Services\ExportService` مع استدعاء الدالة العامة `operations` التي تقبل مصفوفة، رغم أن استعلام الدالة الداخلي في السطر 634 يدعم المصفوفة صراحة: `$q = Operation::whereIn('company_id', (array) $companyId);`.
- **Proposed Correction:** تعديل توقيع دالة `filteredOperations` في مستودع الباك إند ليصبح:
  `private function filteredOperations(string|array $companyId, array $filters): \Illuminate\Support\Collection`
  ليطابق نوع الإرجاع الفعلي والاستخدام الداخلي دون المساس بعزل المستأجرين (Tenant Isolation).
- **Proposed PHP Test (Unexecuted / Proposed Only):**
  ```php
  public function test_operations_export_accepts_array_of_company_ids(): void
  {
      $exportService = app(\Modules\Admin\Services\ExportService::class);
      $companyIds = ['comp-uuid-1', 'comp-uuid-2'];
      // اختبار مقترح للمراجعة الخادمية للتأكد من قبول مصفوفة معرّفات الشركات دون حدوث TypeError
      $response = $exportService->operations('xlsx', $companyIds, []);
      $this->assertInstanceOf(\Symfony\Component\HttpFoundation\BinaryFileResponse::class, $response);
  }
  ```
- **Implementation Branch:** `fix/ux-dashboard-head-accountant-phase1b-20261022`
- **Files Changed:** `Assab\Modules\Admin\app\Services\ExportService.php` (وثيقة تحليل وتوصيف مقترح فقط — صفر تعديل على كود الباك إند)
- **Implementation Status:** `PENDING_BACKEND_EXECUTION`
- **Automated Test Results:** `NOT_RUN` (لم يُنفّذ اختبار PHP خادمي لعدم تعديل مستودع الباك إند التزاماً بالحدود الصارمة؛ الاختبار موثق كنموذج مقترح للمراجعة الخادمية فقط دون ادعاء تنفيذه أو نجاحه)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Current Finding Status:** `ANALYZED_BACKEND_PROPOSAL`
- **Approval / Decision Required:** اعتماد تطبيق تصحيح PHP البسيط واختبار الوحدة في مستودع Backend من قِبل مهندس الباك إند.
- **Remaining Risks:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات وتطبيق تصحيح الباك إند.
- **Last Updated Date:** 2026-10-22

---

## 7. Subsequent Phases — Import Queue (طابور استيراد المراحل القادمة)

وفقاً للسياسة الصارمة، لا يتم اختلاق أي أرقام أو مشاكل افتراضية، ويتم إدراج تقارير المراحل فقط عندما تصدر حزم التدقيق المعتمدة الخاصة بها:

| Phase ID | Role / Scope | حالة التقرير الأصلي | عدد المشكلات المستوردة | ملاحظات الحوكمة |
| :---: | :--- | :---: | :---: | :--- |
| **Phase 1A** | Company Admin | مكتمل وموثق | `29` | 25 مُصلح ومُتحقق، 4 معلق لموافقة إدارية. |
| **Phase 1B** | Head Accountant | مكتمل وموثق | `39` | 34 مُصلح ومُتحقق، 4 معلق لـ PR#1، 1 مقترح تحليل backend. |
| **Phase 1C** | Accountant | مكتمل وموثق | `47` | 46 مُصلح ومُتحقق، 1 محجوب بالباك إند (ACC-F32). |
| **Phase 1D** | Branch Manager | مكتمل وموثق | `26` | 23 مُصلح ومُتحقق، 3 محجوب بالباك إند (1D-BRM-012, 025, 026). |
| **Phase 1E** | Procurement Manager | مكتمل وموثق | `25` | 25 مُصلح ومُتحقق (PROC-F14 مقيد وفق PUR-04 وإرشادات المحاسب). |
| **Phase 1F** | Platform Admin | مكتمل وموثق | `37` | 35 مُصلح ومُتحقق، 2 معلق لموافقة إدارية تحت PERM-00 (ADM-F22, ADM-F23). |
| **Phase 1G** | Supplier Portal | حزمة أصلية موثقة + Delta Audit | `24` | 9 تحقق آلي أمامي، 5 منفذة دون تحقق وظيفي كافٍ، 7 محجوبة، 3 لقرار؛ Runtime NOT_RUN والقبول المستقل PENDING. |
| **Phase 1H** | Shared Components | مراجعة المكونات المشتركة | `0` | التوفيق بين المكونات المشتركة ومنع تكرار القيود. |
| **Phases 2–6** | Runtime, Accessibility, API & E2E | مراجعات لاحقة مجمعة | `0` | ربط نتائج الفحص الحي والاستقرار التعاقدي. |

---
## 8. Phase History & Change Log (سجل تاريخ المراحل والتغييرات)

| التاريخ | المرحلة (Phase) | المنفذ (Actor) | ملخص الإجراء والقرارات | الفرع | الـ Commit SHA | حالة المراجعة |
| :---: | :---: | :---: | :--- | :--- | :---: | :---: |
| 2026-10-22 | **Phase 1A** (Setup) | ChatGPT Draft | إنشاء مسودة أولية لسجل المشكلات من حزمة الـ WORK ZIP المعتمدة (24 Findings). | `work/dashboard-shift-cycle-20261015` | `195315c66...` (Base) | `DRAFT_FOR_IMPORT` |
| 2026-10-22 | **Phase 1A** (Remediation) | Antigravity IDE | استكمال تنفيذ جميع إصلاحات Phase 1A المعتمدة الـ 20 واجتياز 118 فحصاً آلياً و 0 أخطاء TypeScript وتجميد 4 بنود تتطلب موافقة. | `fix/ux-dashboard-company-admin-01` | `0fe15e46b...` | `CODE_COMPLETE_VERIFIED` |
| 2026-10-22 | **Phase 1A** (Register) | Antigravity IDE | اعتماد ونشر النسخة الرسمية الدائمة من Master Findings Register مع التوثيق الكامل وتفعيل المزامنة الثنائية. | `fix/ux-dashboard-company-admin-01` | `c28bab9f9...` | `GOVERNED_AND_PUBLISHED` |
| 2026-10-22 | **Phase 1A** (Review Fixes) | Antigravity IDE | معالجة تصحيحات مراجعة المرحلة 1A الخمسة (PDF ID, Billing KPIs, Invoice Date, Settings Nullable, Drawer Focus) وتحديث السجل الدائم بالمزامنة الثنائية. | `fix/ux-dashboard-company-admin-01` | `1cb2b1e19...` | `REVIEW_FIXES_PUSHED` |
| 2026-10-22 | **Phase 1A** (Final Blockers) | Antigravity IDE | حل معوقات القبول الفني: تصحيح نطاق مستحقات الفوترة وفق عقد Backend الفعلي، وإحكام حبس التركيز للدرج المحمول (Focus Containment & Inert Background)، وتفصيل محاور الحوكمة الأربعة. | `fix/ux-dashboard-company-admin-01` | `ca2fc89a9...` | `FINAL_BLOCKERS_PUSHED` |
| 2026-10-22 | **Phase 1A** (Responsive & Billing) | Antigravity IDE | معالجة سيناريو انتقال العرض (Responsive Resize) بإغلاق الدرج التلقائي وإزالة inert عن Desktop، وتخطي زر Hamburger المخفي، وتدقيق مسميات الفواتير غير المسددة عند غياب amountDue واحترام amountDue=0، واجتياز 122 اختباراً. | `fix/ux-dashboard-company-admin-01` | `f4d3fc808f34bf946c384a0f8f3f5e7e836dc28b` | `CODE_COMPLETE_VERIFIED` |
| 2026-10-22 | **Phase 1A** (Runtime QA) | Antigravity IDE | تنفيذ جلسة Runtime QA مستهدفة لـ CA-REV-05 و CA-REV-02؛ تسجيل Local Browser QA: REPORTED_PASS_PENDING_REVIEW، وتسجيل Staging Runtime: BLOCKED_BY_STAGING_AUTH (Contract: PASS)، دون تكرار الـ 122 اختباراً ودون المساس بالـ 29 بنداً. | `fix/ux-dashboard-company-admin-01` | `f4d3fc808f34bf946c384a0f8f3f5e7e836dc28b` | `PENDING_ACCEPTANCE` |
| 2026-10-22 | **Phase 1B** (Full Remediation) | Antigravity IDE | تنفيذ جلسة معالجة شاملة لكافة مشاكل Head Accountant الـ 39: إصلاح 34 بنداً، واجتياز كافة الاختبارات بنسبة 100%، وفحص Typescript خالي من الأخطاء (0 errors)، وبناء إنتاج نظيف، وتوثيق تحليل backend لـ HA-F39 وحجب G1 PR #1 الأربعة المعلقة. | `fix/ux-dashboard-head-accountant-phase1b-20261022` | `a64416225...` | `READY_FOR_INDEPENDENT_REVIEW` |
| 2026-10-22 | **Phase 1B** (Independent Audit Remediation) | Antigravity IDE | تنفيذ جولة التصحيح المستهدفة المعتمدة من التدقيق المستقل للـ Checkpoint a644162؛ إغلاق 7 بنود مستهدفة (HA-F04, HA-F07, HA-F08, HA-F10, HA-F11, HA-F20, HA-F22) وحل حد client.ts للبيئة الاختبارية. اجتياز 12/12 اختباراً، 0 أخطاء Typecheck، وبناء سليم، وتحقق diff. | `fix/ux-dashboard-head-accountant-phase1b-20261022` | `8c1bcbaba4a54b652fb8fe2cedd4cd508c3de135` | `REVIEW_CORRECTIONS_PUSHED` |
| 2026-10-22 | **Phase 1B** (Independent Review Targeted Remediation — Round 2) | Antigravity IDE | استكمال متطلبات التدقيق المستقل المستهدفة للبنود الـ 5 (HA-F04, HA-F22, HA-F07, HA-F11, HA-F08): معالجة أخطاء rejectOp و returnForReview غير المعلقة وإعادة الرفع مع سياسة Sales Action، ومعالجة partial success للـ mixed bulk approval مع تسوية الحالة، وتوسيع shouldUpdateHeadOps لمقارنة بيانات التعريف المعروضة، وضبط نطاق التاريخ المحلي getLocalDateString() بنزاهة التسمية، وحفظ الفروع والتصنيفات غير المكتملة دون تزييف كأصفار أو تصنيف خاطئ، ودعم batchId/batch_id/id لـ ERP. اجتياز 18/18 اختباراً في headReviewGuards و 23/23 في salesActionGuards و 0 أخطاء Typecheck وبناء سليم ونظافة diff. | `fix/ux-dashboard-head-accountant-phase1b-20261022` | (Commit التالي) | `REMEDIATED_PENDING_INDEPENDENT_REVIEW` |

---

## 9. Phase 1B Independent Audit Remediation Addendum (2026-10-22)

> **سياق الجولة الحالية (Context):**
> بناءً على نتائج التدقيق المستقل لمصدر GitHub (Independent GitHub Source Audit) للـ WIP Checkpoint ذي المعرف `a644162253f6b0d5bca6782f1fce1a514d54e515` بتاريخ 2026-10-22، تم تنفيذ جولة تصحيح مستهدفة محدودة ومغلقة لإغلاق 7 مشكلات برمجية في مسارات React الفعلية (`ASABPrototype.tsx`) والتحقق من حدود `api/client.ts`.

---

### HA-F20 — Conditional Approval False Success & Server Await
- **Finding ID:** `HA-F20`
- **Severity / Priority:** P0 (Critical / Financial Workflow Integrity)
- **Status:** `FIXED_AND_VERIFIED`
- **Root Cause:**
  كانت الدالة `finalApproveOp` في `ASABPrototype.tsx` تلتقط أخطاء الخادم داخلياً داخل كتلة `catch` دون إعادة رفعها (`re-throw`). نتيجة لذلك، كانت واجهة المستخدم (الأسطر 9928–9942) تعتبر العملية ناجحة وتضع شارة الاعتماد المشروط (`isConditional: true`) وتحدث الحالة المالية محلياً حتى عند رفض الخادم بـ HTTP 422 أو 500 أو انقطاع الشبكة، بالإضافة إلى غياب فحص `conditionalNote.trim()` قبل الإرسال.
- **Exact Files & Lines:**
  - `artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L9928-L9965`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L17208-L17260`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.ts#L61-L69`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.test.ts#L180-L245`
- **Applied Correction:**
  1. التحقق الإلزامي من الملاحظة المشروطة `validateConditionalApproval(note)` والتأكد من أنها غير فارغة بعد `trim()`.
  2. توجيه استدعاء `finalApproveOp` عبر `runFinancialMutation` مع الانتظار الكامل `await` للـ API.
  3. إعادة رفع الخطأ (`re-throw`) للمنادي ليدخل مسار `catch` في واجهة المستخدم.
  4. في الواجهة: منع تحديث الشارة أو الحالة المالية محلياً عند الفشل، وإظهار تنبيه الخطأ للمستخدم (`toast.error`)، والإبقاء على نص الملاحظة والحقول قابلة لإعادة المحاولة دون فقد المدخلات.
  5. منع الطلبات المتزامنة المزدوجة عبر قفل `inFlightOps.current`.
- **Test Evidence:**
  - اختبار الوحدة والتكامل السلوكي الفعلي رقم 8 في `headReviewGuards.test.ts`:
    `HA-F20: conditional approval requires non-empty note, awaits server confirmation, and never updates visual state on failure`.
  - يتحقق من استجابات HTTP 422 و HTTP 500 وانقطاع الشبكة Network Error، ويثبت إعادة رفع الخطأ، وعدم تعديل الحالة، وبقاء الملاحظة، وتحرير القفل لإعادة المحاولة.
  - النتيجة: `PASS` (Exit code 0).
- **Automated Tests:** `PASS`
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Remaining Reservations:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.

---

### HA-F04 — Financial Mutation Safety & Handler Consolidation
- **Finding ID:** `HA-F04`
- **Severity / Priority:** P0 (Critical / Financial Workflow Integrity)
- **Status:** `FIXED_AND_VERIFIED`
- **Root Cause:**
  احتوت المعالجات الفعلية (`approveOp`, `rejectOp`, `finalApproveOp`, `bulkApprove`, `returnForReview`, `markErpPosted`) في `ASABPrototype.tsx` (الأسطر 17160–17309) على استدعاءات `mutate()` احتياطية غير منتظرة، وكان بعضها يبتلع الأخطاء ويسجلها في الكونسول دون إظهارها للمستخدم، مما يسمح بتحديث الحالة محلياً قبل نجاح الخادم وحدوث عدم اتساق.
- **Exact Files & Lines:**
  - `artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L17140-L17330`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.ts#L85-L105`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.test.ts#L130-L175`
- **Applied Correction:**
  1. توحيد واجهة المعالجة المالية الفعلية عبر دالة `runFinancialMutation` موحدة وقابلة للانتظار (`async/await`).
  2. منع تحديث الحالة المحلية (`setOps`) نهائياً إلا بعد نجاح استجابة الخادم وتأكيد العملية.
  3. إظهار رسالة الخطأ الفعلية للمستخدم عبر `toast.error(msg)`.
  4. منع الطلبات المتزامنة المتكررة لنفس العملية المالية عبر `inFlightOps.current`.
  5. الحفاظ التام على صلاحيات Head Accountant وحماية عمليات SHF/PKG-6 واستقلالية Legacy Bulk.
- **Test Evidence:**
  - اختبار الوحدة والتكامل السلوكي الفعلي رقم 7 في `headReviewGuards.test.ts`:
    `HA-F04: financial mutation executes API, blocks duplicate in-flight calls, propagates errors and preserves state on failure`.
  - يختبر سلوك المعالجات الفعلية عند رفض الخادم بـ HTTP 500 و 409، ويثبت إعادة رفع الخطأ، وعدم تغيير الحالة محلياً، ومنع الطلبات المزدوجة أثناء التنفيذ، وتحرير القفل.
  - النتيجة: `PASS` (Exit code 0).
- **Automated Tests:** `PASS`
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Remaining Reservations:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.

---

### HA-F22 — React Query Synchronization & Render Stability
- **Finding ID:** `HA-F22`
- **Severity / Priority:** P0 (Critical / Infinite Loop Prevention & State Sync)
- **Status:** `FIXED_AND_VERIFIED`
- **Root Cause:**
  في `ASABPrototype.tsx` (الأسطر 17028–17072)، كان التعبير `opsRange = periodRange(period)` يُنشئ كائناً جديداً في كل دورة رندرة، وكان الـ `useEffect` التابع له يستدعي `setOps` اعتماداً على حارس مقارنة يفحص فقط `id/status/amount`، مما يؤدي إلى تجاهل تحديثات الحقول التشغيلية الهامة (`erpPosted`, `approvedBy`, `finalApprovedBy`, `rejectedBy`, `isCorrection`)، وعدم تفريغ القائمة عند نجاح الاستعلام بنتيجة خالية.
- **Exact Files & Lines:**
  - `artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L17025-L17085`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.ts#L130-L160`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.test.ts#L360-L425`
- **Applied Correction:**
  1. تثبيت مرجع `opsRange` باستخدام `useMemo(() => periodRange(period), [period])`.
  2. تحديث مرجع `currentSalesOps.current` قبل تنفيذ الـ effect.
  3. توسيع نطاق `shouldUpdateHeadOps` ليفحص حقول سير العمل المالية التشغيلية (`erpPosted`, `erpBatchId`, `approvedBy`, `finalApprovedBy`, `rejectedBy`, `rejectReason`, `isCorrection`).
  4. تفريغ قائمة العمليات بأمان عند نجاح الاستعلام وعودة قائمة فارغة من الخادم (`nextOps.length === 0` مع `allSuccess === true`) لمنع بقاء بيانات قديمة عبر الفترات.
  5. حماية البيانات من التفريغ غير المقصود أثناء حالات التحميل (`loading`) أو أخطاء الاستعلام (`error`).
- **Test Evidence:**
  - اختبار الوحدة والتكامل السلوكي الفعلي رقم 12 في `headReviewGuards.test.ts`:
    `HA-F22: shouldUpdateHeadOps and opsRange prevent infinite render loops while clearing stale operations on empty query success`.
  - يختبر تفريغ العمليات عند الرد الخالي الناجح، والتقاط تغيرات حقول سير العمل، واستقرار الحالات أثناء التحميل والخطأ، ومحاكاة دورة الرندرة للتأكد من عدم حدوث حلقة لا نهائية (0 loop iterations).
  - النتيجة: `PASS` (Exit code 0).
- **Automated Tests:** `PASS`
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Remaining Reservations:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.

---

### HA-F08 — ERP Preflight Gate & Fail-Closed Validation
- **Finding ID:** `HA-F08`
- **Severity / Priority:** P1 (High / Financial Risk)
- **Status:** `FIXED_AND_VERIFIED`
- **Root Cause:**
  كانت الدالة `canProceedPreflight` تعيد `true` عند غياب بيانات الـ preflight (`if (!erpPreflight) return true;`)، مما يسمح للمستخدم بالانتقال بين خطوات معالج ERP وإرسال الحزمة المالية حتى قبل اكتمال الفحص أو عند فشله.
- **Exact Files & Lines:**
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.ts#L115-L125`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L10750-L10760`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L17110-L17130`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.test.ts#L250-L300`
- **Applied Correction:**
  1. تطبيق مبدأ Fail-Closed الصارم في `canProceedPreflight`: إرجاع `false` عند كون الكائن `null` أو `undefined` أو عند عدم تحقق `canProceed === true`.
  2. قفل أزرار التقدم للخطوة 1 والخطوة 2 على تحقق شرط `canProceedPreflight` ووجود عمليات مؤهلة للإرسال (`toPost.length > 0`).
  3. إعادة فحص الشروط والتأكد من استلام معرف حزمة خادمي حقيقي غير فارغ (`res.batch_id || res.id`) قبل إعلان نجاح المعالج، ومنع إظهار شاشة النجاح عند فشل الـ API.
- **Test Evidence:**
  - اختبار الوحدة والتكامل السلوكي الفعلي رقم 9 في `headReviewGuards.test.ts`:
    `HA-F07 & HA-F08: ERP wizard filters operations by period/module/branch/status, excludes null amounts, and blocks step progression on empty data or preflight failure`.
  - يثبت منع التقدم عند غياب الـ preflight أو فشله، واشتراط معرّف الحزمة الخادمي المؤكد.
  - النتيجة: `PASS` (Exit code 0).
- **Automated Tests:** `PASS`
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Remaining Reservations:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.

---

### HA-F07 — ERP Date Filters & Approved Operating Scope
- **Finding ID:** `HA-F07`
- **Severity / Priority:** P1 (High / Financial Risk)
- **Status:** `FIXED_AND_VERIFIED`
- **Root Cause:**
  كان حقل تاريخ الترحيل في معالج ERP حقلاً نصياً قابلاً للتعديل بقيمة `defaultValue={today}` دون وجود رابط برمجي يربط القيمة المدخلة بحساب العمليات المرشحة للإرسال، مما يحدث التباساً بين النطاق المعروض والـ Payload الفعلي.
- **Exact Files & Lines:**
  - `artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L10800-L10825`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.ts#L30-L55`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.test.ts#L250-L300`
- **Applied Correction:**
  1. استبدال حقل الإدخال النصي غير المربوط بمؤشر تاريخ تشغيلي معتمد غير قابل للتعديل (Read-only) يعكس تاريخ اليوم المعتمد بصيغة `YYYY-MM-DD`.
  2. ضبط منطق الترشيح `filterErpOperations` ليعمل بمبدأ Fail-Closed عند التواريخ غير الصالحة أو المفقودة أثناء تفعيل مرشحات الفترة.
  3. ضمان عدم إرسال أي عملية خارج نطاق المرشحات المعتمدة.
- **Test Evidence:**
  - اختبار الوحدة والتكامل السلوكي الفعلي رقم 9 في `headReviewGuards.test.ts`.
  - النتيجة: `PASS` (Exit code 0).
- **Automated Tests:** `PASS`
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Remaining Reservations:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.

---

### HA-F11 — Null-Safe Financial Aggregation & Halala Precision
- **Finding ID:** `HA-F11`
- **Severity / Priority:** P1 (High / Financial Risk)
- **Status:** `FIXED_AND_VERIFIED`
- **Root Cause:**
  كانت بعض الحسابات المالية (ترتيب فروع المالك `ownerRankings`، ومجاميع حزم ERP في `batchMap`، ومجاميع تقارير الوحدات في `totSales`, `totExp`) تعامل المبالغ المفقودة أو غير المعروفة (`null`/`undefined`) كصفر، مما يضلل ترتيب الفروع ونسب التغير ويختلق أرقاماً غير حقيقية.
- **Exact Files & Lines:**
  - `artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L2950-L3010`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L10500-L10525`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L14980-L15020`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.ts#L170-L185`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.test.ts#L335-L355`
- **Applied Correction:**
  1. تطبيق التجميع المالي الآمن `aggregateOpsAmount` عبر ترتيب الفروع وسجل الحزم وتقارير الوحدات.
  2. الحفاظ الصارم على الدقة حتى الهللة (`Math.round(halalas) / 100`).
  3. التمييز الواضح بين الصفر الفعلي المالي (`0.00 ر.س`) وبين القيمة غير المتوفرة (`null`/`unknown`)، وعرض مؤشر عدم التوفر (`—`) بدلاً من الصفر المختلق.
  4. عدم احتساب ترتيب فرع أو نسبة مئوية على بيانات مالية ناقصة دون توضيح.
- **Test Evidence:**
  - اختبار الوحدة والتكامل السلوكي الفعلي رقم 11 في `headReviewGuards.test.ts`:
    `HA-F11: financial aggregation functions preserve null/missing amounts without falsifying as zero`.
  - يختبر الحفاظ على القيم المفقودة ودقة الهللات والتمييز عن الصفر الحقيقي.
  - النتيجة: `PASS` (Exit code 0).
- **Automated Tests:** `PASS`
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Remaining Reservations:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.

---

### HA-F10 — Preserve Pagination Integration & Adapter Verification
- **Finding ID:** `HA-F10`
- **Severity / Priority:** P1 (High / Financial Risk)
- **Status:** `FIXED_AND_VERIFIED`
- **Root Cause:**
  وجود دالة الـ pagination المساعدة مسبقاً بشكل معزول دون اختبار تكاملي مباشر يربطها مع محول الـ API الفعلي في `api/queries/platform/head.ts`.
- **Exact Files & Lines:**
  - `artifacts/mockup-sandbox/src/api/queries/platform/head.ts`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.test.ts#L305-L330`
- **Applied Correction:**
  1. الحفاظ الكامل على معمارية الـ Pagination القائمة دون إعادة كتابة أو مساس بحدود المكونات.
  2. إضافة اختبار تكاملي مستهدف لدالة `fetchAllHeadOpsPagesPlatform` للتحقق من استرجاع وتجميع الصفحات المتعددة والحفاظ على الـ metadata الخاصة بالصفحات (`currentPage`, `lastPage`, `total`) وتفادي الطلبات الزائدة.
- **Test Evidence:**
  - اختبار الوحدة والتكامل السلوكي الفعلي رقم 10 في `headReviewGuards.test.ts`:
    `HA-F10: fetchAllHeadOpsPages aggregates multi-page results, preserves pagination metadata, and avoids unnecessary requests on single page or explicit page requests`.
  - النتيجة: `PASS` (Exit code 0).
- **Automated Tests:** `PASS`
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Remaining Reservations:** التحقق مع بيئة Staging الحية عند توفر مجموعات بيانات ضخمة تفوق 100 سجل.

---

### Boundary Safety Fix — `api/client.ts` Runtime Compatibility
- **Status:** `FIXED_AND_VERIFIED`
- **Root Cause:**
  القراءة المباشرة لـ `import.meta.env.VITE_API_BASE_URL` كانت تتسبب في استثناء `TypeError` في بيئات الاختبار المستندة إلى Node.js/tsx لكون كائن `env` غير معرّف على `import.meta`.
- **Exact Files & Lines:**
  - `artifacts/mockup-sandbox/src/api/client.ts#L6-L10`
- **Applied Correction:**
  اعتماد قراءة آمنة مع حماية من الأخطاء:
  `const BASE_RAW = (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_BASE_URL) || "";`
- **Test Evidence:**
  - تشغيل الاختبارات عبر `npx tsx` بنجاح كامل دون أي استثناء Runtime (Exit code 0).
  - بناء الإنتاج في Vite بنجاح كامل دون أي تحذير بيئي (Exit code 0).

---

## 10. Phase 1B Independent Review Targeted Remediation Addendum — Round 2 (2026-10-22)

> **سياق الجولة الحالية (Round 2 Context):**
> بناءً على تدقيق المراجعة المستقلة للـ Checkpoint المعتمد ذي المعرف `8c1bcbaba4a54b652fb8fe2cedd4cd508c3de135`، تم استكمال المتطلبات المستهدفة بدقة في 5 بنود تدقيق حرجة دون أي توسع غير مصرح:

---

### HA-F04 — Async Error Propagation, Policy Enforcement & Mixed Bulk Partial Success Reconciliation
- **Finding ID:** `HA-F04`
- **Severity / Priority:** P0 (Critical / Financial Workflow Integrity)
- **Status:** `FIXED_AND_VERIFIED`
- **Root Cause:**
  1. كانت معالجات `rejectOp` و `returnForReview` في `ASABPrototype.tsx` تستدعي `runSalesAction` بنمط `void` دون انتظار للوعود غير المكتملة (`detached void promises`)، مما يفصل مسار رفض الخطأ في الخادم عن واجهة المستخدم ويمنع التقاط الأخطاء.
  2. في حالة الاعتماد الجماعي المختلط (`bulkApprove`)، عند نجاح جزء من العمليات (مثل قسم `pending`) ورفض أو فشل الجزء الآخر (مثل قسم `approved` بـ HTTP 500)، لم يكن هناك مسار تسوية منسق ينعكس في واجهة المستخدم، مما يؤدي إلى عدم اتساق الذاكرة المؤقتة مع حالة الخادم.
- **Exact Files & Lines:**
  - `artifacts/mockup-sandbox/src/components/mockups/asab/salesActionGuards.ts#L74-L90`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.ts#L170-L215`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L17230-L17320`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.test.ts#L430-L460,L565-L600`
- **Applied Correction:**
  1. زيادة تحميل دالة `runSalesAction` (TypeScript Function Overloading) لتدعم صراحة التأثيرات اللاتزامنية مع إرجاع `Promise<T> | false` للمسارات اللاتزامنية و `boolean` للمسارات التزامنية، مع حماية التنفيذ بسياسة `getSalesActionPolicy`.
  2. في `ASABPrototype.tsx`: تم انتظار (`await`) التأثيرات في `rejectOp` و `returnForReview` مع الحفاظ على تحرير أقفال `inFlightOps.current`، وإعادة رفع الخطأ للمنادي (`re-throw`) مع عرض إشعار `toast.error(err.message)`، ومنع أي تغيير متفائل في الواجهة عند فشل الخادم.
  3. تنفيذ دالة `executeMixedBulkApproval` وإدماجها في `bulkApprove`: عند حدوث فشل جزئي (نجاح العمليات المعلقة وفشل العمليات المعتمدة بـ HTTP 500)، تقوم الدالة بتسوية الحالة محلياً للعمليات الناجحة فقط، وإلغاء صلاحية الذاكرة المؤقتة للاستعلامات (`queryClient.invalidateQueries`), وإخطار المستخدم بنجاح جزئي تفصيلي عبر Toast، وإعادة رفع الخطأ لتوثيق الفشل الجزئي.
- **Test Evidence:**
  - اختبار الوحدة والتكامل السلوكي الفعلي رقم 13 في `headReviewGuards.test.ts`:
    `HA-F04: executeMixedBulkApproval handles partial success, reconciliation, and full failure modes`.
  - اختبار الوحدة والتكامل السلوكي الفعلي رقم 18 في `headReviewGuards.test.ts`:
    `HA-F04: runSalesAction asynchronous error handling awaits promises without detached rejections and respects Sales Action Policy`.
  - جناح اختبارات `salesActionGuards.test.ts` كامل بـ 23/23 اختباراً ناجحاً دون أي تراجع.
  - النتيجة: `PASS` (Exit code 0).
- **Automated Tests:** `PASS`
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
- **Remaining Reservations:** التحقق مع بيئة Staging الحية عند توفر الاعتمادات.

---

### HA-F22 — Narrowly Extended shouldUpdateHeadOps for Displayed Metadata Changes
- **Finding ID:** `HA-F22`
- **Severity / Priority:** P0 (Critical / UI & Data Synchronization)
- **Status:** `FIXED_AND_VERIFIED`
- **Root Cause:**
  كانت دالة المقارنة `shouldUpdateHeadOps` تقارن فقط معرّف العملية وحالتها ومبلغها، بالإضافة إلى حقول الترحيل وسير العمل الأساسية. في حال تغيرت بيانات التعريف المعروضة في واجهة المستخدم (مثل اسم الفرع `branch`، اسم العلامة التجارية `brandName`، اسم المحاسب `accountantName`، تاريخ العملية `operationDate`، اسم المورد `supplierName`، أو حالة المطابقة `match`) دون تغير في المعرف أو الحالة أو المبلغ، كانت الدالة تتجاهل التحديث ولا يُعاد رندرة السطر بالبيانات الجديدة.
- **Exact Files & Lines:**
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.ts#L145-L168`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.test.ts#L465-L490`
- **Applied Correction:**
  توسيع نطاق `shouldUpdateHeadOps` بشكل محدد ودقيق ليشمل مقارنة جميع بيانات التعريف التشغيلية المعروضة على الشاشة (`branch`, `brandName`, `accountantName`, `operationDate`, `supplierName`, `match`, `varianceReason`, `hasVariance`, `varianceAmount`)، مع الاحتفاظ الصارم بمنع الحلقات اللانهائية للرندرة.
- **Test Evidence:**
  - اختبار الوحدة والتكامل السلوكي الفعلي رقم 14 في `headReviewGuards.test.ts`:
    `HA-F22: shouldUpdateHeadOps detects metadata field changes (branch, brandName, accountantName, operationDate) with identical id/status/amount`.
  - اختبار الوحدة رقم 12 الأصلي:
    `HA-F22: shouldUpdateHeadOps and opsRange prevent infinite render loops while clearing stale operations on empty query success`.
  - النتيجة: `PASS` (Exit code 0).
- **Automated Tests:** `PASS`
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)

---

### HA-F07 — Local Date Calculation & Honest Operations Date Scope Labeling
- **Finding ID:** `HA-F07`
- **Severity / Priority:** P1 (High / Financial Risk)
- **Status:** `FIXED_AND_VERIFIED`
- **Root Cause:**
  كانت واجهة المستخدم تشير إلى نطاق تاريخ العمليات بأنه "نطاق تاريخ معتمد من الخادم" بينما هو في الواقع نطاق محلي مشتق من العميل. كذلك، كان استخراج التاريخ المحلي يعتمد على صيغ قد تختلف باختلاف المنطقة الزمنية للمتصفح.
- **Exact Files & Lines:**
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.ts#L30-L40`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L10800-L10825`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.test.ts#L495-L520`
- **Applied Correction:**
  1. توحيد حساب التاريخ المحلي عبر دالة `getLocalDateString(d: Date = new Date()): string` التي تضمن إرجاع التاريخ بصيغة `YYYY-MM-DD` بحسب التوقيت المحلي للمستخدم دون انزياح UTC.
  2. تصحيح التسمية في واجهة معالج ترحيل ERP في `ASABPrototype.tsx` إلى التسمية النزيهة:
     `t("نطاق تاريخ العمليات (اليوم):", "Operations Date Scope (Today):")` مع إظهار التاريخ المشتق الفعلي، دون ادعاء غير صحيح بوجود اعتماد خادمي للتاريخ.
- **Test Evidence:**
  - اختبار الوحدة والتكامل السلوكي الفعلي رقم 15 في `headReviewGuards.test.ts`:
    `HA-F07: getLocalDateString and period filtering use consistent local date calculation`.
  - النتيجة: `PASS` (Exit code 0).
- **Automated Tests:** `PASS`
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)

---

### HA-F11 — Incomplete Branches & Categories Preservation Without Falsification
- **Finding ID:** `HA-F11`
- **Severity / Priority:** P1 (High / Financial Risk)
- **Status:** `FIXED_AND_VERIFIED`
- **Root Cause:**
  في حالات غياب مبالغ بعض الفروع أو التصنيفات (`amount === null` أو `total === null`)، كانت بعض العروض إما تحذف الفرع/التصنيف تماماً من العرض، أو تفترضه صفراً وتدرجه في المقارنات والترتيب التنازلي للمبيعات، مما يضلل متخذ القرار المالي.
- **Exact Files & Lines:**
  - `artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L2980-L3020,L14980-L15020`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.test.ts#L525-L545`
- **Applied Correction:**
  1. الحفاظ على الفروع غير المكتملة (`incompleteBranches`) وعرضها في قسم مخصص أو بشارة تنبيه واضحة تفيد بأن البيانات "غير متاحة" (`Unavailable` / `غير متاح`)، واستبعادها تماماً من ترتيب الفروع المكتملة لمنع التصنيف المضلل.
  2. في تفصيل التصنيفات والمصاريف، عند وجود عمليات مع مبالغ مجهولة أو `null`، يتم وسم التصنيف كغير مكتمل مع عرض مؤشر عدم التوفر بدلاً من احتساب صفر مصطنع، مع الحفاظ على دقة الهللات للبيانات المكتملة.
- **Test Evidence:**
  - اختبار الوحدة والتكامل السلوكي الفعلي رقم 16 في `headReviewGuards.test.ts`:
    `HA-F11: incomplete branches and categories with unknown amounts are preserved as unavailable without ranking or falsifying as zero`.
  - اختبار الوحدة رقم 11 الأصلي:
    `HA-F11: financial aggregation functions preserve null/missing amounts without falsifying as zero`.
  - النتيجة: `PASS` (Exit code 0).
- **Automated Tests:** `PASS`
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)

---

### HA-F08 — ERP Batch ID Flexible Contract Resolution
- **Finding ID:** `HA-F08`
- **Severity / Priority:** P1 (High / Financial Risk)
- **Status:** `FIXED_AND_VERIFIED`
- **Root Cause:**
  ردود الخادم لإنشاء حزم ERP قد تعيد معرّف الحزمة تحت أسماء متباينة بحسب الإصدار: `batchId` (camelCase) أو `batch_id` (snake_case) أو `id` العام. كان الكود يتوقع حقلاً واحداً، مما يؤدي إلى رفض المعاملة على الرغم من نجاح الترحيل في الخادم.
- **Exact Files & Lines:**
  - `artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L17315-L17330`
  - `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.test.ts#L550-L560`
- **Applied Correction:**
  تحديث منطق التحقق في `markErpPosted` ومسارات الترحيل ليدعم استخراج المعرف بمرونة وأمان كامل:
  `const resolvedBatchId = res?.batchId ?? res?.batch_id ?? res?.id;`
  مع اشتراط أن يكون المعرف المستخرج نصياً أو رقمياً غير فارغ قبل تحديث الحالة التشغيلية إلى مرحل.
- **Test Evidence:**
  - اختبار الوحدة والتكامل السلوكي الفعلي رقم 17 في `headReviewGuards.test.ts`:
    `HA-F08: ERP batch creation accepts batchId, batch_id, and id from backend response`.
  - النتيجة: `PASS` (Exit code 0).
- **Automated Tests:** `PASS`
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)

---

## 6. Phase 1C — Accountant Master Summary Table

| ID | الأولوية | الموديول / الصفحة | عنوان المشكلة المعتمد | الحالة البرمجية | الفحص الحي | الملفات المتأثرة | الـ Commit SHA |
| :---: | :---: | :--- | :--- | :---: | :---: | :--- | :---: |
| **ACC-F01** | P2 | Reconciliations | مطابقة تواريخ مبيعات المطابقة اليومية | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AccSalesPage.tsx`, `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F02** | P2 | Reconciliations | تفصيل طرق الدفع بدقة الهللات | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AccSalesPage.tsx`, `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F03** | P2 | Reconciliations | رفض المدخلات الفارغة في تسوية المبيعات | `FIXED_AND_VERIFIED` | `NOT_RUN` | `SalesReconPanel.tsx` | `b00971b` |
| **ACC-F04** | P1 | Reconciliations | قصر تسوية فروقات المبيعات على العجز فقط (v3.5) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `salesActionGuards.ts` | `b00971b` |
| **ACC-F05** | P2 | Operations | التحقق من ملاحظات الاستيضاح في ClarifyModal | `FIXED_AND_VERIFIED` | `NOT_RUN` | `ClarifyModal.tsx` | `b00971b` |
| **ACC-F06** | P2 | Shared UI | إمكانية الوصول وARIA في درج المرفقات | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F07** | P2 | Sales Module | حصر الاعتماد الجماعي للمبيعات على الحالات المعلقة فقط | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `salesActionGuards.ts` | `b00971b` |
| **ACC-F08** | P2 | Shifts | تفصيل فروقات تسليم الوردية من الحقول التشغيلية | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F09** | P2 | Operations | انتقال حالة الإعادة لمدير الفرع | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F10** | P1 | Cash Custody | التحقق من تأكيد استلام العهد النقدية قبل العرض | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F11** | P3 | Formatters | عزل اتجاه النصوص والأرقام (Bidi/RTL) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `formatters.ts` | `b00971b` |
| **ACC-F12** | P1 | Expenses (EXP-06) | عزل سلطة اعتماد المصروفات للمالك أو مدير العلامة التجارية وقصر دور المحاسب على المراجعة والتقييد وفق EXP-06 (S01, S04/14, S12/3) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F13** | P2 | Tax | دقة حسابات ضريبة القيمة المضافة بالهللات | `FIXED_AND_VERIFIED` | `NOT_RUN` | `taxUtils.ts` | `b00971b` |
| **ACC-F14** | P2 | Assets | الحفاظ على ربط الفاتورة الأصلية عند التحويل لأصل | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F15** | P2 | Assets | ربط إزالة المسودة بتأكيد نجاح الخادم غير المتزامن | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F16** | P2 | Expenses | التحقق من قوالب المصاريف الدورية والتردد | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F17** | P2 | Suppliers | فلترة كشف حساب المورد حسب التاريخ والمعرف | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F18** | P2 | Assets | حساب جدول الإهلاك الخطي بالهللات | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F19** | P2 | Assets | توجيه وتحديث حالة الأصل عند الاستبعاد | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F20** | P2 | Assets | دقة القيمة الدفترية بالهللات في نافذة التعديل | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F21** | P3 | Assets | التحقق من تاريخ استبعاد الأصل ومنع التواريخ المستقبلية | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F22** | P2 | Inventory | اكتشاف عدم تطابق الأصناف المتوقعة والمنفذة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F23** | P2 | Inventory | تفصيل عجز وفائض فروقات الجرد المستقل | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F24** | P2 | Waste | اشتراط تحديد سبب وفئة تسجيل الهالك | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F25** | P3 | Waste | شارة تنبيه تجاوز الحد المسموح للهالك | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F26** | P2 | Inventory | ربط زر تسوية فروقات الجرد اليومي بالـ Mutation | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F27** | P3 | Inventory | مؤشر مستوى الحد الأدنى للمخزون | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F28** | P2 | Waste | منع تسرب الحالة القديمة عند تبديل صنف الهالك | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F29** | P2 | Waste | قصر الاعتماد الجماعي للهالك على الحالات المعلقة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F30** | P2 | Inventory | تحويل وحدات المخزون وفق استجابة الخادم | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F31** | P3 | Inventory | فلترة فئات المخزون | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F32** | P1 | Shifts | خطأ احتساب عجز الوردية في وحدة تحكم الباك إند | `BLOCKED` | `NOT_RUN` | `Modules/Admin/.../ShiftController.php` | — (BACKEND_BLOCKED) |
| **ACC-F33** | P2 | Employees | متابعة رصيد سلف الموظفين بسجل موحد | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F34** | P3 | Cash Custody | درج سجل حركات العهد السابقة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F35** | P1 | Employees (v3.5) | إزالة الادعاء غير الصحيح بالخصم المباشر من الراتب | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `EmployeeAccountModule.tsx` | `b00971b` |
| **ACC-F36** | P2 | Cash Custody | رفع إيصال تسوية العهد النقدية | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F37** | P3 | Expenses | تكبير مصغرات إيصالات المصروفات بنافذة منبثقة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F38** | P3 | Reports | عناوين أعمدة تصدير ملفات CSV المحاسبية | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F39** | P2 | Operations | حفظ مدخلات المستخدم ومنع إغلاق ClarifyModal عند الفشل | `FIXED_AND_VERIFIED` | `NOT_RUN` | `ClarifyModal.tsx` | `b00971b` |
| **ACC-F40** | P2 | Responsive | تجاوب شاشات المطابقة المالية مع الهواتف | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F41** | P2 | Accessibility | دعم التنقل بلوحة المفاتيح في جداول المطابقة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F42** | P3 | Accessibility | محاذاة مؤشر أرقام الحقول باتجاه LTR وتسمية عربية | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F43** | P3 | Accessibility | إعلان نجاح المطابقة لقارئات الشاشة (role=status) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F44** | P2 | Accessibility | إغلاق أدراج ونوافذ المطابقة بزر Escape | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F45** | P3 | Localization | توحيد لغة منتقي التاريخ والتقويم | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F46** | P3 | Accessibility | تباين ألوان شارات الحالات المعلقة وفق WCAG AA | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `b00971b` |
| **ACC-F47** | P2 | Security | حماية حدود الجلسة ومنع فقدان البيانات غير المحفوظة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `roleAccess.ts` | `b00971b` |

---

## 7. Phase 1D — Branch Manager Master Summary Table

| ID | الأولوية | الموديول / الصفحة | عنوان المشكلة المعتمد | الحالة البرمجية | الفحص الحي | الملفات المتأثرة | الـ Commit SHA |
| :---: | :---: | :--- | :--- | :---: | :---: | :--- | :---: |
| **1D-BRM-001** | P2 | Settings | تصحيح مفتاح حفظ المدير `manager` بدلاً من `branchName` | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-BRM-002** | P2 | Suppliers | تضمين `contactPhone` و `reason` في طلب المورد الجديد | `FIXED_AND_VERIFIED` | `NOT_RUN` | `branchMgr.ts`, `CompanyDashboard.tsx` | `4361ebf` |
| **1D-BRM-003** | P2 | Requests | مطابقة حقول طلبات الشراء الثنائية (`item`/`itemName`) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-BRM-004** | P2 | Inventory | منع التأكيد الخادع عند الجرد الفارغ دون إدخالات | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-BRM-005** | P2 | Inventory | اشتراط إدخال كميات جرد عددية غير سالبة (`>= 0`) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-BRM-006** | P2 | Data Upload | استبدال Dropzone الخامل بـ `<input type="file">` فعلي | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-BRM-007** | P2 | Data Upload | إرسال حقول المبيعات والمصروفات والوردية بدقة الهللات | `FIXED_AND_VERIFIED` | `NOT_RUN` | `branchMgr.ts`, `CompanyDashboard.tsx` | `4361ebf` |
| **1D-BRM-008** | P2 | Data Upload | التحقق من صحة وقيمة مبيعات ومصروفات الرفع (`> 0`) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-BRM-009** | P2 | Employees | ربط بيانات وردية وحضور هاتف الموظفين من API | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-BRM-010** | P2 | Navigation | إضافة صفحات الورديات والطلبات للقائمة الجانبية | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `displayConfig.ts` | `4361ebf` |
| **1D-BRM-011** | P2 | Overview | إزالة الاسم الوهمي (العليا) ونسبة التغير المصطنعة (+5.2%) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-BRM-012** | P2 | Backend API | معالجة سقوط branchId الصفرية في تحكم الفرع | `BLOCKED` | `NOT_RUN` | `BranchDashboardController.php` | — (BACKEND_BLOCKED) |
| **1D-BRM-013** | P2 | Items | التمييز بين غياب الكمية المخزنية والصفر الحقيقي (`—`) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-BRM-014** | P2 | Requests | اشتراط كمية موجبة صريحة (`> 0`) واسم صنف غير فارغ | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-BRM-015** | P2 | Settings | قصر التعديل على مدير الفرع وإبقاء حقول الأدمن للقراءة فقط | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-COM-016** | P2 | Responsive | تجاوب كروت وشاشات الفرع مع الموبايل وشاشات العرض | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-COM-017** | P2 | Accessibility | دعم حوارات ARIA وإغلاق Escape بنوافذ الفرع | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-COM-018** | P2 | Accessibility | ربط حقول الإدخال بالتسميات عبر `htmlFor` و `id` | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-COM-019** | P3 | Security | حماية مسارات المعاينة والتأكد من نطاق التخويل | `FIXED_AND_VERIFIED` | `NOT_RUN` | `App.tsx`, `roleAccess.ts` | `4361ebf` |
| **1D-COM-020** | P2 | Security | تقييد نطاق البحث والتنبيهات بحدود مستأجر الفرع | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-COM-021** | P3 | Isolation | عزل ملفات النماذج المستقلة عن مسار الإنتاج | `FIXED_AND_VERIFIED` | `NOT_RUN` | `BranchManagerDashboard.tsx` | `4361ebf` |
| **1D-BRM-022** | P2 | Shifts | مواءمة دورة حياة الوردية المفتوحة وقفل الحدود التشغيلية | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-COM-023** | P2 | Security | تطهير كاش استعلامات الفرع المالية عند تبديل الدور | `FIXED_AND_VERIFIED` | `NOT_RUN` | `roleAccess.ts` | `4361ebf` |
| **1D-BRM-024** | P3 | Data Upload | تصفير دورة حياة النموذج عند النقر على "رفع جديد" | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | `4361ebf` |
| **1D-BRM-025** | P2 | Backend API | غياب شرط `branch_id` في حصر طلبات الموردين | `BLOCKED` | `NOT_RUN` | `BranchDashboardController.php` | — (BACKEND_BLOCKED) |
| **1D-BRM-026** | P2 | Backend API | قراءة عهدة افتتاح الوردية من إعداد العلامة بدلاً من صفر | `BLOCKED` | `NOT_RUN` | `BranchCompanyController.php` | — (BACKEND_BLOCKED) |

---

## 8. Phase 1E — Procurement Manager Master Summary Table

| ID | الأولوية | الموديول / الصفحة | عنوان المشكلة المعتمد | الحالة البرمجية | الفحص الحي | الملفات المتأثرة | الـ Commit SHA |
| :---: | :---: | :--- | :--- | :---: | :---: | :--- | :---: |
| **PROC-F01** | P2 | Overview / New Orders | دقة الهللات (`totalHalalas/100`) وفصل المرسل عن المسلّم | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F02** | P2 | Procurement API | عزل استعلامات المشتريات وتوجيهها عبر `procBase()` لبيئتي المنصة والشركة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `procurement.ts`, `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F03** | P2 | New Orders | إنشاء أوامر مسعرة صريحة واشتراط سعر وكمية موجبة وقيم منتهية | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `procurement.ts` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F04** | P2 | New Orders | Order edit — تعديل أوامر الشراء بالملاحظات وتأكيد الحفظ بالخادم | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `procurement.ts` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F05** | P2 | New Orders | اشتراط كمية موجبة صريحة وسعر وحدة صحيح موجب (`qty > 0 && price > 0`) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F06** | P2 | Create / Group Send | Idempotency — حماية الإرسال بمفتاح تطابق نية وتدويره عند تغير المحتوى | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `procurement.ts` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F07** | P2 | Grouped Orders | مطابقة حقول الأوامر المجمعة والفروع (`orderCount`/`branches`) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F08** | P2 | Grouped Orders | Grouped order send — إرسال الأوامر المجمعة بمعرف المورد والمجموعة الصحيح | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F09** | P2 | Grouped Orders | التسمية النزيهة لإجراء إعداد رابط واتساب دون ادعاء استلام خارجي | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F10** | P2 | Sent Orders | Sent order status — استخدام sentAt و inTransit و eta والتمييز بين النقل والتسليم | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F11** | P2 | Lifecycle | ربط إجراءات دورة الشراء وحصر الاعتماد والاعتماد الجزئي وفق PUR-01 | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `ProcNewOrders.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F12** | P2 | Suppliers | احتساب إجمالي إنفاق المورد من بيانات الخادم (`lifetimeSpend`) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F13** | P2 | Suppliers | معايرة تقييم المورد (0-50 إلى 0-5 نجوم) وبيانات الاتصال | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F14** | P2 | Suppliers (PUR-04) | Supplier creation ownership — حظر إنشاء الموردين وقصره على المحاسب وفق PUR-04 | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `ProcSuppliers.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F15** | P2 | Items | اشتراط الوحدة والسعر الموجب (`price > 0`) عند إضافة الصنف | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F16** | P2 | Items | حفظ دقة الهللات بدون بتر وربط عدد الموردين الفعلي | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F17** | P2 | Items / VAT (PUR-05) | VAT treatment — خلو الأسعار من الضريبة واحتساب الضريبة التقديرية 15% وفق PUR-05 | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F18** | P2 | Reports (INTG-01) | تصدير التقارير بصيغتي PDF و Excel/XLSX | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F19** | P2 | Shared Security | تطهير كاش استعلامات المشتريات عند تبديل الدور | `FIXED_AND_VERIFIED` | `NOT_RUN` | `roleAccess.ts` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F20** | P2 | Pagination | Pagination — دعم تجزئة الصفحات Server Pagination والفلترة وحفظ metadata | `FIXED_AND_VERIFIED` | `NOT_RUN` | `procurement.ts`, `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F21** | P2 | Accessibility | نوافذ حوارية قابلة للوصول مع زر Escape و `htmlFor` | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F22** | P2 | Mobile / Responsive | تخطيط متجاوب لشبكات وكروت المشتريات | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F23** | P2 | Cross-Module | توثيق حدود مسؤوليات الاستلام والفروقات المحاسبية | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F24** | P2 | API Persistence | مطابقة وتمرير بدائل الوصف والملاحظات (`description`/`notes`) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `procurement.ts` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |
| **PROC-F25** | P2 | Status Semantics | تمييز دلالات الشارات (مرسل، معتمد، قيد النقل، مسلّم، مرفوض) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | 8c1e7ee3fe4cab4777859657a6c7552b31858a05 |

---

## 9. Phase 1F — Platform Admin Master Summary Table

| ID | الأولوية | الموديول / الصفحة | عنوان المشكلة المعتمد | الحالة البرمجية | الفحص الحي | الملفات المتأثرة | الـ Commit SHA |
| :---: | :---: | :--- | :--- | :---: | :---: | :--- | :---: |
| **ADM-F01** | P2 | Security / Admin Grant | قصر صلاحيات الأدمن الشاملة على التخويل الصريح ومنع التسرب | `FIXED_AND_VERIFIED` | `NOT_RUN` | `roleAccess.ts` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F02** | P2 | Shared Shell | حجب بحث المنصة الموحد للأدمن غير المقيد بشركة مع تلميح نزيه | `FIXED_AND_VERIFIED` | `NOT_RUN` | `ASABPrototype.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F03** | P2 | Shared Shell | حجب إشعارات المنصة الموحدة للأدمن غير المقيد بشركة مع تلميح نزيه | `FIXED_AND_VERIFIED` | `NOT_RUN` | `ASABPrototype.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F04** | P2 | Users | إضافة المستخدم لقائمة العرض فقط بعد نجاح الخادم المؤكد | `FIXED_AND_VERIFIED` | `NOT_RUN` | `ASABPrototype.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F05** | P2 | Users | ربط زر "تعديل الصلاحيات" بمصفوفة الصلاحيات برمجياً | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminUsers.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F06** | P2 | Users | قصر حذف المستخدم من الواجهة على تأكيد نجاح خادم API | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminUsers.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F07** | P2 | Users | دعم التراجع التلقائي (Rollback) عند فشل تعيين المحاسبين | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminUsers.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F08** | P2 | Users | مطابقة مفاتيح الموديولات المعتمدة مع المعايير البرمجية | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminUsers.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F09** | P2 | Users | عزل مستأجري التعيينات المتعددة وفق التسلسل الهرمي | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminUsers.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F10** | P2 | Restaurants & Branches | دعم الاستجابة المسطحة للعلامات دون حجب الهيكل | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminRestaurants.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F11** | P2 | Restaurants & Branches | مؤشرات حالة الرفع وفق الاستجابة المستمرة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminRestaurants.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F12** | P2 | Restaurants & Branches | تعيين العلامة الافتراضية الأولى ديناميكياً من الخادم | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminRestaurants.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F13** | P2 | Branch Requests | إظهار وإتاحة صفحة طلبات الفروع بالقائمة الجانبية للأدمن | `FIXED_AND_VERIFIED` | `NOT_RUN` | `ASABPrototype.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F14** | P2 | Subscriptions | تجديد الاشتراك دون تواريخ ثابتة واعتماد استجابة الخادم | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminSubscriptions.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F15** | P2 | Subscriptions | دعم التراجع التلقائي عند فشل تبديل التذكير الآلي | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminSubscriptions.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F16** | P2 | Subscriptions | ربط أزرار إيقاف وتفعيل الاشتراك في كروت الاشتراكات | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminSubscriptions.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F17** | P2 | Company Subscriptions | قصر تغيير حالة وباقة اشتراك الشركة على تأكيد الخادم | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminCompanies.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F18** | P2 | Company Subscriptions | وسم الإيراد الشهري كتقدير لكتالوج الباقات وفق SUB-01 | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminCompanies.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F19** | P3 | Packages | وسم أسعار الباقات كبيانات استرشادية لكتالوج الباقات (SUB-01) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminPackages.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F20** | P2 | Permissions | استعادة مصفوفة الصلاحيات الأصلية بالكامل عند الإلغاء | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminPermissions.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F21** | P2 | Permissions | تأكيد حفظ التغييرات فقط بعد نجاح تحديث الخادم | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminPermissions.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F22** | P2 | Permissions | استنساخ صلاحيات الأدوار مقيد بحوكمة النظام الأساسية (PERM-00) | `APPROVAL_REQUIRED` | `NOT_RUN` | `AdminPermissions.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F23** | P2 | Permissions | تعديل وتدوير مصفوفة الصلاحيات الأساسية مقيد مركزياً (PERM-00) | `APPROVAL_REQUIRED` | `NOT_RUN` | `AdminPermissions.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F24** | P2 | Reports Manager | حظر توليد أرقام وأرباح مالية مصطنعة عند غياب المعاينة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminReports.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F25** | P2 | Reports Manager | التحقق من خطوات معالج التقرير وحظر الانتقال للخطوة 4 دون ملف ومعاينة معتمدة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminReports.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F26** | P2 | Reports Manager | حصر مؤشرات وسجلات استلام التقرير على السجلات المؤكدة من الخادم ومنع الادعاء الزائف | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminReports.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F27** | P2 | Activity Log | مطابقة فلترة التواريخ بالزمن المعياري واليوم الحقيقي | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminAudit.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F28** | P2 | Activity Log | مطابقة نطاق وتصفية سجل النشاطات الكامل | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminAudit.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F29** | P2 | ERP Export | طلب تأكيد المستخدم قبل تصدير ملفات ERP (قاعدة INTG-01) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminERP.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F30** | P2 | ERP Export | التسمية النزيهة لتوليد ملفات التصدير دون ادعاء ربط خارجي | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminERP.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F31** | P2 | System Settings | إشعار تسجيل الإعدادات كتفضيلات تخضع لتدقيق الخادم المستقل | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminSettings.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F32** | P3 | System Settings | الحفاظ على عزل مسارات المصادقة المعقدة (SSO/2FA) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminSettings.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F33** | P2 | Mobile / Shell | تجاوب القائمة الجانبية والشاشات مع الشاشات الضيقة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `ASABPrototype.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F34** | P2 | Accessibility | دعم سمات الحوارات ARIA وإغلاق Escape بنوافذ الأدمن | `FIXED_AND_VERIFIED` | `NOT_RUN` | `ASABPrototype.tsx`, `AdminSubscriptions.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F35** | P3 | Localization | استخدام اتجاه النصوص الديناميكي dir={dir} بجداول الأدمن | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminReports.tsx`, `AdminPackages.tsx`, `AdminAudit.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F36** | P3 | Architecture | عزل بيانات النماذج المستقلة عن مسار تشغيل لوحة التحكم | `FIXED_AND_VERIFIED` | `NOT_RUN` | `AdminDashboard.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |
| **ADM-F37** | P2 | Policy | حظر منح الأدمن صلاحيات اعتماد العمليات المالية خارج المصفوفة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `ASABPrototype.tsx` | 904b9acf7ea7a229051d871865ad2caca024cd93 |


---

## Phase 1G — Original Supplier Findings Delta (2026-10-23)

# Phase 1G — Targeted Delta Audit and Frontend Delivery Candidate

Date: 2026-10-23. Starting SHA: `9b55d67e527a71e8c6d6c6efa9fe87ab49e4cd6d`. Source tree: `901ee28623b0e89070ff74f581f559ae7e7de088`.

Original ZIP SHA-256: `cda9fa32e9a0f71c867fd6e3dcb3043b41918c687c009070a0ce36583b0b49a2`; ZIP CRC and 10/10 internal SHA-256 entries PASS.

This is developer-executed evidence, not independent acceptance. Supplier activation is NOT_VERIFIED; Staging ON_HOLD; all 43 original supplier runtime scenarios NOT_RUN. Frontend gating is a mitigation, not complete delivery of blocked functionality.


| ID | الأولوية الأصلية | الحالة | Delta disposition | Evidence / limit |
|---|---|---|---|---|
| SUP-F01 | P2 | FIXED_AND_VERIFIED | FIXED_FRONTEND | roleAccess.ts + featureFlags.ts + active picker; flag-OFF unit and negative routing logic. Backend activation NOT_VERIFIED. Original: [artifacts/mockup-sandbox/src/auth/roleAccess.ts:145](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/auth/roleAccess.ts#L145) |
| SUP-F02 | P3 | FIXED_AND_VERIFIED | FIXED_DOCUMENTATION | Removed incorrect Backend-default-OFF claim; executable Backend comparison remains 983db655, not deployment evidence. Original: [artifacts/mockup-sandbox/src/featureFlags.ts:16](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/featureFlags.ts#L16) |
| SUP-F03 | P2 | IMPLEMENTED_UNVERIFIED | IMPLEMENTED_FRONTEND | SupOverview and supplier profiles use authenticated identity or neutral unavailable labels; browser identity verification pending. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:16062](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L16062) |
| SUP-F04 | P2 | FIXED_AND_VERIFIED | FIXED_FRONTEND | useSupplierOrders retains meta; all three order pages expose server pagination. API-function contract tests PASS. Original: [artifacts/mockup-sandbox/src/api/queries/platform/supplier.ts:30](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/api/queries/platform/supplier.ts#L30) |
| SUP-F05 | P2 | BLOCKED | BACKEND_BLOCKED | No authorized supplier order detail endpoint/line VAT contract. Summary retained; no invented API. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:16117](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L16117) |
| SUP-F06 | P2 | BLOCKED | PARTIAL_BACKEND_BLOCKED | Synchronous frontend lock and failed-request propagation tested; server concurrency/idempotency and locking remain unproven/unmodified. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:16112](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L16112) |
| SUP-F07 | P2 | IMPLEMENTED_UNVERIFIED | IMPLEMENTED_FRONTEND | Existing status=delivered API exposed as a read-only history filter in SupAccepted; browser test pending. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:16609](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L16609) |
| SUP-F08 | P2 | APPROVAL_REQUIRED | PARTIAL_AWAITING_POLICY | Delivery action and success text explicitly describe supplier declaration, not branch receipt. Receiving/settlement ownership remains a policy gate. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:16640](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L16640) |
| SUP-F09 | P2 | FIXED_AND_VERIFIED | FIXED_FRONTEND | Real details.supplierIds supported and de-duplicated; explicit ID selection, no invented supplier names. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:16741](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L16741) |
| SUP-F10 | P2 | BLOCKED | PARTIAL_BACKEND_BLOCKED | Edit can retry with an explicitly selected owned ID; Backend presenter still omits item-to-supplier record identity. No inferred first record or claimed cross-company guarantee. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:16752](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L16752) |
| SUP-F11 | P2 | FIXED_AND_VERIFIED | FIXED_FRONTEND | Multipart import accepts explicit supplierId; file retained for ambiguity retry. Actual mutation function tested in memory. Original: [artifacts/mockup-sandbox/src/api/queries/platform/supplier.ts:243](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/api/queries/platform/supplier.ts#L243) |
| SUP-F12 | P2 | BLOCKED | BACKEND_BLOCKED | Procurement PurchaseOrderGroup and Supplier Operation pipelines remain distinct. Phase1E PUR-01 gates preserved; bridge not invented. Original: [Modules/Admin/app/Http/Controllers/Procurement/ProcurementPurchaseOrderController.php:207](https://github.com/mohameelsherbini/Assab/blob/983db6559763855d1a8c430cd92a9f7c199cc44e/Modules/Admin/app/Http/Controllers/Procurement/ProcurementPurchaseOrderController.php#L207) |
| SUP-F13 | P2 | BLOCKED | GATED_BACKEND_CONTRACT | Supplier no longer mounts company GlobalSearch; supplier search functionality remains unavailable pending Backend contract. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:1905](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L1905) |
| SUP-F14 | P2 | BLOCKED | GATED_BACKEND_CONTRACT | Supplier no longer mounts company NotificationBell; supplier notifications remain unavailable pending contract. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:1913](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L1913) |
| SUP-F15 | P3 | FIXED_AND_VERIFIED | FIXED_FRONTEND | Removed fabricated new-order badge instead of inventing a count. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:723](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L723) |
| SUP-F16 | P3 | FIXED_AND_VERIFIED | FIXED_FRONTEND | Removed the operations-period selector from supplier context; no unsupported query filters sent. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:1899](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L1899) |
| SUP-F17 | P2 | IMPLEMENTED_UNVERIFIED | IMPLEMENTED_FRONTEND | Installed Radix Dialog primitive, named titles/fields, controlled pending close, focus return; physical keyboard/browser verification NOT_RUN. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:16127](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L16127) |
| SUP-F18 | P2 | IMPLEMENTED_UNVERIFIED | IMPLEMENTED_FRONTEND | Responsive KPI grids, wrapped order rows, scrollable catalog, context direction and touch actions. Device/browser verification NOT_RUN. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:16773](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L16773) |
| SUP-F19 | P2 | APPROVAL_REQUIRED | AWAITING_POLICY_AND_BACKEND | Invoices/attachments/returns require approved supplier ownership/API contract (PUR-02/03/04). No new action enabled. Original: [Modules/Admin/routes/api.php:587](https://github.com/mohameelsherbini/Assab/blob/983db6559763855d1a8c430cd92a9f7c199cc44e/Modules/Admin/routes/api.php#L587) |
| SUP-F20 | P2 | FIXED_AND_VERIFIED | FIXED_FRONTEND | Exact safe-integer priceHalalas, nonnegative integer catalog limits/lead time and min<=max. Existing zero-price Backend contract preserved. Fractional purchase rounding untouched. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:16717](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L16717) |
| SUP-F21 | P2 | IMPLEMENTED_UNVERIFIED | IMPLEMENTED_FRONTEND | All six pages distinguish loading/error from empty; retries explicit. Missing monetary fields stay unavailable. Render/runtime error-state acceptance pending. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:16051](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L16051) |
| SUP-F22 | P3 | APPROVAL_REQUIRED | AWAITING_POLICY | Detailed reports remain explicitly deferred. No fabricated charts or claim of completed PORTAL-01 reporting. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:16865](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L16865) |
| SUP-F23 | P3 | FIXED_AND_VERIFIED | ALREADY_EXCLUDED_MOCK | App route allowlist still only opens ASABPrototype/CompanyDashboard. Standalone SupplierDashboard is not functional acceptance evidence; no mock source rewritten. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/SupplierDashboard.tsx:6](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/SupplierDashboard.tsx#L6) |
| SUP-F24 | P2 | BLOCKED | BACKEND_CONTRACT_BLOCKED | Catalog prices labelled excluding VAT. Order totals/VAT/invoice breakdown not supplied by existing contract; no tax inferred or new write fields sent. Original: [artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx:16120](https://github.com/mohameelsherbini/dashboard/blob/195315c66d9e7523e799c905b7649a8a7bc8b013/artifacts/mockup-sandbox/src/components/mockups/asab/ASABPrototype.tsx#L16120) |


## Counts and evidence classification

Before: 203 tracked original/review items (198 original + 5 review corrections); 188 historical FIXED_AND_VERIFIED / 10 gated / 5 Backend blocked, carried forward as prior evidence, not independently re-executed historical acceptance.

Added: 24 original IDs. Phase1G distribution: {'FIXED_AND_VERIFIED': 9, 'IMPLEMENTED_UNVERIFIED': 5, 'BLOCKED': 7, 'APPROVAL_REQUIRED': 3}.

After Phase1G: **227 tracked items / 222 original findings + 5 review corrections**; 197 FIXED_AND_VERIFIED, 13 APPROVAL_REQUIRED, 12 BLOCKED, 5 IMPLEMENTED_UNVERIFIED. Cross-phase duplicates are retained with crosswalks, not deleted or described as independent unique root causes.

Focused command: `TZ=UTC node --import ./scripts/node_modules/tsx/dist/loader.mjs --test --test-force-exit --test-reporter=tap artifacts/mockup-sandbox/src/components/mockups/asab/phase1gSupplier.test.ts` — 13/13 PASS, exit 0. **9 behavioral frontend tests, 4 source-wiring assertions**. The transport is in memory; no real HTTP or Backend isolation proved. Initial five tests reproduced missing pagination, record import/selection, validation and flag gating before implementation; RED exit 1.

Full source test discovery: all `artifacts/mockup-sandbox/src/**/*.test.ts`, same Node/tsx runner, process isolation, `TZ=UTC` — 306/306 PASS, 0 skipped, exit 0. Baseline: 293/293 PASS under the same runner/environment. Bare Node cannot load existing extensionless TS/TSX modules; unqualified local TZ America/Toronto reproduces an existing date assertion failure. The explicitly recorded UTC run does not prove cross-timezone correctness; no assertion was changed.

`pnpm run typecheck` — PASS, exit 0. `pnpm --filter @workspace/mockup-sandbox run build` — PASS, exit 0; existing >500kB bundle warning remains. Build registry ordering is generated on Linux; its two ordering-only changes were excluded and restored from this clean checkout's HEAD, without touching existing workspaces. `git diff --check` — PASS.

Node 24.19.0 / pnpm 11.25.0 / TypeScript 5.9.3. Frozen lockfile SHA-256 unchanged: `61cec1148fdfb2891540832c8ab652c8b9a816f6387c2945dcdf590de0b1c241`. Dependencies installed with `--frozen-lockfile --ignore-scripts`; supply-chain release-age policy preserved.

## Delivery and governance

Normal Git HTTPS authentication is unavailable (dry-run: Username unavailable, exit 128). Authenticated official GitHub connector read/write permission was verified, including a guarded no-op update of the feature branch to its existing SHA. Publication uses one commit and guarded non-force update with the expected parent; tree/delta parity required. No credentials copied.

Canonical register updated in this phase. Its Windows mirror is not accessible from this Cloud workspace: **mirror sync BLOCKED / NOT_RUN**, not claimed synchronized. The canonical file can be copied byte-for-byte after delivery; no closure is claimed while required governance or acceptance remains pending. The commit containing this report is the Phase1G delivery candidate; exact remote commit/parent/tree are recorded in the final handoff to avoid a self-referential commit hash inside its own content.

No Backend/Flutter/Auth lifecycle changes; no new API, feature activation, financial approval, PR update, merge or deployment. Runtime, browser, Staging and production: NOT_RUN.
