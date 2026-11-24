/**
 * Normalized contract model resolved from the raw ABI.
 *
 * The resolver walks the type table to turn each incoming message body into a
 * flat list of {@link Message}s with their opcode, fields and a flag for whether
 * a replay header (a `seqno` field) is present. It handles the two shapes seen
 * in real contracts:
 *   - flat: each incoming entry is a message struct carrying its own `prefix`
 *     (e.g. the standard Jetton contracts);
 *   - wrapped: a single wrapper struct (possibly generic, e.g.
 *     `SignedRequest<AllowedInternalMsg>`) whose field resolves to a union whose
 *     variants are the real messages (e.g. the Telegram wallet).
 */

import {
  displayErrorName,
  getArray,
  getNum,
  getObject,
  getStr,
  type Abi,
  type JsonObject,
} from "./abi";

export type Channel = "internal" | "external";

export interface Field {
  name: string;
  ty: string;
}

export interface Message {
  channel: Channel;
  name: string;
  opcode: number | null;
  opcodeLen: number;
  fields: Field[];
  hasReplayHeader: boolean;
}

export interface StorageSchema {
  structName: string | null;
  fields: Field[];
}

export interface Contract {
  name: string;
  schema: string;
  messages: Message[];
  getters: string[];
  errors: [string, number][];
  storage: StorageSchema;
}

export function resolveContract(abi: Abi): Contract {
  const r = new Resolver(abi);
  const messages: Message[] = [];
  for (const m of abi.incomingMessages) r.expand("internal", m.body_ty_idx, messages);
  for (const m of abi.incomingExternal) r.expand("external", m.body_ty_idx, messages);

  return {
    name: abi.contractName,
    schema: abi.schemaVersion,
    messages,
    getters: abi.getMethods.map((g) => g.name),
    errors: abi.thrownErrors.map((e) => [displayErrorName(e), e.err_code]),
    storage: r.storageSchema(abi.storageTyIdx),
  };
}

export function formatSummary(c: Contract): string {
  const lines: string[] = [];
  lines.push(`contract ${c.name} (abi schema ${c.schema})`);
  lines.push("");
  lines.push(`messages (${c.messages.length}):`);
  for (const m of c.messages) {
    const op =
      m.opcode === null
        ? "<no opcode>"
        : `0x${m.opcode.toString(16).padStart(8, "0")}/${m.opcodeLen}`;
    const replay = m.hasReplayHeader ? "  [replay-header]" : "";
    lines.push(`  [${m.channel}] ${op} ${m.name}${replay}`);
    for (const f of m.fields) lines.push(`      - ${f.name}: ${f.ty}`);
  }
  lines.push("");
  lines.push(`get-methods (${c.getters.length}): ${c.getters.join(", ")}`);
  lines.push(`thrown errors (${c.errors.length}):`);
  for (const [name, code] of c.errors) lines.push(`  ${name} = ${code}`);
  return lines.join("\n");
}

class Resolver {
  private readonly declByName = new Map<string, JsonObject>();
  private readonly structInst = new Map<number, JsonObject>();

  constructor(private readonly abi: Abi) {
    for (const d of abi.declarations) {
      const name = getStr(d, "name");
      if (name !== undefined) this.declByName.set(name, d);
    }
    for (const s of abi.structInstantiations) {
      const idx = getNum(s, "ty_idx");
      if (idx !== undefined) this.structInst.set(idx, s);
    }
  }

  private ut(ty: number): JsonObject | undefined {
    return this.abi.uniqueTypes[ty];
  }

  private kind(ty: number): string {
    return getStr(this.ut(ty), "kind") ?? "?";
  }

  /** Follow `AliasRef` entries to their underlying type. */
  private resolveAlias(ty: number): number {
    for (let i = 0; i < 16; i++) {
      if (this.kind(ty) !== "AliasRef") break;
      const name = getStr(this.ut(ty), "alias_name");
      const target = name === undefined ? undefined : getNum(this.declByName.get(name), "target_ty_idx");
      if (target === undefined) break;
      ty = target;
    }
    return ty;
  }

  private structName(ty: number): string | undefined {
    const e = this.ut(ty);
    if (getStr(e, "kind") !== "StructRef") return undefined;
    return getStr(e, "struct_name");
  }

  /** Monomorphized field types for a generic instantiation at `ty`, if any. */
  private monomorph(ty: number): number[] | undefined {
    const arr = getArray(this.structInst.get(ty), "monomorphic_fields_ty_idx");
    if (arr === undefined) return undefined;
    return arr.filter((n): n is number => typeof n === "number");
  }

  /** `[field name, field ty_idx]` for a struct, applying a monomorph override. */
  private rawFields(ty: number, mono: number[] | undefined): [string, number][] {
    const name = this.structName(ty);
    if (name === undefined) return [];
    const decl = this.declByName.get(name);
    const fields = getArray(decl, "fields");
    if (fields === undefined) return [];
    const out: [string, number][] = [];
    fields.forEach((f, i) => {
      const fo = getObject(f);
      const fname = getStr(fo, "name");
      if (fname === undefined) return;
      const fty = mono?.[i] ?? getNum(fo, "ty_idx");
      if (fty === undefined) return;
      out.push([fname, fty]);
    });
    return out;
  }

  private fields(ty: number, mono: number[] | undefined): Field[] {
    return this.rawFields(ty, mono).map(([name, fty]) => ({ name, ty: this.typeStr(fty) }));
  }

  /** The runtime storage struct's name and fields, resolved from its `ty_idx`. */
  storageSchema(tyIdx: number | undefined): StorageSchema {
    if (tyIdx === undefined) return { structName: null, fields: [] };
    const ty = this.resolveAlias(tyIdx);
    return { structName: this.structName(ty) ?? null, fields: this.fields(ty, this.monomorph(ty)) };
  }

  /**
   * Does this message carry a replay header (a `seqno` field), directly or in a
   * nested struct such as `SeqnoHeader`?
   */
  private hasSeqno(ty: number, mono: number[] | undefined, depth: number): boolean {
    if (depth > 6) return false;
    for (const [name, fty] of this.rawFields(ty, mono)) {
      if (name === "seqno") return true;
      const rty = this.resolveAlias(fty);
      if (this.kind(rty) === "StructRef" && this.hasSeqno(rty, this.monomorph(rty), depth + 1)) {
        return true;
      }
    }
    return false;
  }

  private prefixOfDecl(decl: JsonObject | undefined): [number, number] | undefined {
    const p = getObject(decl?.["prefix"]);
    const num = getNum(p, "prefix_num");
    if (num === undefined) return undefined;
    return [num, getNum(p, "prefix_len") ?? 32];
  }

  expand(ch: Channel, bodyTyIdx: number, out: Message[]): void {
    const ty = this.resolveAlias(bodyTyIdx);
    const kind = this.kind(ty);

    if (kind === "union") {
      this.expandUnion(ch, ty, out);
      return;
    }

    if (kind === "StructRef") {
      const sname = this.structName(ty) ?? "";
      const decl = this.declByName.get(sname);
      const prefix = this.prefixOfDecl(decl);
      const mono = this.monomorph(ty);

      if (prefix !== undefined) {
        // Flat message: the struct carries its own opcode.
        out.push({
          channel: ch,
          name: sname,
          opcode: prefix[0],
          opcodeLen: prefix[1],
          fields: this.fields(ty, mono),
          hasReplayHeader: this.hasSeqno(ty, mono, 0),
        });
        return;
      }

      // Wrapper: expand the field(s) that resolve to a union.
      let found = false;
      for (const [, fty] of this.rawFields(ty, mono)) {
        const rty = this.resolveAlias(fty);
        if (this.kind(rty) === "union") {
          this.expandUnion(ch, rty, out);
          found = true;
        }
      }
      if (!found) {
        out.push({
          channel: ch,
          name: sname,
          opcode: null,
          opcodeLen: 0,
          fields: this.fields(ty, mono),
          hasReplayHeader: false,
        });
      }
      return;
    }

    out.push({
      channel: ch,
      name: kind,
      opcode: null,
      opcodeLen: 0,
      fields: [],
      hasReplayHeader: false,
    });
  }

  private expandUnion(ch: Channel, uty: number, out: Message[]): void {
    const variants = getArray(this.ut(uty), "variants");
    if (variants === undefined) return;
    for (const v of variants) {
      const vo = getObject(v);
      const vty = getNum(vo, "variant_ty_idx");
      if (vty === undefined) continue;
      const rvty = this.resolveAlias(vty);
      const mono = this.monomorph(rvty);
      out.push({
        channel: ch,
        name: this.structName(rvty) ?? this.typeStr(rvty),
        opcode: getNum(vo, "prefix_num") ?? null,
        opcodeLen: getNum(vo, "prefix_len") ?? 0,
        fields: this.fields(rvty, mono),
        hasReplayHeader: this.hasSeqno(rvty, mono, 0),
      });
    }
  }

  private typeStr(ty: number): string {
    const e = this.ut(ty);
    if (e === undefined) return `<oob ${ty}>`;
    const n = (k: string): number => getNum(e, k) ?? 0;
    const inner = (k: string): number => getNum(e, k) ?? 0;
    switch (this.kind(ty)) {
      case "uintN":
        return `uint${n("n")}`;
      case "intN":
        return `int${n("n")}`;
      case "bitsN":
        return `bits${n("n")}`;
      case "addressOpt":
        return "address?";
      case "nullable":
        return `${this.typeStr(inner("inner_ty_idx"))}?`;
      case "cellOf":
        return `Cell<${this.typeStr(inner("inner_ty_idx"))}>`;
      case "arrayOf":
        return `[${this.typeStr(inner("inner_ty_idx"))}]`;
      case "mapKV":
        return `map<${this.typeStr(inner("key_ty_idx"))}, ${this.typeStr(inner("value_ty_idx"))}>`;
      case "StructRef":
        return getStr(e, "struct_name") ?? "struct";
      case "AliasRef":
        return getStr(e, "alias_name") ?? "alias";
      case "EnumRef":
        return getStr(e, "enum_name") ?? "enum";
      case "genericT":
        return getStr(e, "name_t") ?? "T";
      case "union":
        return "union";
      default:
        return this.kind(ty);
    }
  }
}
