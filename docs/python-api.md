# Python API Reference

Reifinator can be used as a library by importing `Generator` directly. This is useful when the host project is also Python — rich objects (Pydantic models, dataclasses) flow into templates with no serialisation boundary.

## Basic Usage

```python
from reifinator import Generator

gen = Generator(
    template_dir="./templates",
    output_dir="./output",
)
gen.run(context={"model": my_model})
```

## `Generator` Constructor

```python
Generator(
    template_dir: str | Path,
    output_dir: str | Path | None = None,
    output_stage_dir: str | Path | None = None,
    output_dest_dir: str | Path | None = None,
    content_generators: list[BaseContentGenerator] | None = None,
    placeholder_resolver: PlaceholderResolver | None = None,
    context_script_name: str = "_gen_context.py",
    debug: bool = False,
)
```

| Parameter | Description |
|-----------|-------------|
| `template_dir` | Path to the template directory tree. Required. |
| `output_dir` | Output directory for 1-stage mode. Mutually exclusive with stage/dest. |
| `output_stage_dir` | Staging directory for 2-stage mode. Must be paired with `output_dest_dir`. |
| `output_dest_dir` | Destination directory for 2-stage mode. Must be paired with `output_stage_dir`. |
| `content_generators` | List of template engine adapters to register (the built-in `.tpl` interpolator is always included). |
| `placeholder_resolver` | Custom placeholder resolver. Defaults to `BracketResolver` (`[expr]` syntax). |
| `context_script_name` | Filename to look for as context scripts. Defaults to `_gen_context.py`. |
| `debug` | Write context log files alongside output. |

### Output directory rules

You must specify exactly one of:
- `output_dir` (1-stage), or
- `output_stage_dir` + `output_dest_dir` (2-stage)

Specifying both or neither raises `ValueError`.

## `Generator.run()`

```python
gen.run(context: dict[str, Any] | None = None) -> None
```

Runs the generation. The optional `context` dict is used as the initial root context. If the template root also has a `_gen_context.py`, its returned contexts are merged on top (child keys override).

Raises `FileNotFoundError` if `template_dir` does not exist.
Raises `UnresolvedExpressionsError` if any placeholder items were never resolved across all iterations.

## Public Exports

All of these are importable from `reifinator`:

```python
from reifinator import (
    Generator,              # The main generator class
    BaseContentGenerator,   # ABC for custom template engine adapters
    BuiltinInterpolator,    # The built-in {{var}} interpolator
    Content,                # Wraps generated content (returned by adapters)
    UnresolvedExpressionsError,  # Raised for unresolvable placeholders
)
```

## `Content`

```python
@dataclass
class Content:
    content: str           # The generated text
    encoding: str = "utf-8"  # Encoding used when writing to disk
```

Custom adapters return `Content` from their `generate()` method.

## Writing a Custom Adapter

Implement `BaseContentGenerator`. Adapters use keyword-only constructor arguments:

```python
from pathlib import Path
from typing import Any
from reifinator import BaseContentGenerator, Content

class MyAdapter(BaseContentGenerator):
    extension = ".myext"  # default extension — files ending in this are routed to this adapter

    def __init__(self, *, template_dir=None, extension=None):
        self.template_dir = Path(template_dir) if template_dir else None
        if extension is not None:
            self.extension = extension  # override the default

    def generate(self, template_path: Path, context: dict[str, Any]) -> Content:
        text = template_path.read_text()
        result = my_render(text, context)
        return Content(result)
```

Pass it when constructing the generator:

```python
gen = Generator(
    template_dir="./templates",
    output_dir="./output",
    content_generators=[MyAdapter()],
)
gen.run()
```

The built-in `.tpl` interpolator is always registered alongside any custom adapters. You can use both `.tpl` and `.myext` files in the same template tree.

### Extension Override

Override the default extension at instantiation:

```python
# Route .html files through Mako instead of .mako files
gen = Generator(
    template_dir="./templates",
    output_dir="./output",
    content_generators=[MakoContentGenerator(template_dir="./templates", extension=".html")],
)
```

When using a config file, the `extension` field in a `content_generators` entry achieves the same result.

## Custom Placeholder Resolver

Implement the `PlaceholderResolver` protocol:

```python
from reifinator.resolution import PlaceholderResolver, FilenameResolution

class MyResolver:
    def resolve(self, filename: str, context: dict[str, Any]) -> FilenameResolution:
        # Parse placeholders from filename, resolve against context
        # Return FilenameResolution with resolved name or None on failure
        ...
```

`FilenameResolution` fields:

| Field | Type | Description |
|-------|------|-------------|
| `original` | `str` | The original filename |
| `resolved` | `str \| None` | The resolved filename, or `None` if resolution failed |
| `expressions` | `list[str]` | All placeholder expressions found in the filename |

Computed properties: `success`, `has_expressions`, `was_substituted`.

Pass it to `Generator`:

```python
gen = Generator(
    template_dir="./templates",
    output_dir="./output",
    placeholder_resolver=MyResolver(),
)
```

## Using the Mako Adapter

```python
from reifinator import Generator
from reifinator.adapters.mako import MakoContentGenerator

gen = Generator(
    template_dir="./templates",
    output_dir="./output",
    content_generators=[MakoContentGenerator(template_dir="./templates")],
)
gen.run()
```

The Mako adapter requires `mako` to be installed (`pip install reifinator[mako]`).

## Using the Jinja2 Adapter

```python
from reifinator import Generator
from reifinator.adapters.jinja2 import Jinja2ContentGenerator

gen = Generator(
    template_dir="./templates",
    output_dir="./output",
    content_generators=[Jinja2ContentGenerator(template_dir="./templates")],
)
gen.run()
```

The Jinja2 adapter requires `jinja2` to be installed (`pip install reifinator[jinja2]`).

## Error Handling

```python
from reifinator import Generator, UnresolvedExpressionsError

gen = Generator(template_dir="./templates", output_dir="./output")
try:
    gen.run(context={"model": my_model})
except FileNotFoundError:
    # template_dir does not exist
    ...
except UnresolvedExpressionsError as e:
    # e.unresolved_items is a list of (Path, list[str]) tuples
    for path, expressions in e.unresolved_items:
        print(f"{path}: unresolved {expressions}")
except ValueError:
    # invalid output directory configuration
    ...
```
