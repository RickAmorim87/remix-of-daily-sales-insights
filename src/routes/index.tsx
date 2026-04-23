import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  CalendarRange,
  CreditCard,
  RefreshCw,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { useFechamentos } from "@/hooks/use-fechamentos";
import {
  filterByPeriod,
  formatCurrency,
  sumChannels,
  type Period,
} from "@/lib/fechamentos";
import { KpiCard } from "@/components/painel/KpiCard";
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

function PainelBI() {
  const { data, loading, reload } = useFechamentos();
  const [period, setPeriod] = useState<Period>("30d");
  const [syncing, setSyncing] = useState(false);

  const rows = useMemo(() => filterByPeriod(data, period), [data, period]);
  const totals = useMemo(() => sumChannels(rows), [rows]);

  // comparativo: período anterior de mesma duração
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

  // projeção mês: média diária × dias do mês
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
    <main className="mx-auto min-h-screen w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium shadow-[var(--shadow-soft)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Captura automática via Telegram
          </div>
          <h1 className="font-[Sora] text-3xl font-bold tracking-tight sm:text-4xl">
            Painel de Vendas Diárias
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão executiva por canal • atualização em tempo real • insights e projeções
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={syncNow}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-[var(--shadow-soft)] transition-all hover:shadow-[var(--shadow-elevated)] disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
            {syncing ? "Sincronizando..." : "Sincronizar agora"}
          </button>
        </div>
      </header>

      {/* Filtros de período */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <CalendarRange className="h-4 w-4 text-muted-foreground" />
        <span className="mr-1 text-xs font-medium text-muted-foreground">Período:</span>
        {periodos.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
              period === p.key
                ? "bg-foreground text-background shadow-[var(--shadow-soft)]"
                : "border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && data.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Carregando fechamentos...
        </div>
      ) : (
        <>
          {/* KPIs principais */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              variant="primary"
              label="Faturamento total"
              value={totals.total}
              variation={previousVariation?.total ?? null}
              variationLabel={
                previousVariation
                  ? `vs ${previousVariation.days}d anteriores`
                  : `${rows.length} dia(s) no período`
              }
              icon={<Sparkles className="h-4 w-4" />}
            />
            <KpiCard
              label="Média por dia"
              value={mediaDia}
              subtitle={`${rows.length} dia(s) consolidados`}
              icon={<Activity className="h-4 w-4 text-primary" />}
            />
            <KpiCard
              label="Pagamentos eletrônicos"
              value={totals.cartoes + totals.pix}
              variation={
                previousVariation && previousVariation.cartoes != null && previousVariation.pix != null
                  ? (previousVariation.cartoes + previousVariation.pix) / 2
                  : null
              }
              variationLabel="Cartões + Pix"
              icon={<CreditCard className="h-4 w-4 text-primary" />}
            />
            <KpiCard
              variant="success"
              label="Projeção do mês"
              value={projecaoMes.proj}
              subtitle={`${projecaoMes.diasFeitos}/${projecaoMes.diasMes} dias • atual ${formatCurrency(projecaoMes.atual)}`}
              icon={<Zap className="h-4 w-4" />}
            />
          </section>

          {/* Mini KPIs por canal */}
          <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <CanalMini label="Caixa" value={totals.caixa} variation={previousVariation?.caixa} icon="💰" />
            <CanalMini label="Totem" value={totals.totem} variation={previousVariation?.totem} icon="🧮" />
            <CanalMini label="99Food" value={totals.food99} variation={previousVariation?.food99} icon="🍔" />
            <CanalMini label="iFood" value={totals.ifood} variation={previousVariation?.ifood} icon="🍕" />
            <CanalMini label="Cartões" value={totals.cartoes} variation={previousVariation?.cartoes} icon="💳" />
            <CanalMini label="Pix" value={totals.pix} variation={previousVariation?.pix} icon="⚡" />
          </section>

          {/* Charts */}
          <section className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <EvolucaoChart rows={rows} />
            </div>
            <div>
              <CanalPieChart totals={totals} />
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CanalBarChart rows={rows} />
            </div>
            <div>
              <AlertsPanel rows={rows} />
            </div>
          </section>

          {/* Tabela */}
          <section className="mb-10">
            <FechamentosTable rows={rows} somaTotal={totals.total} />
          </section>

          {/* Setup info */}
          <SetupCard hasData={data.length > 0} />
        </>
      )}
    </main>
  );
}

function CanalMini({
  label,
  value,
  variation,
  icon,
}: {
  label: string;
  value: number;
  variation?: number | null;
  icon: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <p className="mt-1.5 font-[Sora] text-base font-bold tabular-nums">
        {formatCurrency(value)}
      </p>
      {variation != null && (
        <p
          className={cn(
            "mt-0.5 text-[11px] font-semibold",
            variation > 0.5
              ? "text-success"
              : variation < -0.5
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        >
          {variation >= 0 ? "+" : ""}
          {variation.toFixed(1)}% vs anterior
        </p>
      )}
    </div>
  );
}

function SetupCard({ hasData }: { hasData: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/60 p-5 text-sm">
      <div className="mb-2 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <h3 className="font-[Sora] font-semibold">Como configurar a captura automática</h3>
      </div>
      <ol className="ml-5 list-decimal space-y-1 text-muted-foreground">
        <li>
          Crie um bot no <strong>@BotFather</strong> no Telegram e copie o <em>token</em>.
        </li>
        <li>
          Adicione o bot ao grupo onde chegam os fechamentos e dê permissão de leitura
          (no BotFather, desative o <em>privacy mode</em> com <code>/setprivacy</code>).
        </li>
        <li>
          A integração já está conectada ao Lovable. As mensagens são lidas automaticamente
          a cada execução do agendamento.
        </li>
        <li>
          Use <strong>"Sincronizar agora"</strong> no topo para puxar mensagens manualmente
          a qualquer momento.
        </li>
      </ol>
      {!hasData && (
        <p className="mt-3 text-xs text-muted-foreground">
          Quando a próxima mensagem com <strong>"FECHAMENTO DO DIA"</strong> chegar, o painel
          começa a popular automaticamente.
        </p>
      )}
    </div>
  );
}
