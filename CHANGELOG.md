# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- ABI reader and a resolver that turns an Acton contract ABI into a normalized
  model: messages with opcodes and fields, get-methods, thrown errors, and
  replay-header detection. Handles both flat (opcode on the struct prefix) and
  wrapped/generic (`SignedRequest<union>`) message shapes.
- `inspect` CLI command that prints the resolved model.
- `generate` CLI command that emits a `*.adversarial.test.tolk` skeleton:
  unknown-opcode and truncated-body tests (internal channel), with a best-effort
  `deployTarget()` synthesized from the storage schema. Generated tests compile
  and run under `acton test` (verified on the standard Jetton contract).
