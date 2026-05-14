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
  const bn = (value: number | string) => new BN(value.toString());

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
    rate?: number | string;
    maxBudget?: number | string;
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

  async function cancel(
    ctx: Awaited<ReturnType<typeof createStream>>,
    signer = ctx.payer,
    overrides: {
      receiverPubkey?: anchor.web3.PublicKey;
      escrow?: anchor.web3.PublicKey;
    } = {},
  ) {
    return program.methods
      .cancelStream()
      .accounts({
        payer: signer.publicKey,
        receiver: overrides.receiverPubkey ?? ctx.receiverPubkey,
        streamState: ctx.streamState,
        escrow: overrides.escrow ?? ctx.escrow,
        systemProgram: SystemProgram.programId,
      })
      .signers([signer])
      .rpc();
  }

  async function fetchStreamState(streamState: anchor.web3.PublicKey) {
    return (program.account as any).streamState.fetch(streamState);
  }

  async function balance(pubkey: anchor.web3.PublicKey) {
    return provider.connection.getBalance(pubkey);
  }

  async function waitUntilStreamElapsed(
    ctx: Awaited<ReturnType<typeof createStream>>,
    elapsedSeconds: number,
  ) {
    const state: any = await fetchStreamState(ctx.streamState);
    const target = state.startTime.toNumber() + elapsedSeconds;

    const started = Date.now();
    while ((await chainUnix()) < target) {
      assert(
        Date.now() - started < 30_000,
        `timed out waiting for stream elapsed seconds: ${elapsedSeconds}`,
      );
      await sleep(250);
    }
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

  it("rejects unauthorized payer actions", async () => {
    const ctx = await createStream();
    const intruder = await fundedKeypair();

    await expectAnchorError(pause(ctx, intruder), "UnauthorizedPayer");
    await pause(ctx);
    await expectAnchorError(resume(ctx, intruder), "UnauthorizedPayer");
    await resume(ctx);
    await expectAnchorError(cancel(ctx, intruder), "UnauthorizedPayer");
  });

  it("rejects withdraw with a mismatched escrow PDA", async () => {
    const ctx = await createStream();
    const other = await createStream();
    await sleep(1_250);

    await expectAnchorError(
      program.methods
        .withdraw()
        .accounts({
          receiver: ctx.receiver.publicKey,
          streamState: ctx.streamState,
          escrow: other.escrow,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.receiver])
        .rpc(),
      "ConstraintSeeds",
    );
  });

  it("rejects withdraw when nothing is available", async () => {
    const ctx = await createStream({ deposit: 10_000_000, rate: 1, maxBudget: 1 });
    await sleep(1_500);
    await withdraw(ctx);
    await expectAnchorError(withdraw(ctx), "NothingToWithdraw");
  });

  it("withdraws repeatedly without exceeding unlocked amount", async () => {
    const rate = 100_000;
    const ctx = await createStream({ deposit: 2_000_000, rate });

    await waitUntilStreamElapsed(ctx, 2);
    await withdraw(ctx);
    const firstState: any = await fetchStreamState(ctx.streamState);

    await waitUntilStreamElapsed(ctx, 4);
    await withdraw(ctx);
    const secondState: any = await fetchStreamState(ctx.streamState);

    assert(
      secondState.withdrawnAmount.gt(firstState.withdrawnAmount),
      "second withdrawal should increase total withdrawn",
    );
    assert(
      secondState.withdrawnAmount.lte(new BN(rate * 5)),
      `repeated withdrawals exceeded elapsed cap: ${secondState.withdrawnAmount.toString()}`,
    );
    assert(
      secondState.withdrawnAmount.lte(new BN(ctx.depositedAmount)),
      "repeated withdrawals exceeded deposit",
    );
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
    await waitUntilStreamElapsed(ctx, 2);
    await pause(ctx);
    await sleep(1_250);
    await resume(ctx);
    await withdraw(ctx);

    const state: any = await fetchStreamState(ctx.streamState);
    assert(state.totalPausedSeconds.gte(new BN(1)));
    assert(
      state.withdrawnAmount.lte(new BN(400_000)),
      `paused stream accrued too much: ${state.withdrawnAmount.toString()}`,
    );
  });

  it("multiple pause resume cycles only count active time", async () => {
    const rate = 100_000;
    const ctx = await createStream({ deposit: 2_000_000, rate });

    await waitUntilStreamElapsed(ctx, 2);
    await pause(ctx);
    await sleep(1_250);
    await resume(ctx);
    await pause(ctx);
    await sleep(1_250);
    await resume(ctx);
    await withdraw(ctx);

    const state: any = await fetchStreamState(ctx.streamState);
    assert(
      state.totalPausedSeconds.gte(new BN(1)),
      `paused duration too low: ${state.totalPausedSeconds.toString()}`,
    );
    assert(
      state.withdrawnAmount.lte(new BN(rate * 4)),
      `multi-pause stream accrued too much: ${state.withdrawnAmount.toString()}`,
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

  it("cancel after partial withdrawal pays only remaining unlocked funds", async () => {
    const ctx = await createStream({ deposit: 2_000_000, rate: 100_000 });

    await waitUntilStreamElapsed(ctx, 2);
    await withdraw(ctx);
    const stateAfterWithdraw: any = await fetchStreamState(ctx.streamState);

    await waitUntilStreamElapsed(ctx, 4);
    const receiverBefore = await balance(ctx.receiverPubkey);
    await cancel(ctx);
    const receiverAfter = await balance(ctx.receiverPubkey);
    const stateAfterCancel: any = await fetchStreamState(ctx.streamState);
    const escrowAfter = await balance(ctx.escrow);
    const rentReserve = await escrowRentReserve();

    const receiverDelta = receiverAfter - receiverBefore;
    const withdrawnDelta = stateAfterCancel.withdrawnAmount
      .sub(stateAfterWithdraw.withdrawnAmount)
      .toNumber();

    assert(withdrawnDelta > 0, "cancel should settle newly unlocked funds");
    assert.equal(receiverDelta, withdrawnDelta);
    assert(
      stateAfterCancel.withdrawnAmount.lte(new BN(ctx.depositedAmount)),
      "cancel overpaid receiver beyond deposit",
    );
    assert.equal(escrowAfter, rentReserve);
  });

  it("rejects cancel with a mismatched receiver account", async () => {
    const ctx = await createStream();
    const wrongReceiver = await fundedKeypair();

    await expectAnchorError(
      cancel(ctx, ctx.payer, { receiverPubkey: wrongReceiver.publicKey }),
      "InvalidReceiver",
    );
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
    const payer = await fundedKeypair();
    const receiver = await fundedKeypair();
    const expirationWindow = 8;
    const ctx = await createStream({
      payer,
      receiver,
      rate,
      expiration: (await chainUnix()) + expirationWindow,
    });
    await sleep((expirationWindow + 1) * 1_000);
    await withdraw(ctx);
    const state: any = await fetchStreamState(ctx.streamState);

    assert(
      state.withdrawnAmount.lte(new BN(rate * expirationWindow)),
      `expiration cap exceeded: ${state.withdrawnAmount.toString()}`,
    );
  });

  it("resume after expiration while paused does not brick cancellation", async () => {
    const rate = 100_000;
    const payer = await fundedKeypair();
    const receiver = await fundedKeypair();
    const expirationWindow = 6;
    const ctx = await createStream({
      payer,
      receiver,
      rate,
      expiration: (await chainUnix()) + expirationWindow,
    });

    await sleep(1_250);
    await pause(ctx);
    await sleep((expirationWindow + 1) * 1_000);
    await resume(ctx);
    await cancel(ctx);

    const state: any = await fetchStreamState(ctx.streamState);
    assert.equal(state.isCancelled, true);
    assert(
      state.withdrawnAmount.lte(new BN(rate * expirationWindow)),
      `expiration cap exceeded after pause/resume: ${state.withdrawnAmount.toString()}`,
    );
    assert(
      state.totalPausedSeconds.lte(new BN(expirationWindow)),
      `pause duration counted past expiration: ${state.totalPausedSeconds.toString()}`,
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

  it("max budget reached then cancel refunds unused deposit", async () => {
    const rate = 100_000;
    const maxBudget = 200_000;
    const ctx = await createStream({ deposit: 1_000_000, rate, maxBudget });

    await waitUntilStreamElapsed(ctx, 3);
    await withdraw(ctx);
    const receiverBefore = await balance(ctx.receiverPubkey);
    const payerBefore = await balance(ctx.payer.publicKey);

    await cancel(ctx);
    const receiverAfter = await balance(ctx.receiverPubkey);
    const payerAfter = await balance(ctx.payer.publicKey);
    const state: any = await fetchStreamState(ctx.streamState);
    const escrowAfter = await balance(ctx.escrow);
    const rentReserve = await escrowRentReserve();

    assert.equal(state.withdrawnAmount.toNumber(), maxBudget);
    assert.equal(receiverAfter - receiverBefore, 0);
    assert(payerAfter > payerBefore, "payer should receive unused deposit refund");
    assert.equal(escrowAfter, rentReserve);
  });

  it("tiny one-lamport stream withdraws only integer lamports", async () => {
    const ctx = await createStream({ deposit: 3, rate: 1 });

    await waitUntilStreamElapsed(ctx, 2);
    const receiverBefore = await balance(ctx.receiverPubkey);
    await withdraw(ctx);
    const receiverAfter = await balance(ctx.receiverPubkey);
    const state: any = await fetchStreamState(ctx.streamState);

    assert(state.withdrawnAmount.gte(new BN(1)));
    assert(state.withdrawnAmount.lte(new BN(3)));
    assert.equal(receiverAfter - receiverBefore, state.withdrawnAmount.toNumber());
  });

  it("huge flow rate saturates at deposit instead of overflowing", async () => {
    const deposit = 10_000;
    const hugeRate = "18446744073709551615";
    const ctx = await createStream({ deposit, rate: hugeRate });

    await waitUntilStreamElapsed(ctx, 2);
    await withdraw(ctx);
    const state: any = await fetchStreamState(ctx.streamState);

    assert.equal(state.withdrawnAmount.toNumber(), deposit);
    await expectAnchorError(withdraw(ctx), "NothingToWithdraw");
  });
});
