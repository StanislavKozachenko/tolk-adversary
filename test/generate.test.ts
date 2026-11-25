import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadAbi } from "../src/abi";
import { generateAdversarialTests, type GenerateOptions } from "../src/generate";
import { resolveContract, type Contract } from "../src/model";

function gen(name: string, opts?: Partial<GenerateOptions>): string {
  const path = fileURLToPath(new URL(`../fixtures/${name}.json`, import.meta.url));
  const contract = resolveContract(loadAbi(path));
  return generateAdversarialTests(contract, {
    wrapperModule: `../wrappers/${name}.gen`,
    storageModule: "../contracts/storage",
    ...opts,
  });
}

describe("generate", () => {
  it("synthesizes a deploy from a simple storage schema (JettonMinter)", () => {
    const src = gen("JettonMinter");
    // MinterStorage is coins/address?/address?/cell — all placeholder-able.
    expect(src).toContain("fun deployTarget(): (JettonMinter, address)");
    expect(src).toContain("JettonMinter.fromStorage(MinterStorage {");
    expect(src).toContain("totalSupply: 0");
    expect(src).toContain("adminAddress: null");
    expect(src).toContain("metadata: beginCell().endCell()");
    expect(src).not.toContain("TODO: deploy");
  });

  it("emits an unknown-opcode test asserting the real invalid-message code", () => {
    const src = gen("JettonMinter");
    expect(src).toContain("adversarial: rejects an unknown opcode");
    // JettonMinter throws 0xffff for unknown ops.
    expect(src).toContain("exitCode: 0xffff");
  });

  it("emits a truncated-body test per message that has fields, and skips field-less ones", () => {
    const src = gen("JettonMinter");
    expect(src).toContain("rejects a truncated MintNewJettons body");
    expect(src).toContain("storeUint(0x642b7d07, 32)");
    // TopUpTons has no fields -> no truncation case.
    expect(src).not.toContain("truncated TopUpTons");
  });

  it("signs crafted requests and stores a keypair public key for signature-gated contracts (WalletTg)", () => {
    const src = gen("WalletTg");
    expect(src).toContain('import "@acton/crypto"');
    expect(src).toContain("fun deployTarget(): (WalletTg, address, KeyPair)");
    expect(src).toContain("val kp = crypto.generateKeyPair();");
    // The public key storage field is filled from the keypair, not a placeholder.
    expect(src).toContain("publicKey: kp.publicKey");
    // Each crafted request is signed and wrapped as signature + request.
    expect(src).toContain("crypto.sign(kp.privateKey, request)");
    expect(src).toContain("storeSlice(signature).storeSlice(request.beginParse())");
    expect(src).toContain("exitCode: 0xffff");
  });

  it("emits replay-header and cross-channel tests for a signature wallet (WalletTg)", () => {
    const src = gen("WalletTg");
    // Replay family against the real error codes (seqno 133, subwallet 134, expired 136).
    expect(src).toContain("rejects a wrong seqno (replay protection)");
    expect(src).toContain("exitCode: 0x85");
    expect(src).toContain("rejects an expired message");
    expect(src).toContain("blockchain.now() - 1");
    expect(src).toContain("exitCode: 0x88");
    expect(src).toContain("rejects a wrong subwallet id");
    expect(src).toContain("exitCode: 0x86");
    // Cross-channel: an external-only opcode on the internal entry.
    expect(src).toContain("rejects an external-only opcode on the internal entry");
  });

  it("emits no replay-header or cross-channel tests for a plain contract (JettonMinter)", () => {
    const src = gen("JettonMinter");
    expect(src).not.toContain("rejects a wrong seqno");
    expect(src).not.toContain("rejects an expired message");
    expect(src).not.toContain("external-only opcode");
  });

  it("degrades to a TODO deploy when a storage field can't be synthesized", () => {
    const contract: Contract = {
      name: "Widget",
      schema: "1.0",
      messages: [],
      getters: [],
      errors: [],
      storage: { structName: "WidgetStorage", fields: [{ name: "inner", ty: "Cell<Thing>" }] },
      signature: { wrapped: false, publicKeyField: null },
    };
    const src = generateAdversarialTests(contract, {
      wrapperModule: "../wrappers/Widget.gen",
      storageModule: "../contracts/storage",
    });
    expect(src).toContain("TODO: deploy Widget with valid initial storage");
    expect(src).not.toContain(".fromStorage(WidgetStorage {");
  });
});
