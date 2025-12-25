const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN missing");
  process.exit(1);
}

const ADMIN_USERNAME = "Rahul_Joker198"; // NO @

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

/* ========= GLOBAL ERROR GUARDS ========= */
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

/* ========= STORAGE ========= */
const DATA_FILE = "./data.json";
function load() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch (e) {
    console.error("❌ Data load error", e);
    return { users: {} };
  }
}
function save(d) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
  } catch (e) {
    console.error("❌ Data save error", e);
  }
}

/* ========= PANEL ========= */
bot.on("message", async (msg) => {
  try {
    if (!msg.text) return;

    const username = msg.from.username;
    const chatId = msg.chat.id;

    // 🔥 PANEL ALWAYS FIRST
    if (username === ADMIN_USERNAME && msg.text === "/panel") {
      return bot.sendMessage(chatId, "🛠 ADMIN PANEL (SAFE MODE)", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Bot Alive", callback_data: "alive" }]
          ]
        }
      });
    }

    // Simple user reply (never silent)
    if (username !== ADMIN_USERNAME) {
      return bot.sendMessage(
        chatId,
        "👋 Welcome\n\n💳 Register here:\nhttps://www.0diuwin.com/#/register?invitationCode=174348720984\n\n👤 Contact: @Rahul_Joker198"
      );
    }

  } catch (err) {
    console.error("❌ Message handler error:", err);
  }
});

/* ========= CALLBACK ========= */
bot.on("callback_query", async (q) => {
  try {
    await bot.answerCallbackQuery(q.id);

    if (q.data === "alive") {
      return bot.sendMessage(q.from.id, "✅ Bot is running fine.");
    }

  } catch (err) {
    console.error("❌ Callback error:", err);
  }
});

console.log("✅ BOT STARTED IN SAFE MODE");

