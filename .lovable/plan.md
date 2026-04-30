Vou ajustar a integração para que o painel leia corretamente as mensagens que chegam do EXE/C# no grupo do Telegram, igual funciona quando você copia e cola manualmente.

O que encontrei:
- O banco e o painel estão lendo os registros existentes normalmente.
- O polling atual está tentando buscar mensagens pelo `getUpdates`, mas o Telegram está respondendo conflito 409 porque existe webhook ativo. Então esse caminho não está conseguindo pegar novas mensagens.
- Não há POST recente chegando no endpoint de webhook do app; isso indica que a mensagem do grupo não está sendo entregue ao handler, ou o handler está ignorando algum formato diferente vindo do EXE.
- O parser atual só reconhece campos quando existe `:` no rótulo, por exemplo `Caixa: 10,00`. Se o EXE enviar `Caixa 10,00`, `💰Caixa R$ 10,00`, `99 Food`, ou variações com espaços/emoji, alguns valores podem virar zero.

Plano de correção:

1. Fortalecer o parser de fechamento
   - Aceitar campos com ou sem dois-pontos.
   - Aceitar variações como `99Food`, `99 Food`, `Food99`, `Cartoes`, `Cartões`, `Cartao`, `Cartão`, `iFood`, `I Food`.
   - Aceitar `R$`, pontos de milhar, vírgula decimal, espaços extras e emojis antes dos rótulos.
   - Manter fallback para calcular o total pela soma quando `TOTAL` não vier claro.

2. Normalizar o texto recebido do Telegram
   - No webhook e no poll, extrair texto de `message.text`, `caption`, `channel_post`, `edited_message` e `edited_channel_post`.
   - Criar uma função comum para processar update/mensagem e evitar diferença entre manual, webhook e polling.

3. Resolver o conflito webhook x polling
   - Como o conector Telegram disponível no ambiente funciona melhor com polling, vou ajustar o endpoint `/api/public/telegram-poll` para detectar o erro 409 e, quando possível, apagar o webhook ativo via Telegram API antes de tentar buscar novamente.
   - Depois disso, as mensagens enviadas pelo EXE ao grupo serão puxadas pelo sincronizador/poll automático.

4. Melhorar diagnóstico no painel
   - O botão “Sincronizar” continuará chamando o poll e recarregando a tabela.
   - Vou fazer o retorno do poll informar quando processou, salvou, ignorou por parse ou teve conflito, para facilitar confirmar se a mensagem do EXE foi lida.

5. Validar com o EXE enviado
   - Vou inspecionar as strings legíveis do arquivo enviado para identificar o formato exato da mensagem gerada.
   - Com base nisso, adiciono compatibilidade específica ao parser sem quebrar o formato que já funciona ao copiar e colar.

Arquivos que pretendo alterar:
- `src/server/telegram-parser.ts`
- `src/server/telegram-poll.server.ts`
- `src/server/telegram-webhook-handler.ts`
- Se necessário, pequeno ajuste em `src/routes/index.tsx` apenas para mostrar melhor o status de sincronização.