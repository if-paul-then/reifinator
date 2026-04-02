# Contributing to Reifinator

## Development Setup

```bash
# Clone the repo
git clone https://github.com/if-paul-then/reifinator.git
cd reifinator

# Set up all implementations
make setup-all

# Or individually:
make setup-python       # Python venv + dev dependencies
make setup-typescript   # npm install
```

## Running Tests

```bash
make test-all           # Run both Python and TypeScript tests
make test-python        # Python only
make test-typescript    # TypeScript only
make lint               # Run linters
```

Test cases live in `spec/cases/`. See `spec/test-framework.md` for the test case format including variant support for adapter-specific testing.

## Building Locally

```bash
make build-python               # Build Python sdist + wheel
make build-typescript            # Build TypeScript
make publish-typescript-dry-run  # Verify npm package contents
```

## Submitting Changes

1. Fork the repo and create a feature branch
2. Make your changes
3. Run `make test-all` and `make lint` to verify
4. Open a pull request against `main`

CI runs automatically on every PR, testing Python (3.11, 3.12) and TypeScript.

## Releasing

Releases are automated via GitHub Actions. No manual publishing is needed.

1. Bump the version in `implementations/python/pyproject.toml` and/or `implementations/typescript/package.json`
2. Update `CHANGELOG.md` with the new version's changes
3. Commit and push to `main`
4. Go to [Releases](https://github.com/if-paul-then/reifinator/releases) and click "Draft a new release"
   - Create a new tag matching the version (e.g. `v0.2.0`)
   - Click "Generate release notes" for an auto-generated summary
   - Click "Publish release"
5. The publish workflows trigger automatically:
   - **Python** is published to [PyPI](https://pypi.org/project/reifinator/) via OIDC trusted publishing
   - **TypeScript** is published to [npm](https://www.npmjs.com/package/reifinator) via OIDC trusted publishing
6. Verify the new versions are live on both registries
