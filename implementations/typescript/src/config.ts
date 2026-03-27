/**
 * Configuration loading from reifinator.yaml.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import type { BaseContentGenerator } from "./content.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_CONFIG_FILENAME = "reifinator.yaml";

export interface ContentGeneratorEntry {
  adapter: string;
  extension?: string;
}

export interface ReifinatorConfig {
  template_dir?: string;
  output_dir?: string;
  output_stage_dir?: string;
  output_dest_dir?: string;
  content_generators?: ContentGeneratorEntry[];
  debug?: boolean;
}

/**
 * Load configuration from a YAML file.
 * If no path is given, looks for reifinator.yaml in the current directory.
 * Returns an empty object if the file doesn't exist.
 */
export function loadConfig(configPath?: string): ReifinatorConfig {
  const path = configPath ?? join(process.cwd(), DEFAULT_CONFIG_FILENAME);

  if (!existsSync(path)) {
    return {};
  }

  const content = readFileSync(path, "utf-8");
  return (yaml.load(content) as ReifinatorConfig) ?? {};
}

/**
 * Dynamically load an adapter class from a module:ClassName path string.
 *
 * Example: "reifinator/adapters/eta:EtaContentGenerator"
 */
async function loadAdapterClass(
  adapterPath: string,
): Promise<new (options?: Record<string, unknown>) => BaseContentGenerator> {
  if (!adapterPath.includes(":")) {
    throw new Error(
      `Invalid adapter path '${adapterPath}'. Expected format: 'module.path:ClassName'`,
    );
  }

  const [modulePath, className] = adapterPath.split(":", 2);

  // Try loading the module: first as a package path, then relative to this package
  let mod: Record<string, unknown>;
  try {
    mod = (await import(modulePath)) as Record<string, unknown>;
  } catch {
    // If the module path starts with "reifinator/", resolve relative to this package's src/
    const localPath = modulePath.replace(/^reifinator\//, "./");
    const resolved = resolve(__dirname, localPath + ".js");
    mod = (await import(resolved)) as Record<string, unknown>;
  }

  const cls = mod[className] as new (
    options?: Record<string, unknown>,
  ) => BaseContentGenerator;

  if (!cls) {
    throw new Error(
      `Class '${className}' not found in module '${modulePath}'`,
    );
  }

  return cls;
}

/**
 * Load content generators from the config's content_generators list.
 *
 * Each entry must have an 'adapter' key. An optional 'extension' key
 * overrides the adapter's default extension.
 */
export async function loadContentGenerators(
  config: ReifinatorConfig,
  templateDir?: string,
): Promise<BaseContentGenerator[]> {
  const entries = config.content_generators ?? [];
  const generators: BaseContentGenerator[] = [];

  for (const entry of entries) {
    if (!entry.adapter) continue;

    const AdapterCls = await loadAdapterClass(entry.adapter);
    const options: Record<string, unknown> = {};
    if (templateDir !== undefined) {
      options.templateDir = templateDir;
    }
    if (entry.extension !== undefined) {
      options.extension = entry.extension;
    }
    generators.push(new AdapterCls(options));
  }

  return generators;
}
