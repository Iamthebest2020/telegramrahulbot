const TelegramBot = require("node-telegram-bot-api");

// BOT TOKEN FROM RENDER ENV VARIABLE
const BOT_TOKEN = process.env.BOT_TOKEN;

// YOUR ADMIN USERNAME (without @)
const ADMIN_USERNAME = "Rahul_Joker198";

// ====== CONFIG (EDIT FROM ADMIN PANEL LATER) ======
let DEPOSIT_LINK = "https://www.0diuwin.com/#/register?invitationCode=174348720984";
let WELCOME_IMAGE = null;

let welcomeMessages = [
  "👋 Welcome to VIP Community",
  "📘 Educational access only",
  "💳 Access provided after verification",
  "⚠️ No guaranteed profits",
  "👇 Complete registration below"
];

const autoMessages = [
  "🔥 VIP Community Update\n\nNew members are joining today.\n\n👇 Complete registration to request access.",
  "📢 Community Update\n\nVIP access approvals are in progress.\n\n👇 Complete registration to proceed.",
  "⏰ Update\n\nAccess is provided after verification.\n\n👇 Complete registration to continue.",
  "🔔 Reminder\n\nYour access request is pending.\n\n👇 Complete registration now."
];

// ====== BOT INIT ======
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ====== IN-MEMORY STORAGE ======
let users = {};

// ====== JOIN REQUEST HANDLER ======
bot.on("chat_join_request", async (req) => {
  const uid = req.from.id;
  const username = req.from.username || "no_username";

  users[uid] = {
    username,
    verified: false,
    clickedDeposit: false,
    lastAutoMsg: Date.now()
  };

  // Send welcome messages
  for (const msg of welcomeMessages) {
    await bot.sendMessage(uid, msg);
  }

  // Send welcome image if set
  if (WELCOME_IMAGE) {
    await bot.sendPhoto(uid, WELCOME_IMAGE);
  }

  // Send buttons
  await bot.sendMessage(uid, "👇 Continue below", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Complete Registration", url: DEPOSIT_LINK }],
        [{ text: "👤 Message Admin", url: "https://t.me/" + ADMIN_USERNAME }],
        [{ text: "✅ Deposit Done", callback_data: `done_${uid}` }]
      ]
    }
  });
});

// ====== CALLBACK HANDLER ======
bot.on("callback_query", async (q) => {
  const data = q.data;

  // USER CLICKED DEPOSIT DONE
  if (data.startsWith("done_")) {
    const uid = data.split("_")[1];
    if (!users[uid]) return;

    users[uid].clickedDeposit = true;

    await bot.sendMessage(uid, "✅ Deposit marked. Admin will verify.");

    await bot.sendMessage(
      "@" + ADMIN_USERNAME,
      `💰 Deposit Done Clicked\nUser: @${users[uid].username}\nUserID: ${uid}`
    );
  }

  // ADMIN ONLY ACTIONS
  if (q.from.username !== ADMIN_USERNAME) return;

  // APPROVE USER
  if (data.startsWith("approve_")) {
    const uid = data.split("_")[1];
    if (!users[uid]) return;

    users[uid].verified = true;
    await bot.sendMessage(uid, "🎉 You are verified. Admin will approve channel access.");
    await bot.answerCallbackQuery(q.id, { text: "Approved ✅" });
  }

  // REJECT USER
  if (data.startsWith("reject_")) {
    const uid = data.split("_")[1];
    if (!users[uid]) return;

    await bot.sendMessage(uid, "❌ Verification failed. Contact admin.");
    delete users[uid];
    await bot.answerCallbackQuery(q.id, { text: "Rejected ❌" });
  }

  // ADMIN PANEL BUTTONS
  if (data === "pending") {
    const buttons = [];
    for (const uid in users) {
      if (!users[uid].verified) {
        buttons.push([
          { text: `@${users[uid].username}`, callback_data: `manage_${uid}` }
        ]);
      }
    }

    if (!buttons.length) {
      return bot.sendMessage(q.from.id, "No pending users.");
    }

    bot.sendMessage(q.from.id, "Pending Users:", {
      reply_markup: { inline_keyboard: buttons }
    });
  }

  if (data.startsWith("manage_")) {
    const uid = data.split("_")[1];
    if (!users[uid]) return;

    bot.sendMessage(q.from.id, `User: @${users[uid].username}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Approve", callback_data: `approve_${uid}` }],
          [{ text: "❌ Reject", callback_data: `reject_${uid}` }]
        ]
      }
    });
  }

  if (data === "broadcast") {
    bot.sendMessage(q.from.id, "Send broadcast message (only to unverified users):");
    bot.once("message", (m) => {
      for (const uid in users) {
        if (!users[uid].verified) {
          bot.sendMessage(uid, m.text, {
            reply_markup: {
              inline_keyboard: [
                [{ text: "💳 Complete Registration", url: DEPOSIT_LINK }],
                [{ text: "👤 Message Admin", url: "https://t.me/" + ADMIN_USERNAME }]
              ]
            }
          });
        }
      }
      bot.sendMessage(q.from.id, "✅ Broadcast sent.");
    });
  }

  if (data === "edit_welcome") {
    bot.sendMessage(q.from.id, "Send welcome messages separated by |");
    bot.once("message", (m) => {
      welcomeMessages = m.text.split("|");
      bot.sendMessage(q.from.id, "✅ Welcome messages updated.");
    });
  }

  if (data === "set_image") {
    bot.sendMessage(q.from.id, "Send new welcome image");
    bot.once("photo", (m) => {
      WELCOME_IMAGE = m.photo[m.photo.length - 1].file_id;
      bot.sendMessage(q.from.id, "✅ Welcome image updated.");
    });
  }

  if (data === "set_link") {
    bot.sendMessage(q.from.id, "Send new deposit link");
    bot.once("message", (m) => {
      DEPOSIT_LINK = m.text;
      bot.sendMessage(q.from.id, "✅ Deposit link updated.");
    });
  }
});

// ====== ADMIN PANEL COMMAND ======
bot.on("message", (msg) => {
  if (msg.from.username === ADMIN_USERNAME && msg.text === "/panel") {
    bot.sendMessage(msg.chat.id, "🛠 ADMIN PANEL", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Pending Users", callback_data: "pending" }],
          [{ text: "📢 Broadcast Unverified", callback_data: "broadcast" }],
          [{ text: "✏️ Edit Welcome Messages", callback_data: "edit_welcome" }],
          [{ text: "🖼 Change Welcome Image", callback_data: "set_image" }],
          [{ text: "🔗 Change Deposit Link", callback_data: "set_link" }]
        ]
      }
    });
  }
});

// ====== SAFE AUTO MESSAGES (30–60 MIN RANDOM) ======
function randomInterval() {
  return (Math.floor(Math.random() * (60 - 30 + 1)) + 30) * 60 * 1000;
}

function autoMessagesLoop() {
  setTimeout(() => {
    for (const uid in users) {
      if (!users[uid].verified) {
        const msg = autoMessages[Math.floor(Math.random() * autoMessages.length)];
        bot.sendMessage(uid, msg, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "💳 Complete Registration", url: DEPOSIT_LINK }],
              [{ text: "👤 Message Admin", url: "https://t.me/" + ADMIN_USERNAME }]
            ]
          }
        });
      }
    }
    autoMessagesLoop();
  }, randomInterval());
}

autoMessagesLoop();
