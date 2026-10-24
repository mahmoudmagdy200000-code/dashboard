import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

function norm(s: string): string {
  return s.replace(/\r\n/g, "\n");
}

test("AdminOverview: Responsive layout reflow for mobile viewports (OBS-P3-ADMIN-01)", () => {
  const adminOverview = norm(
    readFileSync(new URL("./_pages/admin/AdminOverview.tsx", import.meta.url), "utf8")
  );

  // 1. KPI cards reflow
  assert.ok(
    adminOverview.includes("grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"),
    "AdminOverview KPI cards must reflow from 1 column on mobile to 2 on small screens and 4 on desktop (lg)"
  );
  assert.ok(
    !adminOverview.includes('className="grid grid-cols-4 gap-4"'),
    "AdminOverview must not use fixed 4-column grid without responsive breakpoints"
  );

  // 2. Main sections reflow
  assert.ok(
    adminOverview.includes("grid-cols-1 lg:grid-cols-2 gap-5"),
    "AdminOverview main sections (Brand Hierarchy & Quick Actions) must stack on mobile/tablet (1 col) and restore 2 columns on desktop (lg)"
  );
  assert.ok(
    !adminOverview.includes('className="grid grid-cols-2 gap-5"'),
    "AdminOverview must not use fixed 2-column grid without responsive breakpoints"
  );

  // 3. Header reflow
  assert.ok(
    adminOverview.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-3"),
    "AdminOverview header must wrap vertically on mobile and horizontally on small screens and up"
  );

  // 4. Quick Actions grid reflow
  assert.ok(
    adminOverview.includes("grid-cols-2 sm:grid-cols-3 gap-2.5"),
    "AdminOverview Quick Actions must provide adequate touch/readability space (2 cols on mobile, 3 on sm+)"
  );

  // 5. Brand Hierarchy and alerts text clipping prevention
  assert.ok(
    adminOverview.includes("truncate") && adminOverview.includes("shrink-0"),
    "AdminOverview must use truncate and shrink-0 to prevent badges and text from colliding or clipping on narrow viewports"
  );
});
