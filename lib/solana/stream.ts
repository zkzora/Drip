"use client";

import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { getDripProgram } from "./anchor";
import { deriveStreamPda, deriveEscrowPda, generateStreamId } from "./pda";
import type {
  DripStream,
  CreateStreamParams,
  StreamActionResult,
  WithdrawParams,
  PauseResumeParams,
  CancelStreamParams,
  FetchStreamParams,
  FetchAllStreamsParams,
  FetchStreamsForWalletParams,
  SolanaWalletLike,
} from "./types";
import type { StreamStatus } from "../types";

function deriveStatus(
  isPaused: boolean,
  isCancelled: boolean,
  expirationTime: number,
  depositedAmount: BN,
  withdrawnAmount: BN,
): StreamStatus {
  if (isCancelled) return "cancelled";
  if (isPaused) return "paused";
  const nowUnix = Math.floor(Date.now() / 1000);
  if (expirationTime > 0 && nowUnix >= expirationTime) return "expired";
  if (withdrawnAmount.gte(depositedAmount)) return "completed";
  return "streaming";
}

export function mapProgramAccountToDripStream(account: {
  publicKey: PublicKey;
  account: any;
}): DripStream {
  const a = account.account;

  const depositedAmountLamports: BN = a.depositedAmount;
  const withdrawnAmountLamports: BN = a.withdrawnAmount;
  const isPaused: boolean = a.isPaused;
  const isCancelled: boolean = a.isCancelled;
  const expirationTime: number = (a.expirationTime as BN).toNumber();

  return {
    publicKey: account.publicKey,
    payer: a.payer as PublicKey,
    receiver: a.receiver as PublicKey,
    streamId: a.streamId as BN,
    depositedAmountLamports,
    withdrawnAmountLamports,
    flowRateLamportsPerSecond: a.flowRatePerSecond as BN,
    startTime: (a.startTime as BN).toNumber(),
    lastWithdrawTime: (a.lastWithdrawTime as BN).toNumber(),
    pauseStartedAt: (a.pauseStartedAt as BN).toNumber(),
    totalPausedSeconds: (a.totalPausedSeconds as BN).toNumber(),
    maxBudgetLamports: a.maxBudget as BN,
    expirationTime,
    isPaused,
    isCancelled,
    status: deriveStatus(
      isPaused,
      isCancelled,
      expirationTime,
      depositedAmountLamports,
      withdrawnAmountLamports,
    ),
  };
}

export async function createStream(
  params: CreateStreamParams,
): Promise<StreamActionResult> {
  const {
    wallet,
    receiver,
    depositedAmountLamports,
    flowRateLamportsPerSecond,
    maxBudgetLamports = new BN(0),
    expirationTime = 0,
  } = params;

  const streamId = params.streamId ?? generateStreamId();
  const program = getDripProgram(wallet);
  const [streamState] = deriveStreamPda(wallet.publicKey, receiver, streamId);
  const [escrow] = deriveEscrowPda(streamState);

  const signature = await program.methods
    .initializeStream(
      streamId,
      depositedAmountLamports,
      flowRateLamportsPerSecond,
      maxBudgetLamports,
      new BN(expirationTime),
    )
    .accounts({
      payer: wallet.publicKey,
      receiver,
      streamState,
      escrow,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature };
}

export async function withdrawFromStream(
  params: WithdrawParams,
): Promise<StreamActionResult> {
  const { wallet, streamPublicKey } = params;
  const program = getDripProgram(wallet);

  const streamAccount = await (program.account as any).streamState.fetch(streamPublicKey);
  const [escrow] = deriveEscrowPda(streamPublicKey);

  const signature = await program.methods
    .withdraw()
    .accounts({
      receiver: wallet.publicKey,
      streamState: streamPublicKey,
      escrow,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature };
}

export async function pauseStream(
  params: PauseResumeParams,
): Promise<StreamActionResult> {
  const { wallet, streamPublicKey } = params;
  const program = getDripProgram(wallet);

  const signature = await program.methods
    .pauseStream()
    .accounts({
      payer: wallet.publicKey,
      streamState: streamPublicKey,
    })
    .rpc();

  return { signature };
}

export async function resumeStream(
  params: PauseResumeParams,
): Promise<StreamActionResult> {
  const { wallet, streamPublicKey } = params;
  const program = getDripProgram(wallet);

  const signature = await program.methods
    .resumeStream()
    .accounts({
      payer: wallet.publicKey,
      streamState: streamPublicKey,
    })
    .rpc();

  return { signature };
}

export async function cancelStream(
  params: CancelStreamParams,
): Promise<StreamActionResult> {
  const { wallet, streamPublicKey, receiverPublicKey } = params;
  const program = getDripProgram(wallet);
  const [escrow] = deriveEscrowPda(streamPublicKey);

  const signature = await program.methods
    .cancelStream()
    .accounts({
      payer: wallet.publicKey,
      receiver: receiverPublicKey,
      streamState: streamPublicKey,
      escrow,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature };
}

export async function fetchStream(
  params: FetchStreamParams,
): Promise<DripStream> {
  const { wallet, streamPublicKey } = params;
  const program = getDripProgram(wallet);

  const raw = await (program.account as any).streamState.fetch(streamPublicKey);
  return mapProgramAccountToDripStream({ publicKey: streamPublicKey, account: raw });
}

export async function fetchAllStreams(
  params: FetchAllStreamsParams,
): Promise<DripStream[]> {
  const { wallet } = params;
  const program = getDripProgram(wallet);

  const accounts = await (program.account as any).streamState.all();
  return accounts.map(mapProgramAccountToDripStream);
}

// Payer field is at byte offset 8 (after 8-byte discriminator).
// Receiver field is at offset 40 (8 + 32).
const PAYER_OFFSET = 8;
const RECEIVER_OFFSET = 40;

export async function fetchStreamsForWallet(
  params: FetchStreamsForWalletParams,
): Promise<DripStream[]> {
  const { wallet, walletPublicKey, role = "both" } = params;
  const program = getDripProgram(wallet);

  const key = walletPublicKey.toBase58();

  const fetchByOffset = (offset: number) =>
    (program.account as any).streamState.all([
      { memcmp: { offset, bytes: key } },
    ]) as Promise<{ publicKey: PublicKey; account: any }[]>;

  let accounts: { publicKey: PublicKey; account: any }[] = [];

  if (role === "payer") {
    accounts = await fetchByOffset(PAYER_OFFSET);
  } else if (role === "receiver") {
    accounts = await fetchByOffset(RECEIVER_OFFSET);
  } else {
    const [asPayer, asReceiver] = await Promise.all([
      fetchByOffset(PAYER_OFFSET),
      fetchByOffset(RECEIVER_OFFSET),
    ]);
    const seen = new Set<string>();
    for (const a of [...asPayer, ...asReceiver]) {
      if (!seen.has(a.publicKey.toBase58())) {
        seen.add(a.publicKey.toBase58());
        accounts.push(a);
      }
    }
  }

  return accounts.map(mapProgramAccountToDripStream);
}
