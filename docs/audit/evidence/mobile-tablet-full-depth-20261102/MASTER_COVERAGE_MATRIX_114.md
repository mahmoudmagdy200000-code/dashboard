# ASSAB ERP — 114-Path Master Full-Depth Responsive Coverage Matrix

**Baseline SHA:** `53d2f575b57c28b40d4c2387639c8758c95d25ce`
**Working Branch:** `fix/mobile-tablet-full-depth-20261102`
**Total Paths:** 114
**Viewports Tested:** 390px (Mobile), 820px (Tablet), 1280px (Laptop)
**Locales Tested:** Arabic (RTL), English (LTR)
**Total Executions:** 684
**Pass Count:** 684 (100%)
**Fail Count:** 0 (0%)
**Blocked Count:** 0 (0%)

---

## 1. Summary by Role

| Role | Unique Paths | Viewport/Locale Runs | Status | Document Overflow | Chat Clearance | Branch Clipping |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **accountant** | 26 | 156 | **PASS (100%)** | 0 detected | ≥ 96px safe | 0 detected |
| **head** (Head Accountant) | 34 | 204 | **PASS (100%)** | 0 detected | ≥ 96px safe | 0 detected |
| **admin** (Super Admin) | 12 | 72 | **PASS (100%)** | 0 detected | ≥ 96px safe | 0 detected |
| **branch** (Branch Manager) | 14 | 84 | **PASS (100%)** | 0 detected | ≥ 96px safe | 0 detected |
| **procurement** (Procurement Mgr)| 14 | 84 | **PASS (100%)** | 0 detected | ≥ 96px safe | 0 detected |
| **supplier** (Supplier Portal) | 6 | 36 | **PASS (100%)** | 0 detected | ≥ 96px safe | 0 detected |
| **company-admin** (Company Admin)| 8 | 48 | **PASS (100%)** | 0 detected | ≥ 96px safe | 0 detected |
| **TOTAL** | **114** | **684** | **PASS (100%)** | **0 detected** | **Safe clearance** | **0 detected** |

---

## 2. Detailed Path Coverage (114 Unique Routes)

| # | Surface | Role | Screen ID | Module | 390px AR | 390px EN | 820px AR | 820px EN | 1280px AR | 1280px EN | Result |
| :-: | :--- | :--- | :--- | :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| 1 | `ASABPrototype` | `accountant` | `acc-dashboard` | الرئيسية | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 2 | `ASABPrototype` | `accountant` | `acc-reminders` | الرئيسية | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 3 | `ASABPrototype` | `accountant` | `acc-sales` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 4 | `ASABPrototype` | `accountant` | `acc-expenses` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 5 | `ASABPrototype` | `accountant` | `acc-purchases` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 6 | `ASABPrototype` | `accountant` | `acc-inventory` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 7 | `ASABPrototype` | `accountant` | `acc-waste` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 8 | `ASABPrototype` | `accountant` | `acc-assets` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 9 | `ASABPrototype` | `accountant` | `acc-shifts` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 10 | `ASABPrototype` | `accountant` | `acc-employees` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 11 | `ASABPrototype` | `accountant` | `acc-cash` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 12 | `ASABPrototype` | `accountant` | `acc-reports` | التقارير | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 13 | `ASABPrototype` | `accountant` | `acc-sales-detail` | المبيعات / صفحة داخلية | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 14 | `ASABPrototype` | `accountant` | `acc-inventory-items` | المخزون / صفحة داخلية | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 15 | `ASABPrototype` | `head` | `head-dashboard` | الرئيسية | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 16 | `ASABPrototype` | `head` | `head-pending` | المراجعة والاعتماد | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 17 | `ASABPrototype` | `head` | `head-approved` | المراجعة والاعتماد | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 18 | `ASABPrototype` | `head` | `head-rejected` | المراجعة والاعتماد | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 19 | `ASABPrototype` | `head` | `head-sales` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 20 | `ASABPrototype` | `head` | `head-expenses` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 21 | `ASABPrototype` | `head` | `head-purchases` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 22 | `ASABPrototype` | `head` | `head-inventory` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 23 | `ASABPrototype` | `head` | `head-waste` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 24 | `ASABPrototype` | `head` | `head-assets` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 25 | `ASABPrototype` | `head` | `head-shifts` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 26 | `ASABPrototype` | `head` | `head-employees` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 27 | `ASABPrototype` | `head` | `head-cash` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 28 | `ASABPrototype` | `head` | `head-reminders` | التذكيرات والتقارير | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 29 | `ASABPrototype` | `head` | `head-accountants` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 30 | `ASABPrototype` | `head` | `head-erp` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 31 | `ASABPrototype` | `head` | `head-reports` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 32 | `ASABPrototype` | `admin` | `admin-overview` | الرئيسية | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 33 | `ASABPrototype` | `admin` | `admin-users` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 34 | `ASABPrototype` | `admin` | `admin-restaurants` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 35 | `ASABPrototype` | `admin` | `admin-branch-requests` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 36 | `ASABPrototype` | `admin` | `admin-subscriptions` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 37 | `ASABPrototype` | `admin` | `admin-packages` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 38 | `ASABPrototype` | `admin` | `admin-companies` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 39 | `ASABPrototype` | `admin` | `admin-permissions` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 40 | `ASABPrototype` | `admin` | `admin-reports` | التقارير | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 41 | `ASABPrototype` | `admin` | `admin-audit` | التقارير | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 42 | `ASABPrototype` | `admin` | `admin-erp` | النظام | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 43 | `ASABPrototype` | `admin` | `admin-settings` | النظام | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 44 | `ASABPrototype` | `branch` | `branch-overview` | الرئيسية | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 45 | `ASABPrototype` | `branch` | `branch-employees` | إدارة البيانات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 46 | `ASABPrototype` | `branch` | `branch-items` | إدارة البيانات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 47 | `ASABPrototype` | `branch` | `branch-suppliers` | إدارة البيانات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 48 | `ASABPrototype` | `branch` | `branch-upload` | إدارة البيانات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 49 | `ASABPrototype` | `branch` | `branch-settings` | الإعدادات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 50 | `ASABPrototype` | `procurement` | `proc-overview` | الرئيسية | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 51 | `ASABPrototype` | `procurement` | `proc-new` | الطلبات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 52 | `ASABPrototype` | `procurement` | `proc-grouped` | الطلبات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 53 | `ASABPrototype` | `procurement` | `proc-sent` | الطلبات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 54 | `ASABPrototype` | `procurement` | `proc-items` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 55 | `ASABPrototype` | `procurement` | `proc-suppliers` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 56 | `ASABPrototype` | `procurement` | `proc-reports` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 57 | `ASABPrototype` | `supplier` | `sup-overview` | الرئيسية | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 58 | `ASABPrototype` | `supplier` | `sup-new` | الطلبات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 59 | `ASABPrototype` | `supplier` | `sup-accepted` | الطلبات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 60 | `ASABPrototype` | `supplier` | `sup-rejected` | الطلبات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 61 | `ASABPrototype` | `supplier` | `sup-items` | الكتالوج | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 62 | `ASABPrototype` | `supplier` | `sup-reports` | الكتالوج | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 63 | `CompanyDashboard` | `company-admin` | `ca-dashboard` | لوحة التحكم | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 64 | `CompanyDashboard` | `company-admin` | `ca-subscription` | لوحة التحكم | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 65 | `CompanyDashboard` | `company-admin` | `ca-users` | لوحة التحكم | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 66 | `CompanyDashboard` | `company-admin` | `ca-branches` | لوحة التحكم | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 67 | `CompanyDashboard` | `company-admin` | `ca-modules` | لوحة التحكم | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 68 | `CompanyDashboard` | `company-admin` | `ca-billing` | المالية | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 69 | `CompanyDashboard` | `company-admin` | `ca-settings` | الإعدادات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 70 | `CompanyDashboard` | `company-admin` | `ca-support` | الإعدادات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 71 | `CompanyDashboard` | `head` | `head-dashboard` | الرئيسية | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 72 | `CompanyDashboard` | `head` | `head-pending` | الاعتماد | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 73 | `CompanyDashboard` | `head` | `head-approved` | الاعتماد | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 74 | `CompanyDashboard` | `head` | `head-rejected` | الاعتماد | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 75 | `CompanyDashboard` | `head` | `head-sales` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 76 | `CompanyDashboard` | `head` | `head-expenses` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 77 | `CompanyDashboard` | `head` | `head-purchases` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 78 | `CompanyDashboard` | `head` | `head-inventory` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 79 | `CompanyDashboard` | `head` | `head-waste` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 80 | `CompanyDashboard` | `head` | `head-assets` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 81 | `CompanyDashboard` | `head` | `head-shifts` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 82 | `CompanyDashboard` | `head` | `head-employees` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 83 | `CompanyDashboard` | `head` | `head-cash` | الموديولات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 84 | `CompanyDashboard` | `head` | `head-reminders` | التقارير | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 85 | `CompanyDashboard` | `head` | `head-accountants` | التقارير | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 86 | `CompanyDashboard` | `head` | `head-erp` | التقارير | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 87 | `CompanyDashboard` | `head` | `head-reports` | التقارير | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 88 | `CompanyDashboard` | `accountant` | `acc-dashboard` | الرئيسية | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 89 | `CompanyDashboard` | `accountant` | `acc-reminders` | الرئيسية | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 90 | `CompanyDashboard` | `accountant` | `acc-sales` | الوحدات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 91 | `CompanyDashboard` | `accountant` | `acc-expenses` | الوحدات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 92 | `CompanyDashboard` | `accountant` | `acc-purchases` | الوحدات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 93 | `CompanyDashboard` | `accountant` | `acc-inventory` | الوحدات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 94 | `CompanyDashboard` | `accountant` | `acc-waste` | الوحدات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 95 | `CompanyDashboard` | `accountant` | `acc-assets` | الوحدات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 96 | `CompanyDashboard` | `accountant` | `acc-shifts` | الوحدات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 97 | `CompanyDashboard` | `accountant` | `acc-employees` | الوحدات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 98 | `CompanyDashboard` | `accountant` | `acc-cash` | الوحدات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 99 | `CompanyDashboard` | `accountant` | `acc-reports` | التقارير | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 100 | `CompanyDashboard` | `branch` | `branch-overview` | الرئيسية | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 101 | `CompanyDashboard` | `branch` | `branch-upload` | إدارة البيانات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 102 | `CompanyDashboard` | `branch` | `branch-shifts` | إدارة البيانات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 103 | `CompanyDashboard` | `branch` | `branch-requests` | إدارة البيانات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 104 | `CompanyDashboard` | `branch` | `branch-employees` | إدارة البيانات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 105 | `CompanyDashboard` | `branch` | `branch-items` | إدارة البيانات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 106 | `CompanyDashboard` | `branch` | `branch-suppliers` | إدارة البيانات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 107 | `CompanyDashboard` | `branch` | `branch-settings` | الإعدادات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 108 | `CompanyDashboard` | `procurement` | `proc-overview` | الرئيسية | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 109 | `CompanyDashboard` | `procurement` | `proc-new` | الطلبات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 110 | `CompanyDashboard` | `procurement` | `proc-grouped` | الطلبات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 111 | `CompanyDashboard` | `procurement` | `proc-sent` | الطلبات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 112 | `CompanyDashboard` | `procurement` | `proc-items` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 113 | `CompanyDashboard` | `procurement` | `proc-suppliers` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 114 | `CompanyDashboard` | `procurement` | `proc-reports` | الإدارة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |

---
*Evidence Artifacts:* `artifacts/responsive-evidence/full-depth-114-reconciliation/`
*Metrics Raw Dataset:* `artifacts/responsive-evidence/full-depth-114-reconciliation/full_114_coverage_metrics.json`
