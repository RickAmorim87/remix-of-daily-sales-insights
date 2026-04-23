import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

export const Route = createFileRoute("/api/public/telegram-whoami")({
  server: {
    handlers: {
      GET: async () => {
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
        if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
          return new Response(
            JSON.stringify({ ok: false, error: "missing keys" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        const resp = await fetch(`${GATEWAY_URL}/getMe`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TELEGRAM_API_KEY,
            "Content-Type": "application/json",
          },
          body: "{}",
        });
        const data = await resp.json().catch(() => ({}));
        return new Response(JSON.stringify({ status: resp.status, data }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
