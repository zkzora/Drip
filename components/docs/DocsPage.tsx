"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

// ---- constants ----------------------------------------------------------------
const PROGRAM_ID = "D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6";
const EXPLORER_URL = `https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`;

// ---- sidebar sections ---------------------------------------------------------
const SECTIONS = [
  { id: "overview",   label: "Overview",        icon: "layers" },
  { id: "quickstart", label: "Quick start",     icon: "zap" },
  { id: "concepts",   label: "Core concepts",   icon: "book-open" },
  { id: "lifecycle",  label: "Stream lifecycle",icon: "waves" },
  { id: "sdk",        label: "SDK reference",   icon: "code-2" },
  { id: "program",    label: "On-chain program", icon: "shield-check" },
  { id: "api",        label: "REST API",        icon: "server" },
  { id: "roadmap",    label: "Roadmap",         icon: "map" },
];

// ---- small UI helpers ---------------------------------------------------------
function Pill({ children, color = "violet" }: { children: React.ReactNode; color?: string }) {
  const c = color === "emerald"
    ? "border-emerald-400/30 text-emerald-300 bg-emerald-400/5"
    : color === "amber"
    ? "border-amber-400/30 text-amber-300 bg-amber-400/5"
    : color === "rose"
    ? "border-rose-400/30 text-rose-300 bg-rose-400/5"
    : "border-violet-400/30 text-violet-200 bg-violet-400/5";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10.5px] font-mono uppercase tracking-[0.14em] ${c}`}>
      {children}
    </span>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[12.5px] bg-white/[0.06] border border-white/10 rounded px-1.5 py-0.5 text-violet-200">
      {children}
    </code>
  );
}

function CodeBlock({ lang = "bash", children }: { lang?: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="relative group mt-3 rounded-xl border border-white/8 bg-[#0b0a1a] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/35">{lang}</span>
        <button
          onClick={copy}
          className="text-[11px] font-mono text-white/40 hover:text-white flex items-center gap-1 transition"
        >
          <Icon name={copied ? "check" : "copy"} size={11} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-5 py-4 text-[13px] font-mono leading-[1.65] text-white/80">
        <code>{children.trim()}</code>
      </pre>
    </div>
  );
}

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-7">
      <div className="text-[10.5px] uppercase tracking-[0.22em] text-violet-300/70 font-mono">{eyebrow}</div>
      <h2 className="mt-2 text-[26px] sm:text-[32px] leading-[1.1] tracking-[-0.02em] font-medium text-iri">{title}</h2>
      {sub && <p className="mt-2.5 text-[14px] text-white/55 leading-[1.6] max-w-[620px]">{sub}</p>}
    </div>
  );
}

function PropTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="mt-4 rounded-xl border border-white/8 overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left px-4 py-2.5 text-[10.5px] font-mono uppercase tracking-[0.14em] text-white/40">Param</th>
            <th className="text-left px-4 py-2.5 text-[10.5px] font-mono uppercase tracking-[0.14em] text-white/40">Type</th>
            <th className="text-left px-4 py-2.5 text-[10.5px] font-mono uppercase tracking-[0.14em] text-white/40">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([param, type, desc], i) => (
            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.015]">
              <td className="px-4 py-3 font-mono text-violet-200">{param}</td>
              <td className="px-4 py-3 font-mono text-white/50">{type}</td>
              <td className="px-4 py-3 text-white/65">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ icon = "info", color = "violet", children }: { icon?: string; color?: string; children: React.ReactNode }) {
  const c = color === "emerald"
    ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200"
    : color === "amber"
    ? "border-amber-400/25 bg-amber-400/[0.06] text-amber-200"
    : "border-violet-400/25 bg-violet-400/[0.06] text-violet-100";
  return (
    <div className={`mt-4 rounded-xl border px-4 py-3.5 flex items-start gap-3 ${c}`}>
      <Icon name={icon} size={14} className="shrink-0 mt-0.5" />
      <div className="text-[13px] leading-[1.6]">{children}</div>
    </div>
  );
}

// =========================================================================
// Section content components
// =========================================================================
function OverviewSection() {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="01 — Overview"
        title="What is Drip?"
        sub="Drip is a programmable cashflow protocol built on Solana. It lets you stream SOL by the second — from human-to-human payroll to AI agent budget enforcement."
      />

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: "waves", title: "Real-time streams", desc: "SOL flows every Solana block (~400 ms). Receivers can withdraw earned funds any time." },
          { icon: "bot", title: "Agent-first design", desc: "Give AI agents a revocable budget that streams, pauses, and self-audits without lump-sum transfers." },
          { icon: "shield-check", title: "On-chain enforcement", desc: "All rules live in an Anchor program deployed on Solana devnet — no custodians, no trust required." },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="rounded-2xl glass p-5">
            <div className="w-9 h-9 rounded-xl bg-violet-400/10 text-violet-200 flex items-center justify-center mb-4">
              <Icon name={icon} size={17} />
            </div>
            <div className="text-[14px] text-white font-medium">{title}</div>
            <div className="mt-1.5 text-[12.5px] text-white/55 leading-[1.55]">{desc}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl glass p-6">
        <div className="text-[11px] uppercase tracking-[0.2em] text-violet-300/70 font-mono mb-4">Current status</div>
        <div className="space-y-2">
          {[
            ["Native SOL streaming", "live", "emerald"],
            ["Withdraw / pause / resume / cancel", "live", "emerald"],
            ["Compliance CSV export", "live", "emerald"],
            ["Agent budget panel", "live", "emerald"],
            ["SPL token support (USDC)", "roadmap", "amber"],
            ["Raydium yield routing", "roadmap", "amber"],
            ["Mainnet deployment", "roadmap", "amber"],
            ["drip-sol npm SDK", "roadmap", "amber"],
          ].map(([feat, status, color]) => (
            <div key={feat as string} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-[13px] text-white/75">{feat as string}</span>
              <Pill color={color as string}>{status as string}</Pill>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickstartSection() {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="02 — Quick start"
        title="Up in 60 seconds."
        sub="Clone, install, and connect a browser wallet — your first stream is one form away."
      />

      <div className="space-y-5">
        <div>
          <div className="text-[13px] font-medium text-white mb-1">1. Clone and install</div>
          <CodeBlock lang="bash">{`git clone https://github.com/your-org/drip-devnet
cd drip-devnet
npm install`}</CodeBlock>
        </div>

        <div>
          <div className="text-[13px] font-medium text-white mb-1">2. Configure environment</div>
          <CodeBlock lang="bash">{`cp .env.example .env.local`}</CodeBlock>
          <p className="mt-2 text-[12.5px] text-white/50">
            The defaults already point at devnet — no changes needed for a local run.
          </p>
          <CodeBlock lang="env">{`NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_DRIP_PROGRAM_ID=D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6`}</CodeBlock>
        </div>

        <div>
          <div className="text-[13px] font-medium text-white mb-1">3. Run the dev server</div>
          <CodeBlock lang="bash">{`npm run dev
# → http://localhost:3000`}</CodeBlock>
        </div>

        <div>
          <div className="text-[13px] font-medium text-white mb-1">4. Fund your wallet</div>
          <CodeBlock lang="bash">{`# Via CLI
solana airdrop 2 <YOUR_ADDRESS> --url devnet

# Or use the web faucet
open https://faucet.solana.com`}</CodeBlock>
          <Callout icon="info">
            Set your browser wallet (Phantom, Backpack, Solflare) to <strong>Devnet</strong> before connecting. A minimum of <Code>~0.00214 SOL</Code> is required per stream to cover rent for the StreamState PDA and escrow account.
          </Callout>
        </div>

        <div>
          <div className="text-[13px] font-medium text-white mb-1">5. Create your first stream</div>
          <p className="text-[13px] text-white/55 leading-[1.6]">
            Open the dashboard → click <strong className="text-white">New stream</strong> → fill in receiver, flow rate, deposit, and expiry → sign with your wallet. The stream starts ticking immediately on-chain.
          </p>
        </div>
      </div>
    </div>
  );
}

function ConceptsSection() {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="03 — Core concepts"
        title="How streams work."
        sub="A Drip stream is an escrow contract with a time-release valve. Funds unlock continuously at a fixed rate."
      />

      <div className="space-y-4">
        {[
          {
            term: "Payer",
            def: "The wallet that creates and funds the stream. They can pause, resume, or cancel at any time. On cancel, the remaining escrow is returned.",
          },
          {
            term: "Receiver",
            def: "The wallet earning from the stream. They can call withdraw any time to pull accumulated unlocked funds. They cannot modify the stream rate.",
          },
          {
            term: "Rate (SOL/sec)",
            def: "The flow rate in lamports per second. 1 SOL = 1,000,000,000 lamports. The rate is set once at creation and is immutable unless the stream is cancelled and recreated.",
          },
          {
            term: "Deposit",
            def: "Total SOL locked into the escrow at creation. The stream runs until the deposit is exhausted or the expiry timestamp is reached.",
          },
          {
            term: "Expiry",
            def: "Unix timestamp after which no new funds accumulate. The receiver can still withdraw previously unlocked funds after the expiry.",
          },
          {
            term: "StreamState PDA",
            def: "A program-derived account that stores all stream metadata: payer, receiver, rate, deposit, timestamps, and status. Derived from payer + receiver + a unique stream ID.",
          },
          {
            term: "Escrow account",
            def: "A system-owned SOL account that holds the deposited funds. Only the Drip program can sign transfers from it, enforcing withdrawal rules.",
          },
        ].map(({ term, def }) => (
          <div key={term} className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-4">
            <div className="text-[13.5px] font-medium text-violet-200 font-mono">{term}</div>
            <div className="mt-1.5 text-[13px] text-white/60 leading-[1.6]">{def}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LifecycleSection() {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="04 — Stream lifecycle"
        title="From creation to settlement."
      />

      <div className="relative">
        <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gradient-to-b from-violet-400/60 via-fuchsia-400/30 to-transparent" />
        <div className="space-y-4 pl-10">
          {[
            {
              step: "01",
              title: "Create",
              color: "text-violet-300",
              desc: "Payer signs a create_stream transaction. The StreamState PDA is initialized, SOL is transferred into the escrow account, and streaming begins at the next confirmed slot.",
            },
            {
              step: "02",
              title: "Streaming",
              color: "text-emerald-300",
              desc: "Unlocked balance accumulates every second at the configured rate. The dashboard polls the chain and interpolates locally for smooth sub-second updates.",
            },
            {
              step: "03",
              title: "Withdraw (receiver)",
              color: "text-cyan-300",
              desc: "Receiver calls withdraw_from_stream. The program computes accrued SOL since last_withdraw_at, validates authorization, and transfers to the receiver wallet.",
            },
            {
              step: "04",
              title: "Pause / Resume (payer)",
              color: "text-amber-300",
              desc: "Payer can freeze accumulation at any slot. Paused time does not count toward unlocked funds. Resume restarts the clock from the pause point.",
            },
            {
              step: "05",
              title: "Cancel (payer)",
              color: "text-rose-300",
              desc: "Payer cancels the stream. Any earned-but-unwithdrawn SOL is settled to the receiver; remaining escrow is returned to the payer. StreamState account is closed.",
            },
            {
              step: "06",
              title: "Expiry / Completion",
              color: "text-white/50",
              desc: "When deposit is exhausted or the expiry timestamp is reached, no new funds accumulate. Receiver can still withdraw the final unlocked balance.",
            },
          ].map(({ step, title, color, desc }) => (
            <div key={step} className="relative">
              <div className="absolute -left-10 top-0.5 w-9 h-9 rounded-full border border-violet-400/40 bg-violet-400/10 flex items-center justify-center text-[10px] font-mono text-violet-300">
                {step}
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-4">
                <div className={`text-[13.5px] font-medium ${color}`}>{title}</div>
                <div className="mt-1.5 text-[13px] text-white/60 leading-[1.6]">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SdkSection() {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="05 — SDK reference"
        title="TypeScript helpers."
        sub="The lib/solana/ directory exports lightweight wrappers around the Anchor IDL. No separate npm package yet — copy-import directly."
      />

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Code>createStream</Code>
            <Pill>lib/solana/stream.ts</Pill>
          </div>
          <p className="text-[13px] text-white/55 leading-[1.6] mb-2">
            Creates a new stream on-chain. Derives the StreamState PDA, initializes the escrow, and starts fund accumulation.
          </p>
          <CodeBlock lang="typescript">{`import { createStream } from "@/lib/solana/stream";

const signature = await createStream(program, wallet, {
  receiverPubkey: new PublicKey("..."),
  depositLamports: new BN(2_039_280 + 1_000_000), // rent + buffer
  rateLamportsPerSecond: new BN(1_000),             // ~0.000001 SOL/s
  maxAmountLamports: new BN(10_000_000),
  expiryUnixTs: new BN(Math.floor(Date.now() / 1000) + 86_400),
  streamId: streamId,                               // BN unique per payer+receiver pair
});`}</CodeBlock>
          <PropTable rows={[
            ["receiverPubkey", "PublicKey", "Wallet that earns from this stream"],
            ["depositLamports", "BN", "Total SOL to lock into escrow (lamports)"],
            ["rateLamportsPerSecond", "BN", "Flow rate — SOL released per second"],
            ["maxAmountLamports", "BN", "Hard cap on total unlockable SOL"],
            ["expiryUnixTs", "BN", "Unix timestamp after which no new funds accrue"],
            ["streamId", "BN", "Unique numeric ID per payer/receiver pair"],
          ]} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Code>withdrawFromStream</Code>
            <Pill>lib/solana/stream.ts</Pill>
          </div>
          <CodeBlock lang="typescript">{`import { withdrawFromStream } from "@/lib/solana/stream";

const signature = await withdrawFromStream(program, wallet, {
  streamPda: stream.publicKey,
  escrowPda: stream.escrow,
});`}</CodeBlock>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Code>pauseStream / resumeStream / cancelStream</Code>
            <Pill>lib/solana/stream.ts</Pill>
          </div>
          <CodeBlock lang="typescript">{`import { pauseStream, resumeStream, cancelStream } from "@/lib/solana/stream";

// Payer only
await pauseStream(program, wallet, { streamPda, escrowPda });
await resumeStream(program, wallet, { streamPda, escrowPda });
await cancelStream(program, wallet, { streamPda, escrowPda, receiverPubkey });`}</CodeBlock>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Code>useDripStreams</Code>
            <Pill>lib/solana/useDripStreams.ts</Pill>
          </div>
          <p className="text-[13px] text-white/55 leading-[1.6] mb-2">
            React hook that fetches all StreamState accounts for the connected wallet and returns them normalized.
          </p>
          <CodeBlock lang="typescript">{`const { streams, loading, error, refresh } = useDripStreams();

// streams: DripStream[]
// Each item: { id, publicKey, escrow, dir, status, rate, base, deposit, ... }`}</CodeBlock>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Code>generateStreamId</Code>
            <Pill>lib/solana/pda.ts</Pill>
          </div>
          <CodeBlock lang="typescript">{`import { generateStreamId } from "@/lib/solana/pda";

// Deterministic unique ID per payer+receiver pair
const streamId = generateStreamId(payerPubkey, receiverPubkey);`}</CodeBlock>
        </div>
      </div>
    </div>
  );
}

function ProgramSection() {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="06 — On-chain program"
        title="Anchor program details."
        sub="All stream logic is enforced on-chain. No admin keys, no upgrades without community notice."
      />

      <div className="grad-border glass-strong rounded-2xl p-1.5">
        <div className="rounded-[14px] bg-[#0b0a1a] p-6 space-y-4">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.18em] text-violet-300/70 font-mono mb-1">Program ID</div>
            <div className="font-mono text-[14px] text-white break-all">{PROGRAM_ID}</div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.16em] text-white/40 font-mono">Cluster</div>
              <div className="mt-1 text-[13px] text-white">Solana Devnet</div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.16em] text-white/40 font-mono">Framework</div>
              <div className="mt-1 text-[13px] text-white">Anchor 0.30.1</div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.16em] text-white/40 font-mono">Tests</div>
              <div className="mt-1 text-[13px] text-emerald-300">19 / 19 passing</div>
            </div>
          </div>
          <div className="pt-4 border-t border-white/5">
            <a
              href={EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] text-violet-300 hover:text-white transition"
            >
              View on Solana Explorer <Icon name="external-link" size={13} />
            </a>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-[13px] font-medium text-white">Instructions</div>
        {[
          { name: "create_stream", signer: "payer", desc: "Initialize StreamState PDA and transfer deposit into escrow." },
          { name: "withdraw_from_stream", signer: "receiver", desc: "Pull accumulated unlocked SOL from escrow to receiver wallet." },
          { name: "pause_stream", signer: "payer", desc: "Freeze accumulation. Elapsed time while paused doesn't count." },
          { name: "resume_stream", signer: "payer", desc: "Restart the clock from the pause point." },
          { name: "cancel_stream", signer: "payer", desc: "Settle earned funds to receiver, return remainder to payer, close accounts." },
        ].map(({ name, signer, desc }) => (
          <div key={name} className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3.5 flex items-start gap-4">
            <Code>{name}</Code>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] text-white/60">{desc}</div>
              <div className="mt-1 text-[11px] font-mono text-white/35">Signer: {signer}</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-[13px] font-medium text-white mb-3">Error codes</div>
        <PropTable rows={[
          ["NothingToWithdraw", "6000", "No unlocked funds available yet"],
          ["StreamPaused", "6001", "Cannot withdraw from a paused stream"],
          ["UnauthorizedPayer", "6002", "Only the stream payer can call this instruction"],
          ["UnauthorizedReceiver", "6003", "Only the stream receiver can call this instruction"],
          ["AlreadyPaused", "6004", "Stream is already in paused state"],
          ["NotPaused", "6005", "Stream is not paused — cannot resume"],
          ["AlreadyCancelled", "6006", "Stream was already cancelled"],
          ["InsufficientEscrowFunds", "6007", "Escrow has insufficient releasable funds"],
        ]} />
      </div>
    </div>
  );
}

function ApiSection() {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="07 — REST API"
        title="Compliance & export."
        sub="The Next.js API layer wraps on-chain reads with typed responses. Useful for integrating Drip data into external dashboards."
      />

      <Callout icon="info">
        All API routes are Next.js App Router route handlers. No auth is required for devnet — production will add wallet-signature auth.
      </Callout>

      <div className="space-y-5">
        {[
          {
            method: "GET",
            path: "/api/streams",
            desc: "Returns all StreamState accounts for a given wallet public key.",
            params: [["pubkey", "string (query)", "Wallet address to query streams for"]],
            example: `GET /api/streams?pubkey=7Hk2...q4Wp`,
          },
          {
            method: "GET",
            path: "/api/compliance/csv",
            desc: "Exports a 22-column CSV of all closed and active streams for the connected wallet. Compatible with Excel, Google Sheets, and accounting software.",
            params: [["pubkey", "string (query)", "Wallet address"], ["from", "unix ts (query)", "Optional start timestamp"], ["to", "unix ts (query)", "Optional end timestamp"]],
            example: `GET /api/compliance/csv?pubkey=7Hk2...q4Wp`,
          },
        ].map(({ method, path, desc, params, example }) => (
          <div key={path} className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <span className={`font-mono text-[11px] font-medium px-2 py-0.5 rounded ${method === "GET" ? "bg-emerald-400/10 text-emerald-300" : "bg-violet-400/10 text-violet-300"}`}>{method}</span>
              <span className="font-mono text-[13px] text-white">{path}</span>
            </div>
            <div className="px-4 py-3">
              <p className="text-[13px] text-white/60">{desc}</p>
              <PropTable rows={params as [string, string, string][]} />
              <CodeBlock lang="bash">{example}</CodeBlock>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoadmapSection() {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="08 — Roadmap"
        title="What's next."
        sub="Post-hackathon features planned for the Drip protocol."
      />

      <div className="space-y-3">
        {[
          { phase: "Phase 1", items: ["Agent autopilot withdrawals — automated pull from stream balance", "USDC / SPL token support — program parameterized, needs UI wiring", "drip-sol npm SDK — lightweight TypeScript client package"] },
          { phase: "Phase 2", items: ["Helius indexing & webhooks — real-time stream events via enhanced WS", "PDF audit export — PDF generation for compliance page", "Mainnet deployment — after security review and audit"] },
          { phase: "Phase 3", items: ["Raydium yield routing — idle escrow routed to concentrated liquidity", "Multi-sig stream control — DAO-controlled budgets", "Recurring stream templates — no-code scheduler UI"] },
        ].map(({ phase, items }) => (
          <div key={phase} className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-violet-300/70 font-mono mb-3">{phase}</div>
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] text-white/65">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400/60 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Callout icon="map" color="violet">
        Have a feature request? Open an issue on GitHub or ping us on Discord. Community feedback shapes the roadmap.
      </Callout>
    </div>
  );
}

const SECTION_COMPONENTS: Record<string, React.FC> = {
  overview: OverviewSection,
  quickstart: QuickstartSection,
  concepts: ConceptsSection,
  lifecycle: LifecycleSection,
  sdk: SdkSection,
  program: ProgramSection,
  api: ApiSection,
  roadmap: RoadmapSection,
};

// =========================================================================
// Main DocsPage
// =========================================================================
export default function DocsPage() {
  const [active, setActive] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const ActiveSection = SECTION_COMPONENTS[active] ?? OverviewSection;
  const activeLabel = SECTIONS.find((s) => s.id === active)?.label ?? "Docs";

  return (
    <div className="min-h-screen bg-[#070612]">
      {/* Backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-40 left-[30%] w-[700px] h-[500px] glow-orb opacity-30" />
      </div>

      {/* Top nav bar */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5 bg-[#070612]/75">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" width={22} height={22} alt="Drip" />
            <span className="font-medium tracking-tight text-[15px]">Drip</span>
          </a>
          <span className="text-white/20 hidden sm:inline">/</span>
          <span className="text-[13px] text-white/55 hidden sm:inline">Documentation</span>
          <div className="ml-auto flex items-center gap-2">
            <a href="/dashboard" className="btn-primary rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-white flex items-center gap-1.5">
              Launch app <Icon name="arrow-up-right" size={13} />
            </a>
            {/* Mobile nav toggle */}
            <button
              className="lg:hidden w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/60"
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              <Icon name={mobileNavOpen ? "x" : "menu"} size={15} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1240px] mx-auto flex">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex flex-col w-[220px] shrink-0 py-8 px-4 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-mono px-2 mb-3">Contents</div>
          <nav className="space-y-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition text-left ${
                  active === s.id
                    ? "bg-violet-400/10 text-violet-200 border border-violet-400/20"
                    : "text-white/50 hover:text-white hover:bg-white/[0.02] border border-transparent"
                }`}
              >
                <Icon name={s.icon} size={13} className={active === s.id ? "text-violet-300" : ""} />
                {s.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6">
            <a
              href={EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-white/40 hover:text-white transition"
            >
              <Icon name="external-link" size={12} />
              Solana Explorer
            </a>
            <a
              href="https://faucet.solana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-white/40 hover:text-white transition"
            >
              <Icon name="zap" size={12} />
              Devnet faucet
            </a>
          </div>
        </aside>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)}>
            <div className="absolute top-[57px] left-0 w-[240px] h-full bg-[#0b0a1a] border-r border-white/5 p-4" onClick={(e) => e.stopPropagation()}>
              <nav className="space-y-0.5">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setActive(s.id); setMobileNavOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] transition text-left ${
                      active === s.id ? "bg-violet-400/10 text-violet-200" : "text-white/60 hover:text-white"
                    }`}
                  >
                    <Icon name={s.icon} size={14} />
                    {s.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 lg:px-12 py-10 pb-24">
          {/* Mobile breadcrumb */}
          <div className="lg:hidden flex items-center gap-2 text-[12px] text-white/40 font-mono mb-6">
            <span>Docs</span>
            <Icon name="chevron-right" size={11} />
            <span className="text-white/70">{activeLabel}</span>
          </div>

          <ActiveSection />
        </main>
      </div>
    </div>
  );
}
