"""CLI entry point — the `reify` command."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from reifinator.config import DEFAULT_CONFIG_FILENAME, load_config, load_content_generator
from reifinator.generator import Generator


def main():
    parser = argparse.ArgumentParser(
        prog="reify",
        description="Reifinator — template-structure-driven code and directory generator",
    )
    subparsers = parser.add_subparsers(dest="command")

    # --- reify generate ---
    gen_parser = subparsers.add_parser("generate", help="Run code generation")

    gen_parser.add_argument(
        "--template-dir", type=Path, help="Template directory (overrides config)"
    )
    gen_parser.add_argument(
        "--output-dir", type=Path, help="Output directory for 1-stage output (overrides config)"
    )
    gen_parser.add_argument(
        "--output-stage-dir", type=Path, help="Staging directory for 2-stage output"
    )
    gen_parser.add_argument(
        "--output-dest-dir", type=Path, help="Destination directory for 2-stage output"
    )
    gen_parser.add_argument(
        "--config",
        type=Path,
        default=None,
        help=f"Config file path (default: ./{DEFAULT_CONFIG_FILENAME})",
    )
    gen_parser.add_argument(
        "--dry-run", action="store_true", help="Show what would be generated without writing"
    )
    gen_parser.add_argument(
        "--debug", action="store_true", help="Write generation log files alongside output"
    )

    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(1)

    if args.command == "generate":
        _run_generate(args)


def _run_generate(args: argparse.Namespace) -> None:
    config = load_config(args.config)

    template_dir = args.template_dir or config.get("template_dir")
    output_dir = args.output_dir or config.get("output_dir")
    output_stage_dir = args.output_stage_dir or config.get("output_stage_dir")
    output_dest_dir = args.output_dest_dir or config.get("output_dest_dir")
    debug = args.debug or config.get("debug", False)

    if not template_dir:
        print("Error: template_dir is required (via --template-dir or config file).", file=sys.stderr)
        sys.exit(1)

    # Load content generators from config
    content_generators = []
    gen_config = config.get("content_generator")
    if gen_config and "adapter" in gen_config:
        adapter_cls = load_content_generator(gen_config["adapter"])
        content_generators.append(adapter_cls(template_dir))

    if args.dry_run:
        print("Dry run mode — generation not yet implemented for dry run.")
        sys.exit(0)

    generator = Generator(
        template_dir=template_dir,
        output_dir=output_dir,
        output_stage_dir=output_stage_dir,
        output_dest_dir=output_dest_dir,
        content_generators=content_generators,
        debug=debug,
    )
    generator.run()
    print("Generation complete.")
