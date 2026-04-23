import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseFechamento } from "@/server/telegram-parser";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const ok = (extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ ok: true, ...extra }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

export const Route = createFileRoute("/api/public/telegram-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async () => ok({ hint: "POST telegram update payloads here" }),
      POST: async ({ request }) => {
        try {
          const body: any = await request.json().catch(() => ({}));
          const message =
            body?.message ??
            body?.channel_post ??
            body?.edited_message ??
            body?.edited_channel_post;
          const texto: string = message?.text ?? message?.caption ?? "";

          if (!texto || !texto.toUpperCase().includes("FECHAMENTO DO DIA")) {
            return ok({ skipped: true });
          }

          const parsed = parseFechamento(texto);
          if (!parsed) return ok({ skipped: true, reason: "parse_failed" });

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

          const { error } = await supabaseAdmin
            .from("fechamentos_diarios")
            .upsert(row, { onConflict: "data" });

          if (error) return ok({ saved: false, error: error.message });
          return ok({ saved: true, data: parsed.data, total: parsed.total });
        } catch (e: any) {
          // Telegram exige 200 sempre — logamos o erro mas devolvemos ok
          console.error("telegram-webhook error:", e?.message ?? e);
          return ok({ error: e?.message ?? String(e) });
        }
      },
    },
  },
});
