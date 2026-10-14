# Arcanjo Call Manager

Bot Discord em Node.js com:
- comando `/painel` para publicar uma mensagem fixa com botão;
- formulário modal para o membro escolher o nome da call;
- uma call ativa por usuário enquanto o bot está em execução;
- comando `/painel` restrito a quem tem permissão de Gerenciar servidor.

## Configuração pelo celular

1. Baixe e extraia este ZIP.
2. Escolha uma hospedagem que execute aplicações Node.js continuamente.
3. Envie os arquivos do projeto para a hospedagem.
4. Configure as variáveis de ambiente:
   - `DISCORD_TOKEN`: token do bot, obtido na seção Bot do Developer Portal.
   - `CLIENT_ID`: ID da aplicação, em Informações gerais.
   - `GUILD_ID`: ID do servidor Discord. No Discord, ative o Modo desenvolvedor e use Copiar ID do servidor.
5. Configure o comando de inicialização como `npm start` (ou deixe a hospedagem detectar o package.json).
6. Inicie o serviço e confira os logs: deve aparecer “Bot conectado como...”.
7. No servidor, crie uma categoria para as calls. Garanta que o bot possa ver o canal de texto do painel e gerenciar canais.
8. Em um canal de texto, execute `/painel` e escolha a categoria. O bot publicará o painel.

## Importante
- Nunca publique nem compartilhe `DISCORD_TOKEN`.
- Não é necessário dar permissão de Administrador ao bot.
- O código mantém o limite em memória. Se a hospedagem reiniciar, o mapa de calls ativas é reiniciado; para persistir esse limite entre reinicializações, será necessário usar banco de dados.
- O bot não apaga automaticamente salas vazias neste exemplo.
- O bot precisa continuar em execução na hospedagem para responder aos botões.
