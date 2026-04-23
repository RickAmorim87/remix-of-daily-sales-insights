// Parser específico para mensagens "FECHAMENTO DO DIA" enviadas no Telegram

export interface ParsedFechamento {
  data: string; // YYYY-MM-DD
  caixa: number;
  totem: number;
  food99: number;
  ifood: number;
  cartoes: number;
  pix: number;
  total: number;
}

function toNumberBR(value: string | undefined | null): number {
  if (!value) return 0;
  const cleaned = value
    .toString()
    .replace(/[^\d,.\-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export function parseFechamento(text: string | undefined | null): ParsedFechamento | null {
  if (!text) return null;
  if (!text.toUpperCase().includes("FECHAMENTO DO DIA")) return null;

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 3) return null;

  const dateLine = lines.find((l) => /\d{2}\/\d{2}\/\d{4}/.test(l));
  if (!dateLine) return null;
  const dateMatch = dateLine.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!dateMatch) return null;
  const [, dia, mes, ano] = dateMatch;
  const dataISO = `${ano}-${mes}-${dia}`;

  function getValor(...labels: string[]): number {
    const lowerLabels = labels.map((l) => l.toLowerCase());
    const line = lines.find((l) => {
      const lower = l.toLowerCase();
      return lowerLabels.some((lbl) => lower.includes(lbl + ":"));
    });
    if (!line) return 0;
    const parts = line.split(":");
    if (parts.length < 2) return 0;
    return toNumberBR(parts.slice(1).join(":"));
  }

  const caixa = getValor("caixa");
  const totem = getValor("totem");
  const food99 = getValor("99food", "99 food");
  const ifood = getValor("ifood", "i food");
  const cartoes = getValor("cartões", "cartoes", "cartão", "cartao");
  const pix = getValor("pix");

  let total = 0;
  const totalLine = lines.find((l) => l.toLowerCase().includes("total:"));
  if (totalLine) {
    total = toNumberBR(totalLine.split(":").slice(1).join(":"));
  }
  if (!total) total = caixa + totem + food99 + ifood + cartoes + pix;

  return { data: dataISO, caixa, totem, food99, ifood, cartoes, pix, total };
}
