import type { DripChain, DripAccessResult, CheckDripAccessParams } from "../chain";
import type { DripChainAdapter } from "./types";
import { solanaDevnetAdapter } from "./solana";
import { stellarTestnetAdapter } from "./stellar";

const adapters: Record<DripChain, DripChainAdapter> = {
  "solana-devnet": solanaDevnetAdapter,
  "stellar-testnet": stellarTestnetAdapter,
};

export async function checkDripAccess(
  params: CheckDripAccessParams
): Promise<DripAccessResult> {
  const adapter = adapters[params.chain];
  if (!adapter) {
    return {
      allowed: false,
      reason: "not_supported",
      recommendation: `Chain "${params.chain}" is not supported.`,
    };
  }
  return adapter.checkDripAccess(params);
}

export { solanaDevnetAdapter, stellarTestnetAdapter };
export type { DripChainAdapter };
