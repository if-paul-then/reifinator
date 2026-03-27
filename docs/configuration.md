# Configuration Reference

Reifinator is configured via `reifinator.yaml` in your project root, or a custom path passed with `--config`.

## Full Example

```yaml
# Template directory (required)
template_dir: ./templates

# Output — choose one mode:

# 1-stage: write directly to destination
output_dir: ./output

# 2-stage: write to staging, deploy separately
# output_stage_dir: ./generated
# output_dest_dir: ../../my-project

# Content generators (template engine adapters)
content_generators:
  - adapter: "reifinator.adapters.mako:MakoContentGenerator"

# Write debug log files alongside output (default: false)
debug: false
```

## Config Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `template_dir` | string | Yes | — | Path to the template directory tree |
| `output_dir` | string | Either this or stage/dest | — | Output directory (1-stage mode) |
| `output_stage_dir` | string | Pair with `output_dest_dir` | — | Staging directory (2-stage mode) |
| `output_dest_dir` | string | Pair with `output_stage_dir` | — | Destination directory (2-stage mode) |
| `content_generators` | list | No | `[]` | List of content generator entries (see below) |
| `debug` | boolean | No | `false` | Write debug log files |

### Content Generator Entries

Each entry in `content_generators` has these fields:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `adapter` | string | Yes | — | Adapter class path (`module:ClassName`) |
| `extension` | string | No | from adapter class | File extension that routes to this adapter. Defaults to the adapter's built-in extension (e.g., `.mako`). |

### Extension Override

Each adapter declares a default file extension (e.g., `.mako`, `.j2`, `.eta`). The `extension` field in config overrides this default, allowing you to map a different extension to the adapter:

```yaml
# Use .html files as Mako templates instead of .mako
content_generators:
  - adapter: "reifinator.adapters.mako:MakoContentGenerator"
    extension: ".html"
```

### Multiple Adapters

Multiple adapters can be configured to use different template engines in the same project:

```yaml
content_generators:
  - adapter: "reifinator.adapters.mako:MakoContentGenerator"
  - adapter: "reifinator.adapters.jinja2:Jinja2ContentGenerator"
```

## Output Modes

`output_dir` and `output_stage_dir`/`output_dest_dir` are mutually exclusive. Specifying both is an error.

### 1-Stage

Generated files are written directly to `output_dir`.

### 2-Stage

Generated files are written to `output_stage_dir`. The `output_dest_dir` is recorded for reference (e.g., diffing before deploying generated files into a larger project). Deployment from staging to destination is outside the generator's scope.

```yaml
template_dir: ./templates
output_stage_dir: ./generated        # files written here first
output_dest_dir: ../../my-project    # reference for diffing/deployment
```

## CLI Flags

All config fields can be overridden via CLI flags. CLI flags take precedence over config file values.

```
reify generate [OPTIONS]
```

| Flag | Description |
|------|-------------|
| `--config PATH` | Config file path (default: `./reifinator.yaml`) |
| `--template-dir PATH` | Template directory (overrides config) |
| `--output-dir PATH` | Output directory for 1-stage output (overrides config) |
| `--output-stage-dir PATH` | Staging directory for 2-stage output (overrides config) |
| `--output-dest-dir PATH` | Destination directory for 2-stage output (overrides config) |
| `--debug` | Write generation log files alongside output |
| `--dry-run` | *Not yet implemented.* Intended to show what would be generated without writing. |

## Built-in Adapters

### Python

| Adapter | Default Extension | Install |
|---------|-------------------|---------|
| Built-in interpolator | `.tpl` | included (always active) |
| Mako | `.mako` | `pip install reifinator[mako]` |
| Jinja2 | `.j2` | `pip install reifinator[jinja2]` |

### TypeScript

| Adapter | Default Extension | Install |
|---------|-------------------|---------|
| Built-in interpolator | `.tpl` | included (always active) |
| Eta | `.eta` | `npm install eta` |
| Nunjucks | `.njk` | `npm install nunjucks` |

The built-in `.tpl` interpolator is always available regardless of configuration. When content generators are configured, they are registered alongside the built-in.
