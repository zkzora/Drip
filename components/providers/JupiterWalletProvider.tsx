"use client";

import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  UnifiedWalletProvider,
  useUnifiedWallet,
  useUnifiedWalletContext,
} from "@jup-ag/wallet-adapter";
import type { SignerWalletAdapter } from "@solana/wallet-adapter-base";
import {
  DripWalletContext,
  type AnchorCompatibleWallet,
  type DripWalletContextValue,
} from "@/lib/solana/useDripWallet";

// Bridges Jupiter's unified wallet state into DripWalletContext so all
// downstream code (useDripWallet) stays completely unchanged.
function WalletContextBridge({ children }: { children: ReactNode }) {
  const { wallet, publicKey, connecting, connected, disconnect } = useUnifiedWallet();
  const { setShowModal } = useUnifiedWalletContext();

  const connect = useCallback(async () => {
    setShowModal(true);
  }, [setShowModal]);

  const disconnectFn = useCallback(async () => {
    try {
      await disconnect();
    } catch {
      // swallow — wallet may already be disconnected
    }
  }, [disconnect]);

  const anchorWallet = useMemo<AnchorCompatibleWallet | null>(() => {
    const adapter = wallet?.adapter as (SignerWalletAdapter & { signAllTransactions?: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]> }) | undefined;
    if (!connected || !publicKey || !adapter || !("signTransaction" in adapter)) return null;

    return {
      publicKey,
      signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) =>
        adapter.signTransaction(tx as Parameters<typeof adapter.signTransaction>[0]) as Promise<T>,
      signAllTransactions: adapter.signAllTransactions
        ? <T extends Transaction | VersionedTransaction>(txs: T[]) =>
            adapter.signAllTransactions!(txs as Parameters<typeof adapter.signTransaction>[0][]) as Promise<T[]>
        : async <T extends Transaction | VersionedTransaction>(txs: T[]) => {
            const signed: T[] = [];
            for (const tx of txs) {
              signed.push(
                (await adapter.signTransaction(tx as Parameters<typeof adapter.signTransaction>[0])) as T,
              );
            }
            return signed;
          },
    };
  }, [connected, publicKey, wallet]);

  const value = useMemo<DripWalletContextValue>(
    () => ({
      connected: Boolean(connected && publicKey && anchorWallet),
      connecting,
      publicKey: publicKey ?? null,
      publicKeyString: publicKey?.toBase58() ?? null,
      wallet: anchorWallet,
      connect,
      disconnect: disconnectFn,
      providerName: wallet?.adapter?.name ?? null,
      walletReady: true,
      error: null,
    }),
    [connected, connecting, publicKey, anchorWallet, connect, disconnectFn, wallet],
  );

  return <DripWalletContext.Provider value={value}>{children}</DripWalletContext.Provider>;
}

export function JupiterWalletProvider({ children }: { children: ReactNode }) {
  return (
    <UnifiedWalletProvider
      wallets={[]}
      config={{
        autoConnect: false,
        env: "devnet",
        metadata: {
          name: "Drip",
          description: "Solana streaming payments protocol",
          url: "https://drip.so",
          iconUrls: [],
        },
        theme: "dark",
        lang: "en",
      }}
    >
      <WalletContextBridge>{children}</WalletContextBridge>
    </UnifiedWalletProvider>
  );
}
