require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  Events,
  MessageFlags,
} = require('discord.js');

const required = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Variáveis de ambiente ausentes: ${missing.join(', ')}`);
  process.exit(1);
}

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const activeCalls = new Map();

// O administrador escolhe a categoria ao executar /callmanager.
const command = new SlashCommandBuilder()
  .setName('callmanager')
  .setDescription('Publica o painel moderno para criação de calls.')
  .addChannelOption((option) => option
    .setName('categoria')
    .setDescription('Categoria onde as calls criadas por este painel ficarão.')
    .addChannelTypes(ChannelType.GuildCategory)
    .setRequired(true));

async function registerCommand() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: [command.toJSON()],
  });
  console.log('Comando /callmanager registrado/atualizado.');
}

function buildPanelEmbed(category) {
  return new EmbedBuilder()
    .setColor(0x8B5CF6)
    .setAuthor({ name: 'ARCANJO  /  CALL MANAGER', iconURL: client.user.displayAvatarURL() })
    .setTitle('Sua call. Do seu jeito.')
    .setDescription(
      'Bem-vindo à central de calls!\n' +
      'Crie sua sala de voz personalizada em poucos segundos.\n\n' +
      '```ansi\n\u001b[1;35m COMO FUNCIONA\u001b[0m\n1. Clique em Criar minha call\n2. Digite o nome da sala\n3. Entre e chame seus amigos\n```'
    )
    .addFields(
      { name: '📁 CATEGORIA DE DESTINO', value: `As salas serão criadas em ${category}.`, inline: false },
      { name: '⚡ CRIAÇÃO RÁPIDA', value: 'Sala de voz criada automaticamente.', inline: true },
      { name: '🔒 CONTROLE', value: 'Uma call ativa por usuário.', inline: true },
    )
    .setFooter({ text: 'Arcanjo Call Manager • Central de voz' })
    .setTimestamp();
}

function cleanChannelName(name) {
  return name.trim().replace(/\s+/g, '-').replace(/[\\/#@:`<>|*?"]/g, '').slice(0, 95) || 'call-personalizada';
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot conectado como ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'callmanager') {
      const category = interaction.options.getChannel('categoria', true);
      if (category.type !== ChannelType.GuildCategory) {
        await interaction.reply({ content: '❌ Escolha uma categoria válida.', flags: MessageFlags.Ephemeral });
        return;
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`create_call:${category.id}`)
          .setLabel('CRIAR MINHA CALL')
          .setEmoji('🎙️')
          .setStyle(ButtonStyle.Primary),
      );
      await interaction.reply({ embeds: [buildPanelEmbed(category)], components: [row] });
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('create_call:')) {
      const categoryId = interaction.customId.split(':')[1];
      const activeChannelId = activeCalls.get(interaction.user.id);
      if (activeChannelId) {
        const existing = interaction.guild?.channels.cache.get(activeChannelId);
        if (existing) {
          await interaction.reply({ content: `Você já tem uma call ativa: ${existing}. Apague-a antes de criar outra.`, flags: MessageFlags.Ephemeral });
          return;
        }
        activeCalls.delete(interaction.user.id);
      }

      const modal = new ModalBuilder().setCustomId(`call_name:${categoryId}`).setTitle('Criar sua call');
      const nameInput = new TextInputBuilder()
        .setCustomId('channel_name')
        .setLabel('Qual será o nome da sua sala?')
        .setPlaceholder('Ex.: resenha-do-arcanjo')
        .setStyle(TextInputStyle.Short)
        .setMinLength(2)
        .setMaxLength(100)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
      await interaction.showModal(modal);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('call_name:')) {
      // Responde imediatamente para não deixar o Discord preso no estado "pensando".
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const guild = interaction.guild;
      if (!guild) {
        await interaction.editReply('❌ Não consegui identificar o servidor. Tente novamente pelo painel do servidor.');
        return;
      }

      const categoryId = interaction.customId.split(':')[1];
      const activeChannelId = activeCalls.get(interaction.user.id);
      if (activeChannelId) {
        const existing = guild.channels.cache.get(activeChannelId);
        if (existing) {
          await interaction.editReply(`⚠️ Você já tem uma call ativa: ${existing}. Apague essa sala antes de criar outra.`);
          return;
        }
        activeCalls.delete(interaction.user.id);
      }

      const category = await guild.channels.fetch(categoryId).catch(() => null);
      if (!category || category.type !== ChannelType.GuildCategory) {
        await interaction.editReply('❌ Não encontrei a categoria escolhida no painel. Publique um novo painel com `/callmanager` e selecione uma categoria válida.');
        return;
      }

      const requestedName = interaction.fields.getTextInputValue('channel_name');
      console.log(`Criando call para ${interaction.user.tag} na categoria ${category.id}...`);
      const voiceChannel = await guild.channels.create({
        name: cleanChannelName(requestedName),
        type: ChannelType.GuildVoice,
        parent: category.id,
        reason: `Call criada por ${interaction.user.tag}`,
      });
      activeCalls.set(interaction.user.id, voiceChannel.id);
      console.log(`SUCESSO: call ${voiceChannel.id} criada para ${interaction.user.tag}`);

      const successMessage =
        `✅ **Call criada com sucesso!**\n\n` +
        `🔊 **Sua sala:** ${voiceChannel}\n` +
        `📁 **Categoria:** ${category.name}\n\n` +
        'Pode entrar na sala e chamar seus amigos. Para criar outra, apague a call atual.';

      try {
        await interaction.editReply({ content: successMessage });
      } catch (editError) {
        console.error('Falha ao editar resposta da interação:', editError);
        try {
          await interaction.followUp({ content: successMessage, flags: MessageFlags.Ephemeral });
        } catch (followError) {
          console.error('Falha também no envio da confirmação alternativa:', followError);
        }
      }
    }
  } catch (error) {
    console.error('Erro ao processar interação:', error);
    const message = '❌ Não consegui concluir. Verifique as permissões do bot para ver a categoria e criar canais de voz.';
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: message });
      } else {
        await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
      }
    } catch (replyError) {
      console.error('Falha ao informar o erro no Discord:', replyError);
    }
  }
});

client.on(Events.ChannelDelete, (deletedChannel) => {
  for (const [userId, channelId] of activeCalls.entries()) {
    if (channelId === deletedChannel.id) activeCalls.delete(userId);
  }
});

(async () => {
  try {
    await registerCommand();
    await client.login(DISCORD_TOKEN);
  } catch (error) {
    console.error('Falha ao iniciar o bot:', error);
    process.exit(1);
  }
})();
