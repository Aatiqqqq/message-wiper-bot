const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder
} = require("discord.js");

const TOKEN = process.env.TOKEN;

// 🔴 CHANGE THESE
const GUILD_ID = "1433087368335724616";
const CLEANER_CHANNEL_ID = "1459227178653847700";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= READY =================
client.once("ready", async () => {
  console.log(`🧹 Message Cleaner online as ${client.user.tag}`);

  const guild = await client.guilds.fetch(GUILD_ID);

  await guild.commands.set([
    {
      name: "cleaner",
      description: "Open message cleaner (Admin only)"
    }
  ]);

  console.log("✅ Slash command registered");
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {
  // ---------- /cleaner ----------
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName !== "cleaner") return;

    if (interaction.channelId !== CLEANER_CHANNEL_ID) {
      return interaction.reply({
        content: "❌ Use this in **#message-cleaner** only",
        flags: 64
      });
    }

    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return interaction.reply({
        content: "❌ Admins only",
        flags: 64
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("cleaner_start")
        .setLabel("🚨 START CLEANER")
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({
      content:
        "⚠️ **WARNING**\nThis will delete messages permanently.\nPress the red button to continue.",
      components: [row]
    });
  }

  // ---------- START BUTTON ----------
  if (interaction.isButton() && interaction.customId === "cleaner_start") {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      await interaction.deferUpdate();
      return interaction.followUp({
        content: "❌ Admins only",
        flags: 64
      });
    }

    const menu = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId("cleaner_select")
        .setPlaceholder("Select a channel to wipe")
    );

    return interaction.update({
      content: "🧹 Select a channel to wipe:",
      components: [menu]
    });
  }

  // ---------- CHANNEL SELECT ----------
  if (interaction.isChannelSelectMenu()) {
    await interaction.deferUpdate();

    const channelId = interaction.values[0];

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`cleaner_confirm_${channelId}`)
        .setLabel("✅ CONFIRM DELETE")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cleaner_cancel")
        .setLabel("❌ CANCEL")
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({
      content:
        `⚠️ **FINAL CONFIRMATION**\nDelete ALL messages in <#${channelId}>?\nThis cannot be undone.`,
      components: [row]
    });
  }

  // ---------- CANCEL ----------
  if (interaction.isButton() && interaction.customId === "cleaner_cancel") {
    return interaction.update({
      content: "❌ Cleaning cancelled.",
      components: []
    });
  }

  // ---------- CONFIRM DELETE ----------
  if (
    interaction.isButton() &&
    interaction.customId.startsWith("cleaner_confirm_")
  ) {
    await interaction.deferUpdate();

    const channelId = interaction.customId.replace("cleaner_confirm_", "");
    const channel = await interaction.guild.channels.fetch(channelId);

    let total = 0;

    while (true) {
      const deleted = await channel.bulkDelete(100, true);
      total += deleted.size;
      if (deleted.size < 2) break;
    }

    return interaction.editReply({
      content: `🧹 **Deleted ${total} messages in ${channel}**`,
      components: []
    });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
