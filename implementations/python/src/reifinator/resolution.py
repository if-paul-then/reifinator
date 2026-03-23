"""Filename placeholder resolution and generation tracking."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol


class PlaceholderResolver(Protocol):
    """Protocol for placeholder resolution strategies."""

    def resolve(self, filename: str, context: dict[str, Any]) -> FilenameResolution:
        """Resolve placeholders in a filename against the given context."""
        ...


@dataclass
class FilenameResolution:
    """Result of attempting to resolve a filename with embedded expressions."""

    original: str
    resolved: str | None  # None if resolution failed
    expressions: list[str]  # All expressions found in the filename

    @property
    def success(self) -> bool:
        return self.resolved is not None

    @property
    def has_expressions(self) -> bool:
        return len(self.expressions) > 0

    @property
    def was_substituted(self) -> bool:
        return self.success and self.resolved != self.original


class BracketResolver:
    """Resolves [expression] placeholders using dot-notation property access.

    This is the default resolver. Expressions like [entity.name] are resolved
    by walking the context dict (and object attributes as fallback).
    """

    PATTERN = re.compile(r"\[([\w.]+)\]")

    def resolve(self, filename: str, context: dict[str, Any]) -> FilenameResolution:
        resolution_failed = False
        expressions_found: list[str] = []

        def replace(match: re.Match) -> str:
            nonlocal resolution_failed
            expr = match.group(1)
            expressions_found.append(expr)
            parts = expr.split(".")
            value: Any = context
            try:
                for part in parts:
                    if isinstance(value, dict):
                        if part not in value:
                            resolution_failed = True
                            return match.group(0)
                        value = value[part]
                    else:
                        value = getattr(value, part)
                return str(value)
            except (AttributeError, KeyError):
                resolution_failed = True
                return match.group(0)

        result = self.PATTERN.sub(replace, filename)
        return FilenameResolution(
            original=filename,
            resolved=None if resolution_failed else result,
            expressions=expressions_found,
        )


@dataclass
class GenerationTracker:
    """Tracks template items with expressions and whether they were resolved.

    After a generation run, any item that contained expressions but was never
    resolved indicates a likely error (typo, missing context variable).
    """

    expression_items: dict[Path, list[str]] = field(default_factory=dict)
    resolved_items: set[Path] = field(default_factory=set)

    def register_expression_item(self, item_path: Path, expressions: list[str]) -> None:
        if item_path not in self.expression_items:
            self.expression_items[item_path] = expressions

    def mark_resolved(self, item_path: Path) -> None:
        self.resolved_items.add(item_path)

    def get_unresolved_items(self) -> list[tuple[Path, list[str]]]:
        return [
            (path, exprs)
            for path, exprs in self.expression_items.items()
            if path not in self.resolved_items
        ]

    def raise_if_unresolved(self) -> None:
        unresolved = self.get_unresolved_items()
        if unresolved:
            raise UnresolvedExpressionsError(unresolved)


class UnresolvedExpressionsError(Exception):
    """Raised when template items with expressions could not be resolved."""

    def __init__(self, unresolved_items: list[tuple[Path, list[str]]]):
        self.unresolved_items = unresolved_items
        items_to_show = unresolved_items[:5]
        lines = ["The following template items have expressions that could not be resolved:"]
        for item_path, expressions in items_to_show:
            expr_str = ", ".join(f"[{e}]" for e in expressions)
            lines.append(f"  - {item_path}: {expr_str}")
        if len(unresolved_items) > 5:
            lines.append(f"  ... and {len(unresolved_items) - 5} more")
        super().__init__("\n".join(lines))
