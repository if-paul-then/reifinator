# Online Store Example

Generates a browsable HTML site from a domain model. Four template variants (Mako, Jinja2, Eta, Nunjucks) produce identical output, demonstrating adapter parity across Python and TypeScript. Open the generated pages directly in a browser — no server or dependencies required.

## Run

```bash
cd examples/online-store

# Python — Mako templates
pip install reifinator[mako]
reify generate --config reifinator-mako.yaml

# Python — Jinja2 templates (identical output)
pip install reifinator[jinja2]
reify generate --config reifinator-jinja2.yaml

# TypeScript — Eta templates (identical output)
npm install reifinator eta
npx reify generate --config reifinator-eta.yaml

# TypeScript — Nunjucks templates (identical output)
npm install reifinator nunjucks
npx reify generate --config reifinator-nunjucks.yaml

open output/index.html          # or xdg-open on Linux
```

## What it demonstrates

- **Cross-language adapter parity**: Mako (Python), Jinja2 (Python), Eta (TypeScript), and Nunjucks (TypeScript) templates all produce the same HTML site from the same model.
- **Context iteration**: one context script loads the model and returns one context per entity. A single template produces a page for each entity.
- **Placeholder directories**: `[entity.name]/` becomes `Product/`, `Order/`, `OrderItem/`.
- **Relationships**: the OrderItem page links to its related entities (Order, Product).
- **Static files**: `static/styles.css` is copied as-is.
- **Duplicate prevention**: `index.html` at the root is only generated once despite the per-entity iteration.

## Structure

```
online-store/
├── models/model.json             # Domain model (shared by all variants)
├── reifinator-mako.yaml          # Config for Mako variant
├── reifinator-jinja2.yaml        # Config for Jinja2 variant
├── reifinator-eta.yaml           # Config for Eta variant
├── reifinator-nunjucks.yaml      # Config for Nunjucks variant
├── templates-mako/               # Python — Mako templates (.mako)
│   ├── _gen_context.py
│   ├── index.html.mako
│   ├── [entity.name]/index.html.mako
│   └── static/styles.css
├── templates-jinja2/             # Python — Jinja2 templates (.j2)
│   ├── _gen_context.py
│   ├── index.html.j2
│   ├── [entity.name]/index.html.j2
│   └── static/styles.css
├── templates-eta/                # TypeScript — Eta templates (.eta)
│   ├── _gen_context.js
│   ├── index.html.eta
│   ├── [entity.name]/index.html.eta
│   └── static/styles.css
├── templates-nunjucks/           # TypeScript — Nunjucks templates (.njk)
│   ├── _gen_context.js
│   ├── index.html.njk
│   ├── [entity.name]/index.html.njk
│   └── static/styles.css
└── output/                       # Generated site (same for all)
```

## Extending the model

Add a new entity to `models/model.json` and re-run `reify generate`. For example, add a Customer entity:

```json
{
  "name": "Customer",
  "properties": [
    { "name": "Id", "type": "int" },
    { "name": "Name", "type": "string" },
    { "name": "Email", "type": "string" }
  ]
}
```

The generated site will include a Customer page, and the nav and index table will update automatically. No template changes needed.
