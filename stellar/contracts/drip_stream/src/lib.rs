//! DRIP payment stream Soroban contract — Stellar Testnet prototype.
//!
//! Core model:
//!   active stream  → access allowed  (receiver may withdraw vested funds)
//!   paused / cancelled stream → access blocked
//!   unvested funds remain under payer control
//!
//! PHASE S5A: Token custody is now wired.
//! ────────────────────────────────────────
//! Each stream holds a reference to a Stellar token contract (SEP-41).
//! • create_stream  — transfers `amount` from payer into contract escrow
//! • withdraw       — transfers vested-but-unwithdrawn amount to receiver
//! • cancel_stream  — transfers receiver_due to receiver, payer_refund to payer
//!
//! PROTOTYPE LIMITATIONS
//! ─────────────────────
//! • No Freighter/Lobstr wallet UI yet — stream creation requires CLI invocation.
//! • Testnet only — do not use for real funds.
//! • See docs/architecture/STELLAR_TESTNET_SUPPORT.md for next steps.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

// ── TTL constants ────────────────────────────────────────────────────────────
// Stellar ~5 s/ledger; 30 days ≈ 518 400 ledgers.

const LEDGER_TTL_THRESHOLD: u32 = 100_000;
const LEDGER_TTL_BUMP: u32 = 518_400;

// ── Storage keys ─────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    StreamCount,
    Stream(u64),
}

// ── Domain types ──────────────────────────────────────────────────────────────

/// Lifecycle state of a DRIP stream.
#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum StreamStatus {
    Active,
    Paused,
    Cancelled,
    Completed,
}

/// Full on-chain stream record.
///
/// `amount` and `withdrawn` are in the token's base unit (e.g. stroops for XLM).
/// `token` is the SEP-41 token contract address used for custody.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Stream {
    pub stream_id: u64,
    /// SEP-41 token contract address (e.g. native XLM SAC on testnet).
    pub token: Address,
    pub payer: Address,
    pub receiver: Address,
    /// Total amount deposited into this stream.
    pub amount: i128,
    /// Total amount already withdrawn by the receiver.
    pub withdrawn: i128,
    /// Unix timestamp when streaming begins.
    pub start_time: u64,
    /// Unix timestamp when streaming ends (0 = all funds immediately available).
    pub end_time: u64,
    pub status: StreamStatus,
    pub created_at: u64,
    pub updated_at: u64,
    /// Timestamp when stream was last paused; 0 when not currently paused.
    pub pause_started_at: u64,
    /// Accumulated seconds spent in the paused state; subtracts from vesting.
    pub total_paused_secs: u64,
}

// ── Contract entry points ─────────────────────────────────────────────────────

#[contract]
pub struct DripStream;

#[contractimpl]
impl DripStream {
    // ── Admin ─────────────────────────────────────────────────────────────────

    /// One-time setup: register the admin address.  Panics if already done.
    pub fn initialize_admin(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::StreamCount, &0_u64);
    }

    /// Return the current admin.
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized")
    }

    /// Return the total number of streams ever created.
    pub fn stream_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::StreamCount)
            .unwrap_or(0)
    }

    // ── Stream lifecycle ──────────────────────────────────────────────────────

    /// Create a new payment stream.
    ///
    /// Transfers `amount` tokens from `payer` into contract custody via the
    /// specified SEP-41 `token` contract.  Returns the new `stream_id`.
    pub fn create_stream(
        env: Env,
        payer: Address,
        token: Address,
        receiver: Address,
        amount: i128,
        start_time: u64,
        end_time: u64,
    ) -> u64 {
        payer.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }
        if end_time != 0 && end_time <= start_time {
            panic!("end_time must be after start_time");
        }

        // Pull `amount` tokens from payer into contract escrow.
        token::Client::new(&env, &token)
            .transfer(&payer, &env.current_contract_address(), &amount);

        let now = env.ledger().timestamp();
        let prev: u64 = env
            .storage()
            .instance()
            .get(&DataKey::StreamCount)
            .unwrap_or(0);
        let stream_id = prev + 1;
        env.storage()
            .instance()
            .set(&DataKey::StreamCount, &stream_id);

        let stream = Stream {
            stream_id,
            token,
            payer,
            receiver,
            amount,
            withdrawn: 0,
            start_time,
            end_time,
            status: StreamStatus::Active,
            created_at: now,
            updated_at: now,
            pause_started_at: 0,
            total_paused_secs: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Stream(stream_id), &stream);
        Self::bump_stream_ttl(&env, stream_id);

        stream_id
    }

    /// Pause an active stream.  Only the `payer` may call this.
    pub fn pause_stream(env: Env, caller: Address, stream_id: u64) {
        caller.require_auth();

        let mut stream = Self::load_stream(&env, stream_id);
        if caller != stream.payer {
            panic!("unauthorized: only payer can pause");
        }
        if stream.status != StreamStatus::Active {
            panic!("stream is not active");
        }

        let now = env.ledger().timestamp();
        stream.status = StreamStatus::Paused;
        stream.pause_started_at = now;
        stream.updated_at = now;

        env.storage()
            .persistent()
            .set(&DataKey::Stream(stream_id), &stream);
        Self::bump_stream_ttl(&env, stream_id);
    }

    /// Resume a paused stream.  Only the `payer` may call this.
    /// The paused interval is accumulated into `total_paused_secs`.
    pub fn resume_stream(env: Env, caller: Address, stream_id: u64) {
        caller.require_auth();

        let mut stream = Self::load_stream(&env, stream_id);
        if caller != stream.payer {
            panic!("unauthorized: only payer can resume");
        }
        if stream.status != StreamStatus::Paused {
            panic!("stream is not paused");
        }

        let now = env.ledger().timestamp();
        let paused_duration = now.saturating_sub(stream.pause_started_at);
        stream.total_paused_secs = stream.total_paused_secs.saturating_add(paused_duration);
        stream.status = StreamStatus::Active;
        stream.pause_started_at = 0;
        stream.updated_at = now;

        env.storage()
            .persistent()
            .set(&DataKey::Stream(stream_id), &stream);
        Self::bump_stream_ttl(&env, stream_id);
    }

    /// Withdraw vested funds.  Only the `receiver` may call this.
    ///
    /// State is updated BEFORE the token transfer (checks-effects-interactions).
    /// Returns the amount released in this call.
    pub fn withdraw(env: Env, caller: Address, stream_id: u64) -> i128 {
        caller.require_auth();

        let mut stream = Self::load_stream(&env, stream_id);
        if caller != stream.receiver {
            panic!("unauthorized: only receiver can withdraw");
        }
        if stream.status == StreamStatus::Cancelled {
            panic!("stream is cancelled");
        }
        if stream.status == StreamStatus::Paused {
            panic!("stream is paused; ask payer to resume before withdrawing");
        }
        if stream.status == StreamStatus::Completed {
            panic!("stream is already fully withdrawn");
        }

        let now = env.ledger().timestamp();
        let vested = Self::calc_vested(&stream, now);
        let withdrawable = vested.saturating_sub(stream.withdrawn);
        if withdrawable <= 0 {
            panic!("nothing to withdraw yet");
        }

        // Effects: update state before external call.
        stream.withdrawn = stream.withdrawn.saturating_add(withdrawable);
        stream.updated_at = now;
        if stream.withdrawn >= stream.amount {
            stream.status = StreamStatus::Completed;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Stream(stream_id), &stream);
        Self::bump_stream_ttl(&env, stream_id);

        // Interaction: transfer vested amount to receiver.
        token::Client::new(&env, &stream.token)
            .transfer(&env.current_contract_address(), &caller, &withdrawable);

        withdrawable
    }

    /// Cancel a stream.  Only the `payer` may call this.
    ///
    /// Returns `(receiver_due, payer_refund)`.
    /// State is updated BEFORE transfers (checks-effects-interactions).
    pub fn cancel_stream(env: Env, caller: Address, stream_id: u64) -> (i128, i128) {
        caller.require_auth();

        let mut stream = Self::load_stream(&env, stream_id);
        if caller != stream.payer {
            panic!("unauthorized: only payer can cancel");
        }
        if stream.status == StreamStatus::Cancelled {
            panic!("stream already cancelled");
        }

        let now = env.ledger().timestamp();
        let vested = Self::calc_vested(&stream, now);
        let receiver_due = vested.saturating_sub(stream.withdrawn);
        let payer_refund = stream.amount.saturating_sub(vested);

        // Effects: update state before external calls.
        stream.status = StreamStatus::Cancelled;
        stream.updated_at = now;

        env.storage()
            .persistent()
            .set(&DataKey::Stream(stream_id), &stream);
        Self::bump_stream_ttl(&env, stream_id);

        // Interactions: distribute escrowed funds.
        let token = token::Client::new(&env, &stream.token);
        let contract_addr = env.current_contract_address();
        if receiver_due > 0 {
            token.transfer(&contract_addr, &stream.receiver, &receiver_due);
        }
        if payer_refund > 0 {
            token.transfer(&contract_addr, &stream.payer, &payer_refund);
        }

        (receiver_due, payer_refund)
    }

    /// Read the current stream state.  Callable by anyone.
    pub fn get_stream(env: Env, stream_id: u64) -> Stream {
        Self::load_stream(&env, stream_id)
    }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

impl DripStream {
    fn load_stream(env: &Env, stream_id: u64) -> Stream {
        env.storage()
            .persistent()
            .get(&DataKey::Stream(stream_id))
            .expect("stream not found")
    }

    fn bump_stream_ttl(env: &Env, stream_id: u64) {
        env.storage().persistent().extend_ttl(
            &DataKey::Stream(stream_id),
            LEDGER_TTL_THRESHOLD,
            LEDGER_TTL_BUMP,
        );
    }

    /// Linearly-vested amount at `current_time`, adjusted for paused intervals.
    ///
    /// If `end_time == 0` all funds vest immediately.
    pub fn calc_vested(stream: &Stream, current_time: u64) -> i128 {
        let ongoing_pause = if stream.status == StreamStatus::Paused {
            current_time.saturating_sub(stream.pause_started_at)
        } else {
            0
        };
        let total_paused = stream.total_paused_secs.saturating_add(ongoing_pause);

        if stream.end_time == 0 {
            return stream.amount;
        }
        if current_time <= stream.start_time {
            return 0;
        }

        let effective_now = current_time.min(stream.end_time);
        let raw_elapsed = effective_now.saturating_sub(stream.start_time);
        let active_elapsed = raw_elapsed.saturating_sub(total_paused);
        let total_duration = stream.end_time.saturating_sub(stream.start_time);

        if total_duration == 0 {
            return stream.amount;
        }

        stream.amount * (active_elapsed as i128) / (total_duration as i128)
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        token, Address, Env,
    };

    use crate::{DripStream, DripStreamClient, StreamStatus};

    // ── Test helpers ──────────────────────────────────────────────────────────

    fn set_time(env: &Env, ts: u64) {
        env.ledger().with_mut(|l| l.timestamp = ts);
    }

    /// Register a Stellar Asset Contract and return its address.
    fn create_token(env: &Env, admin: &Address) -> Address {
        env.register_stellar_asset_contract(admin.clone())
    }

    /// Mint `amount` tokens to `to` using the SAC admin client.
    fn mint(env: &Env, token_id: &Address, to: &Address, amount: i128) {
        token::StellarAssetClient::new(env, token_id).mint(to, &amount);
    }

    /// Read token balance for an address.
    fn balance(env: &Env, token_id: &Address, addr: &Address) -> i128 {
        token::Client::new(env, token_id).balance(addr)
    }

    // ── create_stream ─────────────────────────────────────────────────────────

    #[test]
    fn test_create_stream() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register(DripStream, ());
        let client = DripStreamClient::new(&env, &cid);
        client.initialize_admin(&Address::generate(&env));

        let admin = Address::generate(&env);
        let tok = create_token(&env, &admin);
        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);
        mint(&env, &tok, &payer, 10_000);

        set_time(&env, 1_000);
        let id = client.create_stream(&payer, &tok, &receiver, &10_000_i128, &1_000_u64, &2_000_u64);
        assert_eq!(id, 1);
        assert_eq!(client.stream_count(), 1);

        let s = client.get_stream(&id);
        assert_eq!(s.stream_id, 1);
        assert_eq!(s.amount, 10_000);
        assert_eq!(s.withdrawn, 0);
        assert_eq!(s.status, StreamStatus::Active);
        assert_eq!(s.start_time, 1_000);
        assert_eq!(s.end_time, 2_000);
        assert_eq!(s.token, tok);
    }

    #[test]
    fn test_create_stream_holds_custody() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register(DripStream, ());
        let client = DripStreamClient::new(&env, &cid);
        client.initialize_admin(&Address::generate(&env));

        let admin = Address::generate(&env);
        let tok = create_token(&env, &admin);
        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);
        mint(&env, &tok, &payer, 5_000);

        assert_eq!(balance(&env, &tok, &payer), 5_000);

        set_time(&env, 0);
        client.create_stream(&payer, &tok, &receiver, &5_000_i128, &0_u64, &1_000_u64);

        // Payer balance drained; contract holds the funds.
        assert_eq!(balance(&env, &tok, &payer), 0);
        assert_eq!(balance(&env, &tok, &cid), 5_000);
    }

    // ── pause ─────────────────────────────────────────────────────────────────

    #[test]
    fn test_pause_stream() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register(DripStream, ());
        let client = DripStreamClient::new(&env, &cid);
        client.initialize_admin(&Address::generate(&env));

        let admin = Address::generate(&env);
        let tok = create_token(&env, &admin);
        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);
        mint(&env, &tok, &payer, 1_000);

        set_time(&env, 0);
        let id = client.create_stream(&payer, &tok, &receiver, &1_000_i128, &0_u64, &1_000_u64);

        set_time(&env, 200);
        client.pause_stream(&payer, &id);

        let s = client.get_stream(&id);
        assert_eq!(s.status, StreamStatus::Paused);
        assert_eq!(s.pause_started_at, 200);
    }

    // ── resume ────────────────────────────────────────────────────────────────

    #[test]
    fn test_resume_stream() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register(DripStream, ());
        let client = DripStreamClient::new(&env, &cid);
        client.initialize_admin(&Address::generate(&env));

        let admin = Address::generate(&env);
        let tok = create_token(&env, &admin);
        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);
        mint(&env, &tok, &payer, 1_000);

        set_time(&env, 0);
        let id = client.create_stream(&payer, &tok, &receiver, &1_000_i128, &0_u64, &1_000_u64);

        set_time(&env, 200);
        client.pause_stream(&payer, &id);

        set_time(&env, 400);
        client.resume_stream(&payer, &id);

        let s = client.get_stream(&id);
        assert_eq!(s.status, StreamStatus::Active);
        assert_eq!(s.total_paused_secs, 200);
        assert_eq!(s.pause_started_at, 0);
    }

    // ── withdraw ──────────────────────────────────────────────────────────────

    #[test]
    fn test_withdraw_vested() {
        // Stream T=0→1000, amount=1000. At T=500: 50% vested → receiver gets 500.
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register(DripStream, ());
        let client = DripStreamClient::new(&env, &cid);
        client.initialize_admin(&Address::generate(&env));

        let admin = Address::generate(&env);
        let tok = create_token(&env, &admin);
        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);
        mint(&env, &tok, &payer, 1_000);

        set_time(&env, 0);
        let id = client.create_stream(&payer, &tok, &receiver, &1_000_i128, &0_u64, &1_000_u64);

        set_time(&env, 500);
        let released = client.withdraw(&receiver, &id);
        assert_eq!(released, 500);

        assert_eq!(balance(&env, &tok, &receiver), 500);
        assert_eq!(balance(&env, &tok, &cid), 500);

        let s = client.get_stream(&id);
        assert_eq!(s.withdrawn, 500);
        assert_eq!(s.status, StreamStatus::Active);
    }

    #[test]
    fn test_withdraw_completes_stream() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register(DripStream, ());
        let client = DripStreamClient::new(&env, &cid);
        client.initialize_admin(&Address::generate(&env));

        let admin = Address::generate(&env);
        let tok = create_token(&env, &admin);
        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);
        mint(&env, &tok, &payer, 1_000);

        set_time(&env, 0);
        let id = client.create_stream(&payer, &tok, &receiver, &1_000_i128, &0_u64, &1_000_u64);

        set_time(&env, 1_000);
        let released = client.withdraw(&receiver, &id);
        assert_eq!(released, 1_000);

        assert_eq!(balance(&env, &tok, &receiver), 1_000);
        assert_eq!(balance(&env, &tok, &cid), 0);
        assert_eq!(client.get_stream(&id).status, StreamStatus::Completed);
    }

    #[test]
    fn test_withdraw_transfers_to_receiver() {
        // Two withdrawals: T=250 (25%), T=750 (50% more) with correct balances throughout.
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register(DripStream, ());
        let client = DripStreamClient::new(&env, &cid);
        client.initialize_admin(&Address::generate(&env));

        let admin = Address::generate(&env);
        let tok = create_token(&env, &admin);
        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);
        mint(&env, &tok, &payer, 1_000);

        set_time(&env, 0);
        let id = client.create_stream(&payer, &tok, &receiver, &1_000_i128, &0_u64, &1_000_u64);

        set_time(&env, 250);
        let r1 = client.withdraw(&receiver, &id);
        assert_eq!(r1, 250);
        assert_eq!(balance(&env, &tok, &receiver), 250);

        set_time(&env, 750);
        let r2 = client.withdraw(&receiver, &id);
        assert_eq!(r2, 500); // 750 vested - 250 already withdrawn
        assert_eq!(balance(&env, &tok, &receiver), 750);
        assert_eq!(balance(&env, &tok, &cid), 250); // 250 still locked
    }

    // ── cancel ────────────────────────────────────────────────────────────────

    #[test]
    fn test_cancel_stream() {
        // At T=300/1000 → 30% vested.  receiver_due=300, payer_refund=700.
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register(DripStream, ());
        let client = DripStreamClient::new(&env, &cid);
        client.initialize_admin(&Address::generate(&env));

        let admin = Address::generate(&env);
        let tok = create_token(&env, &admin);
        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);
        mint(&env, &tok, &payer, 1_000);

        set_time(&env, 0);
        let id = client.create_stream(&payer, &tok, &receiver, &1_000_i128, &0_u64, &1_000_u64);

        set_time(&env, 300);
        let (receiver_due, payer_refund) = client.cancel_stream(&payer, &id);
        assert_eq!(receiver_due, 300);
        assert_eq!(payer_refund, 700);
        assert_eq!(client.get_stream(&id).status, StreamStatus::Cancelled);
    }

    #[test]
    fn test_cancel_transfers_correct_amounts() {
        // Cancel at T=400/1000 → receiver_due=400, payer_refund=600.
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register(DripStream, ());
        let client = DripStreamClient::new(&env, &cid);
        client.initialize_admin(&Address::generate(&env));

        let admin = Address::generate(&env);
        let tok = create_token(&env, &admin);
        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);
        mint(&env, &tok, &payer, 1_000);

        set_time(&env, 0);
        let id = client.create_stream(&payer, &tok, &receiver, &1_000_i128, &0_u64, &1_000_u64);

        // Payer funded the contract
        assert_eq!(balance(&env, &tok, &cid), 1_000);
        assert_eq!(balance(&env, &tok, &payer), 0);

        set_time(&env, 400);
        client.cancel_stream(&payer, &id);

        // Contract is drained; correct splits.
        assert_eq!(balance(&env, &tok, &cid), 0);
        assert_eq!(balance(&env, &tok, &receiver), 400);
        assert_eq!(balance(&env, &tok, &payer), 600);
    }

    #[test]
    fn test_cancel_after_partial_withdraw() {
        // Receiver withdraws 250 at T=250, payer cancels at T=500.
        // vested at cancel = 500, receiver already got 250 → receiver_due = 250, payer_refund = 500.
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register(DripStream, ());
        let client = DripStreamClient::new(&env, &cid);
        client.initialize_admin(&Address::generate(&env));

        let admin = Address::generate(&env);
        let tok = create_token(&env, &admin);
        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);
        mint(&env, &tok, &payer, 1_000);

        set_time(&env, 0);
        let id = client.create_stream(&payer, &tok, &receiver, &1_000_i128, &0_u64, &1_000_u64);

        set_time(&env, 250);
        client.withdraw(&receiver, &id);
        assert_eq!(balance(&env, &tok, &receiver), 250);

        set_time(&env, 500);
        let (recv_due, pay_refund) = client.cancel_stream(&payer, &id);
        assert_eq!(recv_due, 250);
        assert_eq!(pay_refund, 500);

        assert_eq!(balance(&env, &tok, &receiver), 500);  // 250 + 250
        assert_eq!(balance(&env, &tok, &payer), 500);
        assert_eq!(balance(&env, &tok, &cid), 0);
    }

    // ── blocked actions ───────────────────────────────────────────────────────

    #[test]
    #[should_panic(expected = "stream is cancelled")]
    fn test_cancelled_blocks_withdraw() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register(DripStream, ());
        let client = DripStreamClient::new(&env, &cid);
        client.initialize_admin(&Address::generate(&env));

        let admin = Address::generate(&env);
        let tok = create_token(&env, &admin);
        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);
        mint(&env, &tok, &payer, 1_000);

        set_time(&env, 0);
        let id = client.create_stream(&payer, &tok, &receiver, &1_000_i128, &0_u64, &1_000_u64);

        set_time(&env, 500);
        client.cancel_stream(&payer, &id);
        client.withdraw(&receiver, &id); // must panic
    }

    #[test]
    #[should_panic(expected = "stream already cancelled")]
    fn test_double_cancel_panics() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register(DripStream, ());
        let client = DripStreamClient::new(&env, &cid);
        client.initialize_admin(&Address::generate(&env));

        let admin = Address::generate(&env);
        let tok = create_token(&env, &admin);
        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);
        mint(&env, &tok, &payer, 1_000);

        set_time(&env, 0);
        let id = client.create_stream(&payer, &tok, &receiver, &1_000_i128, &0_u64, &1_000_u64);

        client.cancel_stream(&payer, &id);
        client.cancel_stream(&payer, &id); // must panic
    }

    // ── pause adjusts vesting ─────────────────────────────────────────────────

    #[test]
    fn test_pause_adjusts_vesting() {
        // Stream T=0→1000, amount=1000.
        // Pause T=250→T=750 (500 s paused).
        // Active elapsed at T=1000 = 1000 - 500 = 500 → vested = 500.
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register(DripStream, ());
        let client = DripStreamClient::new(&env, &cid);
        client.initialize_admin(&Address::generate(&env));

        let admin = Address::generate(&env);
        let tok = create_token(&env, &admin);
        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);
        mint(&env, &tok, &payer, 1_000);

        set_time(&env, 0);
        let id = client.create_stream(&payer, &tok, &receiver, &1_000_i128, &0_u64, &1_000_u64);

        set_time(&env, 250);
        client.pause_stream(&payer, &id);
        set_time(&env, 750);
        client.resume_stream(&payer, &id);

        set_time(&env, 1_000);
        let released = client.withdraw(&receiver, &id);
        assert_eq!(released, 500);
        assert_eq!(balance(&env, &tok, &receiver), 500);
        assert_eq!(balance(&env, &tok, &cid), 500); // unvested stays in contract
    }

    // ── get_stream ────────────────────────────────────────────────────────────

    #[test]
    fn test_get_stream_state() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register(DripStream, ());
        let client = DripStreamClient::new(&env, &cid);
        client.initialize_admin(&Address::generate(&env));

        let admin = Address::generate(&env);
        let tok = create_token(&env, &admin);
        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);
        mint(&env, &tok, &payer, 5_000);

        set_time(&env, 42);
        let id = client.create_stream(&payer, &tok, &receiver, &5_000_i128, &42_u64, &1_042_u64);

        let s = client.get_stream(&id);
        assert_eq!(s.stream_id, id);
        assert_eq!(s.amount, 5_000);
        assert_eq!(s.withdrawn, 0);
        assert_eq!(s.start_time, 42);
        assert_eq!(s.end_time, 1_042);
        assert_eq!(s.created_at, 42);
        assert_eq!(s.status, StreamStatus::Active);
        assert_eq!(s.token, tok);
    }
}
