import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadAbi } from "../src/abi";
import { resolveContract, type Contract } from "../src/model";

function load(name: string): Contract {
  const path = fileURLToPath(new URL(`../fixtures/${name}.json`, import.meta.url));
  return resolveContract(loadAbi(path));
}

describe("resolver", () => {
  it("resolves flat message opcodes carried on the struct prefix (JettonWallet)", () => {
    const c = load("JettonWallet");
    const transfer = c.messages.find((m) => m.name === "AskToTransfer");
    expect(transfer).toBeDefined();
    expect(transfer?.opcode).toBe(0x0f8a7ea5);
    expect(transfer?.channel).toBe("internal");
    // Every flat message resolves to an opcode.
    expect(c.messages.every((m) => m.opcode !== null)).toBe(true);
  });

  it("unwraps a generic wrapper union and detects replay headers (WalletTg)", () => {
    const c = load("WalletTg");
    expect(c.messages.some((m) => m.channel === "internal")).toBe(true);
    expect(c.messages.some((m) => m.channel === "external")).toBe(true);
    // Messages live inside SignedRequest<...>; all carry an opcode and a
    // SeqnoHeader replay header.
    expect(c.messages.every((m) => m.opcode !== null)).toBe(true);
    expect(c.messages.every((m) => m.hasReplayHeader)).toBe(true);
  });

  it("exposes named errors and getters (WalletTg)", () => {
    const c = load("WalletTg");
    expect(c.errors).toContainEqual(["Errors.InvalidSeqno", 133]);
    expect(c.getters).toContain("seqno");
  });

  it("falls back to a readable name for anonymous thrown codes (JettonWallet)", () => {
    const c = load("JettonWallet");
    // `throw 0xFFFF` has no name in the ABI.
    expect(c.errors.some(([, code]) => code === 0xffff)).toBe(true);
  });
});
