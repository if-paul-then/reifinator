.PHONY: test-python test-typescript test-all check-parity lint help setup-python setup-typescript setup-all

PYTHON_DIR = implementations/python
TS_DIR = implementations/typescript

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

setup-python: ## Create venv and install Python dev dependencies
	cd $(PYTHON_DIR) && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"

setup-typescript: ## Install TypeScript dependencies
	cd $(TS_DIR) && npm install

setup-all: setup-python setup-typescript ## Set up all implementations

test-python: ## Run Python tests
	cd $(PYTHON_DIR) && .venv/bin/pytest -v

test-typescript: ## Run TypeScript tests
	cd $(TS_DIR) && npx vitest run

test-all: test-python test-typescript ## Run all implementation test suites

check-parity: test-all ## Verify all implementations produce identical output for spec cases

lint: ## Run linters across all implementations
	cd $(PYTHON_DIR) && .venv/bin/ruff check src/ tests/
