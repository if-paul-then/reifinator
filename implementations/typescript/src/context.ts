/**
 * Context script loading.
 */

import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Default context script filenames by priority. */
export const CONTEXT_SCRIPT_NAMES = ["_gen_context.js", "_gen_context.mjs"];

/** Context script filenames from other implementations (skipped, not loaded). */
export const OTHER_CONTEXT_SCRIPTS = ["_gen_context.py"];

export type ContextDict = Record<string, unknown>;
export type GetContextsFn = (parentContext: ContextDict) => ContextDict[];

/**
 * Load a context script and execute its getContexts (or get_contexts) function.
 *
 * Returns a list of context dicts. If the script doesn't exist or doesn't
 * define the function, returns [parentContext] (single pass-through).
 */
export async function loadContextScript(
  dirPath: string,
  scriptNames: string[],
  parentContext: ContextDict,
): Promise<ContextDict[]> {
  for (const name of scriptNames) {
    const scriptPath = `${dirPath}/${name}`;
    if (!existsSync(scriptPath)) continue;

    const fileUrl = pathToFileURL(scriptPath).href;
    const mod = (await import(fileUrl)) as Record<string, unknown>;

    // Support both camelCase and snake_case function names
    const fn = (mod.getContexts ?? mod.get_contexts) as
      | GetContextsFn
      | undefined;

    if (typeof fn === "function") {
      return fn(parentContext);
    }

    return [parentContext];
  }

  return [parentContext];
}
