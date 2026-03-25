/**
 * Content generator interface and built-in string interpolator.
 */

import { readFileSync } from "node:fs";
import type { Content } from "./output.js";

export abstract class BaseContentGenerator {
  abstract readonly extension: string;

  abstract generate(
    templatePath: string,
    context: Record<string, unknown>,
  ): Content;
}

/**
 * Minimal built-in content generator using {{expression}} substitution.
 * Supports dot-notation for nested property access. No control structures.
 */
export class BuiltinInterpolator extends BaseContentGenerator {
  readonly extension = ".tpl";

  private static readonly PATTERN = /\{\{([\w.]+)\}\}/g;

  generate(templatePath: string, context: Record<string, unknown>): Content {
    const templateText = readFileSync(templatePath, "utf-8");
    const result = templateText.replace(
      BuiltinInterpolator.PATTERN,
      (_match, expr: string) => this.resolve(expr, context),
    );
    return { content: result };
  }

  private resolve(expression: string, context: Record<string, unknown>): string {
    const parts = expression.split(".");
    let value: unknown = context;
    for (const part of parts) {
      if (typeof value === "object" && value !== null && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        throw new Error(
          `Cannot resolve expression '${expression}': '${part}' not found`,
        );
      }
    }
    return String(value);
  }
}
