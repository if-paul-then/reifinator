"""Jinja2 template engine adapter.

Install: pip install reifinator[jinja2]
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from reifinator.content import BaseContentGenerator
from reifinator.output import Content


class Jinja2ContentGenerator(BaseContentGenerator):
    """Content generator using Jinja2 templates (.j2 extension)."""

    extension = ".j2"

    def __init__(self, *, template_dir: str | Path | None = None, extension: str | None = None):
        self.template_dir = Path(template_dir) if template_dir else None
        if extension is not None:
            self.extension = extension

    def generate(self, template_path: Path, context: dict[str, Any]) -> Content:
        try:
            from jinja2 import Environment, FileSystemLoader
        except ImportError:
            raise ImportError(
                "Jinja2 is required for .j2 templates. "
                "Install it with: pip install reifinator[jinja2]"
            ) from None

        search_paths = [str(template_path.parent)]
        if self.template_dir:
            search_paths.append(str(self.template_dir))

        env = Environment(loader=FileSystemLoader(search_paths))
        tmpl = env.get_template(template_path.name)
        result = tmpl.render(**context)
        return Content(result)
