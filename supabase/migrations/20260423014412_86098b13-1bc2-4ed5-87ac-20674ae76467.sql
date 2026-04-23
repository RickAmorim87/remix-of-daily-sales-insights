-- Estado do polling (singleton)
CREATE TABLE public.telegram_bot_state (
  id INT PRIMARY KEY CHECK (id = 1),
  update_offset BIGINT NOT NULL DEFAULT 0,
  last_poll_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);

ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bot_state_read_public"
ON public.telegram_bot_state FOR SELECT
USING (true);

-- Fechamentos diários
CREATE TABLE public.fechamentos_diarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL UNIQUE,
  caixa NUMERIC(12,2) NOT NULL DEFAULT 0,
  totem NUMERIC(12,2) NOT NULL DEFAULT 0,
  food99 NUMERIC(12,2) NOT NULL DEFAULT 0,
  ifood NUMERIC(12,2) NOT NULL DEFAULT 0,
  cartoes NUMERIC(12,2) NOT NULL DEFAULT 0,
  pix NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  raw_text TEXT,
  chat_id BIGINT,
  message_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fechamentos_data ON public.fechamentos_diarios (data DESC);

ALTER TABLE public.fechamentos_diarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fechamentos_read_public"
ON public.fechamentos_diarios FOR SELECT
USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER fechamentos_set_updated_at
BEFORE UPDATE ON public.fechamentos_diarios
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER bot_state_set_updated_at
BEFORE UPDATE ON public.telegram_bot_state
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();