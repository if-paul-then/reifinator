# Reifinator

A template-structure-driven code and directory generator. Define your output structure as a template directory tree, and Reifinator walks it to produce the real thing — resolving placeholders, iterating over context data, and rendering template files through the engine of your choice.

"Reify" means to make something abstract concrete. That's what this tool does.

## Features

- **Template directory structure IS the output structure** — the template tree mirrors the desired output. No manifest file mapping templates to destinations.
- **Pluggable template engines** — no lock-in to a specific templating framework. Use Mako, Jinja2, Handlebars, or anything else. Ships with a minimal `{{variable}}` interpolator for simple cases.
- **Configurable placeholder syntax** — directory and file name placeholders default to `[expression]` with dot-notation, but the syntax is pluggable.
- **Context scripts for iteration** — place a `_gen_context.py` at any level of the template tree to provide data and multiply output (e.g., one directory per entity from a single template).
- **Model-agnostic** — any data model works as long as your chosen template engine can consume it. Load a JSON file as plain dicts, use Pydantic models with computed properties, dataclasses, or any Python object. Reifinator doesn't impose a schema — your context scripts decide what data to load and how to structure it.
- **Embeddable** — use as a CLI tool or import directly into Python. When embedded, rich Python objects (with computed properties, methods) flow into templates with no serialisation boundary.
- **Multi-language implementations** — Python today, TypeScript planned. All implementations validated against the same shared spec fixtures to guarantee identical behaviour.

### Comparison

| Feature | Reifinator | Cookiecutter | Copier | Yeoman | Hygen |
|---------|-----------|--------------|--------|--------|-------|
| Template tree = output tree | Yes | Yes | Yes | No | No |
| Pluggable template engine | Yes | No (Jinja2) | No (Jinja2) | No (EJS) | No (EJS) |
| Context scripts for iteration | Yes | No | No | No | No |
| Embeddable as library | Yes | Limited | Limited | No | No |
| Multi-language implementations | Planned | No | No | No | No |
| Config format | YAML | JSON | YAML | JSON | JS |

## How It Works

Given a template tree like:

```
templates/
├── _gen_context.py          # provides {"entities": [...]}
├── [entity.name]/
│   └── model.txt.tpl        # "Entity: {{entity.name}}"
└── README.txt               # static file, copied as-is
```

And a context script that returns one context per entity:

```python
# _gen_context.py
def get_contexts(parent_context):
    return [
        {"entity": {"name": "Order"}},
        {"entity": {"name": "Product"}},
    ]
```

Reifinator produces:

```
output/
├── Order/
│   └── model.txt            # "Entity: Order"
├── Product/
│   └── model.txt            # "Entity: Product"
└── README.txt               # copied as-is
```

## Quick Start

### Install

```bash
pip install reifinator

# With a template engine adapter:
pip install reifinator[mako]
```

### CLI

```bash
# Using a config file (reifinator.yaml in current directory)
reify generate

# With explicit paths
reify generate --template-dir ./templates --output-dir ./output

# Debug mode — writes context log files alongside output
reify generate --debug
```

### Python API

```python
from reifinator import Generator

gen = Generator(
    template_dir="./templates",
    output_dir="./output",
)
gen.run(context={"model": my_model})
```

See [docs/python-api.md](docs/python-api.md) for the full embedding API reference.

## Configuration

Create a `reifinator.yaml` in your project root:

```yaml
template_dir: ./templates
output_dir: ./output

# Optional: use a full template engine instead of the built-in interpolator
content_generator:
  extension: ".mako"
  adapter: "reifinator.adapters.mako:MakoContentGenerator"
```

See [docs/configuration.md](docs/configuration.md) for the full configuration reference including 2-stage output.

## Documentation

- [Template Guide](docs/template-guide.md) — writing templates, context scripts, placeholders, and custom adapters
- [Configuration Reference](docs/configuration.md) — config file fields, CLI flags, output modes
- [Python API Reference](docs/python-api.md) — embedding Reifinator as a library

## Project Structure

```
reifinator/
├── spec/              # Language-agnostic spec and shared test fixtures
├── implementations/
│   ├── python/        # Python implementation (current)
│   └── typescript/    # TypeScript implementation (planned)
├── docs/              # Documentation
└── examples/          # Working examples
```

For contributors and implementers:
- [spec/grammar.md](spec/grammar.md) — canonical cross-implementation specification
- [spec/test-framework.md](spec/test-framework.md) — test case format and variant system

## License

MIT
