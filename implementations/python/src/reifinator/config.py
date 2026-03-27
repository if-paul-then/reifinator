"""Configuration loading from reifinator.yaml."""

from __future__ import annotations

import importlib
from pathlib import Path
from typing import Any

import yaml

from reifinator.content import BaseContentGenerator

DEFAULT_CONFIG_FILENAME = "reifinator.yaml"


def load_config(config_path: Path | None = None) -> dict[str, Any]:
    """Load configuration from a YAML file.

    If no path is given, looks for reifinator.yaml in the current directory.
    Returns an empty dict if the file doesn't exist.
    """
    if config_path is None:
        config_path = Path.cwd() / DEFAULT_CONFIG_FILENAME

    if not config_path.exists():
        return {}

    with open(config_path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _load_adapter_class(adapter_path: str) -> type[BaseContentGenerator]:
    """Load a content generator class from a module:ClassName path string.

    Example: "reifinator.adapters.mako:MakoContentGenerator"
    """
    if ":" not in adapter_path:
        raise ValueError(
            f"Invalid adapter path '{adapter_path}'. Expected format: 'module.path:ClassName'"
        )

    module_path, class_name = adapter_path.split(":", 1)
    module = importlib.import_module(module_path)
    return getattr(module, class_name)


def load_content_generators(
    config: dict[str, Any], template_dir: str | Path | None = None
) -> list[BaseContentGenerator]:
    """Load content generators from the config's content_generators list.

    Each entry must have an 'adapter' key. An optional 'extension' key
    overrides the adapter's default extension.
    """
    entries = config.get("content_generators", [])
    if not entries:
        return []

    generators = []
    for entry in entries:
        adapter_path = entry.get("adapter")
        if not adapter_path:
            continue

        adapter_cls = _load_adapter_class(adapter_path)
        kwargs: dict[str, Any] = {}
        if template_dir is not None:
            kwargs["template_dir"] = template_dir
        extension = entry.get("extension")
        if extension is not None:
            kwargs["extension"] = extension

        generators.append(adapter_cls(**kwargs))

    return generators
