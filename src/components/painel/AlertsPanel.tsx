import { AlertTriangle, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency, formatPct, type Fechamento } from "@/lib/fechamentos";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AlertsPanel({ rows }: { rows: Fechamento[] }) {
  const alerts = computeAlerts(rows);

  if (alerts.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-[Sora] text-base font-semibold">Insights inteligentes</h3>
      </div>
      <ul className="space-y-3">
        {alerts.map((a, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl border bg-secondary/30 p-3"
          >
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                a.tone === "positive"
                  ? "bg-success/15 text-success"
                  : a.tone === "negative"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-info/15 text-info"
              }`}
            >
              {a.tone === "positive" ? (
                <TrendingUp className="h-4 w-4" />
              ) : a.tone === "negative" ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{a.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Alert {
  title: string;
  detail: string;
  tone: "positive" | "negative" | "neutral";
}

function computeAlerts(rows: Fechamento[]): Alert[] {
  if (rows.length === 0) return [];
  const sorted = [...rows].sort((a, b) => a.data.localeCompare(b.data));
  const alerts: Alert[] = [];

  // último dia vs média 7d anteriores
  const last = sorted[sorted.length - 1];
  const prev7 = sorted.slice(-8, -1);
  if (prev7.length >= 3) {
    const avg = prev7.reduce((s, r) => s + Number(r.total), 0) / prev7.length;
    const diff = avg ? ((Number(last.total) - avg) / avg) * 100 : 0;
    if (Math.abs(diff) >= 15) {
      alerts.push({
        title: `${diff > 0 ? "Pico" : "Queda"} de ${formatPct(diff)} no último fechamento`,
        detail: `${format(parseISO(last.data), "dd/MM", { locale: ptBR })} fechou em ${formatCurrency(
          Number(last.total),
        )} vs média de ${formatCurrency(avg)} dos 7 dias anteriores.`,
        tone: diff > 0 ? "positive" : "negative",
      });
    }
  }

  // melhor e pior dia do período
  if (sorted.length >= 3) {
    const best = sorted.reduce((a, b) => (Number(a.total) > Number(b.total) ? a : b));
    const worst = sorted.reduce((a, b) => (Number(a.total) < Number(b.total) ? a : b));
    alerts.push({
      title: `Melhor dia: ${format(parseISO(best.data), "dd 'de' MMM", { locale: ptBR })}`,
      detail: `Faturamento de ${formatCurrency(Number(best.total))}, o maior do período.`,
      tone: "positive",
    });
    if (best.id !== worst.id) {
      alerts.push({
        title: `Pior dia: ${format(parseISO(worst.data), "dd 'de' MMM", { locale: ptBR })}`,
        detail: `Faturamento de ${formatCurrency(Number(worst.total))}, o menor do período.`,
        tone: "neutral",
      });
    }
  }

  // canal com maior variação na última semana vs anterior
  if (sorted.length >= 14) {
    const last7 = sorted.slice(-7);
    const prev = sorted.slice(-14, -7);
    const channels = ["caixa", "totem", "food99", "ifood", "cartoes", "pix"] as const;
    const labels: Record<(typeof channels)[number], string> = {
      caixa: "Caixa",
      totem: "Totem",
      food99: "99Food",
      ifood: "iFood",
      cartoes: "Cartões",
      pix: "Pix",
    };
    let bestVar: { ch: string; diff: number } | null = null;
    let worstVar: { ch: string; diff: number } | null = null;
    for (const ch of channels) {
      const a = prev.reduce((s, r) => s + Number(r[ch]), 0);
      const b = last7.reduce((s, r) => s + Number(r[ch]), 0);
      if (!a) continue;
      const diff = ((b - a) / a) * 100;
      if (!bestVar || diff > bestVar.diff) bestVar = { ch: labels[ch], diff };
      if (!worstVar || diff < worstVar.diff) worstVar = { ch: labels[ch], diff };
    }
    if (bestVar && bestVar.diff >= 10) {
      alerts.push({
        title: `${bestVar.ch} cresceu ${formatPct(bestVar.diff)} na última semana`,
        detail: "Comparado aos 7 dias anteriores. Considere reforçar este canal.",
        tone: "positive",
      });
    }
    if (worstVar && worstVar.diff <= -10) {
      alerts.push({
        title: `${worstVar.ch} caiu ${formatPct(worstVar.diff)} na última semana`,
        detail: "Vale investigar o motivo da queda neste canal.",
        tone: "negative",
      });
    }
  }

  return alerts.slice(0, 5);
}
