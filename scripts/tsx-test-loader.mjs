import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const MOCKUP_SRC_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../artifacts/mockup-sandbox/src"
);

function resolveCandidateFile(basePath) {
  const extensions = [".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs"];
  if (existsSync(basePath) && statSync(basePath).isFile()) {
    return basePath;
  }
  for (const ext of extensions) {
    if (existsSync(basePath + ext) && statSync(basePath + ext).isFile()) {
      return basePath + ext;
    }
  }
  if (existsSync(basePath) && statSync(basePath).isDirectory()) {
    for (const ext of extensions) {
      const indexFile = path.join(basePath, "index" + ext);
      if (existsSync(indexFile) && statSync(indexFile).isFile()) {
        return indexFile;
      }
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = resolveCandidateFile(
      path.join(MOCKUP_SRC_ROOT, specifier.slice(2))
    );
    if (resolved) {
      return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
  }

  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.startsWith("file:")
  ) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const targetPath = path.resolve(parentDir, specifier);
    const resolved = resolveCandidateFile(targetPath);
    if (resolved) {
      return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".css")) {
    return { format: "module", source: "export default {};", shortCircuit: true };
  }

  if (url.startsWith("file:") && (url.endsWith(".tsx") || url.endsWith(".ts"))) {
    const filePath = fileURLToPath(url);
    if (!filePath.includes(`${path.sep}node_modules${path.sep}`)) {
      const sourceText = await readFile(filePath, "utf8");
      const transpiled = ts.transpileModule(sourceText, {
        fileName: filePath,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          esModuleInterop: true,
          allowImportingTsExtensions: true,
          verbatimModuleSyntax: false,
        },
      });
      return {
        format: "module",
        source: transpiled.outputText,
        shortCircuit: true,
      };
    }
  }

  return nextLoad(url, context);
}
