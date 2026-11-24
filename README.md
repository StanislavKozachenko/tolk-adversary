# tolk-adversary

> Generate adversarial (negative) test skeletons for [Tolk](https://docs.ton.org/languages/tolk) / [Acton](https://ton-blockchain.github.io/acton/) smart contracts straight from their ABI.

**Status: early (M0).** ABI parsing and a normalized contract model work; test
generation is next. Working name — may change.

## What it is

Point it at a contract's ABI (`acton build --output-abi`) and it emits a
`*.adversarial.test.tolk` skeleton with the attack cases every contract should
survive: unknown opcode, replayed / expired / wrong-subwallet messages,
truncated or malformed bodies, cross-channel replay, wrong-sender and boundary
values.

It is a **scaffolder, not a bug finder**: it writes the boilerplate and a
coverage checklist from the ABI; the places where the expected behaviour depends
on contract semantics are emitted as `// TODO` for you to fill in.

## Why

While porting the standard TON contracts from FunC to Tolk, the same negative
tests get written by hand for every contract. The ABI already describes every
message, opcode, field and error code — enough to generate the skeleton.

## Today

```
npx tolk-adversary inspect path/to/Contract.json
```

parses the ABI and prints the resolved messages (with opcodes), get-methods and
thrown errors.

Requires Node 22+. From a checkout: `npm ci && npm run build`, then
`node dist/cli.js inspect <abi.json>`.

## Roadmap

- **M0 — ABI model** *(done)*: parse the ABI, resolve the type table (flat and
  wrapped/generic message shapes), detect replay headers.
- **M1**: generate unknown-opcode and malformed-body tests; CI runs the
  generated tests with `acton test`.
- **M2**: replay family and cross-channel tests.
- **M3**: `// TODO` skeletons for wrong-sender and boundary values; allowlist for
  known / intended divergences.

## License

MIT
