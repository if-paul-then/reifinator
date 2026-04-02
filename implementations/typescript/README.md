# Reifinator

Template-structure-driven code and directory generator.

Reifinator generates files and directories from template trees, using your data model as input. It supports pluggable template adapters (e.g. Eta, Nunjucks) alongside a built-in interpolator, context scripts for data transformation, and placeholder resolution in file/directory names.

## Quick Start

```bash
npm install reifinator
```

Eta and Nunjucks are optional peer dependencies — install the ones you need:

```bash
npm install eta
npm install nunjucks
```

```bash
npx reify --config reifinator.yaml --input model.json --output ./generated
```

## Documentation

Full documentation, examples, and the Python implementation are available at the [GitHub repository](https://github.com/if-paul-then/reifinator).
