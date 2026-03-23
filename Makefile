.PHONY: test-python test-all check-parity lint help setup-python

PYTHON_DIR = implementations/python

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

setup-python: ## Create venv and install Python dev dependencies
	cd $(PYTHON_DIR) && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"

test-python: ## Run Python tests
	cd $(PYTHON_DIR) && .venv/bin/pytest -v

test-all: test-python ## Run all implementation test suites

check-parity: test-all ## Verify all implementations produce identical output for spec cases

lint: ## Run linters across all implementations
	cd $(PYTHON_DIR) && .venv/bin/ruff check src/ tests/
