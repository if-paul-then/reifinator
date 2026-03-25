/**
 * Nunjucks template engine adapter.
 */

import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import nunjucks from "nunjucks";
import { BaseContentGenerator } from "../content.js";
import type { Content } from "../output.js";

export class NunjucksContentGenerator extends BaseContentGenerator {
  readonly extension = ".njk";
  private readonly env: nunjucks.Environment;

  constructor(templateDir: string) {
    super();
    this.env = new nunjucks.Environment(
      new nunjucks.FileSystemLoader(templateDir),
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
