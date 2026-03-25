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

# Content generator (template engine adapter)
content_generator:
  extension: ".mako"                                      # template file extension
  adapter: "reifinator.adapters.mako:MakoContentGenerator" # module:ClassName

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
| `content_generator.extension` | string | No | — | Template file extension (e.g., `".mako"`) |
| `content_generator.adapter` | string | No | — | Content generator class path (`module:ClassName`) |
| `debug` | boolean | No | `false` | Write debug log files |

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

| Adapter | Extension | Install |
|---------|-----------|---------|
| Built-in interpolator | `.tpl` | included (always active) |
| Mako | `.mako` | `pip install reifinator[mako]` |
| Jinja2 | `.j2` | `pip install reifinator[jinja2]` |

The built-in `.tpl` interpolator is always available regardless of configuration. When a `content_generator` is configured, it is registered alongside the built-in.
