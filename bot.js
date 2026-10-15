require('dotenv').config();

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
} = require('discord.js');

const token = process.env.DISCORD_BOT_TOKEN;
const panelUrl = process.env.PANEL_URL;
const apiUrl = process.env.API_URL || process.env.FRONTEND_URL;

if (!token) {
  console.error('[bot] DISCORD_BOT_TOKEN não foi definido no ambiente.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`[bot] Conectado como ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'arcanjoquest') return;

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('⚡ Arcanjo AutoQuest')
    .setDescription(
      'Painel do Arcanjo AutoQuest. Use os botões abaixo para abrir o painel configurado ou consultar as informações do bot.'
    )
    .addFields(
      { name: 'Bot', value: 'Online e pronto para receber comandos.', inline: true },
      { name: 'Servidor', value: interaction.guild?.name || 'Mensagem direta', inline: true },
    )
    .setFooter({ text: 'Arcanjo AutoQuest • Painel do Discord' })
    .setTimestamp();

  const row = new ActionRowBuilder();

  if (panelUrl && /^https:\/\/\S+/i.test(panelUrl)) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel('Abrir painel')
        .setStyle(ButtonStyle.Link)
        .setURL(panelUrl)
        .setEmoji('🌐')
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId('arcanjoquest_status')
      .setLabel('Status do bot')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🟢'),
    new ButtonBuilder()
      .setCustomId('arcanjoquest_help')
      .setLabel('Ajuda')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('❔')
  );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'arcanjoquest_status') {
    await interaction.reply({
      content: `🟢 **Bot online**\nLatência do gateway: **${client.ws.ping} ms**`,
      ephemeral: true,
    });
  }

  if (interaction.customId === 'arcanjoquest_help') {
    await interaction.reply({
      content:
        'Use **/arcanjoquest** para abrir este painel. Para abrir o site, configure `PANEL_URL` nas variáveis de ambiente. O comando não solicita nem armazena token pessoal de usuário.',
      ephemeral: true,
    });
  }
});

client.on(Events.Error, (error) => console.error('[bot] Erro do cliente:', error));
process.on('unhandledRejection', (error) => console.error('[bot] Promise rejeitada:', error));

client.login(token).catch((error) => {
  console.error('[bot] Falha ao conectar. Verifique DISCORD_BOT_TOKEN:', error.message);
  process.exit(1);
});
