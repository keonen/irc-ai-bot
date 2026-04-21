# KNG IRC AI Bot

A versatile IRC bot powered by **OpenAI's GPT-4o** and **GPT-3.5-turbo**. This bot features two distinct personalities: an AI Assistant (`!ai`) and a sophisticated Text Adventure Game Master (`!g`) with **SQLite-backed save/load functionality**.

The bot is designed to work seamlessly with modern IRC setups, including support for WebIRC (IP forwarding) and flood protection bypass.

## Features

- 🤖 **Dual Personalities**: General assistant (`!ai`) and immersive Game Master (`!g`).
- 💾 **Persistent Memory**: Uses SQLite to save and load game states (history, context, and metadata).
- 🖼️ **Image Support**: Save game states with associated image URLs (e.g., for maps or character art).
- 🧠 **Context Awareness**: Remembers recent conversation history for coherent interactions.
- 🚀 **Performance**: Optimized for Node.js with built-in flood protection and concurrency locks.

## Commands

### General
- `!ai <question>` - Ask the AI assistant a general question (GPT-3.5).

### Game Master (Text Adventure)
- `!g <action>` - Interact with the current game session (GPT-4o).
- `!g newgame <topic>` - Wipe current history and start a fresh adventure from a specific prompt.
- `!g save <name> [image-url]` - Save the current state with an optional image link.
- `!g load <name>` - Load a saved game. The bot will provide a summary of the situation.
- `!g list` - List all saved game sessions in the database.
- `!g delete <name>` - Delete a save from the database.
- `!g help` - Display help message.

## Installation

### Prerequisites
- Node.js (v18 or higher)
- SQLite3
- An OpenAI API Key

### Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/keonen/irc-ai-bot.git
   cd kng-irc-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install irc openai sqlite3
   ```

3. **Configure the bot:**
   Open `bot.js` and edit the configuration section:
   ```javascript
   const openai = new OpenAI({ apiKey: 'YOUR_OPENAI_API_KEY' });
   // ...
   const client = new irc.Client('127.0.0.1', 'kngbot', {
       channels: ['#yourchannel'],
       port: 6667,
       // ...
   });
   ```

## Deployment

It is recommended to run the bot using **PM2** to ensure it stays online and restarts after crashes or server reboots.

```bash
sudo npm install -g pm2
pm2 start bot.js --name "kng-irc-bot"
pm2 save
pm2 startup
```

## IRC Server Configuration (InspIRCd)

To prevent the bot from being disconnected for "Excess Flood" during long story descriptions, add `fakelag="no"` to your server's connect block for `127.0.0.1`:

```xml
<connect allow="127.0.0.1"
         ...
         fakelag="no">
```

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
