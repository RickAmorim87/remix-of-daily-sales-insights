export interface Fechamento {
  id: string;
  data: string; // YYYY-MM-DD
  caixa: number;
  totem: number;
  food99: number;
  ifood: number;
  cartoes: number;
  pix: number;
  total: number;
  raw_text: string | null;
  created_at: string;
  updated_at: string;
}

export type Period = "7d" | "30d" | "90d" | "mtd" | "all";

export const formatCurrency = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });

export const formatCompact = (v: number) => {
  if (Math.abs(v) >= 1000) {
    return "R$ " + (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k";
  }
  return formatCurrency(v);
};

export const formatPct = (v: number) =>
  (v >= 0 ? "+" : "") + v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";

export const channelMeta = [
  { key: "caixa" as const, label: "Caixa", color: "hsl(155 60% 45%)", icon: "💰" },
  { key: "totem" as const, label: "Totem", color: "hsl(230 70% 55%)", icon: "🧮" },
  { key: "food99" as const, label: "99Food", color: "hsl(45 90% 55%)", icon: "🍔" },
  { key: "ifood" as const, label: "iFood", color: "hsl(0 75% 60%)", icon: "🍕" },
  { key: "cartoes" as const, label: "Cartões", color: "hsl(280 60% 60%)", icon: "💳" },
  { key: "pix" as const, label: "Pix", color: "hsl(175 65% 45%)", icon: "⚡" },
];

export type ChannelKey = (typeof channelMeta)[number]["key"];

export function filterByPeriod(rows: Fechamento[], period: Period): Fechamento[] {
  if (period === "all") return rows;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  let start = new Date(today);
  if (period === "7d") start.setDate(start.getDate() - 6);
  else if (period === "30d") start.setDate(start.getDate() - 29);
  else if (period === "90d") start.setDate(start.getDate() - 89);
  else if (period === "mtd") start = new Date(today.getFullYear(), today.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  return rows.filter((r) => {
    const d = new Date(r.data + "T00:00:00");
    return d >= start && d <= today;
  });
}

export function sumChannels(rows: Fechamento[]) {
  const init = { caixa: 0, totem: 0, food99: 0, ifood: 0, cartoes: 0, pix: 0, total: 0 };
  return rows.reduce((acc, r) => {
    acc.caixa += Number(r.caixa);
    acc.totem += Number(r.totem);
    acc.food99 += Number(r.food99);
    acc.ifood += Number(r.ifood);
    acc.cartoes += Number(r.cartoes);
    acc.pix += Number(r.pix);
    acc.total += Number(r.total);
    return acc;
  }, init);
}

export function movingAverage(rows: Fechamento[], window = 7): number[] {
  const sorted = [...rows].sort((a, b) => a.data.localeCompare(b.data));
  return sorted.map((_, i) => {
    const slice = sorted.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((s, r) => s + Number(r.total), 0) / slice.length;
  });
}
