/**
 * Filename placeholder resolution and generation tracking.
 */

export interface FilenameResolution {
  original: string;
  resolved: string | null; // null if resolution failed
  expressions: string[]; // all expressions found in the filename
  success: boolean;
  wasSubstituted: boolean;
}

export interface PlaceholderResolver {
  resolve(filename: string, context: Record<string, unknown>): FilenameResolution;
}

/**
 * Resolves [expression] placeholders using dot-notation property access.
 */
export class BracketResolver implements PlaceholderResolver {
  private static readonly PATTERN = /\[([\w.]+)\]/g;

  resolve(
    filename: string,
    context: Record<string, unknown>,
  ): FilenameResolution {
    let resolutionFailed = false;
    const expressionsFound: string[] = [];

    const result = filename.replace(
      BracketResolver.PATTERN,
      (match, expr: string) => {
        expressionsFound.push(expr);
        const parts = expr.split(".");
        let value: unknown = context;

        try {
          for (const part of parts) {
            if (value === null || value === undefined) {
              resolutionFailed = true;
              return match;
            }
            if (typeof value === "object" && part in (value as object)) {
              value = (value as Record<string, unknown>)[part];
            } else {
              resolutionFailed = true;
              return match;
            }
          }
          return String(value);
        } catch {
          resolutionFailed = true;
          return match;
        }
      },
    );

    const resolved = resolutionFailed ? null : result;
    return {
      original: filename,
      resolved,
      expressions: expressionsFound,
      success: !resolutionFailed,
      wasSubstituted: !resolutionFailed && result !== filename,
    };
  }
}

/**
 * Tracks template items with expressions and whether they were resolved.
 */
export class GenerationTracker {
  private expressionItems = new Map<string, string[]>();
  private resolvedItems = new Set<string>();

  registerExpressionItem(itemPath: string, expressions: string[]): void {
    if (!this.expressionItems.has(itemPath)) {
      this.expressionItems.set(itemPath, expressions);
    }
  }

  markResolved(itemPath: string): void {
    this.resolvedItems.add(itemPath);
  }

  getUnresolvedItems(): Array<[string, string[]]> {
    const unresolved: Array<[string, string[]]> = [];
    for (const [path, exprs] of this.expressionItems) {
      if (!this.resolvedItems.has(path)) {
        unresolved.push([path, exprs]);
      }
    }
    return unresolved;
  }

  raiseIfUnresolved(): void {
    const unresolved = this.getUnresolvedItems();
    if (unresolved.length > 0) {
      throw new UnresolvedExpressionsError(unresolved);
    }
  }
}

export class UnresolvedExpressionsError extends Error {
  public readonly unresolvedItems: Array<[string, string[]]>;

  constructor(unresolvedItems: Array<[string, string[]]>) {
    const itemsToShow = unresolvedItems.slice(0, 5);
    const lines = [
      "The following template items have expressions that could not be resolved:",
    ];
    for (const [itemPath, expressions] of itemsToShow) {
      const exprStr = expressions.map((e) => `[${e}]`).join(", ");
      lines.push(`  - ${itemPath}: ${exprStr}`);
    }
    if (unresolvedItems.length > 5) {
      lines.push(`  ... and ${unresolvedItems.length - 5} more`);
    }
    super(lines.join("\n"));
    this.name = "UnresolvedExpressionsError";
    this.unresolvedItems = unresolvedItems;
  }
}
