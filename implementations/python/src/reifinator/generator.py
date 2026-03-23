"""Core generation engine."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from reifinator.content import BaseContentGenerator, BuiltinInterpolator
from reifinator.context import CONTEXT_SCRIPT_NAME, load_context_script
from reifinator.output import OutputDirectory
from reifinator.resolution import (
    BracketResolver,
    GenerationTracker,
    PlaceholderResolver,
)

logger = logging.getLogger(__name__)

# Items to always skip during directory walking
SKIP_NAMES = {"__pycache__"}


class Generator:
    """Template-structure-driven code and directory generator.

    Walks a template directory tree, resolves placeholders, invokes content
    generators, and produces a mirrored output tree.
    """

    def __init__(
        self,
        template_dir: str | Path,
        output_dir: str | Path | None = None,
        output_stage_dir: str | Path | None = None,
        output_dest_dir: str | Path | None = None,
        content_generators: list[BaseContentGenerator] | None = None,
        placeholder_resolver: PlaceholderResolver | None = None,
        context_script_name: str = CONTEXT_SCRIPT_NAME,
        debug: bool = False,
    ):
        self.template_dir = Path(template_dir)
        self.context_script_name = context_script_name
        self.debug = debug
        self.placeholder_resolver = placeholder_resolver or BracketResolver()

        # Build extension -> generator mapping
        # Always include the built-in interpolator
        self._content_generators: dict[str, BaseContentGenerator] = {}
        builtin = BuiltinInterpolator()
        self._content_generators[builtin.extension] = builtin
        for gen in content_generators or []:
            self._content_generators[gen.extension] = gen

        # Resolve output directories
        self._resolve_output_dirs(output_dir, output_stage_dir, output_dest_dir)

    def _resolve_output_dirs(
        self,
        output_dir: str | Path | None,
        output_stage_dir: str | Path | None,
        output_dest_dir: str | Path | None,
    ) -> None:
        has_single = output_dir is not None
        has_stage = output_stage_dir is not None
        has_dest = output_dest_dir is not None

        if has_single and (has_stage or has_dest):
            raise ValueError(
                "Cannot specify both output_dir and output_stage_dir/output_dest_dir. "
                "Use output_dir for 1-stage or output_stage_dir + output_dest_dir for 2-stage."
            )
        if has_stage != has_dest:
            raise ValueError(
                "output_stage_dir and output_dest_dir must both be specified for 2-stage output."
            )
        if not has_single and not has_stage:
            raise ValueError(
                "No output directory configured. "
                "Specify output_dir (1-stage) or output_stage_dir + output_dest_dir (2-stage)."
            )

        if has_single:
            self.output_write_dir = Path(output_dir)
            self.output_dest_dir: Path | None = None
        else:
            self.output_write_dir = Path(output_stage_dir)
            self.output_dest_dir = Path(output_dest_dir)

    def run(self, context: dict[str, Any] | None = None) -> None:
        """Run the generation.

        Args:
            context: Initial root context. Merged with any context scripts found.
        """
        if not self.template_dir.is_dir():
            raise FileNotFoundError(f"Template directory does not exist: {self.template_dir}")

        root_context = context or {}
        tracker = GenerationTracker()
        output_root = OutputDirectory(self.output_write_dir)
        output_root.path.mkdir(parents=True, exist_ok=True)

        self._process_directory(self.template_dir, output_root, root_context, tracker)
        tracker.raise_if_unresolved()

    def _process_directory(
        self,
        input_path: Path,
        output_dir: OutputDirectory,
        parent_ctx: dict[str, Any],
        tracker: GenerationTracker,
    ) -> None:
        # Load context script if present
        script_path = input_path / self.context_script_name
        contexts = load_context_script(script_path, parent_ctx)

        for idx, ctx in enumerate(contexts):
            merged_ctx = {**parent_ctx, **ctx}

            if self.debug:
                self._write_context_log(output_dir.path, idx, merged_ctx)

            for item in input_path.iterdir():
                # Skip context scripts, cache dirs
                if item.name == self.context_script_name or item.name in SKIP_NAMES:
                    continue

                resolution = self.placeholder_resolver.resolve(item.name, merged_ctx)

                # Track items with expressions
                if resolution.has_expressions:
                    tracker.register_expression_item(item, resolution.expressions)
                    if resolution.success:
                        tracker.mark_resolved(item)

                # Skip if resolution failed
                if not resolution.success:
                    logger.debug("Skipping %s: placeholder not in current context", item.name)
                    continue

                output_name = resolution.resolved

                if item.is_dir():
                    new_output_dir = output_dir.create_dir(output_name)
                    self._process_directory(item, new_output_dir, merged_ctx, tracker)

                elif self._is_template_file(item):
                    # Duplicate prevention: skip non-substituted files in later iterations
                    if not resolution.was_substituted and idx > 0:
                        continue

                    ext = self._get_template_extension(item)
                    gen = self._content_generators[ext]
                    content = gen.generate(item, merged_ctx)
                    final_name = output_name.removesuffix(ext)
                    output_dir.write_file(final_name, content)

                else:
                    # Static file — copy as-is
                    # Duplicate prevention for static files in iterated directories
                    if not resolution.was_substituted and idx > 0:
                        continue
                    output_dir.copy_file(output_name, item)

    def _is_template_file(self, path: Path) -> bool:
        return any(path.name.endswith(ext) for ext in self._content_generators)

    def _get_template_extension(self, path: Path) -> str:
        for ext in self._content_generators:
            if path.name.endswith(ext):
                return ext
        return ""

    def _write_context_log(
        self, output_path: Path, idx: int, context: dict[str, Any]
    ) -> None:
        import pprint

        log_content = f"# Merged context for iteration {idx}\n{pprint.pformat(context)}"
        log_path = output_path / f".gen_context_{idx}.log"
        log_path.write_text(log_content)
