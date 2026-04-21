const irc = require('irc');
const { OpenAI } = require('openai');
const sqlite3 = require('sqlite3').verbose();

// --- ASETUKSET ---
const openai = new OpenAI({ apiKey: 'YOUR_OPENAI_API_KEY' });
const db = new sqlite3.Database('kng_irc_bot.db');

// Alustetaan tietokanta ja uusi sarake kuville
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS saves (name TEXT PRIMARY KEY, history TEXT, image_url TEXT)");
});

let isProcessing = false;
let aiHistory = [{ role: "system", content: "Olet avulias IRC-botti KNG-Netissä. Vastaa lyhyesti." }];
let gameHistory = [{ role: "system", content: "Olet kokenut Tekstiseikkailu-Game Master. Kuvaile tunnelmallisesti huoneet, esineet ja suunnat. Pysy roolissa." }];

const client = new irc.Client('127.0.0.1', 'kngbot', {
    channels: ['#olohuone'],
    port: 6667,
    floodProtection: false,
    floodProtectionDelay: 500 // Nopeampi tahti, koska fakelag="no" on päällä palvelimella
});

// Apufunktio automaattitallennukseen
function autoSave(name, history) {
    db.run("INSERT OR REPLACE INTO saves (name, history) VALUES (?, ?)", [name, JSON.stringify(history)]);
}

client.addListener('message#olohuone', async (from, message) => {
    if (isProcessing) return;

    // --- !ai Komento ---
    if (message.startsWith('!ai ')) {
        isProcessing = true;
        const prompt = message.substring(4).trim();
        await handleAI(from, prompt, aiHistory, "gpt-3.5-turbo", "ai_autosave");
        isProcessing = false;
    }

    // --- !g Komento ---
    else if (message.startsWith('!g ')) {
        isProcessing = true;
        const cmd = message.substring(3).trim();

        // HELP
        if (cmd === 'help') {
            client.say('#olohuone', "Komennot: !g [toiminto], !g newgame [aihe], !g save [nimi] [kuva-url], !g load [nimi], !g list, !g delete [nimi]");
            isProcessing = false;
        }
        // LIST
        else if (cmd === 'list') {
            db.all("SELECT name FROM saves", (err, rows) => {
                const names = (rows || []).map(r => r.name).join(', ');
                client.say('#olohuone', names ? `Tallennetut seikkailut: ${names}` : "Ei tallennettuja pelejä.");
                isProcessing = false;
            });
        }
        // DELETE
        else if (cmd.startsWith('delete ')) {
            const saveName = cmd.substring(7).trim();
            db.run("DELETE FROM saves WHERE name = ?", [saveName], function() {
                client.say('#olohuone', `Tallennus '${saveName}' poistettu.`);
                isProcessing = false;
            });
        }
        // NEWGAME
        else if (cmd.startsWith('newgame ')) {
            const storyPitch = cmd.substring(8).trim();
            gameHistory = [{ role: "system", content: "Olet Game Master. Aloita uusi peli." }];
            client.say('#olohuone', `Aloitetaan uusi peli: ${storyPitch}...`);
            await handleAI(from, `Aloita uusi peli aiheesta: ${storyPitch}`, gameHistory, "gpt-4o", "latest_game_session");
            isProcessing = false;
        }
        // SAVE
        else if (cmd.startsWith('save ')) {
            const parts = cmd.substring(5).trim().split(' ');
            const saveName = parts[0];
            const imageUrl = parts[1] || null;
            db.run("INSERT OR REPLACE INTO saves (name, history, image_url) VALUES (?, ?, ?)", 
                [saveName, JSON.stringify(gameHistory), imageUrl], (err) => {
                client.say('#olohuone', `Peli '${saveName}' tallennettu! ${imageUrl ? '[Kuva liitetty]' : ''}`);
                isProcessing = false;
            });
        }
        // LOAD
        else if (cmd.startsWith('load ')) {
            const saveName = cmd.substring(5).trim();
            db.get("SELECT history, image_url FROM saves WHERE name = ?", [saveName], async (err, row) => {
                if (row) {
                    gameHistory = JSON.parse(row.history);
                    client.say('#olohuone', `Ladataan '${saveName}'... ${row.image_url ? '[Kuva: ' + row.image_url + ']' : ''}`);
                    
                    try {
                        const response = await openai.chat.completions.create({
                            model: "gpt-4o",
                            messages: [...gameHistory, { role: "user", content: "Peli ladattu. Kertaa lyhyesti tilanne." }],
                            max_tokens: 1000
                        });
                        const summary = response.choices[0].message.content.trim();
                        client.say('#olohuone', `GM: ${summary}`);
                        gameHistory.push({ role: "assistant", content: summary });
                    } catch (e) {
                        client.say('#olohuone', "Peli ladattu, mutta yhteenveto epäonnistui.");
                    }
                } else {
                    client.say('#olohuone', "Tallennusta ei löydy.");
                }
                isProcessing = false;
            });
        }
        // PELI-SYÖTE
        else {
            await handleAI(from, cmd, gameHistory, "gpt-4o", "latest_game_session");
            isProcessing = false;
        }
    }
});

async function handleAI(from, prompt, history, model, saveAs) {
    if (!prompt) return;
    history.push({ role: "user", content: `${from}: ${prompt}` });
    if (history.length > 50) history.splice(1, 2);

    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: history,
            max_tokens: 1000
        });
        const reply = response.choices[0].message.content.trim();
        history.push({ role: "assistant", content: reply });
        
        autoSave(saveAs, history);
        client.say('#olohuone', `${from}: ${reply}`);
    } catch (error) {
        console.error(error);
        client.say('#olohuone', "Botti on hämmentynyt virheen takia.");
    }
}

client.addListener('error', (err) => console.error('IRC-virhe:', err));
