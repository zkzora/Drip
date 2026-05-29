// Stellar Testnet transaction helpers — build, simulate, and submit Soroban contract calls.
// Browser-only. Never auto-signs; callers must obtain explicit user consent before signing.

import {
  rpc,
  xdr,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Contract,
  Address,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";

const CONTRACT_ID = process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID ?? "";
const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? "";

// Native XLM SAC on Stellar Testnet (canonical address from Phase S5A).
export const XLM_SAC_TESTNET = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
export const NETWORK_PASSPHRASE = Networks.TESTNET;
// Use BigInt() not a literal (n suffix) so es2017 target is happy.
export const STROOPS_PER_XLM = BigInt(10_000_000);
export const EXPLORER_TX_URL = "https://stellar.expert/explorer/testnet/tx/";

// ── Result types ──────────────────────────────────────────────────────────────

export type BuildResult = {
  ok: boolean;
  /** Assembled transaction XDR, ready to pass to signStellarTx. */
  txXdr?: string;
  error?: string;
};

export type SubmitResult = {
  ok: boolean;
  txHash?: string;
  /** scValToNative() of the contract return value, when available. */
  returnValue?: unknown;
  error?: string;
};

export type StreamState = {
  streamId: string;
  payer: string;
  receiver: string;
  /** "Active" | "Paused" | "Cancelled" | "Completed" */
  status: string;
  /** Raw stroops as string */
  amount: string;
  withdrawn: string;
  startTime: string;
  endTime: string;
  token: string;
};

export type StreamStateResult = {
  ok: boolean;
  stream?: StreamState;
  error?: string;
};

// ── Param types ───────────────────────────────────────────────────────────────

export type CreateStreamParams = {
  payerAddress: string;
  receiverAddress: string;
  /** Amount in stroops (1 XLM = 10,000,000 stroops). */
  amountStroops: bigint;
  /** Unix timestamp — when vesting starts. */
  startTime: number;
  /** Unix timestamp — when vesting ends. */
  endTime: number;
};

export type StreamActionParams = {
  callerAddress: string;
  streamId: bigint;
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function isConfigured(): boolean {
  return (
    !!CONTRACT_ID &&
    CONTRACT_ID !== "REPLACE_WITH_STELLAR_TESTNET_CONTRACT_ID" &&
    !!RPC_URL &&
    RPC_URL !== "REPLACE_WITH_STELLAR_TESTNET_RPC"
  );
}

function getServer(): rpc.Server {
  return new rpc.Server(RPC_URL);
}

function makeStreamKey(streamId: bigint): xdr.ScVal {
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol("Stream"),
    nativeToScVal(streamId, { type: "u64" }),
  ]);
}

function parseStatus(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  if (raw && typeof raw === "object") {
    const keys = Object.keys(raw as Record<string, unknown>);
    if (keys.length === 1) return keys[0];
  }
  return String(raw);
}

/**
 * Build a transaction with the given operation, simulate it against the RPC,
 * and return the assembled XDR ready for signing.
 * Fails closed if the config is missing or simulation errors.
 */
async function buildAndSimulate(
  callerAddress: string,
  op: xdr.Operation,
): Promise<BuildResult> {
  if (!isConfigured()) {
    return {
      ok: false,
      error:
        "Stellar not configured. Add NEXT_PUBLIC_STELLAR_CONTRACT_ID and " +
        "NEXT_PUBLIC_STELLAR_RPC_URL to .env.local.",
    };
  }
  try {
    const server = getServer();
    const account = await server.getAccount(callerAddress);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    // Any error field means simulation failed.
    if ("error" in sim) {
      return {
        ok: false,
        error: `Simulation failed: ${String((sim as any).error).slice(0, 300)}`,
      };
    }
    // assembleTransaction applies the simulation's soroban data (footprint + auth) to the tx.
    const assembled = rpc.assembleTransaction(tx, sim).build();
    return { ok: true, txXdr: assembled.toXDR() };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.slice(0, 300) };
  }
}

// ── Public build functions ────────────────────────────────────────────────────

export async function buildCreateStream(p: CreateStreamParams): Promise<BuildResult> {
  if (!isConfigured()) {
    return {
      ok: false,
      error: "Stellar not configured. Set NEXT_PUBLIC_STELLAR_CONTRACT_ID and NEXT_PUBLIC_STELLAR_RPC_URL.",
    };
  }
  const contract = new Contract(CONTRACT_ID);
  const op = contract.call(
    "create_stream",
    new Address(p.payerAddress).toScVal(),
    new Address(XLM_SAC_TESTNET).toScVal(),
    new Address(p.receiverAddress).toScVal(),
    nativeToScVal(p.amountStroops, { type: "i128" }),
    nativeToScVal(BigInt(p.startTime), { type: "u64" }),
    nativeToScVal(BigInt(p.endTime), { type: "u64" }),
  );
  return buildAndSimulate(p.payerAddress, op);
}

export async function buildPauseStream(p: StreamActionParams): Promise<BuildResult> {
  if (!isConfigured()) return { ok: false, error: "Stellar not configured." };
  const contract = new Contract(CONTRACT_ID);
  const op = contract.call(
    "pause_stream",
    new Address(p.callerAddress).toScVal(),
    nativeToScVal(p.streamId, { type: "u64" }),
  );
  return buildAndSimulate(p.callerAddress, op);
}

export async function buildResumeStream(p: StreamActionParams): Promise<BuildResult> {
  if (!isConfigured()) return { ok: false, error: "Stellar not configured." };
  const contract = new Contract(CONTRACT_ID);
  const op = contract.call(
    "resume_stream",
    new Address(p.callerAddress).toScVal(),
    nativeToScVal(p.streamId, { type: "u64" }),
  );
  return buildAndSimulate(p.callerAddress, op);
}

export async function buildWithdraw(p: StreamActionParams): Promise<BuildResult> {
  if (!isConfigured()) return { ok: false, error: "Stellar not configured." };
  const contract = new Contract(CONTRACT_ID);
  const op = contract.call(
    "withdraw",
    new Address(p.callerAddress).toScVal(),
    nativeToScVal(p.streamId, { type: "u64" }),
  );
  return buildAndSimulate(p.callerAddress, op);
}

export async function buildCancelStream(p: StreamActionParams): Promise<BuildResult> {
  if (!isConfigured()) return { ok: false, error: "Stellar not configured." };
  const contract = new Contract(CONTRACT_ID);
  const op = contract.call(
    "cancel_stream",
    new Address(p.callerAddress).toScVal(),
    nativeToScVal(p.streamId, { type: "u64" }),
  );
  return buildAndSimulate(p.callerAddress, op);
}

// ── Submit signed transaction ─────────────────────────────────────────────────

/**
 * Submit a Freighter-signed XDR to the Stellar Testnet RPC and poll for
 * confirmation (up to ~15 seconds).
 *
 * Returns `ok: true` even if polling times out — the hash is still valid and
 * the user can verify on the explorer.
 */
export async function submitSignedTx(signedXdr: string): Promise<SubmitResult> {
  if (!isConfigured()) {
    return { ok: false, error: "Stellar not configured." };
  }
  try {
    const server = getServer();
    const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const send = await server.sendTransaction(tx);

    if (send.status === "ERROR") {
      const detail =
        "errorResult" in send
          ? String((send as any).errorResult?.toString?.() ?? "network rejected")
          : "network rejected transaction";
      return { ok: false, error: detail.slice(0, 300) };
    }

    const hash = send.hash;

    // Poll for confirmation — up to 5 × 3 s = 15 s.
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const status = await server.getTransaction(hash);
        if (status.status === "SUCCESS") {
          let returnValue: unknown;
          try {
            if ("returnValue" in status && status.returnValue) {
              returnValue = scValToNative(status.returnValue as xdr.ScVal);
            }
          } catch {
            // ignore parse errors — returnValue stays undefined
          }
          return { ok: true, txHash: hash, returnValue };
        }
        if (status.status === "FAILED") {
          return { ok: false, error: "Transaction failed on-chain.", txHash: hash };
        }
        // "NOT_FOUND" — still pending, keep polling
      } catch {
        // RPC hiccup during polling — continue
      }
    }

    // Submitted but not confirmed within polling window; hash is still valid.
    return { ok: true, txHash: hash };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.slice(0, 300) };
  }
}

// ── Read stream state ─────────────────────────────────────────────────────────

/**
 * Read the current on-chain state of a stream from Soroban persistent storage.
 * Used to refresh the UI after transactions and to show stream details.
 */
export async function getStreamState(streamId: bigint): Promise<StreamStateResult> {
  if (!isConfigured()) {
    return { ok: false, error: "Stellar not configured." };
  }
  try {
    const server = getServer();
    const entry = await server.getContractData(
      CONTRACT_ID,
      makeStreamKey(streamId),
      rpc.Durability.Persistent,
    );
    const raw = scValToNative(entry.val.contractData().val()) as Record<string, unknown>;
    return {
      ok: true,
      stream: {
        streamId: String(raw.stream_id ?? streamId),
        payer: String(raw.payer ?? ""),
        receiver: String(raw.receiver ?? ""),
        status: parseStatus(raw.status),
        amount: String(raw.amount ?? "0"),
        withdrawn: String(raw.withdrawn ?? "0"),
        startTime: String(raw.start_time ?? "0"),
        endTime: String(raw.end_time ?? "0"),
        token: String(raw.token ?? ""),
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("entryNotFound") ||
      msg.includes("not found") ||
      msg.includes("does not exist")
    ) {
      return {
        ok: false,
        error: `Stream ${streamId} not found on Stellar Testnet. It may not exist or its ledger entry may have expired.`,
      };
    }
    return { ok: false, error: msg.slice(0, 200) };
  }
}
