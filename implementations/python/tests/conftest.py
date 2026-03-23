"""Shared fixtures: loads spec/cases/ for parametrised testing."""

import json
from dataclasses import dataclass
from pathlib import Path

import pytest
import yaml

SPEC_CASES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "spec" / "cases"
CURRENT_IMPLEMENTATION = "python"


@dataclass
class SpecCase:
    """A single spec test case (or variant) loaded from spec/cases/."""

    name: str
    variant: str | None
    input_dir: Path
    context: dict
    config_path: Path | None  # reifinator.yaml for configuring adapters
    expected_dir: Path | None  # None for error cases
    expected_error: str | None  # Error type name, e.g. "UnresolvedExpressionsError"

    @property
    def test_id(self) -> str:
        if self.variant:
            return f"{self.name}/{self.variant}"
        return self.name

    @property
    def expects_error(self) -> bool:
        return self.expected_error is not None


def _resolve_file(variant_dir: Path | None, case_dir: Path, filename: str) -> Path | None:
    """Resolve a file using the fallback chain: variant → case → None."""
    if variant_dir:
        path = variant_dir / filename
        if path.exists():
            return path
    path = case_dir / filename
    if path.exists():
        return path
    return None


def _resolve_dir(variant_dir: Path | None, case_dir: Path, dirname: str) -> Path | None:
    """Resolve a directory using the fallback chain: variant → case → None."""
    if variant_dir:
        path = variant_dir / dirname
        if path.is_dir():
            return path
    path = case_dir / dirname
    if path.is_dir():
        return path
    return None


def _load_context(variant_dir: Path | None, case_dir: Path) -> dict:
    """Load context.json using the fallback chain."""
    path = _resolve_file(variant_dir, case_dir, "context.json")
    if path:
        return json.loads(path.read_text())
    return {}


def _load_expected_error(variant_dir: Path | None, case_dir: Path) -> str | None:
    """Load expected_error.txt using the fallback chain."""
    path = _resolve_file(variant_dir, case_dir, "expected_error.txt")
    if path:
        return path.read_text().strip()
    return None


def _load_simple_case(case_dir: Path) -> SpecCase:
    """Load a simple (non-variant) spec case."""
    context = _load_context(None, case_dir)
    expected_dir = case_dir / "expected"
    expected_error = _load_expected_error(None, case_dir)

    return SpecCase(
        name=case_dir.name,
        variant=None,
        input_dir=case_dir / "input",
        context=context,
        config_path=None,
        expected_dir=expected_dir if expected_dir.is_dir() else None,
        expected_error=expected_error,
    )


def _load_variant_cases(case_dir: Path) -> list[SpecCase]:
    """Load variant cases from a case directory with case.yaml and variants/."""
    case_yaml_path = case_dir / "case.yaml"
    if not case_yaml_path.exists():
        return []

    with open(case_yaml_path, encoding="utf-8") as f:
        case_meta = yaml.safe_load(f) or {}

    variants_meta = case_meta.get("variants", {})
    variants_dir = case_dir / "variants"
    cases = []

    for variant_name, variant_meta in variants_meta.items():
        # Filter by implementation
        implementations = variant_meta.get("implementations", "*")
        if implementations != "*" and CURRENT_IMPLEMENTATION not in implementations:
            continue

        variant_dir = variants_dir / variant_name
        if not variant_dir.is_dir():
            continue

        input_dir = _resolve_dir(variant_dir, case_dir, "input")
        if not input_dir:
            continue

        context = _load_context(variant_dir, case_dir)
        config_path = _resolve_file(variant_dir, case_dir, "reifinator.yaml")
        expected_dir = _resolve_dir(variant_dir, case_dir, "expected")
        expected_error = _load_expected_error(variant_dir, case_dir)

        cases.append(
            SpecCase(
                name=case_dir.name,
                variant=variant_name,
                input_dir=input_dir,
                context=context,
                config_path=config_path,
                expected_dir=expected_dir,
                expected_error=expected_error,
            )
        )

    return cases


def load_spec_cases() -> list[SpecCase]:
    """Discover and load all spec cases from the shared spec/cases/ directory."""
    cases = []
    for case_dir in sorted(SPEC_CASES_DIR.iterdir()):
        if not case_dir.is_dir():
            continue

        variants_dir = case_dir / "variants"
        if variants_dir.is_dir():
            cases.extend(_load_variant_cases(case_dir))
        else:
            cases.append(_load_simple_case(case_dir))

    return cases


SPEC_CASES = load_spec_cases()


@pytest.fixture(params=SPEC_CASES, ids=[c.test_id for c in SPEC_CASES])
def spec_case(request) -> SpecCase:
    """Parametrised fixture yielding each spec case."""
    return request.param
