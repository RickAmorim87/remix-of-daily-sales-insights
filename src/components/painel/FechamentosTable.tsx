import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { channelMeta, formatCurrency, type Fechamento } from "@/lib/fechamentos";

export function FechamentosTable({
  rows,
  somaTotal,
}: {
  rows: Fechamento[];
  somaTotal: number;
}) {
  const sorted = [...rows].sort((a, b) => b.data.localeCompare(a.data));
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
      <div className="flex items-baseline justify-between border-b px-5 py-4">
        <div>
          <h3 className="font-[Sora] text-base font-semibold">Fechamento por dia</h3>
          <p className="text-xs text-muted-foreground">
            Detalhamento diário por canal — atualiza em tempo real ao receber do Telegram
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {sorted.length} dia{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>
      {sorted.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          Nenhum fechamento ainda. Envie a próxima mensagem
          <strong className="mx-1 text-foreground">"FECHAMENTO DO DIA"</strong>
          no Telegram para começar.
        </div>
      ) : (
        <div className="max-h-[460px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-secondary/90 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
              <tr>
                <Th>Data</Th>
                {channelMeta.map((c) => (
                  <Th key={c.key} className="text-right">
                    {c.label}
                  </Th>
                ))}
                <Th className="text-right">Total</Th>
                <Th className="pr-5 text-right">% período</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const pct = somaTotal ? (Number(r.total) / somaTotal) * 100 : 0;
                return (
                  <tr key={r.id} className="border-t transition-colors hover:bg-secondary/40">
                    <td className="px-5 py-3 font-medium">
                      {format(parseISO(r.data), "dd 'de' MMM", { locale: ptBR })}
                    </td>
                    {channelMeta.map((c) => (
                      <td key={c.key} className="px-3 py-3 text-right tabular-nums text-foreground/80">
                        {formatCurrency(Number(r[c.key]))}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right font-bold tabular-nums text-primary">
                      {formatCurrency(Number(r.total))}
                    </td>
                    <td className="py-3 pr-5 text-right">
                      <div className="ml-auto flex w-32 items-center justify-end gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-3 text-left font-semibold first:pl-5 ${className ?? ""}`}>
      {children}
    </th>
  );
}
