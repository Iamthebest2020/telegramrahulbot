const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

// ================= ENV =================
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_USERNAME = "Rahul_Joker198"; // NO @

// ================= BOT INIT =================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ================= STORAGE =================
const DATA_FILE = "./data.json";

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {}, config: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let db = loadData();

// ================= DEFAULT CONFIG =================
db.config.depositLink ||= "https://www.0diuwin.com/#/register?invitationCode=174348720984";
db.config.welcomeImage ||= null;
db.config.welcomeMessages ||= [
  "👋 Welcome to VIP Community",
  "📘 Educational purpose only",
  "💳 Access after verification",
  "👇 Complete registration below"
];

saveData(db);

// ================= ADMIN STATE =================
let adminState = null; // null | broadcast | edit_welcome | set_link | set_image

// ================= JOIN REQUEST =================
bot.on("chat_join_request", async (req) => {
  const uid = req.from.id;
  const username = req.from.username || "no_username";

  if (!db.users[uid]) {
    db.users[uid] = {
      username,
      verified: false,
      lastReminder: 0
    };
    saveData(db);
  }

  for (const msg of db.config.welcomeMessages) {
    await bot.sendMessage(uid, msg);
  }

  if (db.config.welcomeImage) {
    await bot.sendPhoto(uid, db.config.welcomeImage);
  }

  await bot.sendMessage(uid, "👇 Continue below", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Complete Registration", url: db.config.depositLink }],
        [{ text: "👤 Message Admin", url: "https://t.me/" + ADMIN_USERNAME }],
        [{ text: "✅ Deposit Done", callback_data: `done_${uid}` }]
      ]
    }
  });
});

// ================= CALLBACKS =================
bot.on("callback_query", async (q) => {
  const data = q.data;
  const isAdmin = q.from.username === ADMIN_USERNAME;

  // USER CLICKED DEPOSIT DONE
  if (data.startsWith("done_")) {
    const uid = data.split("_")[1];
    if (!db.users[uid]) return;

    await bot.sendMessage(uid, "✅ Deposit marked. Admin will verify.");

    await bot.sendMessage(
      "@" + ADMIN_USERNAME,
      `💰 Deposit Done Clicked\nUser: @${db.users[uid].username}\nUserID: ${uid}`
    );
    return;
  }

  if (!isAdmin) return;

  // ADMIN PANEL BUTTONS
  if (["broadcast", "edit_welcome", "set_link", "set_image"].includes(data)) {
    adminState = data;

    const prompts = {
      broadcast: "📢 Send TEXT message for broadcast",
      edit_welcome: "✏️ Send welcome messages separated by |",
      set_link: "🔗 Send new deposit link",
      set_image: "🖼 Send new welcome image"
    };

    await bot.sendMessage(q.from.id, prompts[data]);
  }
});

// ================= ADMIN PANEL =================
bot.on("message", async (msg) => {
  if (!msg.from || msg.from.username !== ADMIN_USERNAME) return;

  // OPEN PANEL
  if (msg.text === "/panel") {
    adminState = null;
    return bot.sendMessage(msg.chat.id, "🛠 ADMIN PANEL", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📢 Broadcast Unverified", callback_data: "broadcast" }],
          [{ text: "✏️ Edit Welcome Messages", callback_data: "edit_welcome" }],
          [{ text: "🖼 Change Welcome Image", callback_data: "set_image" }],
          [{ text: "🔗 Change Deposit Link", callback_data: "set_link" }]
        ]
      }
    });
  }

  // NO STATE → IGNORE
  if (!adminState) return;

  // HANDLE STATES
  if (adminState === "broadcast") {
    if (!msg.text) {
      adminState = null;
      return bot.sendMessage(msg.chat.id, "❌ Broadcast cancelled (TEXT only).");
    }

    for (const uid in db.users) {
      if (!db.users[uid].verified) {
        bot.sendMessage(uid, msg.text, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "💳 Complete Registration", url: db.config.depositLink }],
              [{ text: "👤 Message Admin", url: "https://t.me/" + ADMIN_USERNAME }]
            ]
          }
        });
      }
    }

    adminState = null;
    return bot.sendMessage(msg.chat.id, "✅ Broadcast sent.");
  }

  if (adminState === "edit_welcome") {
    if (!msg.text) {
      adminState = null;
      return bot.sendMessage(msg.chat.id, "❌ Cancelled (TEXT only).");
    }

    db.config.welcomeMessages = msg.text.split("|");
    saveData(db);
    adminState = null;
    return bot.sendMessage(msg.chat.id, "✅ Welcome messages updated.");
  }

  if (adminState === "set_link") {
    if (!msg.text) {
      adminState = null;
      return bot.sendMessage(msg.chat.id, "❌ Cancelled (TEXT only).");
    }

    db.config.depositLink = msg.text;
    saveData(db);
    adminState = null;
    return bot.sendMessage(msg.chat.id, "✅ Deposit link updated.");
  }

  if (adminState === "set_image") {
    if (!msg.photo) {
      adminState = null;
      return bot.sendMessage(msg.chat.id, "❌ Cancelled (send IMAGE only).");
    }

    db.config.welcomeImage = msg.photo[msg.photo.length - 1].file_id;
    saveData(db);
    adminState = null;
    return bot.sendMessage(msg.chat.id, "✅ Welcome image updated.");
  }
});

// ================= SAFE REMINDERS (30–60 MIN) =================
setInterval(() => {
  const now = Date.now();
  for (const uid in db.users) {
    const u = db.users[uid];
    if (!u.verified && now - u.lastReminder > 30 * 60 * 1000) {
      bot.sendMessage(uid, "⏳ Reminder: Complete registration to proceed.");
      u.lastReminder = now;
    }
  }
  saveData(db);
}, 5 * 60 * 1000);

console.log("✅ Bot running safely");

