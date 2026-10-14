# Arcanjo Call Manager — /callmanager

## Render
Tipo: **Background Worker** (não Web Service).
Build command: `npm install`
Start command: `npm start`
Node.js: 20 ou superior.

Configure estas variáveis no Render:
- `DISCORD_TOKEN`: token do bot (não compartilhe).
- `CLIENT_ID`: Application ID da aplicação Discord.
- `GUILD_ID`: ID do servidor Discord.
- `VOICE_CATEGORY_ID`: opcional; ID da categoria onde criar as calls.

Convide o bot com os escopos `bot` e `applications.commands`. Ele precisa ter permissão para ver canais, criar canais e responder a interações.

Depois de iniciar, use `/callmanager` no servidor para publicar o painel. O botão abre o formulário para definir o nome da call.

Nota: chamadas ativas são guardadas em memória; se o bot reiniciar, o controle das chamadas ativas é reiniciado.
