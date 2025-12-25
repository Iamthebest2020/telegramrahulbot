// ===== RENDER KEEP-ALIVE HTTP SERVER =====
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Rahul Trader VIP Bot is running");
});

app.listen(PORT, () => {
  console.log("HTTP server listening on port", PORT);
});
// ========================================



const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

/* ================= BASIC ================= */
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN missing");
  process.exit(1);
}

const ADMIN_USERNAME = "Rahul_Joker198"; // NO @

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

/* ================= GLOBAL GUARDS ================= */
process.on("uncaughtException", err => {
  console.error("❌ Uncaught Exception:", err);
});
process.on("unhandledRejection", err => {
  console.error("❌ Unhandled Rejection:", err);
});

/* ================= STORAGE ================= */
const DATA_FILE = "./data.json";

function load() {
  try {
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
  } catch (e) {
    console.error("❌ Data load error", e);
    return { users: {}, config: {} };
  }
}

function save(d) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
  } catch (e) {
    console.error("❌ Data save error", e);
  }
}

/* ================= SINGLE WELCOME ================= */
async function sendWelcome(uid) {
  const db = load();

  for (const line of db.config.welcomeMessages) {
    await bot.sendMessage(uid, line);
  }

  if (db.config.welcomeImage) {
    await bot.sendPhoto(uid, db.config.welcomeImage);
  }

  await bot.sendMessage(uid, "👇 Continue below", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Register / Deposit", url: db.config.depositLink }],
        [{ text: "👤 Contact Rahul", url: "https://t.me/" + ADMIN_USERNAME }],
        [{ text: "✅ Deposit Done", callback_data: `deposit_done_${uid}` }]
      ]
    }
  });
}

/* ================= JOIN REQUEST ================= */
bot.on("chat_join_request", async r => {
  try {
    const db = load();
    if (!db.users[r.from.id]) {
      db.users[r.from.id] = { waitingProof: false, verified: false };
      save(db);
    }
    await sendWelcome(r.from.id);
  } catch (e) {
    console.error("❌ Join request error", e);
  }
});

/* ================= CALLBACK ================= */
let adminState = null;

bot.on("callback_query", async q => {
  try {
    await bot.answerCallbackQuery(q.id);

    const db = load();
    const fromUsername = q.from.username;

    // USER: Deposit Done
    if (q.data.startsWith("deposit_done_")) {
      const uid = q.data.split("_")[2];
      if (db.users[uid]) {
        db.users[uid].waitingProof = true;
        save(db);
      }

      await bot.sendMessage(uid,
        "📸 Send your Diuwin UID and deposit screenshot/history now."
      );

      await bot.sendMessage(
        "@" + ADMIN_USERNAME,
        `💰 Deposit Done Clicked\nUser ID: ${uid}`
      );
      return;
    }

    // ADMIN ONLY
    if (fromUsername !== ADMIN_USERNAME) return;

    if (q.data === "edit_text") {
      adminState = "text";
      return bot.sendMessage(q.from.id,
        `📌 CURRENT WELCOME:\n\n${db.config.welcomeMessages.join("\n")}\n\n✏️ Send new text using |`
      );
    }

    if (q.data === "edit_image") {
      adminState = "image";
      if (db.config.welcomeImage) {
        return bot.sendPhoto(q.from.id, db.config.welcomeImage, {
          caption: "📌 Current image\nSend new image"
        });
      }
      return bot.sendMessage(q.from.id, "No image set. Send new image.");
    }

    if (q.data === "edit_link") {
      adminState = "link";
      return bot.sendMessage(q.from.id,
        `📌 Current link:\n${db.config.depositLink}\n\nSend new link`
      );
    }

    if (q.data === "broadcast") {
      adminState = "broadcast";
      return bot.sendMessage(q.from.id,
        "📢 Broadcast to UNVERIFIED users\nSend TEXT now"
      );
    }

  } catch (e) {
    console.error("❌ Callback error", e);
  }
});

/* ================= SINGLE MESSAGE HANDLER ================= */
bot.on("message", async msg => {
  try {
    const db = load();
    const uid = msg.from.id;
    const username = msg.from.username;

    // 🔥 /panel ALWAYS FIRST
    if (username === ADMIN_USERNAME && msg.text === "/panel") {
      adminState = null;
      return bot.sendMessage(uid, "🛠 ADMIN PANEL", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✏️ Edit Welcome Text", callback_data: "edit_text" }],
            [{ text: "🖼 Change Welcome Image", callback_data: "edit_image" }],
            [{ text: "🔗 Change Deposit Link", callback_data: "edit_link" }],
            [{ text: "📢 Broadcast Unverified", callback_data: "broadcast" }]
          ]
        }
      });
    }

    // ADMIN INPUT
    if (username === ADMIN_USERNAME && adminState) {
      if (adminState === "text" && msg.text) {
        db.config.welcomeMessages = msg.text.split("|");
        save(db);
        adminState = null;
        return bot.sendMessage(uid, "✅ Welcome updated");
      }

      if (adminState === "link" && msg.text) {
        db.config.depositLink = msg.text;
        save(db);
        adminState = null;
        return bot.sendMessage(uid, "✅ Link updated");
      }

      if (adminState === "image" && msg.photo) {
        db.config.welcomeImage = msg.photo.at(-1).file_id;
        save(db);
        adminState = null;
        return bot.sendMessage(uid, "✅ Image updated");
      }

      if (adminState === "broadcast" && msg.text) {
        let count = 0;
        for (const id in db.users) {
          if (!db.users[id].verified) {
            bot.sendMessage(id, msg.text);
            count++;
          }
        }
        adminState = null;
        return bot.sendMessage(uid, `✅ Broadcast sent to ${count} users`);
      }
      return;
    }

    // USER PROOF FORWARD
    if (db.users[uid]?.waitingProof && username !== ADMIN_USERNAME) {
      await bot.sendMessage(
        "@" + ADMIN_USERNAME,
        `📥 Proof from @${username || uid}\nID: ${uid}`
      );
      if (msg.text) await bot.sendMessage("@" + ADMIN_USERNAME, msg.text);
      if (msg.photo) await bot.sendPhoto("@" + ADMIN_USERNAME, msg.photo.at(-1).file_id);
      return;
    }

    // ANY USER MESSAGE → WELCOME
    if (username !== ADMIN_USERNAME) {
      if (!db.users[uid]) {
        db.users[uid] = { waitingProof: false, verified: false };
        save(db);
      }
      await sendWelcome(uid);
    }

  } catch (e) {
    console.error("❌ Message handler error", e);
  }
});

console.log("✅ BOT RUNNING – FULL FEATURE, WORST-CASE READY");


