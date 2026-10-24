import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

test("AsabLogo: Brand asset files exist in public directory with valid dimensions", () => {
  const publicPng = new URL("../../public/assab logo.png", import.meta.url);
  const hyphenPng = new URL("../../public/assab-logo.png", import.meta.url);
  const emblemSvg = new URL("../../public/assab-emblem.svg", import.meta.url);

  assert.equal(existsSync(publicPng), true, "assab logo.png must exist in public/");
  assert.equal(existsSync(hyphenPng), true, "assab-logo.png must exist in public/");
  assert.equal(existsSync(emblemSvg), true, "assab-emblem.svg must exist in public/");

  // Verify PNG header is valid PNG signature
  const buf = readFileSync(publicPng);
  assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "File must have valid PNG signature");
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  assert.ok(width >= 1000, `High-res width must be >= 1000px, got ${width}`);
  assert.ok(height >= 800, `High-res height must be >= 800px, got ${height}`);

  // Verify SVG content
  const svgContent = readFileSync(emblemSvg, "utf8");
  assert.match(svgContent, /<svg.*viewBox/, "Emblem SVG must have viewBox");
  assert.match(svgContent, /#6E29F6/, "Emblem SVG must include official purple fill");
  assert.match(svgContent, /#28FCFE/, "Emblem SVG must include official cyan fill");
});

test("AsabLogo: Source files adopt the unified AsabLogo component", () => {
  const entryFlow = readFileSync(new URL("../auth/EntryFlow.tsx", import.meta.url), "utf8");
  assert.match(entryFlow, /<AsabLogo\s+variant="brand-card"/, "EntryFlow must use AsabLogo variant='brand-card'");

  const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
  assert.match(app, /<AsabLogo\s+variant="header"/, "App.tsx must use AsabLogo variant='header'");

  const asabProto = readFileSync(new URL("./mockups/asab/ASABPrototype.tsx", import.meta.url), "utf8");
  assert.match(asabProto, /<AsabLogo\s+variant="header"/, "ASABPrototype header must use AsabLogo variant='header'");
  assert.match(asabProto, /<AsabLogo\s+variant="sidebar"/, "ASABPrototype sidebar must use AsabLogo variant='sidebar'");

  const companyDash = readFileSync(new URL("./mockups/asab/CompanyDashboard.tsx", import.meta.url), "utf8");
  assert.match(companyDash, /<AsabLogo\s+variant="header"/, "CompanyDashboard header must use AsabLogo variant='header'");
});
