# Reifinator

Template-structure-driven code and directory generator.

Reifinator generates files and directories from template trees, using your data model as input. It supports pluggable template adapters (e.g. Mako, Jinja2) alongside a built-in interpolator, context scripts for data transformation, and placeholder resolution in file/directory names.

## Quick Start

```bash
pip install reifinator

# With template adapter support:
pip install reifinator[mako]
pip install reifinator[jinja2]
pip install reifinator[all]
```

```bash
reify --config reifinator.yaml --input model.json --output ./generated
```

## Documentation

Full documentation, examples, and the TypeScript implementation are available at the [GitHub repository](https://github.com/if-paul-then/reifinator).
