export type DripChain = "solana-devnet" | "stellar-testnet";

export type AccessReason =
  | "active"
  | "paused"
  | "cancelled"
  | "expired"
  | "no_stream"
  | "wallet_mismatch"
  | "config_missing"
  | "not_supported"
  | "unknown";

export interface DripAccessResult {
  allowed: boolean;
  reason: AccessReason;
  recommendation: string;
  streamSummary?: Record<string, unknown>;
}

export interface CheckDripAccessParams {
  chain: DripChain;
  walletAddress: string;
  streamId?: string;
}

export const DRIP_CHAIN_LABELS: Record<DripChain, string> = {
  "solana-devnet": "Solana Devnet",
  "stellar-testnet": "Stellar Testnet",
};
