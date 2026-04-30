// Parser robusto para mensagens "FECHAMENTO DO DIA" (manual, EXE C#, ou webhook).

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
  if (value == null) return 0;
  const cleaned = String(value)
    .replace(/r\$/gi, "")
    .replace(/[^\d,.\-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "") // remove pontos de milhar
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Normaliza linha: remove emojis/símbolos no começo e espaços extras.
function normalizeLine(line: string): string {
  return line
    .replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF\u2300-\u23FF\u25A0-\u25FF]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Extrai valor numérico de uma linha que contém um dos rótulos.
// Aceita "Caixa: 10,00", "Caixa 10,00", "💰Caixa R$ 10,00", "99 Food: 1.000,00".
function extractValue(lines: string[], aliases: string[]): number {
  const lowerAliases = aliases.map((a) =>
    a.toLowerCase().replace(/\s+/g, ""),
  );
  for (const raw of lines) {
    const line = normalizeLine(raw);
    const lower = line.toLowerCase().replace(/\s+/g, "");
    const hit = lowerAliases.find((a) => lower.includes(a));
    if (!hit) continue;
    // pega tudo depois do rótulo
    const idx = lower.indexOf(hit);
    const after = line.slice(idx + hit.length);
    // se houver ":" usa o que vem depois; senão usa o resto da linha
    const tail = after.includes(":") ? after.split(":").slice(1).join(":") : after;
    const v = toNumberBR(tail);
    if (v || /\d/.test(tail)) return v;
  }
  return 0;
}

export function parseFechamento(text: string | undefined | null): ParsedFechamento | null {
  if (!text) return null;
  if (!text.toUpperCase().includes("FECHAMENTO DO DIA")) return null;

  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (rawLines.length < 2) return null;

  // Data: aceita dd/mm/yyyy em qualquer linha (com ou sem emoji antes).
  const dateLine = rawLines.find((l) => /\d{2}\/\d{2}\/\d{4}/.test(l));
  if (!dateLine) return null;
  const m = dateLine.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const dataISO = `${ano}-${mes}-${dia}`;

  const caixa = extractValue(rawLines, ["caixa"]);
  const totem = extractValue(rawLines, ["totem"]);
  const food99 = extractValue(rawLines, ["99food", "99 food", "food99", "food 99"]);
  const ifood = extractValue(rawLines, ["ifood", "i food"]);
  const cartoes = extractValue(rawLines, ["cartões", "cartoes", "cartão", "cartao", "cart"]);
  const pix = extractValue(rawLines, ["pix"]);

  let total = extractValue(rawLines, ["total"]);
  if (!total) total = caixa + totem + food99 + ifood + cartoes + pix;

  return { data: dataISO, caixa, totem, food99, ifood, cartoes, pix, total };
}
