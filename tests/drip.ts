import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import { strict as assert } from "assert";

const { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } = anchor.web3;

describe("drip", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Drip as anchor.Program;
  let streamNonce = 1;

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const bn = (value: number | bigint) => new BN(value.toString());

  async function confirm(signature: string) {
    const latest = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({ signature, ...latest }, "confirmed");
  }

  async function airdrop(pubkey: anchor.web3.PublicKey, sol = 2) {
    const signature = await provider.connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
    await confirm(signature);
  }

  async function fundedKeypair(sol = 2) {
    const keypair = Keypair.generate();
    await airdrop(keypair.publicKey, sol);
    return keypair;
  }

  async function chainUnix() {
    const slot = await provider.connection.getSlot();
    const blockTime = await provider.connection.getBlockTime(slot);
    return blockTime ?? Math.floor(Date.now() / 1000);
  }

  async function escrowRentReserve() {
    return provider.connection.getMinimumBalanceForRentExemption(0);
  }

  function deriveStreamPda(
    payer: anchor.web3.PublicKey,
    receiver: anchor.web3.PublicKey,
    streamId: BN,
  ) {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("stream"),
        payer.toBuffer(),
        receiver.toBuffer(),
        streamId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId,
    );
  }

  function deriveEscrowPda(streamState: anchor.web3.PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), streamState.toBuffer()],
      program.programId,
    );
  }

  async function expectAnchorError(action: Promise<unknown>, code: string) {
    try {
      await action;
      assert.fail(`Expected Anchor error ${code}`);
    } catch (error: any) {
      const actual = error?.error?.errorCode?.code ?? error?.errorCode?.code;
      const text = `${error?.message ?? ""} ${JSON.stringify(error?.error ?? {})}`;
      assert(
        actual === code || text.includes(code),
        `Expected ${code}, got ${actual ?? text}`,
      );
    }
  }

  async function createStream(opts: {
    payer?: anchor.web3.Keypair;
    receiver?: anchor.web3.Keypair;
    receiverPubkey?: anchor.web3.PublicKey;
    deposit?: number;
    rate?: number;
    maxBudget?: number;
    expiration?: number;
  } = {}) {
    const payer = opts.payer ?? (await fundedKeypair());
    const receiver = opts.receiver ?? (await fundedKeypair());
    const receiverPubkey = opts.receiverPubkey ?? receiver.publicKey;
    const streamId = new BN(streamNonce++);
    const depositedAmount = opts.deposit ?? 10_000_000;
    const flowRatePerSecond = opts.rate ?? 100_000;
    const maxBudget = opts.maxBudget ?? 0;
    const expirationTime = opts.expiration ?? 0;
    const [streamState] = deriveStreamPda(payer.publicKey, receiverPubkey, streamId);
    const [escrow] = deriveEscrowPda(streamState);

    await program.methods
      .initializeStream(
        streamId,
        bn(depositedAmount),
        bn(flowRatePerSecond),
        bn(maxBudget),
        new BN(expirationTime),
      )
      .accounts({
        payer: payer.publicKey,
        receiver: receiverPubkey,
        streamState,
        escrow,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    return {
      payer,
      receiver,
      receiverPubkey,
      streamId,
      streamState,
      escrow,
      depositedAmount,
      flowRatePerSecond,
      maxBudget,
      expirationTime,
    };
  }

  async function initializeExpectFail(opts: {
    payer?: anchor.web3.Keypair;
    receiverPubkey?: anchor.web3.PublicKey;
    deposit: number;
    rate: number;
    maxBudget?: number;
    expiration?: number;
    code: string;
  }) {
    const payer = opts.payer ?? await fundedKeypair();
    const receiverPubkey = opts.receiverPubkey ?? Keypair.generate().publicKey;
    const streamId = new BN(streamNonce++);
    const [streamState] = deriveStreamPda(payer.publicKey, receiverPubkey, streamId);
    const [escrow] = deriveEscrowPda(streamState);

    await expectAnchorError(
      program.methods
        .initializeStream(
          streamId,
          bn(opts.deposit),
          bn(opts.rate),
          bn(opts.maxBudget ?? 0),
          new BN(opts.expiration ?? 0),
        )
        .accounts({
          payer: payer.publicKey,
          receiver: receiverPubkey,
          streamState,
          escrow,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc(),
      opts.code,
    );
  }

  async function withdraw(ctx: Awaited<ReturnType<typeof createStream>>, signer = ctx.receiver) {
    return program.methods
      .withdraw()
      .accounts({
        receiver: signer.publicKey,
        streamState: ctx.streamState,
        escrow: ctx.escrow,
        systemProgram: SystemProgram.programId,
      })
      .signers([signer])
      .rpc();
  }

  async function pause(ctx: Awaited<ReturnType<typeof createStream>>, signer = ctx.payer) {
    return program.methods
      .pauseStream()
      .accounts({
        payer: signer.publicKey,
        streamState: ctx.streamState,
      })
      .signers([signer])
      .rpc();
  }

  async function resume(ctx: Awaited<ReturnType<typeof createStream>>, signer = ctx.payer) {
    return program.methods
      .resumeStream()
      .accounts({
        payer: signer.publicKey,
        streamState: ctx.streamState,
      })
      .signers([signer])
      .rpc();
  }

  async function cancel(ctx: Awaited<ReturnType<typeof createStream>>, signer = ctx.payer) {
    return program.methods
      .cancelStream()
      .accounts({
        payer: signer.publicKey,
        receiver: ctx.receiverPubkey,
        streamState: ctx.streamState,
        escrow: ctx.escrow,
        systemProgram: SystemProgram.programId,
      })
      .signers([signer])
      .rpc();
  }

  async function fetchStreamState(streamState: anchor.web3.PublicKey) {
    return (program.account as any).streamState.fetch(streamState);
  }

  it("creates a stream successfully", async () => {
    const ctx = await createStream();
    const state: any = await fetchStreamState(ctx.streamState);
    const escrowBalance = await provider.connection.getBalance(ctx.escrow);
    const rentReserve = await escrowRentReserve();

    assert.equal(state.payer.toBase58(), ctx.payer.publicKey.toBase58());
    assert.equal(state.receiver.toBase58(), ctx.receiverPubkey.toBase58());
    assert.equal(state.streamId.toString(), ctx.streamId.toString());
    assert.equal(state.depositedAmount.toNumber(), ctx.depositedAmount);
    assert.equal(state.withdrawnAmount.toNumber(), 0);
    assert.equal(escrowBalance, ctx.depositedAmount + rentReserve);
    assert.equal(state.isPaused, false);
    assert.equal(state.isCancelled, false);
  });

  it("rejects zero deposit", async () => {
    await initializeExpectFail({ deposit: 0, rate: 100_000, code: "InvalidDeposit" });
  });

  it("rejects zero flow rate", async () => {
    await initializeExpectFail({ deposit: 10_000_000, rate: 0, code: "InvalidFlowRate" });
  });

  it("rejects receiver equal to payer", async () => {
    const payer = await fundedKeypair();
    await initializeExpectFail({
      payer,
      receiverPubkey: payer.publicKey,
      deposit: 10_000_000,
      rate: 100_000,
      code: "InvalidReceiver",
    });
  });

  it("rejects max budget greater than deposit", async () => {
    await initializeExpectFail({
      deposit: 10_000_000,
      rate: 100_000,
      maxBudget: 10_000_001,
      code: "InvalidMaxBudget",
    });
  });

  it("rejects expiration in the past", async () => {
    await initializeExpectFail({
      deposit: 10_000_000,
      rate: 100_000,
      expiration: (await chainUnix()) - 1,
      code: "InvalidExpiration",
    });
  });

  it("withdraws after time passes", async () => {
    const ctx = await createStream();
    await sleep(2_500);

    const before = await provider.connection.getBalance(ctx.receiverPubkey);
    await withdraw(ctx);
    const after = await provider.connection.getBalance(ctx.receiverPubkey);
    const state: any = await fetchStreamState(ctx.streamState);

    assert(after > before);
    assert(state.withdrawnAmount.gt(new BN(0)));
  });

  it("rejects unauthorized withdraw", async () => {
    const ctx = await createStream();
    const intruder = Keypair.generate();
    await sleep(1_250);

    await expectAnchorError(withdraw(ctx, intruder), "UnauthorizedReceiver");
  });

  it("rejects withdraw when nothing is available", async () => {
    const ctx = await createStream({ deposit: 10_000_000, rate: 1, maxBudget: 1 });
    await sleep(1_500);
    await withdraw(ctx);
    await expectAnchorError(withdraw(ctx), "NothingToWithdraw");
  });

  it("pauses a stream", async () => {
    const ctx = await createStream();
    await pause(ctx);
    const state: any = await fetchStreamState(ctx.streamState);

    assert.equal(state.isPaused, true);
    assert(state.pauseStartedAt.gt(new BN(0)));
  });

  it("rejects withdraw while paused", async () => {
    const ctx = await createStream();
    await sleep(1_250);
    await pause(ctx);

    await expectAnchorError(withdraw(ctx), "StreamPaused");
  });

  it("resumes a stream", async () => {
    const ctx = await createStream();
    await pause(ctx);
    await sleep(1_250);
    await resume(ctx);
    const state: any = await fetchStreamState(ctx.streamState);

    assert.equal(state.isPaused, false);
    assert.equal(state.pauseStartedAt.toNumber(), 0);
    assert(state.totalPausedSeconds.gte(new BN(1)));
  });

  it("does not accrue while paused", async () => {
    const ctx = await createStream({ rate: 100_000 });
    await sleep(1_250);
    await pause(ctx);
    await sleep(3_250);
    await resume(ctx);
    await withdraw(ctx);

    const state: any = await fetchStreamState(ctx.streamState);
    assert(state.totalPausedSeconds.gte(new BN(2)));
    assert(
      state.withdrawnAmount.lte(new BN(300_000)),
      `paused stream accrued too much: ${state.withdrawnAmount.toString()}`,
    );
  });

  it("cancels a stream", async () => {
    const ctx = await createStream();
    await cancel(ctx);
    const state: any = await fetchStreamState(ctx.streamState);

    assert.equal(state.isCancelled, true);
  });

  it("cancel settles receiver due", async () => {
    const ctx = await createStream();
    await sleep(1_250);

    const before = await provider.connection.getBalance(ctx.receiverPubkey);
    await cancel(ctx);
    const after = await provider.connection.getBalance(ctx.receiverPubkey);
    const state: any = await fetchStreamState(ctx.streamState);

    assert(after > before);
    assert(state.withdrawnAmount.gt(new BN(0)));
  });

  it("cancel refunds remaining escrow to payer", async () => {
    const ctx = await createStream({ deposit: 10_000_000, rate: 100_000 });
    await sleep(1_250);

    const payerBefore = await provider.connection.getBalance(ctx.payer.publicKey);
    await cancel(ctx);
    const payerAfter = await provider.connection.getBalance(ctx.payer.publicKey);
    const escrowAfter = await provider.connection.getBalance(ctx.escrow);
    const rentReserve = await escrowRentReserve();

    assert(payerAfter > payerBefore);
    assert.equal(escrowAfter, rentReserve);
  });

  it("rejects actions after cancellation", async () => {
    const ctx = await createStream();
    await cancel(ctx);

    await expectAnchorError(withdraw(ctx), "AlreadyCancelled");
    await expectAnchorError(pause(ctx), "AlreadyCancelled");
    await expectAnchorError(resume(ctx), "AlreadyCancelled");
    await expectAnchorError(cancel(ctx), "AlreadyCancelled");
  });

  it("expiration caps accrual", async () => {
    const rate = 100_000;
    const ctx = await createStream({
      rate,
      expiration: (await chainUnix()) + 5,
    });
    await sleep(6_500);
    await withdraw(ctx);
    const state: any = await fetchStreamState(ctx.streamState);

    assert(
      state.withdrawnAmount.lte(new BN(rate * 5)),
      `expiration cap exceeded: ${state.withdrawnAmount.toString()}`,
    );
  });

  it("max budget caps accrual", async () => {
    const rate = 100_000;
    const maxBudget = 200_000;
    const ctx = await createStream({ rate, maxBudget });
    await sleep(3_500);
    await withdraw(ctx);
    const state: any = await fetchStreamState(ctx.streamState);

    assert.equal(state.withdrawnAmount.toNumber(), maxBudget);
  });
});
