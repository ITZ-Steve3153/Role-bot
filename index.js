const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const express = require("express");
require("dotenv").config();

const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(3000, () => console.log("🌐 Web server running"));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

let triggerRoleIds = new Set();
let removalRoleIds = new Set();

const commands = [
  new SlashCommandBuilder().setName("addtriggerrole").setDescription("Add a role to trigger list").addRoleOption(opt => opt.setName("role").setDescription("Trigger role").setRequired(true)),
  new SlashCommandBuilder().setName("removetriggerrole").setDescription("Remove a role from trigger list").addRoleOption(opt => opt.setName("role").setDescription("Trigger role").setRequired(true)),
  new SlashCommandBuilder().setName("addremoverole").setDescription("Add a role to removal list").addRoleOption(opt => opt.setName("role").setDescription("Role to remove").setRequired(true)),
  new SlashCommandBuilder().setName("removeremoverole").setDescription("Remove a role from removal list").addRoleOption(opt => opt.setName("role").setDescription("Role to remove").setRequired(true)),
  new SlashCommandBuilder().setName("listroles").setDescription("List current trigger and removal roles")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log("✅ Slash commands registered");
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
})();

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const role = interaction.options.getRole("role");

  if (interaction.commandName === "addtriggerrole") {
    triggerRoleIds.add(role.id);
    await interaction.reply(`✅ Added **${role.name}** to trigger roles.`);
  }

  if (interaction.commandName === "removetriggerrole") {
    triggerRoleIds.delete(role.id);
    await interaction.reply(`🗑️ Removed **${role.name}** from trigger roles.`);
  }

  if (interaction.commandName === "addremoverole") {
    removalRoleIds.add(role.id);
    await interaction.reply(`✅ Added **${role.name}** to roles-to-remove.`);
  }

  if (interaction.commandName === "removeremoverole") {
    removalRoleIds.delete(role.id);
    await interaction.reply(`🗑️ Removed **${role.name}** from removal roles.`);
  }

  if (interaction.commandName === "listroles") {
    const guild = interaction.guild;

    const triggerList = [...triggerRoleIds].map(id => guild.roles.cache.get(id)?.name ?? "*Unknown*").join("\n") || "*None*";
    const removalList = [...removalRoleIds].map(id => guild.roles.cache.get(id)?.name ?? "*Unknown*").join("\n") || "*None*";

    await interaction.reply({
      content: `📌 **Trigger Roles:**\n${triggerList}\n\n🧹 **Removal Roles:**\n${removalList}`,
      ephemeral: true
    });
  }
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const oldRoleIDs = new Set(oldMember.roles.cache.map(r => r.id));
  const newRoleIDs = new Set(newMember.roles.cache.map(r => r.id));
  const addedRoles = [...newRoleIDs].filter(id => !oldRoleIDs.has(id));
  const triggered = addedRoles.find(id => triggerRoleIds.has(id));
  if (!triggered) return;

  for (const roleId of removalRoleIds) {
    if (newMember.roles.cache.has(roleId)) {
      await newMember.roles.remove(roleId);
      console.log(`🧹 Removed ${roleId} from ${newMember.user.tag}`);
    }
  }
});

client.once("ready", () => {
  console.log(`🤖 Bot is online as ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN);

