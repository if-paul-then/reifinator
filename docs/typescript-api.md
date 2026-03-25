# TypeScript API Reference

Reifinator can be used as a library by importing `Generator` directly. This is useful when the host project is also TypeScript/JavaScript.

## Basic Usage

```typescript
import { Generator } from "reifinator";

const gen = new Generator({
  templateDir: "./templates",
  outputDir: "./output",
});
await gen.run({ model: myModel });
```

## `Generator` Constructor

```typescript
new Generator(options: GeneratorOptions)
```

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `templateDir` | `string` | Yes | — | Path to the template directory tree |
| `outputDir` | `string` | 1-stage | — | Output directory (mutually exclusive with stage/dest) |
| `outputStageDir` | `string` | 2-stage | — | Staging directory (must pair with `outputDestDir`) |
| `outputDestDir` | `string` | 2-stage | — | Destination directory (must pair with `outputStageDir`) |
| `contentGenerators` | `BaseContentGenerator[]` | No | `[]` | Template engine adapters (built-in `.tpl` is always included) |
| `placeholderResolver` | `PlaceholderResolver` | No | `BracketResolver` | Custom placeholder resolver |
| `contextScriptNames` | `string[]` | No | `["_gen_context.js", "_gen_context.mjs"]` | Context script filenames to look for |
| `debug` | `boolean` | No | `false` | Write context log files alongside output |

## `Generator.run()`

```typescript
await gen.run(context?: Record<string, unknown>): Promise<void>
```

Runs generation. The optional `context` is the initial root context. If the template root also has a context script, its returned contexts are merged on top.

Throws `UnresolvedExpressionsError` if any placeholder items were never resolved.

## Public Exports

```typescript
import {
  Generator,              // Main generator class
  BaseContentGenerator,   // Abstract class for custom adapters
  BuiltinInterpolator,    // Built-in {{var}} interpolator
  OutputDirectory,        // Output directory abstraction
  BracketResolver,        // Default [expr] placeholder resolver
  GenerationTracker,      // Tracks resolution state
  UnresolvedExpressionsError,  // Raised for unresolvable placeholders
} from "reifinator";

// Types
import type {
  GeneratorOptions,
  Content,
  FilenameResolution,
  PlaceholderResolver,
} from "reifinator";
```

## `Content`

```typescript
interface Content {
  content: string;
  encoding?: BufferEncoding;  // default: "utf-8"
}
```

## Writing a Custom Adapter

Extend `BaseContentGenerator`:

```typescript
import { readFileSync } from "node:fs";
import { BaseContentGenerator } from "reifinator";
import type { Content } from "reifinator";

class MyAdapter extends BaseContentGenerator {
  readonly extension = ".myext";

  generate(templatePath: string, context: Record<string, unknown>): Content {
    const text = readFileSync(templatePath, "utf-8");
    const result = myRender(text, context);
    return { content: result };
  }
}
```

Pass it when constructing the generator:

```typescript
const gen = new Generator({
  templateDir: "./templates",
  outputDir: "./output",
  contentGenerators: [new MyAdapter()],
});
```

## Using the Eta Adapter

```typescript
import { Generator } from "reifinator";
import { EtaContentGenerator } from "reifinator/adapters/eta";

const gen = new Generator({
  templateDir: "./templates",
  outputDir: "./output",
  contentGenerators: [new EtaContentGenerator("./templates")],
});
await gen.run();
```

Requires `eta` to be installed.

## Using the Nunjucks Adapter

```typescript
import { Generator } from "reifinator";
import { NunjucksContentGenerator } from "reifinator/adapters/nunjucks";

const gen = new Generator({
  templateDir: "./templates",
  outputDir: "./output",
  contentGenerators: [new NunjucksContentGenerator("./templates")],
});
await gen.run();
```

Requires `nunjucks` to be installed.

## Error Handling

```typescript
import { Generator, UnresolvedExpressionsError } from "reifinator";

const gen = new Generator({ templateDir: "./templates", outputDir: "./output" });
try {
  await gen.run({ model: myModel });
} catch (err) {
  if (err instanceof UnresolvedExpressionsError) {
    for (const [path, expressions] of err.unresolvedItems) {
      console.error(`${path}: unresolved ${expressions}`);
    }
  }
}
```

## Context Scripts

Context scripts are JavaScript files named `_gen_context.js` (or `.mjs`) placed at any level of the template tree. They must export a `getContexts` function:

```javascript
// _gen_context.js
export function getContexts(parentContext) {
  return [
    { entity: { name: "Order" } },
    { entity: { name: "Product" } },
  ];
}
```

Both `getContexts` (camelCase) and `get_contexts` (snake_case) are supported.
