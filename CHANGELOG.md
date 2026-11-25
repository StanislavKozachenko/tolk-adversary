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
- Signature-aware generation: for contracts whose incoming body is a `bits512`
  signature plus the request (with a public key in storage), `deployTarget()`
  stores a generated keypair's public key and each crafted request is signed, so
  the tests reach the branch under test instead of the signature gate (verified
  on the Telegram wallet).
- Replay-header and cross-channel families: for replay-protected contracts,
  tests for a wrong seqno, an expired `validUntil` and a wrong subwallet id,
  asserted against the contract's own error codes; and, for contracts with
  separate internal/external channels, that an external-only opcode is rejected
  on the internal entry (verified on the Telegram wallet).

### Fixed

- Synthesized deploy uses a concrete placeholder for non-optional `address`
  storage fields, so generated tests compile for contracts that keep an owner in
  storage (e.g. the counter template).
