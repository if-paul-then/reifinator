/**
 * Reifinator — template-structure-driven code and directory generator.
 */

export { Generator } from "./generator.js";
export type { GeneratorOptions } from "./generator.js";
export { BaseContentGenerator, BuiltinInterpolator } from "./content.js";
export { OutputDirectory } from "./output.js";
export type { Content } from "./output.js";
export {
  BracketResolver,
  GenerationTracker,
  UnresolvedExpressionsError,
} from "./resolution.js";
export type {
  FilenameResolution,
  PlaceholderResolver,
} from "./resolution.js";
