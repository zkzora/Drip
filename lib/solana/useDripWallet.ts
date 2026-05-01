"use client";

import { createContext, useContext } from "react";
import type { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

export type AnchorCompatibleWallet = {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
};

export type DripWalletContextValue = {
  connected: boolean;
  connecting: boolean;
  publicKey: PublicKey | null;
  publicKeyString: string | null;
  wallet: AnchorCompatibleWallet | null;
  connect: (() => Promise<void>) | null;
  disconnect: (() => Promise<void>) | null;
  providerName: string | null;
  walletReady: boolean;
  error: string | null;
};

const DEFAULT_WALLET_CONTEXT: DripWalletContextValue = {
  connected: false,
  connecting: false,
  publicKey: null,
  publicKeyString: null,
  wallet: null,
  connect: null,
  disconnect: null,
  providerName: null,
  walletReady: false,
  error: null,
};

export const DripWalletContext = createContext<DripWalletContextValue>(DEFAULT_WALLET_CONTEXT);

export function useDripWallet(): DripWalletContextValue {
  return useContext(DripWalletContext);
}

