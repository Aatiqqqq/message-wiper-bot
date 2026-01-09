const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder
} = require("discord.js");

// ===================== CONFIG =====================
const TOKEN = process.env.TOKEN;

// 🔴 PUT YOUR SERVER (GUILD) ID HERE
const GUILD_ID = "1433087368335724616";

// 🧹 message-cleaner CHANNEL ID (YOU GAVE THIS)
const CLEANER_CHANNEL_ID = "1459227178653847700";
// =================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// ===================== READY =====================
client.once("ready", async () => {
  console.log(`🧹 Message Cleaner active as ${client.user.tag}`);

  const guild = await client.guilds.fetch(GUILD_ID);

  console.log("Registering slash commands (guild only)...");
  await guild.commands.set([
    {
      name: "cleaner",
      description: "Clean messages in a selected channel (Admin only)"
    }
  ]);

  console.log("Slash command registered instantly ✅");
});

// ===================== INTERACTIONS =====================
client.on("interactionCreate", async interaction => {
  // ---------- SLASH COMMAND ----------
  if (interaction.isChatInputCommand() && interaction.commandName === "cleaner") {
    // Channel restriction
    if (interaction.channelId !== CLEANER_CHANNEL_ID) {
      return interaction.reply({
        content: "❌ Use this command only in the **message-cleaner** channel.",
        ephemeral: true
      });
    }

    // Admin only
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return interaction.reply({
        content: "❌ Only administrators can use this command.",
        ephemeral: true
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("cleaner_start")
        .setLabel("🚨 START MESSAGE CLEANER")
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({
      content:
        "⚠️ **WARNING**\n\n" +
        "This will permanently delete messages from a channel.\n" +
        "Click the red button to continue.",
      components: [row]
    });
  }

  // ---------- START BUTTON ----------
  if (interaction.isButton() && interaction.customId === "cleaner_start") {
    const menu = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId("cleaner_select")
        .setPlaceholder("Select a channel to wipe")
    );

    return interaction.update({
      content: "🧹 Select the channel you want to **DELETE ALL MESSAGES FROM**:",
      components: [menu]
    });
  }

  // ---------- CHANNEL SELECT ----------
  if (
    interaction.isChannelSelectMenu() &&
    interaction.customId === "cleaner_select"
  ) {
    const channelId = interaction.values[0];

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`cleaner_confirm_${channelId}`)
        .setLabel("✅ CONFIRM DELETE")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cleaner_cancel")
        .setLabel("❌ CANCEL")
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.update({
      content:
        `⚠️ **FINAL CONFIRMATION**\n\n` +
        `Are you sure you want to delete **ALL messages** in <#${channelId}>?\n\n` +
        `❌ This action CANNOT be undone.`,
      components: [confirmRow]
    });
  }

  // ---------- CANCEL ----------
  if (interaction.isButton() && interaction.customId === "cleaner_cancel") {
    return interaction.update({
      content: "❌ Message cleaning cancelled.",
      components: []
    });
  }

  // ---------- CONFIRM DELETE ----------
  if (
    interaction.isButton() &&
    interaction.customId.startsWith("cleaner_confirm_")
  ) {
    const channelId = interaction.customId.replace("cleaner_confirm_", "");
    const channel = await interaction.guild.channels.fetch(channelId);

    await interaction.update({
      content: `🧹 Deleting messages in ${channel}...`,
      components: []
    });

    // Discord rule: only messages < 14 days can be bulk deleted
    let deleted;
    do {
      deleted = await channel.bulkDelete(100, true);
    } while (deleted.size > 0);

    channel.send("✅ **All deletable messages have been wiped.**");
  }
});

// ===================== LOGIN =====================
client.login(TOKEN);
