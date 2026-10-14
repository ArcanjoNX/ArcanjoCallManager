require('dotenv').config();
const {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, Events
} = require('discord.js');

const required = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`Variáveis ausentes: ${missing.join(', ')}`);
  process.exit(1);
}
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
const VOICE_CATEGORY_ID = process.env.VOICE_CATEGORY_ID || null;
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const activeCalls = new Map();

const command = new SlashCommandBuilder()
  .setName('callmanager')
  .setDescription('Abre o painel para criar sua call personalizada.');

async function registerCommand() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [command.toJSON()] });
  console.log('Comando /callmanager registrado.');
}

function panelEmbed() {
  return new EmbedBuilder()
    .setColor(0x9B5CFF)
    .setAuthor({ name: 'ARCANJO • CALL CENTER' })
    .setTitle('╔═══ ⚡ CENTRAL DE CALLS ⚡ ═══╗')
    .setDescription('Crie sua sala de voz personalizada em poucos segundos.\\n\\n✦ Clique no botão abaixo\\n✦ Escolha o nome da sua sala\\n✦ Entre na call e chame seus amigos')
    .addFields(
      { name: '🟢 STATUS', value: 'Sistema operacional', inline: true },
      { name: '🔊 CANAIS', value: 'Criação automática', inline: true }
    )
    .setFooter({ text: 'Arcanjo Call Manager • Sistema de Calls' })
    .setTimestamp();
}

function cleanName(name) {
  return name.trim().replace(/\\s+/g, '-').replace(/[\\/#@:`<>|*?"]/g, '').slice(0, 95) || 'call-personalizada';
}

client.once(Events.ClientReady, readyClient => console.log(`Bot conectado como ${readyClient.user.tag}`));

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'callmanager') {
      await interaction.reply({
        embeds: [panelEmbed()],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('create_call').setLabel('CRIAR MINHA CALL').setEmoji('🚀').setStyle(ButtonStyle.Primary)
        )]
      });
      return;
    }

    if (interaction.isButton() && interaction.customId === 'create_call') {
      const activeId = activeCalls.get(interaction.user.id);
      if (activeId) {
        const existing = interaction.guild?.channels.cache.get(activeId);
        if (existing) {
          await interaction.reply({ content: `Você já possui uma call ativa: ${existing}. Apague essa sala antes de criar outra.`, ephemeral: true });
          return;
        }
        activeCalls.delete(interaction.user.id);
      }
      const modal = new ModalBuilder().setCustomId('call_name').setTitle('🚀 Personalizar sua Call');
      const input = new TextInputBuilder()
        .setCustomId('channel_name').setLabel('✦ NOME DA SUA SALA')
        .setPlaceholder('Ex.: ⚡・resenha-do-arcanjo')
        .setStyle(TextInputStyle.Short).setMinLength(2).setMaxLength(100).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'call_name') {
      await interaction.deferReply({ ephemeral: true });
      const guild = interaction.guild;
      if (!guild) {
        await interaction.editReply('Não consegui identificar o servidor. Tente novamente dentro do servidor.');
        return;
      }

      const oldId = activeCalls.get(interaction.user.id);
      if (oldId) {
        const oldChannel = guild.channels.cache.get(oldId);
        if (oldChannel) {
          await interaction.editReply(`Você já possui uma call ativa: ${oldChannel}.`);
          return;
        }
        activeCalls.delete(interaction.user.id);
      }

      let parent = null;
      if (VOICE_CATEGORY_ID) {
        parent = guild.channels.cache.get(VOICE_CATEGORY_ID) ||
          await guild.channels.fetch(VOICE_CATEGORY_ID).catch(() => null);
        if (!parent || parent.type !== ChannelType.GuildCategory) {
          await interaction.editReply('A categoria definida em VOICE_CATEGORY_ID não foi encontrada ou não é uma categoria. Confira essa variável no Render.');
          return;
        }
      }

      const options = {
        name: cleanName(interaction.fields.getTextInputValue('channel_name')),
        type: ChannelType.GuildVoice,
        reason: `Call criada por ${interaction.user.tag}`
      };
      if (parent) options.parent = parent.id;

      const channel = await guild.channels.create(options);
      activeCalls.set(interaction.user.id, channel.id);
      await interaction.editReply(
        `✅ **Sua call foi criada com sucesso!**\\n\\n🔊 **Sala:** ${channel}\\n✦ **Nome:** \`${channel.name}\`\\n\\nEntre na sala e convide seus amigos. Para criar outra, apague esta call primeiro.`
      );
    }
  } catch (error) {
    console.error('Erro ao processar interação:', error);
    const message = '❌ Ocorreu um erro ao processar sua solicitação. Confira as permissões do bot e tente novamente.';
    try {
      if (interaction.deferred) await interaction.editReply(message);
      else if (interaction.replied) await interaction.followUp({ content: message, ephemeral: true });
      else await interaction.reply({ content: message, ephemeral: true });
    } catch (replyError) {
      console.error('Não foi possível responder à interação:', replyError);
    }
  }
});

client.on(Events.ChannelDelete, channel => {
  for (const [userId, channelId] of activeCalls.entries()) {
    if (channelId === channel.id) activeCalls.delete(userId);
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
