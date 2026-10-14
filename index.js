require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder
} = require("discord.js");

const required = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Variável ausente no ambiente: ${key}`);
    process.exit(1);
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Mantém uma call ativa por pessoa durante a execução do bot.
const activeCalls = new Map();

const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Publica o painel para criar calls")
    .addChannelOption(option =>
      option
        .setName("categoria")
        .setDescription("Categoria onde as calls serão criadas")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON()
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log("Comando /painel registrado.");
}

client.once("ready", () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
      const category = interaction.options.getChannel("categoria", true);

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle("🎧 Central de Calls")
        .setDescription(
          "Clique no botão abaixo para criar sua própria sala de voz.\n\n" +
          "• Escolha o nome da call no formulário.\n" +
          "• Cada pessoa pode manter apenas **uma call ativa por vez**.\n" +
          "• Quando sua sala for excluída, você poderá criar outra."
        )
        .setFooter({ text: "Arcanjo Call Manager" });

      const button = new ButtonBuilder()
        .setCustomId(`create_call:${category.id}`)
        .setLabel("Criar minha call")
        .setEmoji("➕")
        .setStyle(ButtonStyle.Primary);

      await interaction.channel.send({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(button)]
      });

      await interaction.reply({
        content: "Painel publicado neste canal!",
        ephemeral: true
      });
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("create_call:")) {
      const categoryId = interaction.customId.split(":")[1];
      const existingId = activeCalls.get(interaction.user.id);

      if (existingId) {
        const existing = await interaction.guild.channels.fetch(existingId).catch(() => null);
        if (existing) {
          await interaction.reply({
            content: `Você já tem uma call ativa: **${existing.name}**. Exclua-a antes de criar outra.`,
            ephemeral: true
          });
          return;
        }
        activeCalls.delete(interaction.user.id);
      }

      const modal = new ModalBuilder()
        .setCustomId(`call_name:${categoryId}`)
        .setTitle("Criar sua call");

      const nameInput = new TextInputBuilder()
        .setCustomId("call_name")
        .setLabel("Nome da call")
        .setPlaceholder("Ex.: Resenha do Arcanjo")
        .setStyle(TextInputStyle.Short)
        .setMinLength(2)
        .setMaxLength(90)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
      await interaction.showModal(modal);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("call_name:")) {
      const categoryId = interaction.customId.split(":")[1];
      const name = interaction.fields.getTextInputValue("call_name").trim();

      if (!name || name.length < 2) {
        await interaction.reply({ content: "Digite um nome válido para a call.", ephemeral: true });
        return;
      }

      const existingId = activeCalls.get(interaction.user.id);
      if (existingId) {
        const existing = await interaction.guild.channels.fetch(existingId).catch(() => null);
        if (existing) {
          await interaction.reply({
            content: `Você já tem uma call ativa: **${existing.name}**.`,
            ephemeral: true
          });
          return;
        }
        activeCalls.delete(interaction.user.id);
      }

      const category = await interaction.guild.channels.fetch(categoryId).catch(() => null);
      if (!category || category.type !== ChannelType.GuildCategory) {
        await interaction.reply({
          content: "A categoria configurada não foi encontrada. Peça a um administrador para publicar o painel novamente.",
          ephemeral: true
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const channel = await interaction.guild.channels.create({
        name: name.replace(/[\\/@#:`]/g, "").slice(0, 90) || `call-${interaction.user.username}`,
        type: ChannelType.GuildVoice,
        parent: category.id,
        reason: `Call criada por ${interaction.user.tag}`
      });

      activeCalls.set(interaction.user.id, channel.id);

      // Se a sala for apagada manualmente, libera o usuário para criar outra.
      await interaction.editReply({
        content: `Sua call foi criada: <#${channel.id}>`
      });
    }
  } catch (error) {
    console.error("Erro ao processar interação:", error);
    const message = "Ocorreu um erro. Confira as permissões do bot e tente novamente.";
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: message, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    }
  }
});

client.on("channelDelete", channel => {
  for (const [userId, channelId] of activeCalls.entries()) {
    if (channelId === channel.id) activeCalls.delete(userId);
  }
});

(async () => {
  try {
    await registerCommands();
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error("Não foi possível iniciar o bot:", error);
    process.exit(1);
  }
})();