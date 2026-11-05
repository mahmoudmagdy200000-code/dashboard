import assert from "node:assert/strict";
import test from "node:test";
import { displayDigits } from "./displayDigits";

test("Arabic display converts digits without changing financial punctuation or source", () => {
  const source = "-20.00 ر.س / +15.25 (75%)";
  assert.equal(displayDigits(source, "ar"), "-٢٠.٠٠ ر.س / +١٥.٢٥ (٧٥%)");
  assert.equal(source, "-20.00 ر.س / +15.25 (75%)");
});

test("English display keeps Latin digits", () => {
  assert.equal(displayDigits("١٢٣.٤٥", "en"), "123.45");
});
