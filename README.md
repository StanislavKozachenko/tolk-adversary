# tolk-adversary

> Generate adversarial (negative) test skeletons for [Tolk](https://docs.ton.org/languages/tolk) / [Acton](https://ton-blockchain.github.io/acton/) smart contracts straight from their ABI.

Point it at a contract's ABI (`acton build --output-abi`) and it emits a
`*.adversarial.test.tolk` file full of the attacks every contract should
survive — unknown opcodes, malformed bodies, replayed/expired/wrong-subwallet
requests and cross-channel messages — each one asserted against the contract's
own error codes and ready to run under `acton test`.

It is a **scaffolder, not a bug finder**: it writes the boilerplate and a
coverage checklist from the ABI. Where the expected behaviour depends on
contract semantics it can't see, it leaves a `// TODO`.

## Why

While porting the standard TON contracts from FunC to Tolk, the same negative
tests get written by hand for every contract. The ABI already describes every
message, opcode, field, storage slot and error code — enough to generate them.

## Install & use

Requires Node 22+.

```sh
# inspect the resolved model
npx tolk-adversary inspect path/to/Contract.json

# generate the adversarial tests into an Acton project's tests/
npx tolk-adversary generate path/to/Contract.json --project . --out tests/adversarial.test.tolk
```

`generate` reads the project's Acton-generated wrapper (`wrappers/<Contract>.gen.tolk`)
to learn the storage struct and its import, so run it from (or point `--project`
at) the Acton project the ABI came from.

From a checkout: `npm ci && npm run build`, then `node dist/cli.js …`.

## What it generates

| Family | What it sends | Applies to |
| --- | --- | --- |
| Unknown opcode | an opcode no message uses | every contract |
| Truncated body | opcode only, fields missing | every message with fields |
| Wrong seqno | a signed request with a stale seqno | replay-protected contracts |
| Expired | a signed request with `validUntil` in the past | replay-protected contracts |
| Wrong subwallet id | a signed request with a mismatched subwallet id | replay-protected contracts |
| Cross-channel | an external-only opcode on the internal entry | contracts with both channels |

Each test deploys the contract through a best-effort `deployTarget()` synthesized
from the storage schema (placeholder values; a generated keypair's public key for
signature contracts). When a storage field can't be synthesized, `deployTarget()`
degrades to a `// TODO` stub.

**Signature-aware.** When the incoming body is a `bits512` signature plus the
request (with a public key in storage), each crafted request is signed with the
deploy keypair so the tests reach the branch under test instead of the signature
gate.

Verified end-to-end (generated tests compile and pass under `acton test`) on the
standard Jetton, the counter template, and the Telegram wallet (`WalletTg`).

## Limitations

- A scaffolder, not a bug finder: assertions that need contract semantics are
  emitted as `// TODO`.
- Full double-spend replay isn't generated — it needs a request that succeeds
  once, which is contract-specific.
- Sends use the internal entry (`sendAny`); external-channel delivery is future
  work. Cross-channel coverage already exercises the channel separation.
- Storage shapes with nested structs, `Cell<T>` or `bitsN` fields fall back to a
  `// TODO` deploy.

## Development

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. CI also runs an
e2e job that generates tests for a vendored Acton project (`e2e/counter`) and
runs them under `acton test`. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[AGENTS.md](AGENTS.md).

## License

MIT
