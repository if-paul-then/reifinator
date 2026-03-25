# Template Guide

How to write templates and context scripts for Reifinator.

## Overview

1. Templates are organised in directories that mirror the target output structure.
2. `_gen_context.py` files provide context data and enable iteration.
3. Directory and file names can contain `[expression]` placeholders.
4. Files with a template extension (e.g., `.tpl`, `.mako`) are rendered through a content generator.
5. All other files are copied as-is.

## Directory Structure Example

```
templates/
├── _gen_context.py                    # Root context (e.g., loads a model)
├── static-file.txt                    # Copied as-is
├── [entity.name]/                     # One directory per entity
│   ├── _gen_context.py                # Not needed if parent already iterates
│   └── [entity.name]Entity.cs.mako    # Rendered per entity
└── shared/
    └── constants.ts.tpl               # Rendered once with root context
```

## Context Scripts

Context scripts are Python files named `_gen_context.py` placed in any directory of the template tree. They control what data is available to templates and how many times a directory is processed.

### Contract

```python
def get_contexts(parent_context: dict) -> list[dict]:
    """Return a list of context dicts. The directory is processed once per dict."""
```

### Root Context

Typically loads your data model:

```python
# templates/_gen_context.py
import json
from pathlib import Path

def get_contexts(parent_context):
    model_path = Path(__file__).parent.parent / "models" / "model.json"
    with open(model_path) as f:
        model = json.load(f)
    return [{"model": model}]
```

### Iteration Context

Returns one context per item to generate:

```python
# templates/[entity.name]/_gen_context.py  (or in the parent directory)
def get_contexts(parent_context):
    model = parent_context["model"]
    return [{"entity": entity} for entity in model["entities"]]
```

### Context Merging

Child contexts are shallow-merged with the parent:

```python
merged = {**parent_context, **child_context}
```

Child keys override parent keys. The merged context is passed to all templates and subdirectories.

### Edge Cases

- **Empty list**: If `get_contexts` returns `[]`, the directory is skipped entirely — no files or subdirectories are processed.
- **No context script**: The directory is processed once with the inherited parent context.
- **Importing project modules**: Context scripts are loaded dynamically. If they need to import modules from your project (e.g., Pydantic models), use `sys.path.insert` at the top of the script:

```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
from myproject.models import load_model

def get_contexts(parent_context):
    model = load_model(Path(__file__).parent.parent / "models" / "model.json")
    return [{"model": model}]
```

## Placeholder Expressions

### Syntax

Square brackets with dot-notation: `[expression]`

```
[name]           → context["name"]
[entity.name]    → context["entity"]["name"]
[a.b.c]          → context["a"]["b"]["c"]
```

### In Directory Names

```
templates/[entity.name]/    →    output/Order/
                                  output/Product/
```

### In File Names

```
templates/[entity.name]Entity.cs    →    output/OrderEntity.cs
                                          output/ProductEntity.cs
```

### Multiple Placeholders

A single name can contain multiple placeholders:

```
[project.name].[entity.name].cs    →    MyApp.Order.cs
```

### Skipping Behaviour

If a placeholder cannot be resolved from the current context, the item is **skipped** for that iteration. This is normal when a directory contains items targeting different context variables.

After a complete run, if an item was **never** resolved across all iterations, Reifinator raises an `UnresolvedExpressionsError` to catch typos.

## Content Generation

### Built-in Interpolator (`.tpl`)

Simple `{{expression}}` substitution with dot-notation. No control structures.

```
Hello, {{name}}!
{{entity.name}} has {{entity.count}} properties.
```

### Mako Templates (`.mako`)

Install: `pip install reifinator[mako]`

Configure in `reifinator.yaml`:

```yaml
content_generator:
  extension: ".mako"
  adapter: "reifinator.adapters.mako:MakoContentGenerator"
```

Mako syntax:

```mako
## Variable substitution
${entity.name}

## Control structures
% for prop in entity.properties:
    ${prop.name}: ${prop.type}
% endfor

% if prop.nullable:
    // nullable
% endif
```

#### Helper Functions

Define reusable helpers with `<%! ... %>`:

```mako
<%!
def get_type(prop):
    return prop.type if not prop.nullable else f"{prop.type}?"
%>

${get_type(prop)} ${prop.name}
```

#### Inline Python

Execute Python code with `<% ... %>`:

```mako
<%
used_enums = [p for p in entity.properties if p.type == "enum"]
%>
```

### Jinja2 Templates (`.j2`)

Install: `pip install reifinator[jinja2]`

Configure in `reifinator.yaml`:

```yaml
content_generator:
  extension: ".j2"
  adapter: "reifinator.adapters.jinja2:Jinja2ContentGenerator"
```

Jinja2 syntax:

```jinja
{# Variable substitution #}
{{ entity.name }}

{# Control structures #}
{% for prop in entity.properties %}
    {{ prop.name }}: {{ prop.type }}
{% endfor %}

{% if prop.nullable %}
    {# nullable #}
{% endif %}
```

#### Filters

Jinja2 built-in filters work as expected:

```jinja
{{ entity.name | lower }}
{{ entity.name | upper }}
{{ items | join(", ") }}
```

### Custom Adapters

See [Python API Reference](python-api.md) for how to implement and register custom template engine adapters.

## Duplicate Prevention

When a context script returns multiple contexts and a file has no placeholders in its name, the file is generated only on the first iteration. This prevents duplicate writes of static files in iterated directories.

## Static Files

Files and directories with no placeholder expressions and no template extension are copied to the output as-is. File content is copied byte-for-byte.

## Debug Mode

Run with `--debug` to write context log files alongside output:

- `.gen_context_<N>.log` — merged context for each iteration (one per context in the directory)

```bash
reify generate --debug
```
