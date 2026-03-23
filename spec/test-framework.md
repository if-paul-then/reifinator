# Test Framework

Reifinator uses shared test fixtures in `spec/cases/` to validate all implementations against the same scenarios. This document describes the test case format, the variant system for implementation-specific scenarios, and how test runners discover and execute cases.

## Case Directory Structure

### Simple cases (no variants)

A simple case has a single set of inputs and expected outputs. It applies to all implementations.

```
spec/cases/01_basic_static/
  context.json           # root context passed to generator
  input/                 # template directory tree
  expected/              # expected output tree
```

For error cases, replace `expected/` with:

```
  expected_error.txt     # error type name (e.g. "UnresolvedExpressionsError")
```

### Variant cases

A variant case has multiple named variants, each with its own inputs. Variants enable testing different template engines, input model frameworks, or language-specific features against the same (or different) expected output.

```
spec/cases/07_adapter_rendering/
  case.yaml              # variant metadata
  context.json           # shared context (used by all variants unless overridden)
  expected/              # shared expected output (used by all variants unless overridden)
  variants/
    builtin/
      input/             # template tree using .tpl files
    mako/
      input/             # template tree using .mako files
      reifinator.yaml    # adapter config for this variant
```

## `case.yaml`

Required for variant cases. Defines which variants exist and which implementations each targets.

```yaml
description: "What this case tests"

variants:
  builtin:
    description: "Built-in {{expr}} interpolator"
    implementations: [python, typescript]   # which implementations run this
  mako:
    description: "Mako template engine"
    implementations: [python]
    tags: [adapter]                         # optional freeform tags for filtering
```

### `implementations` field

- A list of implementation names: `[python]`, `[python, typescript]`
- `"*"` or omitted: the variant runs for all implementations

### `tags` field

Optional freeform strings for categorising variants. Useful for filtering test runs (e.g., `pytest -k "adapter"`).

## File Resolution

Each variant needs four artifacts. They are resolved using a fallback chain — variant-level overrides case-level:

| Artifact | Lookup order |
|----------|-------------|
| `input/` | `variants/<name>/input/` → `input/` at case root |
| `context` | `variants/<name>/context.json` → `context.json` at case root → `{}` |
| `config` | `variants/<name>/reifinator.yaml` → `reifinator.yaml` at case root → none |
| `expected/` | `variants/<name>/expected/` → `expected/` at case root |
| `expected_error` | `variants/<name>/expected_error.txt` → `expected_error.txt` at case root |

This means:
- **Shared expected output**: put `expected/` at the case root. All variants that don't override it share the same expected tree. This is the typical pattern for adapter parity tests.
- **Variant-specific expected output**: put `expected/` inside the variant directory.
- **Shared context**: put `context.json` at the case root.
- **Config**: only needed for variants that configure a template engine adapter.

## Test IDs

Test runners produce IDs for each case:

- Simple case: `01_basic_static`
- Variant case: `07_adapter_rendering/builtin`, `07_adapter_rendering/mako`

## Naming Conventions

Case directories are numbered and snake_cased: `07_adapter_rendering`.

Variant directories use descriptive kebab-case names. When a variant combines multiple dimensions, join them: `python-mako-pydantic`.

## Common Patterns

### Adapter parity

Test that different template engines produce identical output from equivalent templates. Share `expected/` at the case root, put engine-specific `input/` and `reifinator.yaml` in each variant.

```
case-root/
  expected/              # shared — all adapters must produce this
  variants/
    builtin/input/       # .tpl templates
    mako/input/          # .mako templates + reifinator.yaml
    jinja2/input/        # .j2 templates + reifinator.yaml
```

### Input model variants

Test that different data representations (plain dicts, Pydantic, dataclasses) produce the same output. Each variant has a different `_gen_context.py` that loads data differently.

```
case-root/
  expected/
  variants/
    dict-input/input/          # context script returns dicts
    pydantic-input/input/      # context script returns Pydantic objects
```

### Cross-language parity

Test that different implementations produce the same output from equivalent context scripts. Each variant contains the language-appropriate context script.

```
case-root/
  expected/
  variants/
    python/
      input/
        _gen_context.py
        template.txt.tpl
    typescript/
      input/
        _gen_context.ts
        template.txt.tpl
```

## Adding a New Case

1. Create a numbered directory: `spec/cases/09_my_scenario/`
2. For a simple case: add `context.json`, `input/`, `expected/`
3. For a variant case:
   - Create `case.yaml` with variant definitions
   - Create `variants/<name>/input/` for each variant
   - Add shared `context.json` and `expected/` at the case root (or per-variant overrides)
   - Add `reifinator.yaml` in any variant that needs a specific adapter
4. Run tests to verify
