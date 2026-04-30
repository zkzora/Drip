export const fmtUSD = (n: number, frac = 6) => {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const [whole, decimal = ""] = abs.toFixed(frac).split(".");
  return sign + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (frac ? "." + decimal : "");
};

export const fmtDuration = (sec: number) => {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const truncAddr = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;
