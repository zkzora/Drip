// Freighter wallet helpers for Stellar Testnet.
// Browser-only — dynamically imported to avoid SSR issues.
// Never stores private keys. Signing requires explicit user action every time.

export type FreighterConnectResult = {
  ok: boolean;
  address?: string;
  network?: string;
  networkPassphrase?: string;
  error?: string;
};

export type FreighterSignResult = {
  ok: boolean;
  signedTxXdr?: string;
  error?: string;
};

// Returns true if the Freighter browser extension is installed and reachable.
export async function detectFreighter(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { isConnected } = await import("@stellar/freighter-api");
    const result = await isConnected();
    return result.isConnected === true;
  } catch {
    return false;
  }
}

// Prompts Freighter for the user's public key and current network.
// Returns ok:false on user rejection, missing extension, or any error.
// Uses requestAccess() (not getAddress()) so Freighter shows a permission popup
// when the site hasn't been approved yet, and always returns the public key.
export async function connectFreighter(): Promise<FreighterConnectResult> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Freighter requires a browser environment." };
  }
  try {
    const { isConnected, requestAccess, getNetwork } = await import("@stellar/freighter-api");

    const connResult = await isConnected();
    if (!connResult.isConnected) {
      return {
        ok: false,
        error:
          "Freighter is not installed. Install the Freighter browser extension from freighter.app to connect a Stellar wallet.",
      };
    }

    // requestAccess triggers the Freighter permission popup when the site is not
    // yet approved, and returns the public key once the user approves.
    const accessResult = await requestAccess();
    if (accessResult.error) {
      const msg = accessResult.error.message ?? "";
      return { ok: false, error: isUserRejection(msg) ? "Connection rejected in Freighter." : msg.slice(0, 200) };
    }
    const address = accessResult.address;
    if (!address || !address.startsWith("G") || address.length < 50) {
      return {
        ok: false,
        error: "Freighter returned an empty or invalid address. Make sure you are logged in to Freighter and try again.",
      };
    }

    const netResult = await getNetwork();
    if (netResult.error) {
      return {
        ok: false,
        error: netResult.error.message?.slice(0, 200) ?? "Could not read network from Freighter.",
      };
    }

    return {
      ok: true,
      address,
      network: netResult.network,
      networkPassphrase: netResult.networkPassphrase,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: isUserRejection(msg) ? "Connection rejected in Freighter." : msg.slice(0, 200) };
  }
}

// Signs a Soroban transaction XDR via Freighter.
// Must only be called in direct response to a user action — never auto-signed.
// Shows a transaction preview in Freighter before the user approves.
export async function signStellarTx(
  xdrTx: string,
  networkPassphrase: string,
): Promise<FreighterSignResult> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Freighter requires a browser environment." };
  }
  try {
    const { signTransaction } = await import("@stellar/freighter-api");
    const result = await signTransaction(xdrTx, { networkPassphrase });
    if (result.error) {
      const msg = result.error.message ?? "";
      return { ok: false, error: isUserRejection(msg) ? "Transaction rejected in Freighter." : msg.slice(0, 200) };
    }
    return { ok: true, signedTxXdr: result.signedTxXdr };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: isUserRejection(msg) ? "Transaction rejected in Freighter." : msg.slice(0, 200) };
  }
}

function isUserRejection(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("user") ||
    lower.includes("reject") ||
    lower.includes("denied") ||
    lower.includes("declined") ||
    lower.includes("cancel")
  );
}
