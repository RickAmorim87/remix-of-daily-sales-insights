import { json } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseFechamento } from "@/server/telegram-parser";

export const telegramWebhookCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

export const telegramWebhookOk = (extra: Record<string, unknown> = {}) =>
  json(
    { ok: true, ...extra },
    {
      status: 200,
      headers: telegramWebhookCorsHeaders,
    },
  );

export async function handleTelegramWebhook(request: Request) {
  try {
    const body: any = await request.json().catch(() => ({}));

    console.log("TELEGRAM WEBHOOK RAW BODY:", JSON.stringify(body, null, 2));

    const message =
      body?.message ??
      body?.channel_post ??
      body?.edited_message ??
      body?.edited_channel_post;

    console.log("TELEGRAM WEBHOOK MESSAGE OBJ:", JSON.stringify(message, null, 2));

    const texto: string = message?.text ?? message?.caption ?? "";

    console.log("TELEGRAM WEBHOOK TEXTO:", texto);

    if (!texto || !texto.toUpperCase().includes("FECHAMENTO DO DIA")) {
      return telegramWebhookOk({ skipped: true, reason: "no_fechamento_keyword" });
    }

    const parsed = parseFechamento(texto);
    console.log("TELEGRAM WEBHOOK PARSED:", parsed);

    if (!parsed) return telegramWebhookOk({ skipped: true, reason: "parse_failed" });

    const row = {
      data: parsed.data,
      caixa: parsed.caixa,
      totem: parsed.totem,
      food99: parsed.food99,
      ifood: parsed.ifood,
      cartoes: parsed.cartoes,
      pix: parsed.pix,
      total: parsed.total,
      raw_text: texto,
      chat_id: message?.chat?.id ?? null,
      message_id: message?.message_id ?? null,
    };

    console.log("TELEGRAM WEBHOOK UPSERT ROW:", row);

    const { error } = await supabaseAdmin
      .from("fechamentos_diarios")
      .upsert(row, { onConflict: "data" });

    if (error) {
      console.error("TELEGRAM WEBHOOK SUPABASE ERROR:", error);
      return telegramWebhookOk({ saved: false, error: error.message });
    }

    return telegramWebhookOk({ saved: true, data: parsed.data, total: parsed.total });
  } catch (e: any) {
    console.error("TELEGRAM WEBHOOK ERROR:", e?.message ?? e);
    return telegramWebhookOk({ error: e?.message ?? String(e) });
  }
}