# Online Store Example

Generates a browsable HTML site from a domain model. Two template variants (Mako and Jinja2) produce identical output, demonstrating adapter parity. Open the generated pages directly in a browser — no server or dependencies required.

## Run

```bash
cd examples/online-store
pip install reifinator[mako]    # or reifinator[jinja2]

# Generate with Mako templates
reify generate --config reifinator-mako.yaml

# Or generate with Jinja2 templates (identical output)
reify generate --config reifinator-jinja2.yaml

open output/index.html          # or xdg-open on Linux
```

## What it demonstrates

- **Adapter parity**: Mako and Jinja2 templates produce the same HTML site from the same model.
- **Context iteration**: one `_gen_context.py` loads the model and returns one context per entity. A single template produces a page for each entity.
- **Placeholder directories**: `[entity.name]/` becomes `Product/`, `Order/`, `OrderItem/`.
- **Relationships**: the OrderItem page links to its related entities (Order, Product).
- **Static files**: `static/styles.css` is copied as-is.
- **Duplicate prevention**: `index.html` at the root is only generated once despite the per-entity iteration.

## Structure

```
online-store/
├── models/model.json             # Domain model (shared by both variants)
├── reifinator-mako.yaml          # Config for Mako variant
├── reifinator-jinja2.yaml        # Config for Jinja2 variant
├── templates-mako/               # Mako templates (.mako)
│   ├── _gen_context.py
│   ├── index.html.mako
│   ├── [entity.name]/index.html.mako
│   └── static/styles.css
├── templates-jinja2/             # Jinja2 templates (.j2)
│   ├── _gen_context.py
│   ├── index.html.j2
│   ├── [entity.name]/index.html.j2
│   └── static/styles.css
└── output/                       # Generated site (same for both)
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