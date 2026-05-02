"use client";

import type { ReactNode } from "react";
import { JupiterWalletProvider } from "./JupiterWalletProvider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return <JupiterWalletProvider>{children}</JupiterWalletProvider>;
}

