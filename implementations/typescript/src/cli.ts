#!/usr/bin/env node

/**
 * CLI entry point — the `reify` command.
 */

import { Command } from "commander";
import { loadConfig, loadContentGenerators } from "./config.js";
import { Generator } from "./generator.js";

const program = new Command();

program
  .name("reify")
  .description(
    "Reifinator — template-structure-driven code and directory generator",
  );

program
  .command("generate")
  .description("Run code generation")
  .option("--template-dir <path>", "Template directory (overrides config)")
  .option(
    "--output-dir <path>",
    "Output directory for 1-stage output (overrides config)",
  )
  .option(
    "--output-stage-dir <path>",
    "Staging directory for 2-stage output",
  )
  .option(
    "--output-dest-dir <path>",
    "Destination directory for 2-stage output",
  )
  .option("--config <path>", "Config file path (default: ./reifinator.yaml)")
  .option("--dry-run", "Show what would be generated without writing")
  .option("--debug", "Write generation log files alongside output")
  .action(async (opts) => {
    const config = loadConfig(opts.config);

    const templateDir =
      opts.templateDir ?? config.template_dir;
    const outputDir =
      opts.outputDir ?? config.output_dir;
    const outputStageDir =
      opts.outputStageDir ?? config.output_stage_dir;
    const outputDestDir =
      opts.outputDestDir ?? config.output_dest_dir;
    const debug = opts.debug ?? config.debug ?? false;

    if (!templateDir) {
      console.error(
        "Error: template_dir is required (via --template-dir or config file).",
      );
      process.exit(1);
    }

    // Load content generators from config
    const contentGenerators = await loadContentGenerators(config, templateDir);

    if (opts.dryRun) {
      console.log("Dry run mode — generation not yet implemented for dry run.");
      process.exit(0);
    }

    const generator = new Generator({
      templateDir,
      outputDir,
      outputStageDir,
      outputDestDir,
      contentGenerators,
      debug,
    });

    await generator.run();
    console.log("Generation complete.");
  });

program.parse();
