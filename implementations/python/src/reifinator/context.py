"""Context script loading."""

from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any

# Default context script filename for the Python implementation
CONTEXT_SCRIPT_NAME = "_gen_context.py"

# Context script filenames from other implementations (skipped, not loaded)
OTHER_CONTEXT_SCRIPTS = {"_gen_context.js", "_gen_context.mjs", "_gen_context.ts"}


def load_context_script(
    script_path: Path, parent_context: dict[str, Any]
) -> list[dict[str, Any]]:
    """Load a context script and execute its get_contexts function.

    Returns a list of context dicts. If the script doesn't exist or doesn't
    define get_contexts, returns [parent_context] (single pass-through).
    """
    if not script_path.exists():
        return [parent_context]

    spec = importlib.util.spec_from_file_location("_gen_context", script_path)
    if not spec or not spec.loader:
        return [parent_context]

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    if hasattr(module, "get_contexts"):
        return module.get_contexts(parent_context)

    return [parent_context]
