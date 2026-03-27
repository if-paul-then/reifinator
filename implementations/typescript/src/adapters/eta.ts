/**
 * Eta template engine adapter.
 */

import { readFileSync } from "node:fs";
import { Eta } from "eta";
import { BaseContentGenerator } from "../content.js";
import type { Content } from "../output.js";

export interface EtaContentGeneratorOptions {
  templateDir?: string;
  extension?: string;
}

export class EtaContentGenerator extends BaseContentGenerator {
  readonly extension: string;
  private readonly eta: Eta;

  constructor(options: EtaContentGeneratorOptions = {}) {
    super();
    this.extension = options.extension ?? ".eta";
    this.eta = new Eta({
      views: options.templateDir,
      autoEscape: false,
      autoTrim: false,
    });
  }

  generate(
    templatePath: string,
    context: Record<string, unknown>,
  ): Content {
    const templateText = readFileSync(templatePath, "utf-8");
    const result = this.eta.renderString(templateText, context);
    return { content: result };
  }
}
