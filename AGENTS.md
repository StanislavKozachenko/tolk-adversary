# AGENTS.md

Instructions for coding agents working in this repository.

## Project

tolk-adversary generates adversarial (negative) test skeletons for
[Tolk](https://docs.ton.org/languages/tolk) / [Acton](https://ton-blockchain.github.io/acton/)
smart contracts from their ABI (`acton build --output-abi`). It is a CLI: ABI
JSON in, `*.adversarial.test.tolk` skeletons out. It is a scaffolder, not a bug
finder — it writes boilerplate and a coverage checklist; semantics that depend on
the contract are emitted as `// TODO`.

TypeScript (ESM), one binary. Source lives in `src/`:

| File           | Role                                                        |
| -------------- | ---------------------------------------------------------- |
| `src/abi.ts`   | Load and lightly type the Acton ABI JSON                   |
| `src/model.ts` | Resolve the ABI type table into a normalized contract model |
| `src/cli.ts`   | CLI entry (`node:util` `parseArgs`)                         |

Tests live in `test/`, run by vitest. `fixtures/` holds real ABI JSONs used by
the tests and as examples.

## Commands

- `npm run build`: tsup, ESM into `dist/`
- `npm test`: vitest
- `npm run typecheck`: `tsc --noEmit`
- `npm run lint`: ESLint flat config
- `npm run check`: lint, typecheck, test and build

Run lint, typecheck, test and build before finishing a change.

## Rules

- No runtime dependencies in the CLI beyond the Node standard library unless a
  change genuinely needs one; justify any addition.
- Do not disable lint rules or checks to get green; fix the cause.
- Keep the ABI reader tolerant: an unknown type `kind` must never crash parsing.

## Commits

- Conventional Commits with a scope where one fits, a single short lowercase
  subject line, no body: `feat(model): resolve generic wrappers`, `ci: add matrix`.
  Scopes: `abi`, `model`, `cli`, `gen`, plus `ci`, `docs`, `chore`.
- No `Co-Authored-By`, no "Generated with" trailers, no agent attribution of any kind.
- Commits are signed. Never bypass signing: no `--no-gpg-sign`, `--no-verify` or
  `-c commit.gpgsign=false`. If signing fails, stop and report the exact error.
- Do not touch git config. Make atomic commits.

## Workflow

Nothing is committed or pushed to `main` directly, however small the change.

1. Open an issue (see `.claude/commands/create-issue.md`)
2. Branch from an up-to-date `main`: `feat/...`, `fix/...`, `docs/...`, `ci/...`, `chore/...`
3. Open a pull request that closes the issue (see `.claude/commands/create-pr.md`)
4. Wait for CI. If a check fails, read the log and fix the cause before anything else
5. Squash-merge when `CI ok` is green and delete the branch

Never tag or publish to npm without the maintainer's explicit approval.
