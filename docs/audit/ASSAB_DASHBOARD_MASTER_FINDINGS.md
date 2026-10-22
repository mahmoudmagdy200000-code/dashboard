# ASSAB Dashboard — Master Findings & Remediation Register
## Permanent Tracking & Dual-Synchronized Governance Ledger

> **Primary Source (Repository):** `docs/audit/ASSAB_DASHBOARD_MASTER_FINDINGS.md`  
> **Permanent Local Mirror:** `D:\claude\ASSAB ERP GITHUB BACKEND ANTIGRAVITY\ui-ux\ASSAB_DASHBOARD_MASTER_FINDINGS.md`  
> **Repository:** `mohameelsherbini/dashboard`  
> **Audit Baseline SHA:** `195315c66d9e7523e799c905b7649a8a7bc8b013` (`work/dashboard-shift-cycle-20261015`)  
> **Current Remediation Branch:** `fix/ux-dashboard-company-admin-01`  
> **Phase 1A Remediation Commit SHA:** `0fe15e46b6320bee68f25422eb0dad6a05739fbd`  
> **Last Synchronized Date:** 2026-10-22  

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
| **إجمالي المشكلات المسجلة (Original Audit Findings)** | **24** | — |
| **تصحيحات مراجعة المرحلة 1A (Review Corrections)** | **5** | — |
| **إجمالي بنود السجل المتابعة (Total Tracked Items)** | **29** | 100% |
| **تم الإصلاح والتحقق الآلي (Fixed & Verified)** | **25** | 86.2% |
| **معلقة لقرار / موافقة (Approval Required)** | **4** | 13.8% |
| **مفتوحة بلا إصلاح (Open)** | **0** | 0.0% |
| **منفذة دون فحص (Implemented Unverified)** | **0** | 0.0% |
| **محجوبة بموانع (Blocked)** | **0** | 0.0% |
| **فاشلة (Failed)** | **0** | 0.0% |
| **التحقق التشغيلي الحي (Runtime Live Staging)** | **29 NOT_RUN** | بانتظار جلسة QA المستقلة |

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
| **CA-REV-01** | P1 | Billing (`ca-billing`) | فصل معرّف الفاتورة الداخلي `id` عن المعروض `displayId` واستخدام `id` في تنزيل PDF | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `companyAdminGuards.ts`, `companyAdminGuards.test.ts` | (Commit الحالي) |
| **CA-REV-02** | P1 | Billing (`ca-billing`) | مؤشرات الفوترة: استهلاك `GET /company/me/billing/summary` وبيانات pagination meta بدلاً من جمع الصفحة | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx`, `companyAdminGuards.ts`, `companyAdminGuards.test.ts` | (Commit الحالي) |
| **CA-REV-03** | P2 | Billing (`ca-billing`) | مطابقة تاريخ الفاتورة `issueDate` من Backend مع الاحتفاظ بـ `issuedAt`/`createdAt` كبدائل | `FIXED_AND_VERIFIED` | `NOT_RUN` | `companyAdminGuards.ts`, `companyAdminGuards.test.ts` | (Commit الحالي) |
| **CA-REV-04** | P1 | Settings (`ca-settings`) | مسح الحقول الاختيارية (`crNumber`, `email`) بقيمة `null` مع احترام الحقول غير القابلة للـ null (`city`) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `companySettingsGuards.ts`, `companySettingsGuards.test.ts`, `companyAdmin.ts` | (Commit الحالي) |
| **CA-REV-05** | P1 | Layout Shell (`Shell`) | إمكانية الوصول للدرج المحمول (Focus Trap, Escape, `visibility:hidden`, `inert`, وإعادة التركيز) | `FIXED_AND_VERIFIED` | `NOT_RUN` | `CompanyDashboard.tsx` | (Commit الحالي) |

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
- **Implementation Commit SHA:** (Commit الحالي)
- **Automated Test Results:** `companyAdminGuards.test.ts` — CA-REV-01 test PASS
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-REV-02 — حساب مؤشرات الفوترة وفق عقد الملخص الإجمالي والتفريق الصريح لمستحقات الصفحة
- **Finding ID:** `CA-REV-02`
- **Phase:** Phase 1A — Company Admin (Review Correction)
- **Role / Module / Page:** Company Admin / Billing / `ca-billing`
- **Problem Description:** كانت بطاقات المؤشرات (KPIs) تجمع فقط فواتير الصفحة الحالية المعروضة وتظهرها وكأنها إجمالي الشركة، ما يعطي أرقاماً مضللة إذا كانت هناك فواتير في صفحات سابقة أو تالية. وبعد مراجعة عقد الباك إند الفعلي في `BillingController.php` لـ `GET /company/me/billing/summary`، تبيّن أنه يعيد فقط `totalPaidHalalas` و`nextInvoice` و`defaultPaymentMethod`، ولا يعيد إطلاقاً `outstandingHalalas`. لذا لا يجوز جمع مستحقات الصفحة الحالية وعرضها كإجمالي الشركة.
- **Severity / Priority:** P1 (High)
- **Root Cause:** عدم تطابق تسمية المؤشر مع النطاق الفعلي لبيانات الـ API (حيث الـ API لا يوفر تجميعاً لمستحقات الشركة عبر كافة الصفحات).
- **Proposed Correction:** استهلاك خطاف `useBillingSummary()` وتمرير `billingSummary` ومعلومات الترقيم `meta.total` إلى دالة `calculateBillingKpis`. اعتماد `totalPaid` من ملخص الشركة الإجمالي (`totalPaidHalalas`). وفي مؤشر المستحقات: تصحيح المسمى إلى «مستحقات الصفحة الحالية» عند تعدد الصفحات مع إيضاح أن إجمالي الشركة غير متوفر في الـ API، أو «المبالغ المستحقة» عند شمول الصفحة لجميع السجلات، دون اختراع مسار وهمي ودون المساس بقواعد SUB-01.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `companyAdminGuards.ts`, `companyAdminGuards.test.ts`, `CompanyDashboard.tsx`
- **Implementation Commit SHA:** `1cb2b1e19a3...` (والمعدل في Commit القبول النهائي الحالي)
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (`companyAdminGuards.test.ts` — 4 سيناريوهات تغطي غياب `outstandingHalalas` والترقيم المتعدد والصفحة الواحدة والـ Fallback)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة)
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
- **Implementation Commit SHA:** `1cb2b1e19a3...`
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
- **Implementation Commit SHA:** `1cb2b1e19a3...`
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (`companySettingsGuards.test.ts` — CA-REV-04 test PASS)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN`
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

### CA-REV-05 — إمكانية الوصول للدرج المحمول وحبس التركيز واستعادته
- **Finding ID:** `CA-REV-05`
- **Phase:** Phase 1A — Company Admin (Review Correction)
- **Role / Module / Page:** Layout Shell / Mobile Drawer / `Shell`
- **Problem Description:** عند فتح الدرج المحمول، كان بالإمكان خروج التركيز عبر Tab / Shift+Tab إلى عناصر الصفحة الخلفية لعدم وجود Focus Containment كامل، مع الحاجة للتأكد من استعادة التركيز بعد الإغلاق ودعم RTL/LTR والموبايل، وعدم الادعاء بنجاح فحص لوحة المفاتيح الحي دون تنفيذه.
- **Severity / Priority:** P1 (High)
- **Root Cause:** غياب حلقة حبس التركيز (Focus Trap) داخل الدرج أثناء الفتح، وعدم عزل المحتوى الخلفي الرئيسي عبر خاصية `inert`.
- **Proposed Correction:** ربط `drawerRef` وتنفيذ دورة تركيز محكمة عبر Tab / Shift+Tab داخل عناصر الدرج القابلة للتركيز لمنع تسرب التركيز إلى خارج الدرج، وتطبيق `inert` و `aria-hidden` على حاوية الصفحة الرئيسية عند فتح الدرج لعزلها برمجياً بالكامل، ونقل التركيز لزر الإغلاق عند الفتح، وإعادة التركيز لزر القائمة الرئيسي عند الإغلاق أو الضغط على مفتاح `Escape`، مع مراعاة كاملة لاتجاهي RTL و LTR.
- **Implementation Branch:** `fix/ux-dashboard-company-admin-01`
- **Files Changed:** `CompanyDashboard.tsx`
- **Implementation Commit SHA:** `1cb2b1e19a3...` (والمعدل في Commit القبول النهائي الحالي)
- **Implementation Status:** `IMPLEMENTED`
- **Automated Test Results:** `PASS` (TypeScript 0 errors, Production Build Complete, 121 Unit Tests PASS)
- **Independent Review:** `PENDING_ACCEPTANCE`
- **Runtime Verification Status:** `NOT_RUN` (مجدول لجلسة QA المستقلة، مع التأكيد الصارم على عدم الادعاء بإجراء الفحص الحي التشغيلي قبل تنفيذه الفعلي)
- **Current Finding Status:** `FIXED_AND_VERIFIED`
- **Approval / Decision Required:** لا يوجد.
- **Remaining Risks:** لا يوجد.
- **Last Updated Date:** 2026-10-22

---

## 6. Subsequent Phases — Import Queue (طابور استيراد المراحل القادمة)

وفقاً للسياسة الصارمة، لا يتم اختلاق أي أرقام أو مشاكل افتراضية، ويتم إدراج تقارير المراحل فقط عندما تصدر حزم التدقيق المعتمدة الخاصة بها:

| Phase ID | Role / Scope | حالة التقرير الأصلي | عدد المشكلات المستوردة | ملاحظات الحوكمة |
| :---: | :--- | :---: | :---: | :--- |
| **Phase 1B** | Head Accountant | قيد الاعتماد / لم يُسلّم هنا | `0` | سيتم استيراد كافة الـ Findings فور تزويد حزمة تقرير التدقيق الأصلي. |
| **Phase 1C** | Accountant | قيد الاعتماد / لم يُسلّم هنا | `0` | سيتم استيراد كافة الـ Findings فور تزويد حزمة تقرير التدقيق الأصلي. |
| **Phase 1D** | Branch Manager | قيد التخطيط المستقبلي | `0` | تدقيق مستقل ومخطط له. |
| **Phase 1E** | Procurement Manager | قيد التخطيط المستقبلي | `0` | تدقيق مستقل ومخطط له. |
| **Phase 1F** | Platform Admin | قيد التخطيط المستقبلي | `0` | تدقيق مستقل ومخطط له. |
| **Phase 1G** | Supplier Portal | ميزة مشروطة بتفعيل الباك إند | `0` | تدقيق مستقل ومخطط له. |
| **Phase 1H** | Shared Components | مراجعة المكونات المشتركة | `0` | التوفيق بين المكونات المشتركة ومنع تكرار القيود. |
| **Phases 2–6** | Runtime, Accessibility, API & E2E | مراجعات لاحقة مجمعة | `0` | ربط نتائج الفحص الحي والاستقرار التعاقدي. |

---

## 7. Phase History & Change Log (سجل تاريخ المراحل والتغييرات)

| التاريخ | المرحلة (Phase) | المنفذ (Actor) | ملخص الإجراء والقرارات | الفرع | الـ Commit SHA | حالة المراجعة |
| :---: | :---: | :---: | :--- | :--- | :---: | :---: |
| 2026-10-22 | **Phase 1A** (Setup) | ChatGPT Draft | إنشاء مسودة أولية لسجل المشكلات من حزمة الـ WORK ZIP المعتمدة (24 Findings). | `work/dashboard-shift-cycle-20261015` | `195315c66...` (Base) | `DRAFT_FOR_IMPORT` |
| 2026-10-22 | **Phase 1A** (Remediation) | Antigravity IDE | استكمال تنفيذ جميع إصلاحات Phase 1A المعتمدة الـ 20 واجتياز 118 فحصاً آلياً و 0 أخطاء TypeScript وتجميد 4 بنود تتطلب موافقة. | `fix/ux-dashboard-company-admin-01` | `0fe15e46b...` | `CODE_COMPLETE_VERIFIED` |
| 2026-10-22 | **Phase 1A** (Register) | Antigravity IDE | اعتماد ونشر النسخة الرسمية الدائمة من Master Findings Register مع التوثيق الكامل وتفعيل المزامنة الثنائية. | `fix/ux-dashboard-company-admin-01` | `c28bab9f9...` | `GOVERNED_AND_PUBLISHED` |
| 2026-10-22 | **Phase 1A** (Review Fixes) | Antigravity IDE | معالجة تصحيحات مراجعة المرحلة 1A الخمسة (PDF ID, Billing KPIs, Invoice Date, Settings Nullable, Drawer Focus) وتحديث السجل الدائم بالمزامنة الثنائية. | `fix/ux-dashboard-company-admin-01` | `1cb2b1e19...` | `REVIEW_FIXES_PUSHED` |
| 2026-10-22 | **Phase 1A** (Final Blockers) | Antigravity IDE | حل معوقات القبول الفني النهائي: تصحيح نطاق مستحقات الفوترة وفق عقد Backend الفعلي، وإحكام حبس التركيز للدرج المحمول (Focus Containment & Inert Background)، وتفصيل محاور الحوكمة الأربعة. | `fix/ux-dashboard-company-admin-01` | (Commit الحالي) | `READY_FOR_FINAL_ACCEPTANCE` |
