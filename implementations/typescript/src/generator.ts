/**
 * Core generation engine.
 */

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { BaseContentGenerator, BuiltinInterpolator } from "./content.js";
import { CONTEXT_SCRIPT_NAMES, OTHER_CONTEXT_SCRIPTS, loadContextScript } from "./context.js";
import type { ContextDict } from "./context.js";
import { OutputDirectory } from "./output.js";
import {
  BracketResolver,
  GenerationTracker,
  type PlaceholderResolver,
} from "./resolution.js";

/** Items to always skip during directory walking. */
const SKIP_NAMES = new Set([
  "__pycache__",
  "node_modules",
  ".DS_Store",
]);

export interface GeneratorOptions {
  templateDir: string;
  outputDir?: string;
  outputStageDir?: string;
  outputDestDir?: string;
  contentGenerators?: BaseContentGenerator[];
  placeholderResolver?: PlaceholderResolver;
  contextScriptNames?: string[];
  debug?: boolean;
}

export class Generator {
  private readonly templateDir: string;
  private readonly outputWriteDir: string;
  private readonly outputDestDir: string | null;
  private readonly contentGenerators: Map<string, BaseContentGenerator>;
  private readonly placeholderResolver: PlaceholderResolver;
  private readonly contextScriptNames: string[];
  private readonly debug: boolean;

  constructor(options: GeneratorOptions) {
    this.templateDir = options.templateDir;
    this.placeholderResolver =
      options.placeholderResolver ?? new BracketResolver();
    this.contextScriptNames =
      options.contextScriptNames ?? CONTEXT_SCRIPT_NAMES;
    this.debug = options.debug ?? false;

    // Build extension -> generator mapping (built-in always included)
    this.contentGenerators = new Map<string, BaseContentGenerator>();
    const builtin = new BuiltinInterpolator();
    this.contentGenerators.set(builtin.extension, builtin);
    for (const gen of options.contentGenerators ?? []) {
      this.contentGenerators.set(gen.extension, gen);
    }

    // Resolve output directories
    const [writeDir, destDir] = this.resolveOutputDirs(
      options.outputDir,
      options.outputStageDir,
      options.outputDestDir,
    );
    this.outputWriteDir = writeDir;
    this.outputDestDir = destDir;
  }

  private resolveOutputDirs(
    outputDir?: string,
    outputStageDir?: string,
    outputDestDir?: string,
  ): [string, string | null] {
    const hasSingle = outputDir !== undefined;
    const hasStage = outputStageDir !== undefined;
    const hasDest = outputDestDir !== undefined;

    if (hasSingle && (hasStage || hasDest)) {
      throw new Error(
        "Cannot specify both outputDir and outputStageDir/outputDestDir. " +
          "Use outputDir for 1-stage or outputStageDir + outputDestDir for 2-stage.",
      );
    }
    if (hasStage !== hasDest) {
      throw new Error(
        "outputStageDir and outputDestDir must both be specified for 2-stage output.",
      );
    }
    if (!hasSingle && !hasStage) {
      throw new Error(
        "No output directory configured. " +
          "Specify outputDir (1-stage) or outputStageDir + outputDestDir (2-stage).",
      );
    }

    if (hasSingle) {
      return [outputDir!, null];
    }
    return [outputStageDir!, outputDestDir!];
  }

  async run(context?: ContextDict): Promise<void> {
    if (!existsSync(this.templateDir) || !statSync(this.templateDir).isDirectory()) {
      throw new Error(
        `Template directory does not exist: ${this.templateDir}`,
      );
    }

    const rootContext = context ?? {};
    const tracker = new GenerationTracker();
    const outputRoot = new OutputDirectory(this.outputWriteDir);
    mkdirSync(this.outputWriteDir, { recursive: true });

    await this.processDirectory(
      this.templateDir,
      outputRoot,
      rootContext,
      tracker,
    );
    tracker.raiseIfUnresolved();
  }

  private async processDirectory(
    inputPath: string,
    outputDir: OutputDirectory,
    parentCtx: ContextDict,
    tracker: GenerationTracker,
  ): Promise<void> {
    const contexts = await loadContextScript(
      inputPath,
      this.contextScriptNames,
      parentCtx,
    );

    for (let idx = 0; idx < contexts.length; idx++) {
      const ctx = contexts[idx];
      const mergedCtx = { ...parentCtx, ...ctx };

      if (this.debug) {
        this.writeContextLog(outputDir.path, idx, mergedCtx);
      }

      const items = readdirSync(inputPath);
      for (const itemName of items) {
        // Skip context scripts (own and other implementations), cache dirs
        if (
          this.contextScriptNames.includes(itemName) ||
          OTHER_CONTEXT_SCRIPTS.includes(itemName) ||
          SKIP_NAMES.has(itemName)
        ) {
          continue;
        }

        const itemPath = join(inputPath, itemName);
        const resolution = this.placeholderResolver.resolve(
          itemName,
          mergedCtx,
        );

        // Track items with expressions
        if (resolution.expressions.length > 0) {
          tracker.registerExpressionItem(itemPath, resolution.expressions);
          if (resolution.success) {
            tracker.markResolved(itemPath);
          }
        }

        // Skip if resolution failed
        if (!resolution.success) {
          continue;
        }

        const outputName = resolution.resolved!;
        const stat = statSync(itemPath);

        if (stat.isDirectory()) {
          const newOutputDir = outputDir.createDir(outputName);
          await this.processDirectory(
            itemPath,
            newOutputDir,
            mergedCtx,
            tracker,
          );
        } else if (this.isTemplateFile(itemName)) {
          // Duplicate prevention: skip non-substituted files in later iterations
          if (!resolution.wasSubstituted && idx > 0) continue;

          const ext = this.getTemplateExtension(itemName)!;
          const gen = this.contentGenerators.get(ext)!;
          const content = gen.generate(itemPath, mergedCtx);
          const finalName = outputName.slice(
            0,
            outputName.length - ext.length,
          );
          outputDir.writeFile(finalName, content);
        } else {
          // Static file — copy as-is
          // Duplicate prevention for static files in iterated directories
          if (!resolution.wasSubstituted && idx > 0) continue;
          outputDir.copyFile(outputName, itemPath);
        }
      }
    }
  }

  private isTemplateFile(name: string): boolean {
    for (const ext of this.contentGenerators.keys()) {
      if (name.endsWith(ext)) return true;
    }
    return false;
  }

  private getTemplateExtension(name: string): string | null {
    for (const ext of this.contentGenerators.keys()) {
      if (name.endsWith(ext)) return ext;
    }
    return null;
  }

  private writeContextLog(
    outputPath: string,
    idx: number,
    context: ContextDict,
  ): void {
    const logContent = `# Merged context for iteration ${idx}\n${JSON.stringify(context, null, 2)}`;
    const logPath = join(outputPath, `.gen_context_${idx}.log`);
    writeFileSync(logPath, logContent, "utf-8");
  }
}
