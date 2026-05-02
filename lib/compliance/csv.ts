import type { ComplianceStreamRecord } from "./records";

// ---- formatting helpers ------------------------------------------------

function fmtDate(unixSec: number): string {
  if (!unixSec) return "";
  return new Date(unixSec * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function fmtSol(n: number): string {
  // Always fixed 6 decimal places — never scientific notation
  return n.toFixed(6);
}

function fmtRate(n: number): string {
  // Flow rate can be very small; use 9 decimals to avoid 3.8e-8 nonsense
  return n.toFixed(9);
}

function fmtDuration(sec: number): string {
  if (!sec) return "0s";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function shortAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-6)}` : addr;
}

function escapeField(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

// ---- column definitions ------------------------------------------------

const COLUMNS: Array<{ header: string; value: (r: ComplianceStreamRecord) => string }> = [
  { header: "stream_id",               value: r => r.streamId },
  { header: "stream_account",          value: r => r.streamAccount },
  { header: "stream_account_short",    value: r => shortAddr(r.streamAccount) },
  { header: "payer",                   value: r => r.payer },
  { header: "payer_short",             value: r => shortAddr(r.payer) },
  { header: "receiver",                value: r => r.receiver },
  { header: "receiver_short",          value: r => shortAddr(r.receiver) },
  { header: "direction",               value: r => r.direction },
  { header: "category",                value: r => r.category },
  { header: "status",                  value: r => r.status },
  { header: "start_time_utc",          value: r => fmtDate(r.startTime) },
  { header: "start_time_unix",         value: r => r.startTime ? String(r.startTime) : "" },
  { header: "expiration_time_utc",     value: r => r.expirationTime ? fmtDate(r.expirationTime) : "none" },
  { header: "duration_human",          value: r => fmtDuration(r.durationSeconds) },
  { header: "duration_seconds",        value: r => r.durationSeconds.toFixed(0) },
  { header: "deposited_sol",           value: r => fmtSol(r.depositedAmountSol) },
  { header: "withdrawn_sol",           value: r => fmtSol(r.withdrawnAmountSol) },
  { header: "estimated_unlocked_sol",  value: r => fmtSol(r.estimatedUnlockedSol) },
  { header: "flow_rate_sol_per_sec",   value: r => fmtRate(r.flowRateSolPerSecond) },
  { header: "max_budget_sol",          value: r => r.maxBudgetSol ? fmtSol(r.maxBudgetSol) : "none" },
  { header: "total_paused_seconds",    value: r => r.totalPausedSeconds.toFixed(0) },
  { header: "explorer_url",            value: r => r.explorerUrl },
];

// ---- public API --------------------------------------------------------

export function recordsToCsv(records: ComplianceStreamRecord[]): string {
  const header = COLUMNS.map(c => c.header).join(",");
  const rows = records.map(r =>
    COLUMNS.map(c => escapeField(c.value(r))).join(",")
  );
  return [header, ...rows].join("\r\n");
}

export function downloadCsv(csv: string, filename: string): void {
  // UTF-8 BOM so Excel opens it correctly without garbling characters
  const bom = "﻿";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getCsvFilename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `drip-compliance-report-${y}-${m}-${day}.csv`;
}
