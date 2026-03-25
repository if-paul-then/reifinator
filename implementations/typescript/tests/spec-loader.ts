/**
 * Shared spec case loader for tests.
 * Mirrors the Python conftest.py — loads spec/cases/ with variant support.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
export const SPEC_CASES_DIR = resolve(
  __dirname,
  "..",
  "..",
  "..",
  "spec",
  "cases",
);
const CURRENT_IMPLEMENTATION = "typescript";

export interface SpecCase {
  name: string;
  variant: string | null;
  inputDir: string;
  context: Record<string, unknown>;
  configPath: string | null;
  expectedDir: string | null;
  expectedError: string | null;
}

export function testId(c: SpecCase): string {
  return c.variant ? `${c.name}/${c.variant}` : c.name;
}

export function expectsError(c: SpecCase): boolean {
  return c.expectedError !== null;
}

interface CaseYaml {
  description?: string;
  variants?: Record<
    string,
    {
      description?: string;
      implementations?: string[] | "*";
      tags?: string[];
    }
  >;
}

function resolveFile(
  variantDir: string | null,
  caseDir: string,
  filename: string,
): string | null {
  if (variantDir) {
    const path = join(variantDir, filename);
    if (existsSync(path)) return path;
  }
  const path = join(caseDir, filename);
  if (existsSync(path)) return path;
  return null;
}

function resolveDir(
  variantDir: string | null,
  caseDir: string,
  dirname: string,
): string | null {
  if (variantDir) {
    const path = join(variantDir, dirname);
    if (existsSync(path) && statSync(path).isDirectory()) return path;
  }
  const path = join(caseDir, dirname);
  if (existsSync(path) && statSync(path).isDirectory()) return path;
  return null;
}

function loadContext(
  variantDir: string | null,
  caseDir: string,
): Record<string, unknown> {
  const path = resolveFile(variantDir, caseDir, "context.json");
  if (path) {
    return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
  }
  return {};
}

function loadExpectedError(
  variantDir: string | null,
  caseDir: string,
): string | null {
  const path = resolveFile(variantDir, caseDir, "expected_error.txt");
  if (path) return readFileSync(path, "utf-8").trim();
  return null;
}

function loadSimpleCase(caseDir: string): SpecCase {
  const context = loadContext(null, caseDir);
  const expectedDir = join(caseDir, "expected");
  const expectedError = loadExpectedError(null, caseDir);
  const name = caseDir.split("/").pop()!;

  return {
    name,
    variant: null,
    inputDir: join(caseDir, "input"),
    context,
    configPath: null,
    expectedDir:
      existsSync(expectedDir) && statSync(expectedDir).isDirectory()
        ? expectedDir
        : null,
    expectedError,
  };
}

function loadVariantCases(caseDir: string): SpecCase[] {
  const caseYamlPath = join(caseDir, "case.yaml");
  if (!existsSync(caseYamlPath)) return [];

  const caseMeta = yaml.load(
    readFileSync(caseYamlPath, "utf-8"),
  ) as CaseYaml | null;
  if (!caseMeta?.variants) return [];

  const variantsDir = join(caseDir, "variants");
  const cases: SpecCase[] = [];
  const name = caseDir.split("/").pop()!;

  for (const [variantName, variantMeta] of Object.entries(
    caseMeta.variants,
  )) {
    // Filter by implementation
    const implementations = variantMeta.implementations ?? "*";
    if (
      implementations !== "*" &&
      !implementations.includes(CURRENT_IMPLEMENTATION)
    ) {
      continue;
    }

    const variantDir = join(variantsDir, variantName);
    if (!existsSync(variantDir) || !statSync(variantDir).isDirectory()) {
      continue;
    }

    const inputDir = resolveDir(variantDir, caseDir, "input");
    if (!inputDir) continue;

    const context = loadContext(variantDir, caseDir);
    const configPath = resolveFile(variantDir, caseDir, "reifinator.yaml");
    const expectedDir = resolveDir(variantDir, caseDir, "expected");
    const expectedError = loadExpectedError(variantDir, caseDir);

    cases.push({
      name,
      variant: variantName,
      inputDir,
      context,
      configPath,
      expectedDir,
      expectedError,
    });
  }

  return cases;
}

export function loadSpecCases(): SpecCase[] {
  const cases: SpecCase[] = [];

  const entries = readdirSync(SPEC_CASES_DIR).sort();
  for (const entry of entries) {
    const caseDir = join(SPEC_CASES_DIR, entry);
    if (!statSync(caseDir).isDirectory()) continue;

    const variantsDir = join(caseDir, "variants");
    if (existsSync(variantsDir) && statSync(variantsDir).isDirectory()) {
      cases.push(...loadVariantCases(caseDir));
    } else {
      cases.push(loadSimpleCase(caseDir));
    }
  }

  return cases;
}
