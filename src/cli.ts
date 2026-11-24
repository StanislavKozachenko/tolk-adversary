#!/usr/bin/env node
/**
 * tolk-adversary CLI.
 *
 * Adversarial (negative) test scaffolder for Tolk / Acton contracts, driven by
 * the contract ABI (`acton build --output-abi`).
 */

import { parseArgs } from "node:util";
import { loadAbi } from "./abi";
import { formatSummary, resolveContract } from "./model";

const USAGE = `tolk-adversary — adversarial test scaffolder for Tolk/Acton contracts

Usage:
  tolk-adversary inspect <abi.json>   Parse an Acton ABI and print the contract model

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
    case "inspect": {
      const abiPath = positionals[1];
      if (abiPath === undefined) {
        console.error("error: `inspect` needs a path to an ABI JSON file\n");
        console.error(USAGE);
        return 1;
      }
      const contract = resolveContract(loadAbi(abiPath));
      console.log(formatSummary(contract));
      return 0;
    }
    default:
      console.error(`error: unknown command "${command}"\n`);
      console.error(USAGE);
      return 1;
  }
}

process.exit(main(process.argv.slice(2)));
