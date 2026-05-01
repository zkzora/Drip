import type { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import type BN from "bn.js";

export type { StreamStatus, StreamCategory } from "../types";
import type { StreamStatus, StreamCategory } from "../types";

export interface SolanaWalletLike {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

export interface DripStream {
  publicKey: PublicKey;
  payer: PublicKey;
  receiver: PublicKey;
  streamId: BN;
  depositedAmountLamports: BN;
  withdrawnAmountLamports: BN;
  flowRateLamportsPerSecond: BN;
  startTime: number;
  lastWithdrawTime: number;
  pauseStartedAt: number;
  totalPausedSeconds: number;
  maxBudgetLamports: BN;
  expirationTime: number;
  isPaused: boolean;
  isCancelled: boolean;
  status: StreamStatus;
  category?: StreamCategory;
  lastTxSignature?: string;
}

export interface CreateStreamParams {
  wallet: SolanaWalletLike;
  receiver: PublicKey;
  streamId?: BN;
  depositedAmountLamports: BN;
  flowRateLamportsPerSecond: BN;
  maxBudgetLamports?: BN;
  expirationTime?: number;
}

export interface StreamActionResult {
  signature: string;
  stream?: DripStream;
}

export interface WithdrawParams {
  wallet: SolanaWalletLike;
  streamPublicKey: PublicKey;
}

export interface PauseResumeParams {
  wallet: SolanaWalletLike;
  streamPublicKey: PublicKey;
}

export interface CancelStreamParams {
  wallet: SolanaWalletLike;
  streamPublicKey: PublicKey;
  receiverPublicKey: PublicKey;
}

export interface FetchStreamParams {
  wallet: SolanaWalletLike;
  streamPublicKey: PublicKey;
}

export interface FetchAllStreamsParams {
  wallet: SolanaWalletLike;
}

export interface FetchStreamsForWalletParams {
  wallet: SolanaWalletLike;
  walletPublicKey: PublicKey;
  role?: "payer" | "receiver" | "both";
}
