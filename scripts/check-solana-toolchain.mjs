import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const REQUIRED_NODE_VERSION = "v20.20.2";
const REQUIRED_RUST_VERSION = "rustc 1.75.0";
const REQUIRED_CARGO_VERSION = "cargo 1.75.0";
const REQUIRED_SOLANA_VERSION = "solana-cli 1.18.26";
const REQUIRED_ANCHOR_VERSION = "0.30.1";
const REQUIRED_SBF_VERSION = "solana-cargo-build-sbf 1.18.26";
const PATH_KEY =
  process.platform === "win32" && process.env.Path !== undefined ? "Path" : "PATH";

const extraPathEntries = [
  path.join(os.homedir(), ".cargo", "bin"),
  path.join(
    os.homedir(),
    ".local",
    "share",
    "solana",
    "install",
    "active_release",
    "bin",
  ),
];

process.env[PATH_KEY] = [
  ...extraPathEntries,
  process.env[PATH_KEY] ?? process.env.PATH ?? "",
]
  .filter(Boolean)
  .join(path.delimiter);

process.env.PATH = process.env[PATH_KEY];

const checks = [
  {
    label: "Node.js",
    command: "node",
    args: ["--version"],
    expectedText: REQUIRED_NODE_VERSION,
  },
  {
    label: "Rust compiler",
    command: "rustc",
    args: ["--version"],
    expectedText: REQUIRED_RUST_VERSION,
  },
  {
    label: "Cargo",
    command: "cargo",
    args: ["--version"],
    expectedText: REQUIRED_CARGO_VERSION,
  },
  {
    label: "Solana CLI",
    command: "solana",
    args: ["--version"],
    expectedText: REQUIRED_SOLANA_VERSION,
  },
  {
    label: "Anchor CLI",
    command: "anchor",
    args: ["--version"],
    expectedText: REQUIRED_ANCHOR_VERSION,
  },
  {
    label: "Solana SBF cargo subcommand",
    command: "cargo",
    args: ["build-sbf", "--version"],
    expectedText: REQUIRED_SBF_VERSION,
  },
];

const knownSbfIncompatibleLockEntries = [
  {
    name: "block-buffer",
    version: "0.12.0",
    reason: "requires Cargo edition 2024 support; Solana 1.18 platform cargo is 1.75",
  },
  {
    name: "toml_datetime",
    version: "1.1.1+spec-1.1.0",
    reason: "requires Cargo edition 2024 support; pulled through newer toml_edit/proc-macro-crate",
  },
  {
    name: "indexmap",
    version: "2.14.0",
    reason: "requires Cargo edition 2024 support in the currently resolved package",
  },
  {
    name: "borsh",
    version: "1.6.1",
    reason: "requires rustc 1.77+, but Solana 1.18 platform rustc reports 1.75.0-dev",
  },
  {
    name: "unicode-segmentation",
    version: "1.13.2",
    reason: "requires rustc 1.85+, but Solana 1.18 platform rustc reports 1.75.0-dev",
  },
];

function runCheck(check) {
  const result = spawnSync(check.command, check.args, {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  const ok =
    result.status === 0 &&
    (!check.expectedText || output.includes(check.expectedText));

  return {
    ...check,
    ok,
    status: result.status,
    output,
    error: result.error,
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lockContainsPackage(lockContent, name, version) {
  const pattern = new RegExp(
    String.raw`\[\[package\]\][\s\S]*?name = "${escapeRegex(name)}"[\s\S]*?version = "${escapeRegex(
      version,
    )}"`,
  );
  return pattern.test(lockContent);
}

function checkCargoLockCompatibility() {
  const lockPath = path.join(process.cwd(), "Cargo.lock");
  const label = "Cargo.lock SBF compatibility";
  const command = "Cargo.lock";
  const args = [];

  if (!existsSync(lockPath)) {
    return {
      label,
      command,
      args,
      ok: false,
      status: 1,
      output: "Cargo.lock is missing",
    };
  }

  const lockContent = readFileSync(lockPath, "utf8");
  const issues = [];
  const versionMatch = lockContent.match(/^version = (\d+)/m);
  const lockVersion = versionMatch ? Number(versionMatch[1]) : undefined;

  if (!lockVersion) {
    issues.push("Cargo.lock version could not be detected");
  } else if (lockVersion > 3) {
    issues.push(
      `Cargo.lock version ${lockVersion} is not accepted by Solana 1.18 cargo-build-sbf platform cargo`,
    );
  }

  for (const entry of knownSbfIncompatibleLockEntries) {
    if (lockContainsPackage(lockContent, entry.name, entry.version)) {
      issues.push(`${entry.name} ${entry.version}: ${entry.reason}`);
    }
  }

  return {
    label,
    command,
    args,
    ok: issues.length === 0,
    status: issues.length === 0 ? 0 : 1,
    output:
      issues.length === 0
        ? `Cargo.lock version ${lockVersion} passed Solana 1.18 SBF compatibility checks`
        : issues.join("\n"),
  };
}

const results = [...checks.map(runCheck), checkCargoLockCompatibility()];
const failures = results.filter((result) => !result.ok);

console.log("DRIP Solana/Anchor validation preflight");
console.log("-----------------------------------------");

for (const result of results) {
  const status = result.ok ? "ok" : "missing";
  const command = [result.command, ...result.args].join(" ");
  const outputLines = result.output.split(/\r?\n/).filter(Boolean);
  console.log(`[${status}] ${result.label}: ${command}`);
  if (result.ok && outputLines[0]) {
    console.log(`     ${outputLines[0]}`);
  } else {
    for (const line of outputLines) console.log(`     ${line}`);
  }
}

if (failures.length === 0) {
  console.log("");
  console.log("Preflight passed. You can run: npm run test:anchor:full");
  process.exit(0);
}

console.error("");
console.error("Preflight failed. Anchor tests are not reproducible until these are fixed:");
for (const failure of failures) {
  console.error(`- ${failure.label}`);
}

console.error("");
console.error("Expected toolchain:");
console.error(`- Node.js ${REQUIRED_NODE_VERSION}`);
console.error(`- Rust compiler ${REQUIRED_RUST_VERSION}`);
console.error(`- Cargo ${REQUIRED_CARGO_VERSION}`);
console.error(`- Solana CLI ${REQUIRED_SOLANA_VERSION}`);
console.error(`- Cargo SBF subcommand ${REQUIRED_SBF_VERSION}`);
console.error(`- Anchor CLI ${REQUIRED_ANCHOR_VERSION}`);
console.error("- Cargo.lock compatible with Solana 1.18/Anchor 0.30.1 SBF builds");
console.error("");
console.error("After installing/fixing the toolchain, run:");
console.error("1. npm ci");
console.error("2. npm run preflight:solana");
console.error("3. npm run test:anchor:full");

process.exit(1);
