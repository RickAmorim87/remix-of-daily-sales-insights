import { createFileRoute } from "@tanstack/react-router";
import {
  handleTelegramWebhook,
  telegramWebhookCorsHeaders,
  telegramWebhookOk,
} from "@/server/telegram-webhook-handler";

export const Route = createFileRoute("/api/telegram-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: telegramWebhookCorsHeaders }),
      GET: async () => telegramWebhookOk({ hint: "POST endpoint for Telegram" }),
      POST: async ({ request }) => handleTelegramWebhook(request),
    },
  },
});