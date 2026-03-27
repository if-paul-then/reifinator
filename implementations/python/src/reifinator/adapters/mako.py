"""Mako template engine adapter.

Install: pip install reifinator[mako]
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from reifinator.content import BaseContentGenerator
from reifinator.output import Content


class MakoContentGenerator(BaseContentGenerator):
    """Content generator using Mako templates (.mako extension)."""

    extension = ".mako"

    def __init__(self, *, template_dir: str | Path | None = None, extension: str | None = None):
        self.template_dir = Path(template_dir) if template_dir else None
        if extension is not None:
            self.extension = extension

    def generate(self, template_path: Path, context: dict[str, Any]) -> Content:
        try:
            from mako.template import Template
            from mako.lookup import TemplateLookup
        except ImportError:
            raise ImportError(
                "Mako is required for .mako templates. "
                "Install it with: pip install reifinator[mako]"
            ) from None

        directories = []
        if self.template_dir:
            directories.append(str(self.template_dir))
        directories.append(str(template_path.parent))

        lookup = TemplateLookup(directories=directories)
        tmpl = Template(filename=str(template_path), lookup=lookup)
        result = tmpl.render(**context)
        return Content(result)
