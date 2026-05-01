import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { DRIP_PROGRAM_ID } from "./constants";

export function deriveStreamPda(
  payer: PublicKey,
  receiver: PublicKey,
  streamId: BN,
  programId: PublicKey = DRIP_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("stream"),
      payer.toBuffer(),
      receiver.toBuffer(),
      streamId.toArrayLike(Buffer, "le", 8),
    ],
    programId,
  );
}

export function deriveEscrowPda(
  streamPda: PublicKey,
  programId: PublicKey = DRIP_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), streamPda.toBuffer()],
    programId,
  );
}

/** Millisecond-timestamp-based stream ID, safe as u64 through 2554. */
export function generateStreamId(): BN {
  return new BN(Date.now());
}
