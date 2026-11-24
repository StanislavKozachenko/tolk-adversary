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

  it("degrades to a TODO deploy when a storage field can't be synthesized", () => {
    const contract: Contract = {
      name: "Widget",
      schema: "1.0",
      messages: [],
      getters: [],
      errors: [],
      storage: { structName: "WidgetStorage", fields: [{ name: "inner", ty: "Cell<Thing>" }] },
    };
    const src = generateAdversarialTests(contract, {
      wrapperModule: "../wrappers/Widget.gen",
      storageModule: "../contracts/storage",
    });
    expect(src).toContain("TODO: deploy Widget with valid initial storage");
    expect(src).not.toContain(".fromStorage(WidgetStorage {");
  });
});
