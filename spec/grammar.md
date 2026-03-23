# Reifinator Specification

Version: 0.1.0

> **Audience**: This document is for implementers building a Reifinator implementation in a new language. For user-facing documentation, see the [README](../README.md) and [docs/](../docs/).

This document is the canonical specification for the Reifinator generator. All implementations (Python, TypeScript, etc.) must conform to this spec. When implementations disagree, this document is the tiebreaker.

## Overview

Reifinator walks a **template directory tree** and produces a **mirrored output tree**. Three mechanisms transform the template tree into the output:

1. **Placeholder resolution** in directory and file names
2. **Context scripts** that provide data and enable iteration
3. **Content generation** for template files (via pluggable adapters)

Files and directories that don't match any of these mechanisms are copied as-is.

## Definitions

- **Template directory**: The root directory containing the template tree (the input).
- **Output directory**: The root directory where generated output is written.
- **Context**: A dictionary (map) of key-value pairs available for placeholder resolution and content generation.
- **Context script**: A language-native script file (e.g., `_gen_context.py`) that provides context data.
- **Placeholder**: An expression embedded in a directory or file name that is resolved against the current context.
- **Content generator**: An adapter that transforms template file content using context data.

## Template Directory Walking

The generator performs a depth-first recursive walk of the template directory.

For each item (file or directory) encountered:

1. Skip items that are context scripts (e.g., `_gen_context.py`) or cache directories (e.g., `__pycache__`).
2. Attempt to resolve any placeholders in the item's name against the current context.
3. If placeholder resolution fails (a referenced variable is not in the context), **skip** this item for the current context iteration.
4. If the item is a directory, create the corresponding directory in the output and recurse into it.
5. If the item is a template file (identified by its extension), invoke the content generator and write the result (with the template extension stripped from the output filename).
6. If the item is a static file (no placeholders failed, no template extension), copy it as-is to the output.

### Ordering

Items within a directory are processed in filesystem iteration order. Implementations should not sort or reorder items unless the underlying filesystem API guarantees a specific order.

## Placeholder Expression Resolution

### Default Syntax: Bracket

The default placeholder syntax uses square brackets: `[expression]`.

Expressions support dot-notation for nested property access:

```
[name]           → context["name"]
[entity.name]    → context["entity"]["name"] (or context["entity"].name)
[a.b.c]          → context["a"]["b"]["c"]
```

A single name segment may contain multiple placeholders:

```
[entity.name]Entity.g.cs    → "OrderEntity.g.cs" (when entity.name = "Order")
```

### Resolution Rules

1. Each `[expression]` is resolved left-to-right against the current context.
2. Property access uses dictionary key lookup. If the value is an object with attributes, attribute access is also permitted.
3. If **any** placeholder in a name cannot be resolved, the entire item is skipped for the current context iteration.
4. The resolved value is converted to a string via the language's standard string conversion.

### Pluggable Syntax

The placeholder syntax is configurable. The default `bracket` syntax (`[expr]`) can be replaced with alternatives (e.g., `{{expr}}` for Jinja-style). Custom syntaxes are defined by a regular expression pattern with a capture group for the expression.

## Context Scripts

Context scripts are language-native files placed in any directory of the template tree. They provide context data for that directory and its descendants.

### File Naming

Each implementation looks for its own language's context script:

| Implementation | Context script       |
|----------------|----------------------|
| Python         | `_gen_context.py`    |
| TypeScript     | `_gen_context.ts`    |

### Contract

A context script must expose a function with the following contract:

```
get_contexts(parent_context: dict) -> list[dict]
```

- **Input**: The merged context inherited from parent directories.
- **Output**: A list of context dictionaries. The generator iterates over this list, processing the current directory once per context.

### Context Merging

When a context script returns a context dictionary, it is merged with the parent context using shallow merge (child keys override parent keys):

```
merged = {**parent_context, **child_context}
```

### No Context Script

If a directory has no context script, the generator processes it once using the inherited parent context.

### Iteration

When a context script returns multiple contexts, the directory is processed once per context. This enables generating multiple outputs from a single template:

```python
# _gen_context.py — generates one directory per entity
def get_contexts(parent_context):
    model = parent_context["model"]
    return [{"entity": entity} for entity in model.entities]
```

With a template directory named `[entity.name]/`, this produces one directory per entity.

### Duplicate Prevention

When a context script returns multiple contexts and a file in the directory has **no placeholders** in its name (i.e., it would produce the same output filename for every iteration), the file is only generated on the **first** iteration. This prevents duplicate writes of static files within iterated directories.

## Content Generation

### Template File Detection

Template files are identified by their file extension. The extension is configurable per content generator adapter:

| Adapter | Extension | Example |
|---------|-----------|---------|
| Built-in interpolator | `.tpl` | `hello.txt.tpl` → `hello.txt` |
| Mako (optional) | `.mako` | `Entity.cs.mako` → `Entity.cs` |
| Jinja2 (optional) | `.j2` | `config.yaml.j2` → `config.yaml` |

The template extension is stripped from the output filename.

### Built-in String Interpolator

Every implementation ships a minimal built-in content generator using `.tpl` extension. It performs simple `{{expression}}` substitution:

```
Hello, {{name}}!
```

With context `{"name": "world"}`, produces:

```
Hello, world!
```

The built-in interpolator supports the same dot-notation as placeholder resolution:

```
{{entity.name}} has {{entity.properties.length}} properties.
```

The built-in interpolator has **no** control structures (no loops, no conditionals). For anything beyond simple variable substitution, use a full template engine adapter.

### Content Generator Interface

Content generators implement the following interface:

```
class BaseContentGenerator:
    extension: str  # The file extension that identifies template files

    def generate(template_path: Path, context: dict) -> Content
```

The `Content` object wraps the generated string content and its encoding (default UTF-8).

## Static File and Directory Handling

Files and directories that have:
- No unresolved placeholders in their name, AND
- No template file extension

are copied to the output as-is. File content is copied byte-for-byte.

## Error Handling

### Unresolved Expressions

After a complete generation run, the generator checks whether any template item that contained placeholder expressions was **never** successfully resolved across all context iterations.

If such items exist, the generator raises an `UnresolvedExpressionsError` listing:
- The template item path
- The expressions that could not be resolved

This catches typos and missing context variables that would otherwise silently produce no output.

Note: An item being skipped in *some* iterations is normal (e.g., a file with `[entity.name]` is skipped when the context has no `entity` key). The error only fires when an item is skipped in *all* iterations.

### Configuration Errors

The following are configuration errors that must be reported before generation begins:

- `output_dir` and `output_stage_dir`/`output_dest_dir` are both specified.
- `output_stage_dir` is specified without `output_dest_dir` (or vice versa).
- No output directory is configured at all.
- The template directory does not exist.

## Output Modes

### 1-Stage Output

When `output_dir` is configured, generated files are written directly to the destination:

```
template_dir/ → output_dir/
```

### 2-Stage Output

When `output_stage_dir` and `output_dest_dir` are configured, generated files are written to the staging directory first. The staging directory mirrors what would eventually be deployed to the destination:

```
template_dir/ → output_stage_dir/ (generation target)
                output_dest_dir/  (reference for diffing/deployment)
```

The generator writes to `output_stage_dir`. Deployment from staging to destination is outside the generator's scope (handled by the user or a separate tool).

## Debug Mode

When debug mode is enabled (`--debug` flag or `debug: true` in config):

- A `.gen_context_<N>.log` file is written in each output directory showing the merged context for each iteration.

Debug mode is off by default.

## Configuration File

The generator looks for `reifinator.yaml` in the current working directory. The config file path can be overridden via `--config`.

See [docs/configuration.md](../docs/configuration.md) for the full configuration schema.
