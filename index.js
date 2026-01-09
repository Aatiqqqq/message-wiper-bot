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
const GUILD_ID = "1433087368335724616";
const CLEANER_CHANNEL_ID = "1459227178653847700";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", async () => {
  console.log(`🧹 Message Cleaner active as ${client.user.tag}`);

  const guild = await client.guilds.fetch(GUILD_ID);

  console.log("Registering slash commands...");
  await guild.commands.set([
    {
      name: "cleaner",
      description: "Clean messages in a selected channel (Admin only)"
    }
  ]);

  console.log("Slash command registered instantly ✅");
});

client.on("interactionCreate", async interaction => {
  // ---------- SLASH ----------
  if (interaction.isChatInputCommand() && interaction.commandName === "cleaner") {
    if (interaction.channelId !== CLEANER_CHANNEL_ID) {
      return interaction.reply({
        content: "❌ Use this only in #message-cleaner",
        ephemeral: true
      });
    }

    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return interaction.reply({
        content: "❌ Admins only.",
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
        "⚠️ **WARNING**\n\nThis will permanently delete messages.\nProceed carefully.",
      components: [row]
    });
  }

  // ---------- BUTTON: START ----------
  if (interaction.isButton() && interaction.customId === "cleaner_start") {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) return interaction.reply({ content: "Admins only.", ephemeral: true });

    const menu = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId("cleaner_select")
        .setPlaceholder("Select a channel to wipe")
    );

    return interaction.update({
      content: "🧹 Select the channel to wipe:",
      components: [menu]
    });
  }

  // ---------- CHANNEL SELECT ----------
  if (interaction.isChannelSelectMenu()) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) return interaction.reply({ content: "Admins only.", ephemeral: true });

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
        `⚠️ FINAL CONFIRMATION\nDelete ALL messages in <#${channelId}>?`,
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

  // ---------- CONFIRM ----------
  if (interaction.isButton() && interaction.customId.startsWith("cleaner_confirm_")) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) return interaction.reply({ content: "Admins only.", ephemeral: true });

    const channelId = interaction.customId.replace("cleaner_confirm_", "");
    const channel = await interaction.guild.channels.fetch(channelId);

    await interaction.update({
      content: `🧹 Cleaning ${channel}...`,
      components: []
    });

    let totalDeleted = 0;
    while (true) {
      const deleted = await channel.bulkDelete(100, true);
      totalDeleted += deleted.size;
      if (deleted.size < 2) break;
    }

    channel.send(`✅ Wiped **${totalDeleted}** messages.`);
  }
});

client.login(TOKEN);
