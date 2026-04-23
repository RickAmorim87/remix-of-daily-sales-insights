import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  channelMeta,
  formatCompact,
  formatCurrency,
  linearForecast,
  movingAverage,
  type Fechamento,
} from "@/lib/fechamentos";

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "var(--shadow-elevated)",
};

export function EvolucaoChart({ rows }: { rows: Fechamento[] }) {
  const sorted = [...rows].sort((a, b) => a.data.localeCompare(b.data));
  const ma = movingAverage(sorted, 7);
  const data = sorted.map((r, i) => ({
    data: r.data,
    label: format(parseISO(r.data), "dd/MM", { locale: ptBR }),
    total: Number(r.total),
    media7: Math.round(ma[i]),
  }));

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="font-[Sora] text-base font-semibold">Evolução do faturamento</h3>
          <p className="text-xs text-muted-foreground">
            Total diário com média móvel de 7 dias
          </p>
        </div>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="totalBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.62 0.20 258)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="oklch(0.62 0.20 258)" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatCompact(Number(v))}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, name: string) => [
                formatCurrency(Number(v)),
                name === "total" ? "Total" : "Média 7d",
              ]}
              labelFormatter={(l) => `Dia ${l}`}
            />
            <Bar dataKey="total" fill="url(#totalBar)" radius={[8, 8, 0, 0]} maxBarSize={42} />
            <Line
              type="monotone"
              dataKey="media7"
              stroke="oklch(0.72 0.18 155)"
              strokeWidth={2.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CanalPieChart({
  totals,
}: {
  totals: { caixa: number; totem: number; food99: number; ifood: number; cartoes: number; pix: number };
}) {
  const data = channelMeta.map((c) => ({
    name: c.label,
    value: Number(totals[c.key] || 0),
    color: c.color,
  }));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-2">
        <h3 className="font-[Sora] text-base font-semibold">Mix por canal</h3>
        <p className="text-xs text-muted-foreground">Participação % no período</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={2}
                stroke="var(--color-card)"
                strokeWidth={3}
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => formatCurrency(Number(v))}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-2">
          {data.map((d) => {
            const pct = total ? (d.value / total) * 100 : 0;
            return (
              <li key={d.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="font-medium">{d.name}</span>
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  <span className="text-muted-foreground">{pct.toFixed(1)}%</span>
                  <span className="font-semibold">{formatCompact(d.value)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function CanalBarChart({ rows }: { rows: Fechamento[] }) {
  const sorted = [...rows].sort((a, b) => a.data.localeCompare(b.data)).slice(-14);
  const data = sorted.map((r) => ({
    label: format(parseISO(r.data), "dd/MM", { locale: ptBR }),
    Caixa: Number(r.caixa),
    Totem: Number(r.totem),
    "99Food": Number(r.food99),
    iFood: Number(r.ifood),
    Cartões: Number(r.cartoes),
    Pix: Number(r.pix),
  }));

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4">
        <h3 className="font-[Sora] text-base font-semibold">Vendas por canal • últimos 14 dias</h3>
        <p className="text-xs text-muted-foreground">Empilhado por dia</p>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatCompact(Number(v))}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number) => formatCurrency(Number(v))}
            />
            {channelMeta.map((c) => (
              <Bar
                key={c.key}
                dataKey={c.label}
                stackId="a"
                fill={c.color}
                radius={[0, 0, 0, 0]}
                maxBarSize={28}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ProjecaoChart({ rows, daysAhead = 14 }: { rows: Fechamento[]; daysAhead?: number }) {
  const sorted = [...rows].sort((a, b) => a.data.localeCompare(b.data));
  const forecast = linearForecast(sorted, daysAhead);

  // Build a single dataset where every point has both keys when relevant.
  // The "ponte" (último real também aparece como projetado) conecta as duas áreas.
  const lastReal = sorted[sorted.length - 1];
  const data: Array<{ label: string; real: number | null; projetado: number | null; isFuture: boolean }> = [];
  sorted.forEach((r, i) => {
    const isLast = i === sorted.length - 1;
    data.push({
      label: format(parseISO(r.data), "dd/MM", { locale: ptBR }),
      real: Number(r.total),
      projetado: isLast ? Number(r.total) : null, // ponte
      isFuture: false,
    });
  });
  forecast.forEach((f) => {
    data.push({
      label: format(parseISO(f.data), "dd/MM", { locale: ptBR }),
      real: null,
      projetado: Math.round(f.forecast),
      isFuture: true,
    });
  });

  const totalProjetado = forecast.reduce((s, f) => s + f.forecast, 0);
  const mediaProjetada = forecast.length ? totalProjetado / forecast.length : 0;
  const mediaHistorica = sorted.length
    ? sorted.reduce((s, r) => s + Number(r.total), 0) / sorted.length
    : 0;
  const variacao = mediaHistorica
    ? ((mediaProjetada - mediaHistorica) / mediaHistorica) * 100
    : 0;

  const hasData = sorted.length >= 2;

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-[Sora] text-base font-semibold">Projeção de faturamento</h3>
          <p className="text-xs text-muted-foreground">
            Histórico real + tendência linear • próximos {daysAhead} dias
          </p>
        </div>
        <div className="flex items-end gap-5">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Média projetada/dia
            </p>
            <p className="font-[Sora] text-base font-bold tabular-nums">
              {formatCompact(mediaProjetada)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Total {daysAhead}d
            </p>
            <p
              className="font-[Sora] text-xl font-extrabold tabular-nums"
              style={{ color: "#a78bfa" }}
            >
              {formatCompact(totalProjetado)}
            </p>
            {hasData && (
              <p
                className="text-[10px] font-semibold tabular-nums"
                style={{ color: variacao >= 0 ? "#4ade80" : "#f87171" }}
              >
                {variacao >= 0 ? "↑" : "↓"} {Math.abs(variacao).toFixed(1)}% vs histórico
              </p>
            )}
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
          <span className="text-3xl opacity-50">📈</span>
          <p className="text-sm font-medium">Projeção indisponível</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Precisamos de pelo menos <strong>2 dias</strong> de fechamento para
            calcular a tendência. Envie mais um fechamento no Telegram.
          </p>
        </div>
      ) : (
        <div className="relative h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => formatCompact(Number(v))}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: any, name: any) =>
                  v == null ? null : [formatCurrency(Number(v)), String(name)]
                }
              />
              <Area
                type="monotone"
                dataKey="real"
                name="Real"
                stroke="#6366f1"
                strokeWidth={3}
                fill="url(#realGrad)"
                connectNulls={false}
                dot={{ r: 3.5, fill: "#6366f1", stroke: "#fff", strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="projetado"
                name="Projeção"
                stroke="#a855f7"
                strokeWidth={3}
                strokeDasharray="6 4"
                fill="url(#projGrad)"
                connectNulls={false}
                dot={{ r: 3.5, fill: "#a855f7", stroke: "#fff", strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="projetado"
                stroke="transparent"
                dot={false}
                activeDot={false}
                legendType="none"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#6366f1]" />
          Histórico real
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-[3px] w-6 rounded-full"
            style={{ background: "repeating-linear-gradient(90deg,#a855f7 0 6px, transparent 6px 10px)" }}
          />
          Projeção linear
        </span>
      </div>
    </div>
  );
}
  const sorted = [...rows].sort((a, b) => a.data.localeCompare(b.data));
  const forecast = linearForecast(sorted, daysAhead);

  const historic = sorted.map((r) => ({
    label: format(parseISO(r.data), "dd/MM", { locale: ptBR }),
    real: Number(r.total),
    projetado: null as number | null,
  }));
  const future = forecast.map((f) => ({
    label: format(parseISO(f.data), "dd/MM", { locale: ptBR }),
    real: null as number | null,
    projetado: Math.round(f.forecast),
  }));
  const data = [...historic, ...future];
  const totalProjetado = forecast.reduce((s, f) => s + f.forecast, 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <div className="relative mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-[Sora] text-base font-semibold">Projeção de faturamento</h3>
          <p className="text-xs text-muted-foreground">
            Histórico real + tendência linear • próximos {daysAhead} dias
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Projetado {daysAhead}d
          </p>
          <p className="font-[Sora] text-lg font-bold tabular-nums">
            {formatCompact(totalProjetado)}
          </p>
        </div>
      </div>
      <div className="relative h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatCompact(Number(v))} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={70} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: any, name: any) =>
                v == null ? ["—", String(name)] : [formatCurrency(Number(v)), String(name)]
              }
            />
            <Area type="monotone" dataKey="real" name="Real" stroke="#6366f1" strokeWidth={2.5} fill="url(#realGrad)" connectNulls={false} />
            <Area type="monotone" dataKey="projetado" name="Projeção" stroke="#a855f7" strokeWidth={2.5} strokeDasharray="6 4" fill="url(#projGrad)" connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#6366f1]" />
          Histórico real
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-6 rounded-full bg-gradient-to-r from-[#a855f7] to-[#06b6d4]" />
          Projeção linear
        </span>
      </div>
    </div>
  );
}
