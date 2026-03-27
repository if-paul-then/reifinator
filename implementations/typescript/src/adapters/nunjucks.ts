/**
 * Nunjucks template engine adapter.
 */

import { readFileSync } from "node:fs";
import nunjucks from "nunjucks";
import { BaseContentGenerator } from "../content.js";
import type { Content } from "../output.js";

export interface NunjucksContentGeneratorOptions {
  templateDir?: string;
  extension?: string;
}

export class NunjucksContentGenerator extends BaseContentGenerator {
  readonly extension: string;
  private readonly env: nunjucks.Environment;

  constructor(options: NunjucksContentGeneratorOptions = {}) {
    super();
    this.extension = options.extension ?? ".njk";
    this.env = new nunjucks.Environment(
      options.templateDir
        ? new nunjucks.FileSystemLoader(options.templateDir)
        : undefined,
      { autoescape: false },
    );
  }

  generate(
    templatePath: string,
    context: Record<string, unknown>,
  ): Content {
    const templateText = readFileSync(templatePath, "utf-8");
    const result = this.env.renderString(templateText, context);
    return { content: result };
  }
}
