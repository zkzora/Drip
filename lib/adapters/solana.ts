import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import type { DripChainAdapter } from "./types";
import type { DripAccessResult, CheckDripAccessParams } from "../chain";
import { SOLANA_RPC_URL, DRIP_PROGRAM_ID } from "../solana/constants";
import { mapProgramAccountToDripStream } from "../solana/stream";
import IDL from "../solana/idl";

// Read-only dummy wallet — only used to construct an AnchorProvider for account reads.
// Signing is never called on this wallet.
function makeReadOnlyWallet() {
  const kp = Keypair.generate();
  return {
    publicKey: kp.publicKey,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };
}

function getReadOnlyProgram(): Program {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const wallet = makeReadOnlyWallet();
  const provider = new AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  const idl = { ...IDL, address: DRIP_PROGRAM_ID.toBase58() } as unknown as Idl;
  return new Program(idl, provider);
}

const PAYER_OFFSET = 8;
const RECEIVER_OFFSET = 40;

export const solanaDevnetAdapter: DripChainAdapter = {
  async checkDripAccess(params: CheckDripAccessParams): Promise<DripAccessResult> {
    const { walletAddress, streamId } = params;

    let walletPublicKey: PublicKey;
    try {
      walletPublicKey = new PublicKey(walletAddress);
    } catch {
      return {
        allowed: false,
        reason: "wallet_mismatch",
        recommendation: "The wallet address is not a valid Solana public key.",
      };
    }

    let program: Program;
    try {
      program = getReadOnlyProgram();
    } catch {
      return {
        allowed: false,
        reason: "unknown",
        recommendation: "Could not initialize Solana connection. Check NEXT_PUBLIC_SOLANA_RPC_URL.",
      };
    }

    try {
      const key = walletPublicKey.toBase58();

      const fetchByOffset = (offset: number) =>
        (program.account as any).streamState.all([
          { memcmp: { offset, bytes: key } },
        ]) as Promise<{ publicKey: PublicKey; account: any }[]>;

      const [asPayer, asReceiver] = await Promise.all([
        fetchByOffset(PAYER_OFFSET),
        fetchByOffset(RECEIVER_OFFSET),
      ]);

      const seen = new Set<string>();
      const raw: { publicKey: PublicKey; account: any }[] = [];
      for (const a of [...asPayer, ...asReceiver]) {
        if (!seen.has(a.publicKey.toBase58())) {
          seen.add(a.publicKey.toBase58());
          raw.push(a);
        }
      }

      if (raw.length === 0) {
        return {
          allowed: false,
          reason: "no_stream",
          recommendation: "No DRIP stream found for this wallet on Solana Devnet.",
        };
      }

      const streams = raw.map(mapProgramAccountToDripStream);

      // If a specific streamId was requested, filter to that stream.
      const candidates = streamId
        ? streams.filter((s) => s.streamId.toString() === streamId)
        : streams;

      if (candidates.length === 0) {
        return {
          allowed: false,
          reason: "no_stream",
          recommendation: `No stream with ID ${streamId} found for this wallet on Solana Devnet.`,
        };
      }

      // Check if any candidate stream allows access (status=streaming and receiver matches).
      const activeStream = candidates.find(
        (s) => s.status === "streaming" && s.receiver.toBase58() === walletAddress
      );
      if (activeStream) {
        return {
          allowed: true,
          reason: "active",
          recommendation: "Stream is active. Access allowed.",
          streamSummary: {
            streamId: activeStream.streamId.toString(),
            payer: activeStream.payer.toBase58(),
            receiver: activeStream.receiver.toBase58(),
            status: activeStream.status,
            depositedAmountLamports: activeStream.depositedAmountLamports.toString(),
            withdrawnAmountLamports: activeStream.withdrawnAmountLamports.toString(),
            expirationTime: activeStream.expirationTime,
          },
        };
      }

      // No active stream — find the most informative reason from candidates.
      const first = candidates[0];
      const reason = first.status === "paused"
        ? "paused"
        : first.status === "cancelled"
        ? "cancelled"
        : first.status === "expired"
        ? "expired"
        : "no_stream";

      const recommendationMap: Record<string, string> = {
        paused: "The DRIP stream is paused. Access is blocked until the stream is resumed.",
        cancelled: "The DRIP stream has been cancelled. Access is blocked.",
        expired: "The DRIP stream has expired. Access is blocked.",
        no_stream: "No active incoming stream found for this wallet on Solana Devnet.",
      };

      return {
        allowed: false,
        reason,
        recommendation: recommendationMap[reason] ?? "Access not allowed.",
        streamSummary: {
          streamId: first.streamId.toString(),
          status: first.status,
        },
      };
    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      if (msg.includes("does not exist") || msg.includes("not deployed")) {
        return {
          allowed: false,
          reason: "config_missing",
          recommendation: "The DRIP program is not deployed on Solana Devnet. Check NEXT_PUBLIC_DRIP_PROGRAM_ID.",
        };
      }
      return {
        allowed: false,
        reason: "unknown",
        recommendation: "Unexpected error while checking stream on Solana Devnet: " + msg.slice(0, 120),
      };
    }
  },
};
