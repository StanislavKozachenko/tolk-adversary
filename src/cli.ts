#!/usr/bin/env node
/**
 * tolk-adversary CLI.
 *
 * Adversarial (negative) test scaffolder for Tolk / Acton contracts, driven by
 * the contract ABI (`acton build --output-abi`).
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { loadAbi } from "./abi";
import { generateAdversarialTests } from "./generate";
import { formatSummary, resolveContract } from "./model";

const USAGE = `tolk-adversary — adversarial test scaffolder for Tolk/Acton contracts

Usage:
  tolk-adversary inspect <abi.json>
      Parse an Acton ABI and print the contract model

  tolk-adversary generate <abi.json> [options]
      Emit a *.adversarial.test.tolk skeleton
      --out <file>             Output file (default: stdout)
      --project <dir>          Acton project root, to locate wrappers (default: .)
      --wrapper-module <spec>  Wrapper import (default: ../wrappers/<Contract>.gen)
      --storage-module <spec>  Storage import (default: read from the wrapper)

Options:
  -h, --help     Show this help
  -v, --version  Show version`;

function main(argv: string[]): number {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      out: { type: "string" },
      project: { type: "string" },
      "wrapper-module": { type: "string" },
      "storage-module": { type: "string" },
    },
  });

  if (values.version) {
    console.log("0.0.0");
    return 0;
  }

  const command = positionals[0];
  if (values.help || command === undefined) {
    console.log(USAGE);
    return command === undefined && !values.help ? 1 : 0;
  }

  switch (command) {
    case "inspect":
      return runInspect(positionals[1]);
    case "generate":
      return runGenerate(positionals[1], values);
    default:
      console.error(`error: unknown command "${command}"\n`);
      console.error(USAGE);
      return 1;
  }
}

function runInspect(abiPath: string | undefined): number {
  if (abiPath === undefined) {
    console.error("error: `inspect` needs a path to an ABI JSON file\n");
    console.error(USAGE);
    return 1;
  }
  console.log(formatSummary(resolveContract(loadAbi(abiPath))));
  return 0;
}

interface GenerateValues {
  out?: string | undefined;
  project?: string | undefined;
  "wrapper-module"?: string | undefined;
  "storage-module"?: string | undefined;
}

function runGenerate(abiPath: string | undefined, values: GenerateValues): number {
  if (abiPath === undefined) {
    console.error("error: `generate` needs a path to an ABI JSON file\n");
    console.error(USAGE);
    return 1;
  }
  const contract = resolveContract(loadAbi(abiPath));
  const project = values.project ?? ".";
  const wrapperModule = values["wrapper-module"] ?? `../wrappers/${contract.name}.gen`;
  const storageModule =
    values["storage-module"] ?? deriveStorageModule(project, contract.name);

  if (storageModule === undefined) {
    console.error(
      `error: could not find the storage import in ${project}/wrappers/${contract.name}.gen.tolk; pass --storage-module`,
    );
    return 1;
  }

  const src = generateAdversarialTests(contract, { wrapperModule, storageModule });
  if (values.out === undefined) {
    process.stdout.write(src);
  } else {
    mkdirSync(dirname(values.out), { recursive: true });
    writeFileSync(values.out, src);
    console.log(`wrote ${values.out}`);
  }
  return 0;
}

/** Read the storage import from the Acton-generated wrapper's header comment. */
function deriveStorageModule(project: string, contractName: string): string | undefined {
  const wrapperPath = join(project, "wrappers", `${contractName}.gen.tolk`);
  let text: string;
  try {
    text = readFileSync(wrapperPath, "utf8");
  } catch {
    return undefined;
  }
  // The wrapper states: /// Storage `Name` is defined in `../contracts/storage`
  const comment = text.match(/Storage [`'][^`']+[`'] is defined in [`']([^`']+)[`']/);
  if (comment?.[1] !== undefined) return comment[1];
  return undefined;
}

process.exit(main(process.argv.slice(2)));
