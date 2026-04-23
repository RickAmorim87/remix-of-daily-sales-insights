import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarRange,
  CreditCard,
  RefreshCw,
  Sparkles,
  Target,
  Wallet,
  Zap,
} from "lucide-react";
import { useFechamentos } from "@/hooks/use-fechamentos";
import logoAB from "@/assets/american-burger-logo.png";
import neonAB from "@/assets/american-burger-neon.png";
import lojaAB from "@/assets/american-burger-loja.png";
import {
  filterByPeriod,
  formatCurrency,
  sumChannels,
  type Period,
} from "@/lib/fechamentos";
import {
  CanalBarChart,
  CanalPieChart,
  EvolucaoChart,
  ProjecaoChart,
} from "@/components/painel/Charts";
import { FechamentosTable } from "@/components/painel/FechamentosTable";
import { AlertsPanel } from "@/components/painel/AlertsPanel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel BI de Vendas Diárias" },
      {
        name: "description",
        content:
          "Dashboard executivo com integração automática Telegram. Comparativos, tendências e alertas sobre o faturamento diário.",
      },
    ],
  }),
  component: PainelBI,
});

const periodos: { key: Period; label: string }[] = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "mtd", label: "Mês atual" },
  { key: "90d", label: "90 dias" },
  { key: "all", label: "Tudo" },
];

const channelStyles = {
  caixa:   { color: "#3b82f6", dim: "rgba(59,130,246,0.15)", icon: "💰" },
  totem:   { color: "#22c55e", dim: "rgba(34,197,94,0.15)",  icon: "🧮" },
  food99:  { color: "#f97316", dim: "rgba(249,115,22,0.15)", icon: "🍔" },
  ifood:   { color: "#ef4444", dim: "rgba(239,68,68,0.15)",  icon: "🍕" },
  cartoes: { color: "#a855f7", dim: "rgba(168,85,247,0.15)", icon: "💳" },
  pix:     { color: "#06b6d4", dim: "rgba(6,182,212,0.15)",  icon: "⚡" },
} as const;

function PainelBI() {
  const { data, loading, reload } = useFechamentos();
  const [period, setPeriod] = useState<Period>("30d");
  const [syncing, setSyncing] = useState(false);

  const rows = useMemo(() => filterByPeriod(data, period), [data, period]);
  const totals = useMemo(() => sumChannels(rows), [rows]);

  const previousVariation = useMemo(() => {
    if (rows.length === 0) return null;
    const sortedAll = [...data].sort((a, b) => a.data.localeCompare(b.data));
    const sortedRows = [...rows].sort((a, b) => a.data.localeCompare(b.data));
    const start = sortedRows[0].data;
    const end = sortedRows[sortedRows.length - 1].data;
    const startD = new Date(start + "T00:00:00");
    const endD = new Date(end + "T00:00:00");
    const days = Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1;
    const prevEnd = new Date(startD);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (days - 1));
    const prevRows = sortedAll.filter((r) => {
      const d = new Date(r.data + "T00:00:00");
      return d >= prevStart && d <= prevEnd;
    });
    if (prevRows.length === 0) return null;
    const prev = sumChannels(prevRows);
    const variation = (k: keyof typeof totals) =>
      prev[k] ? ((totals[k] - prev[k]) / prev[k]) * 100 : null;
    return {
      total: variation("total"),
      caixa: variation("caixa"),
      totem: variation("totem"),
      food99: variation("food99"),
      ifood: variation("ifood"),
      cartoes: variation("cartoes"),
      pix: variation("pix"),
      days,
    };
  }, [data, rows, totals]);

  const projecaoMes = useMemo(() => {
    const today = new Date();
    const ano = today.getFullYear();
    const mes = today.getMonth();
    const diasMes = new Date(ano, mes + 1, 0).getDate();
    const mtdRows = data.filter((r) => {
      const d = new Date(r.data + "T00:00:00");
      return d.getFullYear() === ano && d.getMonth() === mes;
    });
    if (mtdRows.length === 0) return { proj: 0, atual: 0, diasFeitos: 0, diasMes };
    const atual = mtdRows.reduce((s, r) => s + Number(r.total), 0);
    const proj = (atual / mtdRows.length) * diasMes;
    return { proj, atual, diasFeitos: mtdRows.length, diasMes };
  }, [data]);

  const mediaDia = rows.length ? totals.total / rows.length : 0;

  async function syncNow() {
    setSyncing(true);
    try {
      await fetch("/api/public/telegram-poll", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    await reload();
    setSyncing(false);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1340px] px-4 pb-16 pt-7 sm:px-6 lg:px-8">
      {/* TOPBAR */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 p-1 shadow-[0_8px_24px_rgba(239,68,68,0.35)] ring-1 ring-white/20"
          >
            <img
              src={logoAB}
              alt="American Burger"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight">American Burger</p>
            <p className="text-[11px] text-muted-foreground">
              Painel Executivo · Fechamento Diário
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium"
            style={{
              background: "rgba(34,197,94,0.10)",
              borderColor: "rgba(34,197,94,0.20)",
              color: "#4ade80",
            }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                style={{ background: "#22c55e" }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ background: "#22c55e" }}
              />
            </span>
            Captura ao vivo · Telegram
          </span>
          <button
            onClick={syncNow}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              boxShadow: "0 8px 24px rgba(59,130,246,0.35)",
            }}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
            {syncing ? "Sincronizando..." : "Sincronizar agora"}
          </button>
        </div>
      </div>

      {/* PAGE HEADER */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1
            className="text-3xl font-extrabold tracking-tight sm:text-4xl"
            style={{
              background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Painel de Fechamentos
          </h1>
          <p className="mt-1.5 max-w-xl text-[13px] text-muted-foreground">
            Fechamentos automáticos via Telegram · consolidação por canal ·
            projeções e histórico em tempo real
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="mr-1 text-xs text-muted-foreground">Período:</span>
          {periodos.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                period === p.key
                  ? "text-white shadow-[0_6px_18px_rgba(59,130,246,0.4)]"
                  : "border bg-card text-muted-foreground hover:text-foreground",
              )}
              style={
                period === p.key
                  ? { background: "#3b82f6", borderColor: "#3b82f6" }
                  : undefined
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && data.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Carregando fechamentos...
        </div>
      ) : (
        <>
          {/* HERO BANNER — American Burger */}
          <section className="mb-5 grid grid-cols-1 gap-3.5 lg:grid-cols-3">
            <div
              className="relative col-span-1 overflow-hidden rounded-2xl border lg:col-span-2"
              style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-soft)", minHeight: 180 }}
            >
              <img
                src={lojaAB}
                alt="Loja American Burger"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(8,12,20,0.92) 0%, rgba(8,12,20,0.55) 55%, rgba(8,12,20,0.15) 100%)",
                }}
              />
              <div className="relative flex h-full flex-col justify-between p-6">
                <div>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                    style={{
                      background: "rgba(239,68,68,0.18)",
                      color: "#fca5a5",
                      border: "1px solid rgba(239,68,68,0.30)",
                    }}
                  >
                    <Sparkles className="h-3 w-3" /> Inaugurado
                  </span>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    American Burger
                  </h2>
                  <p className="mt-1 max-w-md text-[12px] text-white/70">
                    Praça de Alimentação · ao lado do Spoleto · acompanhamento
                    de vendas em tempo real
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-white/60">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Dashboard sincronizado com o grupo do Telegram</span>
                </div>
              </div>
            </div>

            <div
              className="relative overflow-hidden rounded-2xl border"
              style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-soft)", minHeight: 180 }}
            >
              <img
                src={neonAB}
                alt="Letreiro neon American Burger"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(8,12,20,0.10) 0%, rgba(8,12,20,0.85) 100%)",
                }}
              />
              <div className="relative flex h-full flex-col justify-end p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  Identidade
                </p>
                <p className="mt-1 text-base font-bold text-white">
                  Sabor que ilumina o dia
                </p>
              </div>
            </div>
          </section>

          {/* KPIs principais — colorful premium */}
          <section className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <KpiHero
              tone="blue"
              icon={<Zap className="h-3.5 w-3.5" />}
              label="Faturamento total do período"
              value={totals.total}
              variation={previousVariation?.total ?? null}
              caption={
                previousVariation
                  ? `${rows.length} dias · vs ${previousVariation.days}d anteriores`
                  : `${rows.length} dias consolidados`
              }
            />
            <KpiHero
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Média diária"
              value={mediaDia}
              caption="Baseado nos dias consolidados"
            />
            <KpiHero
              icon={<CreditCard className="h-3.5 w-3.5" />}
              label="Pagamentos eletrônicos"
              value={totals.cartoes + totals.pix}
              caption="Cartões + Pix somados"
            />
            <KpiHero
              tone="green"
              icon={<Target className="h-3.5 w-3.5" />}
              label="Projeção do mês"
              value={projecaoMes.proj}
              caption={`${projecaoMes.diasFeitos}/${projecaoMes.diasMes} dias · média ${formatCurrency(mediaDia)}/dia`}
            />
          </section>

          {/* CHANNEL ROW */}
          <section className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            <ChannelCard k="caixa"   label="Caixa"   value={totals.caixa}   total={totals.total} />
            <ChannelCard k="totem"   label="Totem"   value={totals.totem}   total={totals.total} />
            <ChannelCard k="food99"  label="99Food"  value={totals.food99}  total={totals.total} />
            <ChannelCard k="ifood"   label="iFood"   value={totals.ifood}   total={totals.total} />
            <ChannelCard k="cartoes" label="Cartões" value={totals.cartoes} total={totals.total} />
            <ChannelCard k="pix"     label="Pix"     value={totals.pix}     total={totals.total} />
          </section>

          {/* Charts */}
          <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <EvolucaoChart rows={rows} />
            </div>
            <div>
              <CanalPieChart totals={totals} />
            </div>
          </section>

          {/* Projeção */}
          <section className="mb-5">
            <ProjecaoChart rows={rows} daysAhead={14} />
          </section>

          <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CanalBarChart rows={rows} />
            </div>
            <div>
              <AlertsPanel rows={rows} />
            </div>
          </section>

          <section className="mb-10">
            <FechamentosTable rows={rows} somaTotal={totals.total} />
          </section>

          <SetupCard hasData={data.length > 0} />
        </>
      )}

      <footer className="mt-10 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
        <span>Painel Executivo · Fechamento Diário</span>
        <span className="h-1 w-1 rounded-full bg-white/15" />
        <span>Captura automática via Telegram</span>
      </footer>
    </main>
  );
}

function KpiHero({
  tone,
  icon,
  label,
  value,
  variation,
  caption,
}: {
  tone?: "blue" | "green";
  icon: React.ReactNode;
  label: string;
  value: number;
  variation?: number | null;
  caption?: string;
}) {
  const toneBg =
    tone === "blue"
      ? { background: "var(--gradient-card-blue)", borderColor: "rgba(59,130,246,0.30)" }
      : tone === "green"
        ? { background: "var(--gradient-card-green)", borderColor: "rgba(34,197,94,0.25)" }
        : { background: "var(--card)", borderColor: "var(--border)" };
  const valueColor =
    tone === "blue" ? "#93c5fd" : tone === "green" ? "#86efac" : undefined;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-5 transition-all hover:-translate-y-0.5"
      style={{ ...toneBg, boxShadow: "var(--shadow-soft)" }}
    >
      {tone && (
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-30"
          style={{
            background:
              tone === "blue" ? "rgba(59,130,246,0.45)" : "rgba(34,197,94,0.40)",
            filter: "blur(12px)",
          }}
        />
      )}
      <div className="relative">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            {icon}
          </span>
          {label}
        </div>
        <p
          className="text-[28px] font-extrabold leading-none tracking-tight tabular-nums"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {formatCurrency(value)}
        </p>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {caption && <span>{caption}</span>}
          {variation != null && (
            <span
              className="ml-auto inline-flex items-center gap-0.5 font-semibold"
              style={{
                color:
                  variation > 0.5
                    ? "#4ade80"
                    : variation < -0.5
                      ? "#f87171"
                      : "var(--muted-foreground)",
              }}
            >
              {variation >= 0 ? "↑" : "↓"} {Math.abs(variation).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelCard({
  k,
  label,
  value,
  total,
}: {
  k: keyof typeof channelStyles;
  label: string;
  value: number;
  total: number;
}) {
  const s = channelStyles[k];
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5"
      style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-soft)" }}
    >
      <div
        className="absolute inset-x-0 bottom-0 h-[2px]"
        style={{ background: s.color }}
      />
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        <span className="text-base">{s.icon}</span>
      </div>
      <p className="text-[15px] font-bold leading-tight tracking-tight tabular-nums">
        {formatCurrency(value)}
      </p>
      <span
        className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums"
        style={{ background: s.dim, color: s.color }}
      >
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function SetupCard({ hasData }: { hasData: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/60 p-5 text-sm">
      <div className="mb-2 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Como configurar a captura automática</h3>
      </div>
      <ol className="ml-5 list-decimal space-y-1 text-muted-foreground">
        <li>
          Crie um bot no <strong>@BotFather</strong> no Telegram e copie o <em>token</em>.
        </li>
        <li>
          Adicione o bot ao grupo onde chegam os fechamentos e desative o
          <em> privacy mode</em> com <code>/setprivacy</code>.
        </li>
        <li>
          A integração já está conectada ao Lovable. As mensagens são lidas
          automaticamente pelo agendamento.
        </li>
        <li>
          Use <strong>"Sincronizar agora"</strong> no topo para puxar mensagens
          manualmente a qualquer momento.
        </li>
      </ol>
      {!hasData && (
        <p className="mt-3 text-xs text-muted-foreground">
          Quando a próxima mensagem com <strong>"FECHAMENTO DO DIA"</strong>{" "}
          chegar, o painel popula automaticamente.
        </p>
      )}
    </div>
  );
}
