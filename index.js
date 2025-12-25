const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN = "@Rahul_Joker198";

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const DATA_FILE = "./data.json";

/* ================= STORAGE ================= */
function load() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({
        users: {},
        config: {
          depositLink: "https://www.0diuwin.com/#/register?invitationCode=174348720984",
          welcomeImage: null,
          welcomeMessages: [
            "👋 Welcome to Rahul Trader VIP",
            "📘 Educational purpose only",
            "💳 Register under official link",
            "👇 Click below to continue"
          ]
        }
      }, null, 2)
    );
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function save(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

/* ================= SINGLE WELCOME FUNCTION ================= */
async function sendWelcome(userId) {
  const db = load();

  for (const line of db.config.welcomeMessages) {
    await bot.sendMessage(userId, line);
  }

  if (db.config.welcomeImage) {
    await bot.sendPhoto(userId, db.config.welcomeImage);
  }

  await bot.sendMessage(userId, "👇 Continue below", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Register / Deposit", url: db.config.depositLink }],
        [{ text: "👤 Contact Rahul", url: "https://t.me/Rahul_Joker198" }],
        [{ text: "✅ Deposit Done", callback_data: `deposit_done_${userId}` }]
      ]
    }
  });
}

/* ================= JOIN REQUEST ================= */
bot.on("chat_join_request", async (req) => {
  const db = load();
  const uid = req.from.id;

  if (!db.users[uid]) {
    db.users[uid] = { waitingProof: false };
    save(db);
  }

  await sendWelcome(uid);
});

/* ================= /START ================= */
bot.onText(/\/start/, async (msg) => {
  const db = load();
  const uid = msg.from.id;

  if (!db.users[uid]) {
    db.users[uid] = { waitingProof: false };
    save(db);
  }

  await sendWelcome(uid);
});

/* ================= ANY USER MESSAGE ================= */
bot.on("message", async (msg) => {
  const db = load();
  const uid = msg.from.id;
  const username = msg.from.username ? "@" + msg.from.username : uid;

  /* Admin Panel */
  if (username === ADMIN && msg.text === "/panel") {
    return bot.sendMessage(uid, "🛠 ADMIN PANEL", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✏️ Edit Welcome Text", callback_data: "edit_text" }],
          [{ text: "🖼 Change Welcome Image", callback_data: "edit_image" }],
          [{ text: "🔗 Change Deposit Link", callback_data: "edit_link" }]
        ]
      }
    });
  }

  /* User sent proof */
  if (db.users[uid]?.waitingProof && username !== ADMIN) {
    await bot.sendMessage(ADMIN, `📥 PROOF FROM ${username}\n🆔 ${uid}`);
    if (msg.text) await bot.sendMessage(ADMIN, msg.text);
    if (msg.photo)
      await bot.sendPhoto(ADMIN, msg.photo[msg.photo.length - 1].file_id);
    return;
  }

  /* Any random user message → resend welcome */
  if (username !== ADMIN) {
    await sendWelcome(uid);
  }
});

/* ================= CALLBACKS ================= */
let adminState = null;

bot.on("callback_query", async (q) => {
  const db = load();
  const uid = q.from.id;
  const username = q.from.username ? "@" + q.from.username : "";

  /* Deposit Done */
  if (q.data.startsWith("deposit_done_")) {
    const userId = q.data.split("_")[2];
    db.users[userId].waitingProof = true;
    save(db);

    await bot.sendMessage(userId,
      "📸 Send your Diuwin UID & deposit screenshot now."
    );

    await bot.sendMessage(ADMIN,
      `💰 Deposit Done Clicked\nUser ID: ${userId}`
    );
    return;
  }

  if (username !== ADMIN) return;

  /* Edit Welcome Text */
  if (q.data === "edit_text") {
    adminState = "text";
    return bot.sendMessage(uid,
      `📌 CURRENT WELCOME:\n\n${db.config.welcomeMessages.join("\n")}\n\n✏️ Send new text using |`
    );
  }

  /* Edit Image */
  if (q.data === "edit_image") {
    adminState = "image";
    if (db.config.welcomeImage) {
      return bot.sendPhoto(uid, db.config.welcomeImage, {
        caption: "📌 Current image\nSend new image"
      });
    }
    return bot.sendMessage(uid, "No image set. Send new image.");
  }

  /* Edit Link */
  if (q.data === "edit_link") {
    adminState = "link";
    return bot.sendMessage(uid,
      `📌 Current Link:\n${db.config.depositLink}\n\nSend new link`
    );
  }
});

/* ================= ADMIN INPUT ================= */
bot.on("message", async (msg) => {
  const db = load();
  const username = msg.from.username ? "@" + msg.from.username : "";

  if (username !== ADMIN || !adminState) return;

  if (adminState === "text" && msg.text) {
    db.config.welcomeMessages = msg.text.split("|");
    save(db);
    adminState = null;
    return bot.sendMessage(msg.chat.id, "✅ Welcome text updated");
  }

  if (adminState === "link" && msg.text) {
    db.config.depositLink = msg.text;
    save(db);
    adminState = null;
    return bot.sendMessage(msg.chat.id, "✅ Deposit link updated");
  }

  if (adminState === "image" && msg.photo) {
    db.config.welcomeImage = msg.photo[msg.photo.length - 1].file_id;
    save(db);
    adminState = null;
    return bot.sendMessage(msg.chat.id, "✅ Welcome image updated");
  }
});

console.log("✅ BOT RUNNING – FINAL STABLE VERSION");


