
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
  if (!process.env[key] || !process.env[key].trim()) {
    console.error(`Variável ausente no ambiente: ${key}`);
    process.exit(1);
  }
}

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Controle das calls durante a execução atual.
const activeCalls = new Map();
const creatingCalls = new Set();

const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Publica o painel futurista de criação de calls")
    .addChannelOption(option =>
      option
        .setName("categoria")
        .setDescription("Categoria onde as salas de voz serão criadas")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON()
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("Comando /painel registrado.");
}

client.once("ready", () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  try {
    if (!interaction.inGuild()) return;

    // PAINEL PRINCIPAL
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "painel"
    ) {
      const category = interaction.options.getChannel("categoria", true);

      const embed = new EmbedBuilder()
        .setColor(0x9B5CFF)
        .setAuthor({
          name: "ARCANJO • CALL CENTER",
          iconURL: client.user.displayAvatarURL()
        })
        .setTitle("╔═══ ⚡ CENTRAL DE CALLS ⚡ ═══╗")
        .setDescription(
          [
            "## 🚀 SUA SALA. SUAS REGRAS.",
            "",
            "Entre na experiência **Arcanjo Call Manager** e crie sua própria sala de voz em segundos.",
            "",
            "━━━━━━━━━━━━━━━━━━━━",
            "",
            "### ✦ COMO FUNCIONA",
            "",
            "🔹 **01 — INICIAR**",
            "Clique no botão neon abaixo.",
            "",
            "🔹 **02 — PERSONALIZAR**",
            "Escolha o nome da sua sala.",
            "",
            "🔹 **03 — CONECTAR**",
            "Acesse sua nova call e chame seus amigos.",
            "",
            "━━━━━━━━━━━━━━━━━━━━",
            "",
            "### 🛡️ REGRAS DO SISTEMA",
            "• Cada usuário pode ter **1 call ativa**.",
            "• Exclua sua sala atual para liberar outra.",
            "• Use um nome apropriado para sua sala.",
            "",
            "✨ **Sua próxima conversa começa aqui.**"
          ].join("\n")
        )
        .addFields(
          {
            name: "🟢 STATUS DO SISTEMA",
            value: "```ansi\n\u001b[1;32m● SISTEMA OPERACIONAL\u001b[0m\n```",
            inline: true
          },
          {
            name: "🔊 TIPO DE SALA",
            value: "```fix\nCANAL DE VOZ\n```",
            inline: true
          }
        )
        .setFooter({
          text: "ARCANJO CALL MANAGER  •  Tecnologia e conexão",
          iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setCustomId(`create_call:${category.id}`)
        .setLabel("CRIAR MINHA CALL")
        .setEmoji("🚀")
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(button);

      await interaction.channel.send({
        embeds: [embed],
        components: [row]
      });

      await interaction.reply({
        content: "✅ **Painel Arcanjo publicado com sucesso!**",
        ephemeral: true
      });

      return;
    }

    // CLIQUE NO BOTÃO
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("create_call:")
    ) {
      const categoryId = interaction.customId.split(":")[1];
      const existingId = activeCalls.get(interaction.user.id);

      if (existingId) {
        const existing = await interaction.guild.channels
          .fetch(existingId)
          .catch(() => null);

        if (existing) {
          await interaction.reply({
            content:
              `⚠️ Você já possui uma call ativa: **${existing.name}**.\n\n` +
              "🗑️ Exclua sua sala atual antes de criar outra.",
            ephemeral: true
          });
          return;
        }

        activeCalls.delete(interaction.user.id);
      }

      const modal = new ModalBuilder()
        .setCustomId(`call_name:${categoryId}`)
        .setTitle("🚀 Personalizar sua Call");

      const nameInput = new TextInputBuilder()
        .setCustomId("call_name")
        .setLabel("✦ NOME DA SUA SALA")
        .setPlaceholder("Ex.: ⚡・resenha-do-arcanjo")
        .setStyle(TextInputStyle.Short)
        .setMinLength(2)
        .setMaxLength(90)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput)
      );

      await interaction.showModal(modal);
      return;
    }

    // ENVIO DO FORMULÁRIO
    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("call_name:")
    ) {
      const categoryId = interaction.customId.split(":")[1];
      const name = interaction.fields
        .getTextInputValue("call_name")
        .trim();

      if (!name || name.length < 2) {
        await interaction.reply({
          content: "⚠️ Digite um nome válido com pelo menos 2 caracteres.",
          ephemeral: true
        });
        return;
      }

      if (creatingCalls.has(interaction.user.id)) {
        await interaction.reply({
          content: "⏳ Sua call já está sendo criada. Aguarde um instante!",
          ephemeral: true
        });
        return;
      }

      const existingId = activeCalls.get(interaction.user.id);

      if (existingId) {
        const existing = await interaction.guild.channels
          .fetch(existingId)
          .catch(() => null);

        if (existing) {
          await interaction.reply({
            content: `⚠️ Você já possui uma call ativa: <#${existing.id}>`,
            ephemeral: true
          });
          return;
        }

        activeCalls.delete(interaction.user.id);
      }

      const category = await interaction.guild.channels
        .fetch(categoryId)
        .catch(() => null);

      if (!category || category.type !== ChannelType.GuildCategory) {
        await interaction.reply({
          content:
            "❌ **Categoria não encontrada.**\n" +
            "Peça a um administrador para publicar o painel novamente.",
          ephemeral: true
        });
        return;
      }

      // Responde imediatamente para evitar carregamento infinito.
      creatingCalls.add(interaction.user.id);
      await interaction.deferReply({ ephemeral: true });

      try {
        const safeName = name
          .replace(/[\\/@#:`]/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 90) || `call-${interaction.user.username}`;

        const channel = await interaction.guild.channels.create({
          name: safeName,
          type: ChannelType.GuildVoice,
          parent: category.id,
          reason: `Call criada por ${interaction.user.tag}`
        });

        activeCalls.set(interaction.user.id, channel.id);

        await interaction.editReply({
          content: [
            "╔══════════════════════╗",
            "   ✅ **CALL CRIADA COM SUCESSO!**",
            "╚══════════════════════╝",
            "",
            "🚀 Sua sala está pronta para uso.",
            "",
            `🔊 **Nome:** ${channel.name}`,
            `📍 **Canal:** <#${channel.id}>`,
            "",
            "✨ Clique no canal acima para entrar na sua call!",
            "",
            "🛡️ O sistema registrou sua sala ativa."
          ].join("\n")
        });

        console.log(
          `Call criada: ${channel.name} | Usuário: ${interaction.user.tag}`
        );
      } catch (error) {
        console.error("Erro ao criar call:", error);

        await interaction.editReply({
          content:
            "❌ **Não foi possível criar sua call.**\n\n" +
            "Verifique se o bot tem a permissão **Gerenciar canais** " +
            "e se consegue acessar a categoria selecionada.\n\n" +
            "Tente novamente em instantes."
        }).catch(() => {});
      } finally {
        creatingCalls.delete(interaction.user.id);
      }
    }
  } catch (error) {
    console.error("Erro ao processar interação:", error);

    const message =
      "❌ Ocorreu um erro ao processar sua solicitação. " +
      "Verifique as permissões do bot e tente novamente.";

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: message,
        ephemeral: true
      }).catch(() => {});
    } else {
      await interaction.reply({
        content: message,
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// Libera o usuário quando sua sala é excluída.
client.on("channelDelete", channel => {
  for (const [userId, channelId] of activeCalls.entries()) {
    if (channelId === channel.id) {
      activeCalls.delete(userId);
    }
  }
});

(async () => {
  try {
    await registerCommands();
    await client.login(DISCORD_TOKEN);
  } catch (error) {
    console.error("Não foi possível iniciar o bot:", error);
    process.exit(1);
  }
})();
