require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('Defina DISCORD_BOT_TOKEN e DISCORD_CLIENT_ID nas variáveis de ambiente.');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('arcanjoquest')
    .setDescription('Abre o painel do Arcanjo AutoQuest')
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log('Comando /arcanjoquest registrado no servidor de teste.');
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('Comando /arcanjoquest registrado globalmente. Pode levar algum tempo para aparecer.');
    }
  } catch (error) {
    console.error('Falha ao registrar comandos:', error);
    process.exitCode = 1;
  }
})();
