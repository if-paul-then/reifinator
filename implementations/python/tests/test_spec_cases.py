"""Parametrised tests that run each spec case against the generator."""

from pathlib import Path

import pytest

from reifinator import Generator, UnresolvedExpressionsError
from reifinator.config import load_config, load_content_generator
from tests.conftest import SPEC_CASES, SpecCase


def test_spec_cases_loaded():
    """Verify that spec cases were discovered."""
    assert len(SPEC_CASES) >= 6, f"Expected at least 6 spec cases, found {len(SPEC_CASES)}"


def test_spec_case_structure(spec_case: SpecCase):
    """Verify each spec case has the required structure."""
    assert spec_case.input_dir.is_dir(), f"{spec_case.test_id}: input/ directory missing"
    assert spec_case.context is not None, f"{spec_case.test_id}: context is None"

    if spec_case.expects_error:
        assert spec_case.expected_error, f"{spec_case.test_id}: expected_error is empty"
    else:
        assert spec_case.expected_dir is not None, f"{spec_case.test_id}: expected/ directory missing"
        assert spec_case.expected_dir.is_dir(), f"{spec_case.test_id}: expected/ is not a directory"


def _compare_trees(actual: Path, expected: Path) -> list[str]:
    """Recursively compare two directory trees, returning a list of differences."""
    diffs = []

    expected_items = {p.relative_to(expected) for p in expected.rglob("*")}
    actual_items = {p.relative_to(actual) for p in actual.rglob("*")}

    for missing in sorted(expected_items - actual_items):
        diffs.append(f"Missing: {missing}")
    for extra in sorted(actual_items - expected_items):
        diffs.append(f"Extra: {extra}")

    for common in sorted(expected_items & actual_items):
        exp_path = expected / common
        act_path = actual / common
        if exp_path.is_file() and act_path.is_file():
            if exp_path.read_bytes() != act_path.read_bytes():
                diffs.append(
                    f"Content differs: {common}\n"
                    f"  expected: {exp_path.read_text()!r}\n"
                    f"  actual:   {act_path.read_text()!r}"
                )
        elif exp_path.is_file() != act_path.is_file():
            diffs.append(f"Type mismatch: {common} (file vs directory)")

    return diffs


def _build_generator(spec_case: SpecCase, output_dir: Path) -> Generator:
    """Build a Generator instance, loading config from the spec case if present."""
    content_generators = []

    if spec_case.config_path:
        config = load_config(spec_case.config_path)
        gen_config = config.get("content_generator")
        if gen_config and "adapter" in gen_config:
            adapter_cls = load_content_generator(gen_config["adapter"])
            content_generators.append(adapter_cls(template_dir=spec_case.input_dir))

    return Generator(
        template_dir=spec_case.input_dir,
        output_dir=output_dir,
        content_generators=content_generators,
    )


def test_generation(spec_case: SpecCase, tmp_path: Path):
    """Run the generator for each spec case and compare output to expected."""
    output_dir = tmp_path / "output"

    if spec_case.expects_error:
        error_type = spec_case.expected_error
        if error_type == "UnresolvedExpressionsError":
            with pytest.raises(UnresolvedExpressionsError):
                gen = _build_generator(spec_case, output_dir)
                gen.run(context=spec_case.context)
        else:
            pytest.fail(f"Unknown expected error type: {error_type}")
    else:
        gen = _build_generator(spec_case, output_dir)
        gen.run(context=spec_case.context)

        diffs = _compare_trees(output_dir, spec_case.expected_dir)
        if diffs:
            diff_report = "\n".join(diffs)
            pytest.fail(f"Output mismatch for {spec_case.test_id}:\n{diff_report}")
