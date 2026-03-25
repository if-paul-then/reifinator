/**
 * Eta template engine adapter.
 */

import { readFileSync } from "node:fs";
import { Eta } from "eta";
import { BaseContentGenerator } from "../content.js";
import type { Content } from "../output.js";

export class EtaContentGenerator extends BaseContentGenerator {
  readonly extension = ".eta";
  private readonly eta: Eta;

  constructor(templateDir: string) {
    super();
    this.eta = new Eta({ views: templateDir, autoEscape: false, autoTrim: false });
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
