const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN = "@Rahul_Joker198";

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const DATA_FILE = "./data.json";

/* ================= STORAGE ================= */
function load() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
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
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}
function save(d){ fs.writeFileSync(DATA_FILE, JSON.stringify(d,null,2)); }

/* ================= SINGLE WELCOME ================= */
async function sendWelcome(uid){
  const db = load();
  for(const t of db.config.welcomeMessages){
    await bot.sendMessage(uid, t);
  }
  if(db.config.welcomeImage){
    await bot.sendPhoto(uid, db.config.welcomeImage);
  }
  await bot.sendMessage(uid, "👇 Continue", {
    reply_markup:{
      inline_keyboard:[
        [{ text:"💳 Register / Deposit", url: db.config.depositLink }],
        [{ text:"👤 Contact Rahul", url:"https://t.me/Rahul_Joker198" }],
        [{ text:"✅ Deposit Done", callback_data:`deposit_done_${uid}` }]
      ]
    }
  });
}

/* ================= JOIN REQUEST ================= */
bot.on("chat_join_request", async r => {
  const db = load();
  if(!db.users[r.from.id]){
    db.users[r.from.id] = { waitingProof:false, verified:false };
    save(db);
  }
  await sendWelcome(r.from.id);
});

/* ================= CALLBACK ================= */
let adminState = null;

bot.on("callback_query", async q => {
  const db = load();
  const from = q.from.username ? "@"+q.from.username : "";

  // USER CLICKED DEPOSIT DONE
  if(q.data.startsWith("deposit_done_")){
    const uid = q.data.split("_")[2];
    db.users[uid].waitingProof = true;
    save(db);

    await bot.sendMessage(uid,
      "📸 Send your Diuwin UID and deposit screenshot/history now."
    );
    await bot.sendMessage(ADMIN,
      `💰 Deposit Done Clicked\nUser ID: ${uid}`
    );
    return;
  }

  if(from !== ADMIN) return;

  // ADMIN ACTIONS
  if(q.data === "edit_text"){
    adminState = "text";
    return bot.sendMessage(q.from.id,
      `📌 CURRENT WELCOME:\n\n${db.config.welcomeMessages.join("\n")}\n\n✏️ Send new text using |`
    );
  }

  if(q.data === "edit_image"){
    adminState = "image";
    if(db.config.welcomeImage){
      return bot.sendPhoto(q.from.id, db.config.welcomeImage,
        { caption:"📌 Current image\nSend new image" });
    }
    return bot.sendMessage(q.from.id,"No image set. Send new image.");
  }

  if(q.data === "edit_link"){
    adminState = "link";
    return bot.sendMessage(q.from.id,
      `📌 Current link:\n${db.config.depositLink}\n\nSend new link`
    );
  }

  if(q.data === "broadcast"){
    adminState = "broadcast";
    return bot.sendMessage(q.from.id,
      "📢 Broadcast to UNVERIFIED users\n\nSend TEXT message now"
    );
  }
});

/* ================= SINGLE MESSAGE HANDLER ================= */
bot.on("message", async msg => {
  const db = load();
  const uid = msg.from.id;
  const user = msg.from.username ? "@"+msg.from.username : "";

  // ADMIN PANEL
  if(user === ADMIN && msg.text === "/panel"){
    adminState = null;
    return bot.sendMessage(uid,"🛠 ADMIN PANEL",{
      reply_markup:{ inline_keyboard:[
        [{text:"✏️ Edit Welcome Text", callback_data:"edit_text"}],
        [{text:"🖼 Change Welcome Image", callback_data:"edit_image"}],
        [{text:"🔗 Change Deposit Link", callback_data:"edit_link"}],
        [{text:"📢 Broadcast Unverified", callback_data:"broadcast"}]
      ]}
    });
  }

  // ADMIN INPUT
  if(user === ADMIN && adminState){
    if(adminState==="text" && msg.text){
      db.config.welcomeMessages = msg.text.split("|");
      save(db); adminState=null;
      return bot.sendMessage(uid,"✅ Welcome updated");
    }
    if(adminState==="link" && msg.text){
      db.config.depositLink = msg.text;
      save(db); adminState=null;
      return bot.sendMessage(uid,"✅ Link updated");
    }
    if(adminState==="image" && msg.photo){
      db.config.welcomeImage = msg.photo.at(-1).file_id;
      save(db); adminState=null;
      return bot.sendMessage(uid,"✅ Image updated");
    }
    if(adminState==="broadcast" && msg.text){
      let count = 0;
      for(const id in db.users){
        if(!db.users[id].verified){
          bot.sendMessage(id, msg.text);
          count++;
        }
      }
      adminState=null;
      return bot.sendMessage(uid, `✅ Broadcast sent to ${count} users`);
    }
    return;
  }

  // USER PROOF FORWARDING
  if(db.users[uid]?.waitingProof && user !== ADMIN){
    await bot.sendMessage(ADMIN, `📥 Proof from ${user}\nID: ${uid}`);
    if(msg.text) await bot.sendMessage(ADMIN, msg.text);
    if(msg.photo) await bot.sendPhoto(ADMIN, msg.photo.at(-1).file_id);
    return;
  }

  // ANY USER MESSAGE → WELCOME
  if(user !== ADMIN){
    if(!db.users[uid]){
      db.users[uid] = { waitingProof:false, verified:false };
      save(db);
    }
    await sendWelcome(uid);
  }
});

console.log("✅ BOT RUNNING – FINAL, WORST-CASE HARDENED");
