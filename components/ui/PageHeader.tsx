import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  sub?: string;
  right?: ReactNode;
};

export function PageHeader({ eyebrow, title, sub, right }: PageHeaderProps) {
  return (
    <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-violet-300/70">{eyebrow}</div>
        <h1 className="text-iri mt-2 text-[34px] font-medium leading-[1.05] tracking-[-0.02em]">{title}</h1>
        {sub && <p className="mt-2 max-w-[600px] text-[14px] leading-[1.55] text-white/55">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
