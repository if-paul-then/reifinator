# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - 2026-03-27

Initial release.

### Added

- Template-structure-driven generation: template directory tree mirrors the output structure
- Placeholder resolution in directory and file names (`[expression]` syntax with dot-notation)
- Context scripts (`_gen_context.py` / `_gen_context.js`) for providing data and enabling iteration
- Built-in `{{variable}}` string interpolator (`.tpl` extension)
- Pluggable template engine adapters with configurable extension override
- Python implementation with Mako (`.mako`) and Jinja2 (`.j2`) adapters
- TypeScript implementation with Eta (`.eta`) and Nunjucks (`.njk`) adapters
- Cross-language context script skipping (Python skips `.js`/`.ts` scripts and vice versa)
- 1-stage and 2-stage output modes
- CLI (`reify generate`) with config file support (`reifinator.yaml`)
- Embedding API for both Python and TypeScript
- Duplicate prevention for static and template files in iterated directories
- Unresolved expression detection with error reporting
- Debug mode with context logging
- Shared spec test fixtures with variant system for cross-implementation and cross-adapter parity testing
