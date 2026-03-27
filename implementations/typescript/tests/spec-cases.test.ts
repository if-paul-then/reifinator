/**
 * Parametrised tests that run each spec case against the generator.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { describe, it, expect } from "vitest";

import { Generator } from "../src/generator.js";
import { UnresolvedExpressionsError } from "../src/resolution.js";
import type { BaseContentGenerator } from "../src/content.js";
import { loadConfig, loadContentGenerators } from "../src/config.js";
import {
  loadSpecCases,
  testId,
  expectsError,
  type SpecCase,
} from "./spec-loader.js";

const SPEC_CASES = loadSpecCases();

/** Recursively collect all relative paths in a directory. */
function collectPaths(dir: string, base?: string): Set<string> {
  const root = base ?? dir;
  const paths = new Set<string>();
  if (!existsSync(dir)) return paths;

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const relPath = relative(root, fullPath);
    paths.add(relPath);
    if (statSync(fullPath).isDirectory()) {
      for (const sub of collectPaths(fullPath, root)) {
        paths.add(sub);
      }
    }
  }
  return paths;
}

/** Compare two directory trees and return differences. */
function compareTrees(actual: string, expected: string): string[] {
  const diffs: string[] = [];
  const expectedItems = collectPaths(expected);
  const actualItems = collectPaths(actual);

  for (const missing of [...expectedItems].sort()) {
    if (!actualItems.has(missing)) {
      diffs.push(`Missing: ${missing}`);
    }
  }
  for (const extra of [...actualItems].sort()) {
    if (!expectedItems.has(extra)) {
      diffs.push(`Extra: ${extra}`);
    }
  }

  for (const common of [...expectedItems].sort()) {
    if (!actualItems.has(common)) continue;
    const expPath = join(expected, common);
    const actPath = join(actual, common);
    const expIsFile = statSync(expPath).isFile();
    const actIsFile = statSync(actPath).isFile();

    if (expIsFile && actIsFile) {
      const expContent = readFileSync(expPath);
      const actContent = readFileSync(actPath);
      if (!expContent.equals(actContent)) {
        diffs.push(
          `Content differs: ${common}\n` +
            `  expected: ${JSON.stringify(expContent.toString())}\n` +
            `  actual:   ${JSON.stringify(actContent.toString())}`,
        );
      }
    } else if (expIsFile !== actIsFile) {
      diffs.push(`Type mismatch: ${common} (file vs directory)`);
    }
  }

  return diffs;
}

async function buildGenerator(
  specCase: SpecCase,
  outputDir: string,
): Promise<Generator> {
  let contentGenerators: BaseContentGenerator[] = [];

  if (specCase.configPath) {
    const config = loadConfig(specCase.configPath);
    contentGenerators = await loadContentGenerators(config, specCase.inputDir);
  }

  return new Generator({
    templateDir: specCase.inputDir,
    outputDir,
    contentGenerators,
  });
}

describe("spec cases", () => {
  it("should discover at least 6 cases", () => {
    expect(SPEC_CASES.length).toBeGreaterThanOrEqual(6);
  });

  describe.each(SPEC_CASES.map((c) => [testId(c), c] as const))(
    "%s",
    (_id, specCase) => {
      it("has valid structure", () => {
        expect(existsSync(specCase.inputDir)).toBe(true);
        expect(statSync(specCase.inputDir).isDirectory()).toBe(true);

        if (expectsError(specCase)) {
          expect(specCase.expectedError).toBeTruthy();
        } else {
          expect(specCase.expectedDir).not.toBeNull();
          expect(existsSync(specCase.expectedDir!)).toBe(true);
        }
      });

      it("generates correct output", async () => {
        const tmpDir = mkdtempSync(join(tmpdir(), "reifinator-test-"));
        const outputDir = join(tmpDir, "output");

        if (expectsError(specCase)) {
          if (specCase.expectedError === "UnresolvedExpressionsError") {
            const gen = await buildGenerator(specCase, outputDir);
            await expect(
              gen.run(specCase.context),
            ).rejects.toThrow(UnresolvedExpressionsError);
          } else {
            throw new Error(
              `Unknown expected error type: ${specCase.expectedError}`,
            );
          }
        } else {
          const gen = await buildGenerator(specCase, outputDir);
          await gen.run(specCase.context);

          const diffs = compareTrees(outputDir, specCase.expectedDir!);
          if (diffs.length > 0) {
            throw new Error(
              `Output mismatch for ${testId(specCase)}:\n${diffs.join("\n")}`,
            );
          }
        }
      });
    },
  );
});
