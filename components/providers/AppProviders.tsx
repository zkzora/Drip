"use client";

import type { ReactNode } from "react";
import { SolanaProvider } from "./SolanaProvider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return <SolanaProvider>{children}</SolanaProvider>;
}

