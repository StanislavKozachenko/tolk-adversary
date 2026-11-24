# Contributing

## Reporting bugs

Open an issue with the contract or ABI involved, the versions of tolk-adversary,
Acton and Node.js, and a minimal reproduction (ideally the ABI JSON, or a small
contract that produces it).

## Development setup

Development needs Node.js 22 or newer (`.nvmrc` pins the version `nvm use` picks);
CI tests on Node.js 22 and 24. Run `npm ci` to install.

Generate an ABI to try the tool against with `acton build --output-abi <dir>`;
some real ABIs are checked in under `fixtures/`.

## Submitting changes

Nothing is pushed to `main` directly.

1. Open (or pick) an issue
2. Branch from `main`: `feat/...`, `fix/...`, `docs/...`, `ci/...`, `chore/...`
3. Make the change and add tests
4. Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`; all must pass
5. Open a pull request with `Closes #N` in the body; CI runs automatically
6. A maintainer reviews and squash-merges

## Commit style

[Conventional Commits](https://www.conventionalcommits.org/) with a scope where
one fits and one short lowercase subject line:

```text
feat(model): resolve generic wrapper unions
fix(abi): tolerate unknown type kinds
docs: describe the ABI model
ci: add the test matrix
```

- `feat` goes under **Added**, `fix` under **Fixed**, `refactor` / `perf` / `docs` / `ci` under **Changed** in the CHANGELOG; `chore` and `test` are not listed
- Mark a breaking change with `!` (`feat(cli)!: ...`); it goes under **Breaking**
