"use client";

import { useState, useEffect, useCallback } from "react";
import { detectFreighter, connectFreighter } from "./wallet";

export type FreighterWalletState = {
  available: boolean;
  connected: boolean;
  connecting: boolean;
  address: string | null;
  network: string | null;
  networkPassphrase: string | null;
  error: string | null;
};

const INITIAL_STATE: FreighterWalletState = {
  available: false,
  connected: false,
  connecting: false,
  address: null,
  network: null,
  networkPassphrase: null,
  error: null,
};

export type UseFreighterWalletReturn = FreighterWalletState & {
  connect: () => Promise<void>;
  disconnect: () => void;
};

export function useFreighterWallet(): UseFreighterWalletReturn {
  const [state, setState] = useState<FreighterWalletState>(INITIAL_STATE);

  // Probe for Freighter availability once on mount (browser-only).
  useEffect(() => {
    detectFreighter().then((available) => {
      setState((s) => ({ ...s, available }));
    });
  }, []);

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, connecting: true, error: null }));
    const result = await connectFreighter();
    const address = result.address || null;
    if (result.ok && address) {
      setState({
        available: true,
        connected: true,
        connecting: false,
        address,
        network: result.network || null,
        networkPassphrase: result.networkPassphrase || null,
        error: null,
      });
      return;
    }
    if (result.ok && !address) {
      // connectFreighter returned ok but no address — treat as error
      setState((s) => ({
        ...s,
        connecting: false,
        connected: false,
        address: null,
        network: null,
        networkPassphrase: null,
        error: "Freighter returned no address. Make sure you are logged in and try again.",
      }));
      return;
    }
    const errorMessage = result.error ?? "Unknown Freighter error.";
    setState((s) => ({
      ...s,
      connecting: false,
      connected: false,
      address: null,
      network: null,
      networkPassphrase: null,
      error: errorMessage,
    }));
  }, []);

  // Disconnect clears local state only — no wallet-side revocation.
  const disconnect = useCallback(() => {
    setState((s) => ({
      ...s,
      connected: false,
      address: null,
      network: null,
      networkPassphrase: null,
      error: null,
    }));
  }, []);

  return { ...state, connect, disconnect };
}
