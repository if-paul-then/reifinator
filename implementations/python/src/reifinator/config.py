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


def load_content_generator(adapter_path: str) -> BaseContentGenerator:
    """Load a content generator from a module:ClassName path string.

    Example: "reifinator.adapters.mako:MakoContentGenerator"
    """
    if ":" not in adapter_path:
        raise ValueError(
            f"Invalid adapter path '{adapter_path}'. Expected format: 'module.path:ClassName'"
        )

    module_path, class_name = adapter_path.split(":", 1)
    module = importlib.import_module(module_path)
    cls = getattr(module, class_name)
    return cls
