"""Content generator interface and built-in string interpolator."""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

from reifinator.output import Content


class BaseContentGenerator(ABC):
    """Base class for content generators (template engine adapters)."""

    extension: str  # e.g. ".mako", ".j2", ".tpl"

    @abstractmethod
    def generate(self, template_path: Path, context: dict[str, Any]) -> Content:
        """Generate content from a template file and context."""
        ...


class BuiltinInterpolator(BaseContentGenerator):
    """Minimal built-in content generator using {{expression}} substitution.

    Supports dot-notation for nested property access. No control structures.
    Ships with every implementation for cross-language spec testing.
    """

    extension = ".tpl"

    PATTERN = re.compile(r"\{\{([\w.]+)\}\}")

    def generate(self, template_path: Path, context: dict[str, Any]) -> Content:
        template_text = template_path.read_text(encoding="utf-8")
        result = self.PATTERN.sub(lambda m: self._resolve(m.group(1), context), template_text)
        return Content(result)

    def _resolve(self, expression: str, context: dict[str, Any]) -> str:
        parts = expression.split(".")
        value: Any = context
        for part in parts:
            if isinstance(value, dict):
                value = value[part]
            else:
                value = getattr(value, part)
        return str(value)
