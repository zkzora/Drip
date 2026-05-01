"use client";

import { Connection } from "@solana/web3.js";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { SOLANA_RPC_URL, DRIP_PROGRAM_ID } from "./constants";
import type { SolanaWalletLike } from "./types";
import IDL from "./idl";

export function getConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, "confirmed");
}

export function getAnchorProvider(wallet: SolanaWalletLike): AnchorProvider {
  return new AnchorProvider(getConnection(), wallet as any, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
}

export function getDripProgram(wallet: SolanaWalletLike): Program {
  const provider = getAnchorProvider(wallet);
  // Spread so the program ID from constants/env overrides the IDL default.
  const idl = { ...IDL, address: DRIP_PROGRAM_ID.toBase58() } as unknown as Idl;
  return new Program(idl, provider);
}
