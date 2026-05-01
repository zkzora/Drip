"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PublicKey, type Transaction, type VersionedTransaction } from "@solana/web3.js";
import {
  DripWalletContext,
  type AnchorCompatibleWallet,
  type DripWalletContextValue,
} from "@/lib/solana/useDripWallet";

type SolanaPublicKeyLike =
  | PublicKey
  | string
  | {
      toBase58?: () => string;
      toString?: () => string;
    }
  | null
  | undefined;

type SolanaConnectResult = {
  publicKey?: SolanaPublicKeyLike;
};

type InjectedSolanaProvider = {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  isConnected?: boolean;
  publicKey?: SolanaPublicKeyLike;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<SolanaConnectResult | void>;
  disconnect?: () => Promise<void>;
  signTransaction?: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions?: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
  on?: (event: "connect" | "disconnect" | "accountChanged", handler: (publicKey?: SolanaPublicKeyLike) => void) => void;
  off?: (event: "connect" | "disconnect" | "accountChanged", handler: (publicKey?: SolanaPublicKeyLike) => void) => void;
  removeListener?: (
    event: "connect" | "disconnect" | "accountChanged",
    handler: (publicKey?: SolanaPublicKeyLike) => void,
  ) => void;
};

declare global {
  interface Window {
    solana?: InjectedSolanaProvider;
    phantom?: { solana?: InjectedSolanaProvider };
    solflare?: InjectedSolanaProvider;
    backpack?: { solana?: InjectedSolanaProvider };
  }
}

type SolanaProviderProps = {
  children: ReactNode;
};

function parsePublicKey(value: SolanaPublicKeyLike): PublicKey | null {
  if (!value) return null;

  try {
    if (value instanceof PublicKey) return value;
    if (typeof value === "string") return new PublicKey(value);
    if (typeof value.toBase58 === "function") return new PublicKey(value.toBase58());
    if (typeof value.toString === "function") return new PublicKey(value.toString());
  } catch {
    return null;
  }

  return null;
}

function getInjectedSolanaProvider(): InjectedSolanaProvider | null {
  if (typeof window === "undefined") return null;

  const providers = [
    window.phantom?.solana,
    window.backpack?.solana,
    window.solflare,
    window.solana,
  ].filter(Boolean) as InjectedSolanaProvider[];

  return providers.find((provider) => typeof provider.connect === "function") ?? null;
}

function getProviderName(provider: InjectedSolanaProvider | null): string | null {
  if (!provider) return null;
  if (provider.isPhantom) return "Phantom";
  if (provider.isBackpack) return "Backpack";
  if (provider.isSolflare) return "Solflare";
  return "Solana wallet";
}

export function SolanaProvider({ children }: SolanaProviderProps) {
  const [provider, setProvider] = useState<InjectedSolanaProvider | null>(null);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectedProvider = getInjectedSolanaProvider();
    setProvider(detectedProvider);

    if (!detectedProvider) return;

    const syncPublicKey = (nextPublicKey?: SolanaPublicKeyLike) => {
      setPublicKey(parsePublicKey(nextPublicKey ?? detectedProvider.publicKey));
    };
    const clearPublicKey = () => setPublicKey(null);

    detectedProvider.on?.("connect", syncPublicKey);
    detectedProvider.on?.("accountChanged", syncPublicKey);
    detectedProvider.on?.("disconnect", clearPublicKey);

    if (detectedProvider.isConnected || detectedProvider.publicKey) {
      syncPublicKey(detectedProvider.publicKey);
    } else if (detectedProvider.isPhantom) {
      detectedProvider
        .connect({ onlyIfTrusted: true })
        .then((result) => {
          syncPublicKey(result && "publicKey" in result ? result.publicKey : detectedProvider.publicKey);
        })
        .catch(() => {
          syncPublicKey(detectedProvider.publicKey);
        });
    }

    return () => {
      detectedProvider.off?.("connect", syncPublicKey);
      detectedProvider.off?.("accountChanged", syncPublicKey);
      detectedProvider.off?.("disconnect", clearPublicKey);
      detectedProvider.removeListener?.("connect", syncPublicKey);
      detectedProvider.removeListener?.("accountChanged", syncPublicKey);
      detectedProvider.removeListener?.("disconnect", clearPublicKey);
    };
  }, []);

  const connect = useCallback(async () => {
    const detectedProvider = provider ?? getInjectedSolanaProvider();
    if (!detectedProvider) {
      setError("No Solana wallet extension found. Install Phantom, Solflare, or Backpack to sign transactions.");
      return;
    }

    setProvider(detectedProvider);
    setConnecting(true);
    setError(null);

    try {
      const result = await detectedProvider.connect();
      setPublicKey(parsePublicKey(result && "publicKey" in result ? result.publicKey : detectedProvider.publicKey));
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Wallet connection was cancelled.");
    } finally {
      setConnecting(false);
    }
  }, [provider]);

  const disconnect = useCallback(async () => {
    if (!provider) {
      setPublicKey(null);
      return;
    }

    setError(null);
    await provider.disconnect?.();
    setPublicKey(null);
  }, [provider]);

  const wallet = useMemo<AnchorCompatibleWallet | null>(() => {
    if (!provider || !publicKey || !provider.signTransaction) return null;

    return {
      publicKey,
      signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => provider.signTransaction!(tx),
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]) => {
        if (provider.signAllTransactions) return provider.signAllTransactions(txs);

        const signed: T[] = [];
        for (const tx of txs) {
          signed.push(await provider.signTransaction!(tx));
        }
        return signed;
      },
    };
  }, [provider, publicKey]);

  const value = useMemo<DripWalletContextValue>(
    () => ({
      connected: Boolean(publicKey && wallet),
      connecting,
      publicKey,
      publicKeyString: publicKey?.toBase58() ?? null,
      wallet,
      connect,
      disconnect,
      providerName: getProviderName(provider),
      walletReady: Boolean(provider),
      error,
    }),
    [connect, connecting, disconnect, error, provider, publicKey, wallet],
  );

  return <DripWalletContext.Provider value={value}>{children}</DripWalletContext.Provider>;
}
