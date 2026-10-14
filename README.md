# Arcanjo Call Manager — edição moderna

Painel de Discord com visual moderno, mensagem de boas-vindas curta, instruções reunidas na caixa de texto e um único botão para criar a call.

## Escolher onde as calls serão criadas

O administrador escolhe a categoria no próprio comando `/callmanager`:
1. Digite `/callmanager` no servidor.
2. No campo **categoria**, selecione a categoria onde as salas devem ser criadas.
3. Envie o comando. O painel será publicado indicando a categoria escolhida.
4. As pessoas clicam em **CRIAR MINHA CALL**, informam o nome e a sala aparece naquela categoria.

Cada painel mantém a categoria que foi selecionada quando ele foi publicado. Para mudar o destino, publique outro painel com `/callmanager` e escolha outra categoria.

## Deploy no Render

Use **Background Worker** (não Web Service).
- Build Command: `npm install`
- Start Command: `npm start`
- Node: 20 ou superior

Variáveis de ambiente em Render > Environment:
- `DISCORD_TOKEN`: token do bot (mantenha privado).
- `CLIENT_ID`: Application ID da aplicação Discord.
- `GUILD_ID`: ID do servidor Discord.

Não é necessário configurar `VOICE_CATEGORY_ID`; a categoria é escolhida no comando `/callmanager`.

## Permissões

Convide o bot com os escopos `bot` e `applications.commands`. Ele precisa de permissões para ver canais, enviar mensagens/embeds, usar comandos e criar canais de voz dentro da categoria escolhida.

## Comportamento

- O bot responde imediatamente ao envio do formulário para evitar o carregamento infinito.
- Após criar a sala, envia confirmação privada com o canal e a categoria.
- Cada usuário pode ter uma call ativa por vez enquanto o bot estiver em execução.
- Se a sala for apagada, o usuário pode criar outra.
- O mapa de calls ativas fica em memória e é reiniciado quando o processo do bot reinicia.
