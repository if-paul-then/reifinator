# Online Store Example

Generates a browsable HTML site from a domain model using Mako templates. Open the generated pages directly in a browser — no server or dependencies required.

## Run

```bash
cd examples/online-store
pip install reifinator[mako]
reify generate
open output/index.html       # or xdg-open on Linux
```

## What it demonstrates

- **Context iteration**: one `_gen_context.py` loads the model and returns one context per entity. A single template produces a page for each entity.
- **Placeholder directories**: `[entity.name]/` becomes `Product/`, `Order/`, `OrderItem/`.
- **Relationships**: the OrderItem page links to its related entities (Order, Product).
- **Static files**: `static/styles.css` is copied as-is.
- **Duplicate prevention**: `index.html` at the root is only generated once despite the per-entity iteration.

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
