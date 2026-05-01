// Copy of target/idl/drip.json — kept here so it's source-controlled.
// Regenerate from: anchor build
const IDL = {
  address: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkgPj3GVjKqLx",
  metadata: { name: "drip", version: "0.1.0", spec: "0.1.0" },
  instructions: [
    {
      name: "cancel_stream",
      discriminator: [218, 221, 38, 25, 177, 207, 188, 91],
      accounts: [
        { name: "payer", writable: true, signer: true },
        { name: "receiver", writable: true },
        { name: "stream_state", writable: true },
        { name: "escrow", writable: true },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [],
    },
    {
      name: "initialize_stream",
      discriminator: [118, 75, 0, 207, 137, 93, 113, 74],
      accounts: [
        { name: "payer", writable: true, signer: true },
        { name: "receiver" },
        { name: "stream_state", writable: true },
        { name: "escrow", writable: true },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "stream_id", type: "u64" },
        { name: "deposited_amount", type: "u64" },
        { name: "flow_rate_per_second", type: "u64" },
        { name: "max_budget", type: "u64" },
        { name: "expiration_time", type: "i64" },
      ],
    },
    {
      name: "pause_stream",
      discriminator: [245, 31, 118, 229, 0, 108, 166, 82],
      accounts: [
        { name: "payer", signer: true },
        { name: "stream_state", writable: true },
      ],
      args: [],
    },
    {
      name: "resume_stream",
      discriminator: [193, 187, 211, 115, 119, 76, 178, 68],
      accounts: [
        { name: "payer", signer: true },
        { name: "stream_state", writable: true },
      ],
      args: [],
    },
    {
      name: "withdraw",
      discriminator: [183, 18, 70, 156, 148, 109, 161, 34],
      accounts: [
        { name: "receiver", writable: true, signer: true },
        { name: "stream_state", writable: true },
        { name: "escrow", writable: true },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "StreamState",
      discriminator: [7, 127, 34, 194, 119, 142, 214, 87],
    },
  ],
  errors: [
    { code: 6000, name: "InvalidDeposit", msg: "Deposit amount must be greater than zero" },
    { code: 6001, name: "InvalidFlowRate", msg: "Flow rate must be greater than zero" },
    { code: 6002, name: "InvalidReceiver", msg: "Receiver cannot be the same as payer" },
    { code: 6003, name: "InvalidMaxBudget", msg: "Max budget cannot exceed deposited amount" },
    { code: 6004, name: "InvalidExpiration", msg: "Expiration timestamp must be in the future" },
    { code: 6005, name: "UnauthorizedPayer", msg: "Only the payer can perform this action" },
    { code: 6006, name: "UnauthorizedReceiver", msg: "Only the receiver can withdraw" },
    { code: 6007, name: "StreamPaused", msg: "Stream is currently paused" },
    { code: 6008, name: "AlreadyPaused", msg: "Stream is already paused" },
    { code: 6009, name: "NotPaused", msg: "Stream is not paused" },
    { code: 6010, name: "AlreadyCancelled", msg: "Stream is already cancelled" },
    { code: 6011, name: "NothingToWithdraw", msg: "No funds available to withdraw" },
    { code: 6012, name: "InsufficientEscrowFunds", msg: "Escrow does not have enough stream funds available" },
    { code: 6013, name: "MathError", msg: "Math overflow or underflow" },
  ],
  types: [
    {
      name: "StreamState",
      type: {
        kind: "struct",
        fields: [
          { name: "payer", type: "pubkey" },
          { name: "receiver", type: "pubkey" },
          { name: "stream_id", type: "u64" },
          { name: "deposited_amount", type: "u64" },
          { name: "withdrawn_amount", type: "u64" },
          { name: "flow_rate_per_second", type: "u64" },
          { name: "start_time", type: "i64" },
          { name: "last_withdraw_time", type: "i64" },
          { name: "pause_started_at", type: "i64" },
          { name: "total_paused_seconds", type: "i64" },
          { name: "max_budget", type: "u64" },
          { name: "expiration_time", type: "i64" },
          { name: "is_paused", type: "bool" },
          { name: "is_cancelled", type: "bool" },
          { name: "bump", type: "u8" },
          { name: "escrow_bump", type: "u8" },
        ],
      },
    },
  ],
} as const;

export default IDL;
export type DripIdl = typeof IDL;
