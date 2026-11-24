/**
 * Loading and light typing of the Acton contract ABI JSON
 * (`acton build --output-abi`).
 *
 * The ABI has a type table (`unique_types`) indexed by `ty_idx`, a list of
 * `declarations` (structs / enums / aliases), the incoming message bodies per
 * channel, get-methods and thrown errors. The type table and declarations are
 * kept as raw JSON objects on purpose: their per-kind shape is wide and still
 * evolving, so the resolver in `model.ts` interprets them, and a new `kind`
 * never breaks parsing.
 */

import { readFileSync } from "node:fs";

export type JsonObject = Record<string, unknown>;

export interface BodyRef {
  body_ty_idx: number;
}

export interface GetMethod {
  name: string;
}

export interface ThrownError {
  /** Some thrown codes are raw integers (e.g. `throw 0xFFFF`) with no name. */
  name?: string;
  kind?: string;
  err_code: number;
}

export interface Abi {
  contractName: string;
  schemaVersion: string;
  uniqueTypes: JsonObject[];
  declarations: JsonObject[];
  structInstantiations: JsonObject[];
  incomingMessages: BodyRef[];
  incomingExternal: BodyRef[];
  getMethods: GetMethod[];
  thrownErrors: ThrownError[];
  /** `ty_idx` of the runtime storage struct, if the ABI declares one. */
  storageTyIdx: number | undefined;
}

export function loadAbi(path: string): Abi {
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`ABI ${path} is not a JSON object`);
  }
  const o = raw as JsonObject;

  return {
    contractName: asString(o["contract_name"]) ?? "<unnamed>",
    schemaVersion: schemaVersion(o["abi_schema_version"]),
    uniqueTypes: asObjectArray(o["unique_types"]),
    declarations: asObjectArray(o["declarations"]),
    structInstantiations: asObjectArray(o["struct_instantiations"]),
    incomingMessages: asBodyRefs(o["incoming_messages"]),
    incomingExternal: asBodyRefs(o["incoming_external"]),
    getMethods: asGetMethods(o["get_methods"]),
    thrownErrors: asThrownErrors(o["thrown_errors"]),
    storageTyIdx: getNum(getObject(o["storage"]), "storage_ty_idx"),
  };
}

export function displayErrorName(e: ThrownError): string {
  return e.name ?? `<${e.kind ?? "anon"}:${e.err_code}>`;
}

// --- small typed accessors over untyped JSON --------------------------------

export function getStr(o: JsonObject | undefined, key: string): string | undefined {
  const v = o?.[key];
  return typeof v === "string" ? v : undefined;
}

export function getNum(o: JsonObject | undefined, key: string): number | undefined {
  const v = o?.[key];
  return typeof v === "number" ? v : undefined;
}

export function getArray(o: JsonObject | undefined, key: string): unknown[] | undefined {
  const v = o?.[key];
  return Array.isArray(v) ? v : undefined;
}

export function getObject(v: unknown): JsonObject | undefined {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as JsonObject) : undefined;
}

// --- normalization helpers --------------------------------------------------

function schemaVersion(v: unknown): string {
  if (typeof v === "string") return v;
  if (v === undefined || v === null) return "unknown";
  return String(v);
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function asObjectArray(v: unknown): JsonObject[] {
  if (!Array.isArray(v)) return [];
  return v.filter((e): e is JsonObject => typeof e === "object" && e !== null && !Array.isArray(e));
}

function asBodyRefs(v: unknown): BodyRef[] {
  return asObjectArray(v)
    .map((o) => getNum(o, "body_ty_idx"))
    .filter((n): n is number => n !== undefined)
    .map((body_ty_idx) => ({ body_ty_idx }));
}

function asGetMethods(v: unknown): GetMethod[] {
  return asObjectArray(v)
    .map((o) => getStr(o, "name"))
    .filter((name): name is string => name !== undefined)
    .map((name) => ({ name }));
}

function asThrownErrors(v: unknown): ThrownError[] {
  return asObjectArray(v)
    .map((o): ThrownError | undefined => {
      const code = getNum(o, "err_code");
      if (code === undefined) return undefined;
      const name = getStr(o, "name");
      const kind = getStr(o, "kind");
      const e: ThrownError = { err_code: code };
      if (name !== undefined) e.name = name;
      if (kind !== undefined) e.kind = kind;
      return e;
    })
    .filter((e): e is ThrownError => e !== undefined);
}
