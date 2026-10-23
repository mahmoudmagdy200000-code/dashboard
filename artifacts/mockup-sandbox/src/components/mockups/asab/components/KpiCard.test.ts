import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("./KpiCard.tsx", import.meta.url), "utf8");
const sourceFile = ts.createSourceFile("KpiCard.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function findNode<T extends ts.Node>(node: ts.Node, predicate: (candidate: ts.Node) => candidate is T): T | undefined {
  if (predicate(node)) return node;
  return ts.forEachChild(node, child => findNode(child, predicate));
}

function jsxTag(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
  const tagName = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
  return tagName.getText();
}

function collectJsxTags(node: ts.Node, tags: string[] = []): string[] {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) tags.push(jsxTag(node));
  if (ts.isJsxElement(node)) {
    node.children.forEach(child => collectJsxTags(child, tags));
  } else if (ts.isJsxFragment(node)) {
    node.children.forEach(child => collectJsxTags(child, tags));
  } else {
    ts.forEachChild(node, child => collectJsxTags(child, tags));
  }
  return tags;
}

test("interactive KpiCard uses a native focused button and valid phrasing content", () => {
  const content = findNode(sourceFile, (node): node is ts.VariableDeclaration =>
    ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "content",
  );
  const button = findNode(sourceFile, (node): node is ts.JsxElement =>
    ts.isJsxElement(node) && node.openingElement.tagName.getText(sourceFile) === "button",
  );

  assert.ok(content?.initializer, "card content should be defined");
  assert.ok(button, "interactive card should render a button");
  const contentTags = collectJsxTags(content.initializer);
  assert.ok(!contentTags.some(tag => tag === "div" || tag === "p"), "button descendants must not contain flow-content elements");
  assert.ok(contentTags.includes("span"), "card content should use phrasing wrappers");
  assert.match(button.openingElement.getText(sourceFile), /type="button"/);
  assert.match(button.openingElement.getText(sourceFile), /focus-visible:ring-2/);
  assert.match(button.children.map(child => child.getText(sourceFile)).join(""), /\{content\}/);
});

test("informational KpiCard remains a noninteractive div", () => {
  const noninteractiveReturn = sourceFile.statements
    .flatMap(statement => ts.isFunctionDeclaration(statement) ? [statement] : [])
    .flatMap(fn => {
      const returns: ts.ReturnStatement[] = [];
      const visit = (node: ts.Node) => {
        if (ts.isReturnStatement(node) && node.expression && (ts.isJsxElement(node.expression) || ts.isJsxSelfClosingElement(node.expression))) returns.push(node);
        ts.forEachChild(node, visit);
      };
      visit(fn);
      return returns;
    })
    .find(statement => statement.expression?.getText(sourceFile).includes("className={cardClassName}"));

  assert.ok(noninteractiveReturn, "informational card should retain a noninteractive return");
  assert.match(noninteractiveReturn.expression?.getText(sourceFile) ?? "", /<div/);
  assert.doesNotMatch(noninteractiveReturn.expression?.getText(sourceFile) ?? "", /tabIndex|onClick/);
});

test("jsxTag reads opening tags for paired and self-closing JSX elements", () => {
  const fixture = ts.createSourceFile(
    "jsx-tag-fixture.tsx",
    "<section><Icon /></section>",
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  assert.deepEqual(collectJsxTags(fixture), ["section", "Icon"]);
});
