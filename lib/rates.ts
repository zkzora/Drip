import BN from "bn.js";
import { LAMPORTS_PER_SOL_NUM } from "./solana/constants";

export type RateUnit = "second" | "minute" | "hour" | "day" | "week" | "month";

const UNIT_SECONDS: Record<RateUnit, number> = {
  second: 1,
  minute: 60,
  hour: 3_600,
  day: 86_400,
  week: 604_800,
  month: 2_592_000, // 30 days
};

export function convertRateToPerSecond(amount: number, unit: RateUnit): number {
  return amount / UNIT_SECONDS[unit];
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL_NUM);
}

export function lamportsToSol(lamports: number | bigint | BN): number {
  return Number(lamports instanceof BN ? lamports.toNumber() : lamports) / LAMPORTS_PER_SOL_NUM;
}

export function formatSol(lamports: number | bigint | BN, decimals = 4): string {
  return lamportsToSol(lamports).toFixed(decimals) + " SOL";
}

// Mirrors the Rust calculate_unlocked_amount logic exactly.
export interface StreamSnapshot {
  startTime: number;
  flowRateLamportsPerSecond: BN;
  depositedAmountLamports: BN;
  maxBudgetLamports: BN;
  expirationTime: number;
  isPaused: boolean;
  pauseStartedAt: number;
  totalPausedSeconds: number;
}

export function calculateUnlockedAmountClientSide(
  stream: StreamSnapshot,
  nowUnix = Math.floor(Date.now() / 1000),
): BN {
  let endTime = nowUnix;

  if (stream.expirationTime > 0 && endTime > stream.expirationTime) {
    endTime = stream.expirationTime;
  }
  if (stream.isPaused && stream.pauseStartedAt > 0 && stream.pauseStartedAt < endTime) {
    endTime = stream.pauseStartedAt;
  }

  const rawElapsed = endTime - stream.startTime;
  const effectiveElapsed = rawElapsed - stream.totalPausedSeconds;

  if (effectiveElapsed <= 0) return new BN(0);

  let unlocked = stream.flowRateLamportsPerSecond.mul(new BN(effectiveElapsed));

  if (unlocked.gt(stream.depositedAmountLamports)) {
    unlocked = stream.depositedAmountLamports.clone();
  }
  if (stream.maxBudgetLamports.gtn(0) && unlocked.gt(stream.maxBudgetLamports)) {
    unlocked = stream.maxBudgetLamports.clone();
  }

  return unlocked;
}

export function calculateWithdrawableAmountClientSide(
  stream: StreamSnapshot & { withdrawnAmountLamports: BN },
  nowUnix = Math.floor(Date.now() / 1000),
): BN {
  const unlocked = calculateUnlockedAmountClientSide(stream, nowUnix);
  const withdrawable = unlocked.sub(stream.withdrawnAmountLamports);
  return withdrawable.ltn(0) ? new BN(0) : withdrawable;
}
