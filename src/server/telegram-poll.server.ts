// Server-only: faz polling do Telegram via connector gateway e salva fechamentos
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseFechamento } from "./telegram-parser";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const MAX_RUNTIME_MS = 50_000;
const MIN_REMAINING_MS = 6_000;

export interface PollResult {
  ok: boolean;
  processed: number;
  saved: number;
  finalOffset: number;
  errors?: string[];
}

export async function runTelegramPoll(): Promise<PollResult> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!TELEGRAM_API_KEY) throw new Error("TELEGRAM_API_KEY is not configured");

  const startTime = Date.now();
  const errors: string[] = [];
  let totalProcessed = 0;
  let totalSaved = 0;

  const { data: state, error: stateErr } = await supabaseAdmin
    .from("telegram_bot_state")
    .select("update_offset")
    .eq("id", 1)
    .single();

  if (stateErr) throw new Error(`bot_state read: ${stateErr.message}`);
  let currentOffset: number = Number(state?.update_offset ?? 0);

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(40, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    let resp: Response;
    try {
      resp = await fetch(`${GATEWAY_URL}/getUpdates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TELEGRAM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offset: currentOffset,
          timeout,
          allowed_updates: ["message", "channel_post", "edited_message", "edited_channel_post"],
        }),
      });
    } catch (e: any) {
      errors.push(`getUpdates network: ${e?.message ?? e}`);
      break;
    }

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.ok) {
      errors.push(`getUpdates failed [${resp.status}]: ${JSON.stringify(data)}`);
      break;
    }

    const updates: any[] = data.result ?? [];
    if (updates.length === 0) {
      // ciclo de long-poll vazio: encerra esta execução
      break;
    }

    for (const u of updates) {
      totalProcessed++;
      const message = u.message ?? u.channel_post ?? u.edited_message ?? u.edited_channel_post;
      const text: string | undefined = message?.text ?? message?.caption;
      if (!text) continue;

      const parsed = parseFechamento(text);
      if (!parsed) continue;

      const row = {
        data: parsed.data,
        caixa: parsed.caixa,
        totem: parsed.totem,
        food99: parsed.food99,
        ifood: parsed.ifood,
        cartoes: parsed.cartoes,
        pix: parsed.pix,
        total: parsed.total,
        raw_text: text,
        chat_id: message?.chat?.id ?? null,
        message_id: message?.message_id ?? null,
      };

      const { error: upErr } = await supabaseAdmin
        .from("fechamentos_diarios")
        .upsert(row, { onConflict: "data" });

      if (upErr) {
        errors.push(`upsert ${parsed.data}: ${upErr.message}`);
      } else {
        totalSaved++;
      }
    }

    const newOffset = Math.max(...updates.map((u: any) => Number(u.update_id))) + 1;
    const { error: offErr } = await supabaseAdmin
      .from("telegram_bot_state")
      .update({ update_offset: newOffset, last_poll_at: new Date().toISOString() })
      .eq("id", 1);

    if (offErr) {
      errors.push(`offset update: ${offErr.message}`);
      break;
    }
    currentOffset = newOffset;
  }

  return {
    ok: true,
    processed: totalProcessed,
    saved: totalSaved,
    finalOffset: currentOffset,
    errors: errors.length ? errors : undefined,
  };
}
