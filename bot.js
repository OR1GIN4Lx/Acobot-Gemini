const { Client, GatewayIntentBits, ChannelType, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Configurazione
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CLIENT_ID = process.env.CLIENT_ID || '';

// Inizializza client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Inizializza Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Personalità predefinita del bot
let botPersonality = "Si chiama Aco-Chan o Aco e gli piacciono gli anime, film e videogiochi";

// Database in memoria
const botSettings = new Map();
const conversations = new Map();
const messageStats = new Map(); // userId -> { count, lastMessage }
const serverStats = new Map(); // guildId -> { totalMessages, users: {} }

// Registra i comandi slash
const commands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra la lista dei comandi'),
  
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Mostra lo stato del bot'),
  
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Mostra la latenza del bot'),
  
  new SlashCommandBuilder()
    .setName('clearhistory')
    .setDescription('Resetta la tua cronologia conversazione'),
  
  new SlashCommandBuilder()
    .setName('enable')
    .setDescription('Abilita il bot (solo admin)'),
  
  new SlashCommandBuilder()
    .setName('disable')
    .setDescription('Disabilita il bot (solo admin)'),
  
  new SlashCommandBuilder()
    .setName('addchannel')
    .setDescription('Aggiungi un canale attivo (solo admin)')
    .addChannelOption(option => 
      option.setName('canale')
        .setDescription('Seleziona il canale')
        .setRequired(true)
    ),
  
  new SlashCommandBuilder()
    .setName('removechannel')
    .setDescription('Rimuovi un canale (solo admin)')
    .addChannelOption(option =>
      option.setName('canale')
        .setDescription('Seleziona il canale')
        .setRequired(true)
    ),
  
  new SlashCommandBuilder()
    .setName('channels')
    .setDescription('Mostra i canali attivi (solo admin)'),
  
  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Mostra info profilo utente')
    .addUserOption(option =>
      option.setName('utente')
        .setDescription('Seleziona un utente')
        .setRequired(false)
    ),
  
  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Mostra info del server'),
  
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Mostra statistiche messaggi del server'),
  
  new SlashCommandBuilder()
    .setName('mystats')
    .setDescription('Mostra tue statistiche personali'),
  
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Mostra leaderboard messaggi del server'),

  new SlashCommandBuilder()
    .setName('setpersonality')
    .setDescription('Imposta personalità/regole del bot (solo admin)')
    .addStringOption(option =>
      option.setName('personalita')
        .setDescription('Descrivi come deve comportarsi il bot')
        .setRequired(true)
        .setMaxLength(500)
    ),

  new SlashCommandBuilder()
    .setName('getpersonality')
    .setDescription('Mostra la personalità attuale del bot'),

  new SlashCommandBuilder()
    .setName('resetpersonality')
    .setDescription('Resetta la personalità del bot (solo admin)'),
];

// Registra i comandi slash quando il bot è pronto
client.on('ready', async () => {
  console.log(`✅ Bot loggato come ${client.user.tag}`);
  client.user.setActivity('comandi / | ChatBot Gemini', { type: 'WATCHING' });

  try {
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    
    console.log('📝 Registrazione comandi slash...');
    
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands.map(cmd => cmd.toJSON()),
    });
    
    console.log('✅ Comandi slash registrati!');
  } catch (error) {
    console.error('Errore nella registrazione:', error);
  }
});

// Gestione messaggi normali
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Registra statistiche
  recordStats(message);

  // Se è un DM, rispondi
  if (message.channel.type === ChannelType.DM) {
    await respondToMessage(message);
    return;
  }

  // Se è un server, rispondi solo nei canali attivi
  if (message.guild) {
    const settings = getBotSettings(message.guildId);
    if (!settings.enabled || !settings.activeChannels.includes(message.channelId)) {
      return;
    }
    await respondToMessage(message);
  }
});

// Gestione comandi slash
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'help':
        await showHelp(interaction);
        break;
      case 'status':
        await showStatus(interaction);
        break;
      case 'ping':
        await interaction.reply(`🏓 Pong! ${client.ws.ping}ms`);
        break;
      case 'clearhistory':
        await clearHistory(interaction);
        break;
      case 'enable':
        if (!interaction.member.permissions.has('Administrator')) {
          return await interaction.reply({ content: '❌ Devi essere amministratore!', ephemeral: true });
        }
        await enableBot(interaction);
        break;
      case 'disable':
        if (!interaction.member.permissions.has('Administrator')) {
          return await interaction.reply({ content: '❌ Devi essere amministratore!', ephemeral: true });
        }
        await disableBot(interaction);
        break;
      case 'addchannel':
        if (!interaction.member.permissions.has('Administrator')) {
          return await interaction.reply({ content: '❌ Devi essere amministratore!', ephemeral: true });
        }
        await addChannel(interaction);
        break;
      case 'removechannel':
        if (!interaction.member.permissions.has('Administrator')) {
          return await interaction.reply({ content: '❌ Devi essere amministratore!', ephemeral: true });
        }
        await removeChannel(interaction);
        break;
      case 'channels':
        if (!interaction.member.permissions.has('Administrator')) {
          return await interaction.reply({ content: '❌ Devi essere amministratore!', ephemeral: true });
        }
        await listChannels(interaction);
        break;
      case 'userinfo':
        await showUserInfo(interaction);
        break;
      case 'serverinfo':
        await showServerInfo(interaction);
        break;
      case 'stats':
        await showServerStats(interaction);
        break;
      case 'mystats':
        await showMyStats(interaction);
        break;
      case 'leaderboard':
        await showLeaderboard(interaction);
        break;
      case 'setpersonality':
        if (!interaction.member.permissions.has('Administrator')) {
          return await interaction.reply({ content: '❌ Devi essere amministratore!', ephemeral: true });
        }
        await setPersonality(interaction);
        break;
      case 'getpersonality':
        await getPersonality(interaction);
        break;
      case 'resetpersonality':
        if (!interaction.member.permissions.has('Administrator')) {
          return await interaction.reply({ content: '❌ Devi essere amministratore!', ephemeral: true });
        }
        await resetPersonality(interaction);
        break;
      default:
        await interaction.reply({ content: '❓ Comando non riconosciuto', ephemeral: true });
    }
  } catch (error) {
    console.error('Errore:', error);
    await interaction.reply({ content: '❌ Si è verificato un errore', ephemeral: true });
  }
});

// Funzioni helper
function getBotSettings(guildId) {
  if (!botSettings.has(guildId)) {
    botSettings.set(guildId, {
      enabled: true,
      activeChannels: [],
    });
  }
  return botSettings.get(guildId);
}

function recordStats(message) {
  const guildId = message.guildId || 'dm';
  const userId = message.author.id;

  // Statistiche utente
  if (!messageStats.has(userId)) {
    messageStats.set(userId, { count: 0, lastMessage: null });
  }
  const userStats = messageStats.get(userId);
  userStats.count++;
  userStats.lastMessage = new Date();

  // Statistiche server
  if (message.guild) {
    if (!serverStats.has(guildId)) {
      serverStats.set(guildId, { totalMessages: 0, users: {} });
    }
    const stats = serverStats.get(guildId);
    stats.totalMessages++;
    stats.users[userId] = (stats.users[userId] || 0) + 1;
  }
}

async function respondToMessage(message) {
  try {
    await message.channel.sendTyping();

    let conversationHistory = conversations.get(message.author.id) || [];

    conversationHistory.push({
      role: 'user',
      parts: [{ text: message.content }],
    });

    const chat = model.startChat({
      history: conversationHistory.slice(0, -1),
      systemInstruction: getBotPersonality(message.guildId),
    });

    const result = await chat.sendMessage(message.content);
    const response = result.response.text();

    conversationHistory.push({
      role: 'model',
      parts: [{ text: response }],
    });

    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }
    conversations.set(message.author.id, conversationHistory);

    const maxLength = 2000;
    if (response.length > maxLength) {
      const chunks = response.match(new RegExp(`.{1,${maxLength}}`, 'g'));
      for (const chunk of chunks) {
        await message.reply({ content: chunk });
      }
    } else {
      await message.reply({ content: response });
    }
  } catch (error) {
    console.error('Errore:', error);
    await message.reply({ content: '❌ Si è verificato un errore. Riprova più tardi.' });
  }
}

// Comandi Admin
async function enableBot(interaction) {
  const settings = getBotSettings(interaction.guildId);
  settings.enabled = true;
  const embed = new EmbedBuilder()
    .setColor('#27AE60')
    .setTitle('✅ Bot Abilitato')
    .setDescription('Il bot è stato abilitato su questo server.');
  await interaction.reply({ embeds: [embed] });
}

async function disableBot(interaction) {
  const settings = getBotSettings(interaction.guildId);
  settings.enabled = false;
  const embed = new EmbedBuilder()
    .setColor('#E74C3C')
    .setTitle('⛔ Bot Disabilitato')
    .setDescription('Il bot è stato disabilitato su questo server.');
  await interaction.reply({ embeds: [embed] });
}

async function addChannel(interaction) {
  const channel = interaction.options.getChannel('canale');
  const settings = getBotSettings(interaction.guildId);

  if (settings.activeChannels.includes(channel.id)) {
    return await interaction.reply({ content: `⚠️ Il canale ${channel} è già attivo!`, ephemeral: true });
  }

  settings.activeChannels.push(channel.id);
  const embed = new EmbedBuilder()
    .setColor('#3498DB')
    .setTitle('✅ Canale Aggiunto')
    .setDescription(`Il bot risponderà in ${channel}`);
  await interaction.reply({ embeds: [embed] });
}

async function removeChannel(interaction) {
  const channel = interaction.options.getChannel('canale');
  const settings = getBotSettings(interaction.guildId);
  const index = settings.activeChannels.indexOf(channel.id);

  if (index === -1) {
    return await interaction.reply({ content: `⚠️ Il canale ${channel} non è attivo!`, ephemeral: true });
  }

  settings.activeChannels.splice(index, 1);
  const embed = new EmbedBuilder()
    .setColor('#E67E22')
    .setTitle('✅ Canale Rimosso')
    .setDescription(`Il bot non risponderà più in ${channel}`);
  await interaction.reply({ embeds: [embed] });
}

async function listChannels(interaction) {
  const settings = getBotSettings(interaction.guildId);

  if (settings.activeChannels.length === 0) {
    const embed = new EmbedBuilder()
      .setColor('#95A5A6')
      .setTitle('📋 Canali Attivi')
      .setDescription('Nessun canale configurato. Usa `/addchannel`');
    return await interaction.reply({ embeds: [embed] });
  }

  const channels = settings.activeChannels.map(id => `<#${id}>`).join('\n');
  const embed = new EmbedBuilder()
    .setColor('#3498DB')
    .setTitle('📋 Canali Attivi')
    .setDescription(channels);
  await interaction.reply({ embeds: [embed] });
}

async function clearHistory(interaction) {
  conversations.delete(interaction.user.id);
  const embed = new EmbedBuilder()
    .setColor('#27AE60')
    .setTitle('🔄 Cronologia Cancellata')
    .setDescription('La tua cronologia conversazione è stata resettata.');
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showStatus(interaction) {
  const settings = getBotSettings(interaction.guildId);
  const status = settings.enabled ? '✅ Attivo' : '⛔ Inattivo';
  const channelCount = settings.activeChannels.length;

  const embed = new EmbedBuilder()
    .setColor('#3498DB')
    .setTitle('🤖 Status Bot')
    .addFields(
      { name: 'Stato', value: status, inline: true },
      { name: 'Canali Attivi', value: `${channelCount}`, inline: true },
      { name: 'Server', value: interaction.guild.name, inline: false }
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

// Nuovi comandi utilità
async function showUserInfo(interaction) {
  const user = interaction.options.getUser('utente') || interaction.user;
  const member = await interaction.guild.members.fetch(user.id);

  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle('👤 Informazioni Utente')
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: 'Nome', value: user.username, inline: true },
      { name: 'ID', value: user.id, inline: true },
      { name: 'Account creato', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'Entrato nel server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
      { name: 'Ruoli', value: member.roles.cache.map(r => r.toString()).join(', ') || 'Nessuno', inline: false }
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

async function showServerInfo(interaction) {
  const guild = interaction.guild;
  const owner = await guild.fetchOwner();

  const embed = new EmbedBuilder()
    .setColor('#3498DB')
    .setTitle('🏰 Informazioni Server')
    .setThumbnail(guild.iconURL())
    .addFields(
      { name: 'Nome', value: guild.name, inline: true },
      { name: 'ID', value: guild.id, inline: true },
      { name: 'Owner', value: owner.user.username, inline: true },
      { name: 'Membri', value: `${guild.memberCount}`, inline: true },
      { name: 'Canali', value: `${guild.channels.cache.size}`, inline: true },
      { name: 'Ruoli', value: `${guild.roles.cache.size}`, inline: true },
      { name: 'Creato', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: false }
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

async function showServerStats(interaction) {
  const stats = serverStats.get(interaction.guildId) || { totalMessages: 0, users: {} };

  const embed = new EmbedBuilder()
    .setColor('#F39C12')
    .setTitle('📊 Statistiche Server')
    .addFields(
      { name: 'Messaggi totali', value: `${stats.totalMessages}`, inline: true },
      { name: 'Utenti attivi', value: `${Object.keys(stats.users).length}`, inline: true }
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

async function showMyStats(interaction) {
  const stats = messageStats.get(interaction.user.id) || { count: 0, lastMessage: null };

  const embed = new EmbedBuilder()
    .setColor('#2ECC71')
    .setTitle('📈 Tue Statistiche')
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: 'Messaggi inviati', value: `${stats.count}`, inline: true },
      { name: 'Ultimo messaggio', value: stats.lastMessage ? `<t:${Math.floor(stats.lastMessage.getTime() / 1000)}:R>` : 'Mai', inline: true }
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showLeaderboard(interaction) {
  const stats = serverStats.get(interaction.guildId);
  if (!stats || Object.keys(stats.users).length === 0) {
    return await interaction.reply({ content: '❌ Nessun dato disponibile', ephemeral: true });
  }

  const sorted = Object.entries(stats.users)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const leaderboard = sorted
    .map((entry, i) => `${i + 1}. <@${entry[0]}> - ${entry[1]} messaggi`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor('#E74C3C')
    .setTitle('🏆 Leaderboard Messaggi')
    .setDescription(leaderboard)
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

async function showHelp(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle('📚 Comandi Bot Gemini')
    .addFields(
      {
        name: '💬 Comandi Generali',
        value: '`/help` - Mostra questo messaggio\n`/status` - Stato del bot\n`/ping` - Latenza bot\n`/clearhistory` - Resetta cronologia',
        inline: false
      },
      {
        name: '🔧 Comandi Amministratore',
        value: '`/enable` - Abilita il bot\n`/disable` - Disabilita il bot\n`/addchannel` - Aggiungi canale\n`/removechannel` - Rimuovi canale\n`/channels` - Mostra canali attivi',
        inline: false
      },
      {
        name: '📊 Statistiche e Utilità',
        value: '`/userinfo` - Info utente\n`/serverinfo` - Info server\n`/stats` - Stats server\n`/mystats` - Tue statistiche\n`/leaderboard` - Top messaggi',
        inline: false
      },
      {
        name: '🎭 Personalità e Regole',
        value: '`/setpersonality` - Dai una personalità al bot (admin)\n`/getpersonality` - Vedi la personalità attuale\n`/resetpersonality` - Resetta la personalità (admin)',
        inline: false
      },
      {
        name: '💡 Come Usarlo',
        value: '1. Admin: usa `/addchannel` per configurare\n2. Scrivi messaggi nel canale\n3. Il bot risponde automaticamente\n4. O invia DM al bot direttamente',
        inline: false
      }
    )
    .setFooter({ text: 'Solo admin possono usare comandi admin' });
  await interaction.reply({ embeds: [embed] });
}

// Funzioni per gestire la personalità del bot
function getBotPersonality(guildId) {
  const defaultPersonality = 'Sei un assistente amichevole, utile e rispettoso. Rispondi in italiano.';
  return botPersonality.get(guildId) || defaultPersonality;
}

async function setPersonality(interaction) {
  const personality = interaction.options.getString('personalita');
  botPersonality.set(interaction.guildId, personality);

  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle('🎭 Personalità Impostata')
    .setDescription(`La personalità del bot è stata aggiornata:\n\n"${personality}"`)
    .addFields(
      { name: 'Quando entra in vigore?', value: 'Immediatamente nei prossimi messaggi' }
    )
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

async function getPersonality(interaction) {
  const personality = getBotPersonality(interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle('🎭 Personalità Attuale')
    .setDescription(`**Personalità del bot:**\n\n"${personality}"`)
    .addFields(
      { name: 'Come cambiarla?', value: 'Usa `/setpersonality` per modificarla (solo admin)' }
    )
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

async function resetPersonality(interaction) {
  botPersonality.delete(interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor('#E74C3C')
    .setTitle('🔄 Personalità Resettata')
    .setDescription(`**Personalità del bot:**\n\n"${personality}"`)
    .addFields(
      { name: 'Come cambiarla?', value: 'Usa `/setpersonality` per modificarla (solo admin)' }
    )
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

async function resetPersonality(interaction) {
  botPersonality.delete(interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor('#E74C3C')
    .setTitle('🔄 Personalità Resettata')
    .setDescription('La personalità del bot è stata resettata a quella predefinita.')
    .addFields(
      { name: 'Personalità predefinita', value: 'Sei un assistente amichevole, utile e rispettoso. Rispondi in italiano.' }
    )
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

client.login(DISCORD_TOKEN);
