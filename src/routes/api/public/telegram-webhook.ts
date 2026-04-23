import { json } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseFechamento } from "@/server/telegram-parser";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

const ok = (extra: Record<string, unknown> = {}) =>
  json(
    { ok: true, ...extra },
    {
      status: 200,
      headers: corsHeaders,
    },
  );

export const Route = createFileRoute("/api/public/telegram-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async () => ok({ hint: "POST endpoint for Telegram" }),
      POST: async ({ request }) => {
        try {
          const body: any = await request.json().catch(() => ({}));
          const message =
            body?.message ??
            body?.channel_post ??
            body?.edited_message ??
            body?.edited_channel_post;
          const texto: string = message?.text ?? message?.caption ?? "";

          if (!texto.toUpperCase().includes("FECHAMENTO DO DIA")) {
            return ok({ skipped: true });
          }

          const parsed = parseFechamento(texto);
          if (!parsed) return ok({ skipped: true, reason: "parse_failed" });

          const { error } = await supabaseAdmin.from("fechamentos_diarios").upsert(
            {
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
            },
            { onConflict: "data" },
          );

          if (error) return ok({ saved: false, error: error.message });
          return ok({ saved: true, data: parsed.data, total: parsed.total });
        } catch (e: any) {
          console.error("telegram-webhook error:", e?.message ?? e);
          return ok({ error: e?.message ?? String(e) });
        }
      },
    },
  },
});
