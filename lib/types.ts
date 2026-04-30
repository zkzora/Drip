export type StreamDirection = "in" | "out";

export type StreamStatus =
  | "streaming"
  | "paused"
  | "completed"
  | "cancelled"
  | "expired";

export type StreamPolicy = "standard" | "agent";

export type StreamCategory =
  | "AI_COMPUTE"
  | "API_COSTS"
  | "HUMAN_PAYROLL"
  | "B2B_SUBSCRIPTION"
  | "SUBSCRIPTION"
  | "OTHER";

export type MockStream = {
  id: string;
  dir: StreamDirection;
  party: string;
  addr: string;
  token: string;
  rate: number;
  status: StreamStatus;
  started: number;
  base: number;
  label: string;
  deposit: number;
  totalDuration: number;
  policy: StreamPolicy;
  budgetCap?: number;
  autoRevoke?: string;
  category?: StreamCategory;
};

export type MockHistoryItem = {
  id: string;
  kind: "ended" | "cancelled";
  party: string;
  final: number;
  token: string;
  at: string;
  duration: number;
  tx: string;
};

export type MockAgent = {
  id: string;
  name: string;
  model: string;
  rate: number;
  status: "active" | "idle";
  calls: number;
};

export type ReportLedgerItem = {
  date: string;
  counterparty: string;
  addr: string;
  category: "payroll" | "ai-compute" | "subs";
  duration: number;
  amount: number;
  tx: string;
  type: StreamDirection;
};

export type UserWalletProfile = {
  name: string;
  email: string;
  shortAddress: string;
  walletLabel: string;
  embeddedWalletLabel: string;
  recovery: string;
  twoFactor: string;
};

export type ProtocolStats = {
  clusterLabel: string;
  version: string;
  blockTime: string;
  settlement: string;
  streamFee: string;
  rpcStatus: string;
  rpcSlotShort: string;
  slot: string;
  complianceSlot: string;
  protocolStatus: string;
  finalityLabel: string;
  yieldApy: number;
};
