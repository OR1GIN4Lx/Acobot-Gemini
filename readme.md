# 🤖 Discord Bot Gemini

Bot Discord intelligente che usa l'API di Google Gemini come ChatBot con comandi slash, statistiche e gestione completa.

## ✨ Caratteristiche

- 💬 **ChatBot intelligente** con Gemini API
- 🎯 **Comandi slash (/)** moderni
- 📊 **Statistiche complete** - Messaggi, utenti, leaderboard
- 🔧 **Comandi Admin** - Controllo completo del bot
- 📝 **Cronologia conversazione** - Ricorda il contesto
- 🛠️ **Facile da deployare** - Setup in 5 minuti su Glitch

## 📋 Requisiti

- Node.js 18+
- Token Discord Bot
- API Key Google Gemini
- Account Glitch (gratuito)

## 📱 Come creare i file con Acode

1. **Scarica Acode** dal Play Store
2. **Apri Acode** e crea nuovo progetto
3. **Crea questi file** nella cartella del progetto:
   - `bot.js`
   - `package.json`
   - `.env`
   - `.gitignore`
   - `README.md`

4. **Copia il contenuto** di ogni file da qui

## 🚀 Come deployare su Glitch

### Step 1: Preparare i token

**Discord Token:**
- Vai su [Discord Developer Portal](https://discord.com/developers/applications)
- Crea nuova app
- Vai a "Bot" → Copia il token
- Salva il token

**Client ID:**
- Nella sezione "General Information" → Copia "Application ID"

**Gemini API Key:**
- Vai su [Google AI Studio](https://aistudio.google.com/apikey)
- Genera nuova API key
- Copia la chiave

### Step 2: Creare repository GitHub

1. Vai su [github.com](https://github.com)
2. Clicca `+` → "New repository"
3. Nome: `discord-gemini-bot`
4. Seleziona "Public"
5. Crea il repository

### Step 3: Aggiungere file a GitHub

1. Nel repository, clicca "Add file" → "Create new file"
2. Crea ogni file:
   - Nome file: `bot.js` → Copia il contenuto
   - Nome file: `package.json` → Copia il contenuto
   - Nome file: `.env` → Copia il contenuto
   - Nome file: `.gitignore` → Copia il contenuto
   - Nome file: `README.md` → Copia il contenuto
3. Commit ogni file

### Step 4: Deployare su Glitch

1. Vai su [glitch.com](https://glitch.com)
2. Clicca "New Project" → "Import from GitHub"
3. Incolla l'URL del tuo repository GitHub
4. Glitch creerà il progetto automaticamente

### Step 5: Aggiungere variabili di ambiente su Glitch

1. Nel progetto Glitch, clicca il file `.env`
2. Modifica le variabili con i tuoi dati:
   ```
   DISCORD_TOKEN=il_tuo_token_vero
   GEMINI_API_KEY=la_tua_api_key_vera
   CLIENT_ID=il_tuo_client_id_vero
   ```
3. Salva
4. Glitch riavvierà il bot automaticamente ✅

### Step 6: Il bot è online!

- Vai su Discord
- Scrivi `/help` nel tuo server
- Se il bot risponde → **Funziona!** 🎉

## 📊 Comandi disponibili

### 💬 Generali
- `/help` - Lista comandi
- `/status` - Stato bot
- `/ping` - Latenza
- `/clearhistory` - Resetta cronologia

### 🔧 Admin
- `/enable` - Abilita bot
- `/disable` - Disabilita bot
- `/addchannel` - Aggiungi canale attivo
- `/removechannel` - Rimuovi canale
- `/channels` - Mostra canali attivi

### 📊 Statistiche
- `/userinfo` - Info utente
- `/serverinfo` - Info server
- `/stats` - Statistiche server
- `/mystats` - Tue statistiche
- `/leaderboard` - Top messaggi

## 🔒 Sicurezza

- ⚠️ NON pushare mai `.env` reale su GitHub
- Glitch legge `.env` localmente
- I token rimangono privati

## 🐛 Troubleshooting

**Bot non risponde:**
- Controlla i log su Glitch
- Verifica che i token siano corretti
- Assicurati che il bot abbia permessi nel server

**Errore "Token non valido":**
- Ricrea il token nel Developer Portal
- Copia di nuovo nel `.env`

**Comandi slash non apppaiono:**
- Attendi 5 minuti dopo il primo avvio
- Riavvia il bot su Glitch
- Prova `/help` di nuovo

## 🎭 Personalità e Regole

Puoi dare una personalità unica al bot per ogni server!

- `/setpersonality "descrizione"` - Imposta come deve comportarsi il bot
- `/getpersonality` - Vedi la personalità attuale
- `/resetpersonality` - Resetta alla personalità predefinita (solo admin)

Esempi:
- "Sei un assistente professionista, rispondi sempre in modo tecnico"
- "Sei amichevole e simpatico, usa emoji e battute"
- "Sei un tutor, spiega i concetti in modo semplice"
- 
## 📝 Note

- Bot gratuito 24/7 su Glitch
- Nessun costo mensile
- Cronologia conversazione resettata ogni restart
- Statistiche resettate ogni restart

---

**Made with ❤️ using Discord.js & Google Gemini**