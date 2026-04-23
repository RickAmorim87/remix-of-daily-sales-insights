import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
} from "docx";
import { saveAs } from "file-saver";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  channelMeta,
  formatCurrency,
  type Fechamento,
} from "@/lib/fechamentos";

interface ExportPayload {
  rows: Fechamento[];
  totals: {
    caixa: number;
    totem: number;
    food99: number;
    ifood: number;
    cartoes: number;
    pix: number;
    total: number;
  };
  periodLabel: string;
  mediaDia: number;
  projecaoMes: number;
}

function fileName(ext: string) {
  return `fechamento-american-burger-${format(new Date(), "yyyy-MM-dd-HHmm")}.${ext}`;
}

// ---------- PDF ----------
export function exportToPDF(p: ExportPayload) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("American Burger", 40, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 210, 230);
  doc.text("Painel Executivo · Fechamento Diário", 40, 50);
  doc.text(
    `Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
    pageWidth - 40,
    50,
    { align: "right" },
  );

  // Resumo
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Resumo · ${p.periodLabel}`, 40, 100);

  const cards = [
    ["Faturamento total", formatCurrency(p.totals.total)],
    ["Média diária", formatCurrency(p.mediaDia)],
    ["Eletrônicos", formatCurrency(p.totals.cartoes + p.totals.pix)],
    ["Projeção mês", formatCurrency(p.projecaoMes)],
  ];
  autoTable(doc, {
    startY: 110,
    head: [cards.map((c) => c[0])],
    body: [cards.map((c) => c[1])],
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    bodyStyles: { fontStyle: "bold", fontSize: 11 },
    styles: { halign: "center" },
  });

  // Mix de canais
  const canalRows = channelMeta.map((c) => {
    const v = p.totals[c.key] || 0;
    const pct = p.totals.total ? (v / p.totals.total) * 100 : 0;
    return [c.label, formatCurrency(v), `${pct.toFixed(1)}%`];
  });
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [["Canal", "Total", "Participação"]],
    body: canalRows,
    theme: "striped",
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
  });

  // Histórico
  const sorted = [...p.rows].sort((a, b) => b.data.localeCompare(a.data));
  const histRows = sorted.map((r) => [
    format(parseISO(r.data), "dd/MM/yyyy", { locale: ptBR }),
    formatCurrency(r.caixa),
    formatCurrency(r.totem),
    formatCurrency(r.food99),
    formatCurrency(r.ifood),
    formatCurrency(r.cartoes),
    formatCurrency(r.pix),
    formatCurrency(r.total),
  ]);
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [["Data", "Caixa", "Totem", "99Food", "iFood", "Cartões", "Pix", "Total"]],
    body: histRows,
    theme: "grid",
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    styles: { halign: "right" },
    columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
  });

  doc.save(fileName("pdf"));
}

// ---------- DOCX ----------
export async function exportToDOCX(p: ExportPayload) {
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

  const summaryTable = new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [2250, 2250, 2250, 2250],
    rows: [
      new TableRow({
        children: ["Faturamento", "Média/dia", "Eletrônicos", "Projeção mês"].map(
          (label) =>
            new TableCell({
              borders,
              width: { size: 2250, type: WidthType.DXA },
              shading: { fill: "3B82F6", type: ShadingType.CLEAR, color: "auto" },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: label, bold: true, color: "FFFFFF" })],
                }),
              ],
            }),
        ),
      }),
      new TableRow({
        children: [
          formatCurrency(p.totals.total),
          formatCurrency(p.mediaDia),
          formatCurrency(p.totals.cartoes + p.totals.pix),
          formatCurrency(p.projecaoMes),
        ].map(
          (val) =>
            new TableCell({
              borders,
              width: { size: 2250, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: val, bold: true, size: 22 })],
                }),
              ],
            }),
        ),
      }),
    ],
  });

  // Mix
  const mixHeader = new TableRow({
    tableHeader: true,
    children: ["Canal", "Total", "Participação"].map(
      (h) =>
        new TableCell({
          borders,
          width: { size: 3000, type: WidthType.DXA },
          shading: { fill: "1E293B", type: ShadingType.CLEAR, color: "auto" },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, color: "FFFFFF" })],
            }),
          ],
        }),
    ),
  });
  const mixRows = channelMeta.map((c) => {
    const v = p.totals[c.key] || 0;
    const pct = p.totals.total ? (v / p.totals.total) * 100 : 0;
    return new TableRow({
      children: [c.label, formatCurrency(v), `${pct.toFixed(1)}%`].map(
        (text) =>
          new TableCell({
            borders,
            width: { size: 3000, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun(text)] })],
          }),
      ),
    });
  });
  const mixTable = new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [3000, 3000, 3000],
    rows: [mixHeader, ...mixRows],
  });

  // Histórico
  const sorted = [...p.rows].sort((a, b) => b.data.localeCompare(a.data));
  const histHeader = new TableRow({
    tableHeader: true,
    children: ["Data", "Caixa", "Totem", "99Food", "iFood", "Cartões", "Pix", "Total"].map(
      (h) =>
        new TableCell({
          borders,
          width: { size: 1125, type: WidthType.DXA },
          shading: { fill: "1E293B", type: ShadingType.CLEAR, color: "auto" },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 16 })],
            }),
          ],
        }),
    ),
  });
  const histBody = sorted.map(
    (r) =>
      new TableRow({
        children: [
          format(parseISO(r.data), "dd/MM/yy", { locale: ptBR }),
          formatCurrency(r.caixa),
          formatCurrency(r.totem),
          formatCurrency(r.food99),
          formatCurrency(r.ifood),
          formatCurrency(r.cartoes),
          formatCurrency(r.pix),
          formatCurrency(r.total),
        ].map(
          (text, i) =>
            new TableCell({
              borders,
              width: { size: 1125, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text, size: 16, bold: i === 0 || i === 7 })],
                }),
              ],
            }),
        ),
      }),
  );
  const histTable = new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [1125, 1125, 1125, 1125, 1125, 1125, 1125, 1125],
    rows: [histHeader, ...histBody],
  });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
    },
    sections: [
      {
        properties: { page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: "American Burger", bold: true, size: 36 })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Painel Executivo · ${p.periodLabel}`,
                color: "64748B",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
                color: "94A3B8",
                size: 18,
              }),
            ],
          }),
          new Paragraph({ children: [new TextRun("")] }),
          summaryTable,
          new Paragraph({ children: [new TextRun("")] }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "Mix por canal", bold: true })],
          }),
          mixTable,
          new Paragraph({ children: [new TextRun("")] }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "Histórico de fechamentos", bold: true })],
          }),
          histTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName("docx"));
}

// ---------- WhatsApp ----------
export function buildWhatsappText(p: ExportPayload): string {
  const lines: string[] = [];
  lines.push(`*🍔 American Burger — Fechamento*`);
  lines.push(`_${p.periodLabel} · ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}_`);
  lines.push("");
  lines.push(`💰 *Faturamento total:* ${formatCurrency(p.totals.total)}`);
  lines.push(`📈 *Média diária:* ${formatCurrency(p.mediaDia)}`);
  lines.push(`💳 *Eletrônicos (Cartões + Pix):* ${formatCurrency(p.totals.cartoes + p.totals.pix)}`);
  lines.push(`🎯 *Projeção do mês:* ${formatCurrency(p.projecaoMes)}`);
  lines.push("");
  lines.push(`*Mix por canal:*`);
  channelMeta.forEach((c) => {
    const v = p.totals[c.key] || 0;
    const pct = p.totals.total ? (v / p.totals.total) * 100 : 0;
    lines.push(`${c.icon} ${c.label}: ${formatCurrency(v)} (${pct.toFixed(1)}%)`);
  });
  lines.push("");
  lines.push(`_Painel automatizado via Telegram._`);
  return lines.join("\n");
}

export function shareWhatsapp(p: ExportPayload) {
  const text = encodeURIComponent(buildWhatsappText(p));
  // wa.me funciona no mobile e no web
  const url = `https://wa.me/?text=${text}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
