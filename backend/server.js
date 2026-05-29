require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Bot ──────────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // admin Telegram ID si
const WEBAPP_URL = process.env.WEBAPP_URL;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ─── Ma'lumotlar bazasi (oddiy JSON, real loyihada MongoDB/PostgreSQL) ─────────
const db = {
  products: [
    { id:1,  name:"Oq ko'ylak",      price:89000,  oldPrice:120000, category:"Kiyim",    emoji:"👕", desc:"Yumshoq paxta material. O'lcham: S-XXL." },
    { id:2,  name:"Ko'k jins shim",  price:145000, oldPrice:null,   category:"Kiyim",    emoji:"👖", desc:"Stretch denim. Qulay va chidamli." },
    { id:3,  name:"Teri sumka",       price:220000, oldPrice:280000, category:"Aksessuar",emoji:"👜", desc:"Haqiqiy charm. Qo'lda ishlangan." },
    { id:4,  name:"Qora krossovka",  price:310000, oldPrice:null,   category:"Poyabzal", emoji:"👟", desc:"Engil va nafas oladigan material." },
    { id:5,  name:"Qishki sharf",    price:65000,  oldPrice:null,   category:"Aksessuar",emoji:"🧣", desc:"Issiq akril tolasi. 180×30 sm." },
    { id:6,  name:"Sport kepka",     price:45000,  oldPrice:60000,  category:"Aksessuar",emoji:"🧢", desc:"Adjustable. Universal o'lcham." },
  ],
  orders: []
};

let orderCounter = 1000;

// ─── Bot buyruqlari ───────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const userId = msg.chat.id;
  const name = msg.from.first_name || 'Foydalanuvchi';
  bot.sendMessage(userId, 
    `Salom, ${name}! 👋\n\nBizning do'konimizga xush kelibsiz! 🛍\n\nQuyidagi tugmani bosib do'konni oching:`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: "🛍 Do'konni ochish", web_app: { url: WEBAPP_URL } }
        ]]
      }
    }
  );
});

bot.onText(/\/catalog/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `📦 Bizda ${db.products.length} ta mahsulot mavjud.\n\nDo'konni ochish:`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: "🛍 Katalogni ko'rish", web_app: { url: WEBAPP_URL } }
        ]]
      }
    }
  );
});

bot.onText(/\/orders/, (msg) => {
  const userId = msg.chat.id;
  const userOrders = db.orders.filter(o => o.userId == userId);
  if (!userOrders.length) {
    bot.sendMessage(userId, "📭 Sizda hali buyurtmalar yo'q.");
    return;
  }
  const list = userOrders.slice(-5).reverse().map(o =>
    `#${o.id} — ${new Date(o.date).toLocaleDateString('uz-UZ')} — ${o.total.toLocaleString()} so'm (${o.status})`
  ).join('\n');
  bot.sendMessage(userId, `📋 Oxirgi buyurtmalaringiz:\n\n${list}`);
});

// ─── API: Mahsulotlar ─────────────────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  res.json(db.products);
});

app.get('/api/products/:id', (req, res) => {
  const p = db.products.find(x => x.id == req.params.id);
  if (!p) return res.status(404).json({ error: 'Topilmadi' });
  res.json(p);
});

// ─── API: Buyurtma ────────────────────────────────────────────────────────────
app.post('/api/order', async (req, res) => {
  const { cart, total, initData, user } = req.body;

  // initData tekshirish (xavfsizlik uchun muhim!)
  let verifiedUser = user;
  if (initData && initData !== 'demo') {
    const check = verifyTelegramData(initData, BOT_TOKEN);
    if (!check.valid) {
      return res.status(403).json({ ok: false, error: 'Invalid initData' });
    }
    verifiedUser = check.user;
  }

  // Buyurtma yaratish
  const order = {
    id: ++orderCounter,
    userId: verifiedUser?.id || 0,
    userName: verifiedUser?.first_name || 'Noma\'lum',
    items: cart,
    total,
    date: new Date().toISOString(),
    status: '⏳ Kutilmoqda'
  };
  db.orders.push(order);

  // Foydalanuvchiga xabar
  if (verifiedUser?.id) {
    const itemsText = cart.map(i => `• ${i.name} × ${i.qty} — ${(i.price * i.qty).toLocaleString()} so'm`).join('\n');
    try {
      await bot.sendMessage(verifiedUser.id,
        `✅ Buyurtma #${order.id} qabul qilindi!\n\n${itemsText}\n\n💰 Jami: ${total.toLocaleString()} so'm\n\n📞 Operator tez orada siz bilan bog'lanadi.`
      );
    } catch (e) {
      console.error('Foydalanuvchiga xabar yuborishda xatolik:', e.message);
    }
  }

  // Adminga xabar
  if (ADMIN_CHAT_ID) {
    const itemsText = cart.map(i => `• ${i.emoji || ''} ${i.name} × ${i.qty} — ${(i.price * i.qty).toLocaleString()} so'm`).join('\n');
    try {
      await bot.sendMessage(ADMIN_CHAT_ID,
        `🆕 Yangi buyurtma #${order.id}\n\n` +
        `👤 Mijoz: ${verifiedUser?.first_name || '?'} (ID: ${verifiedUser?.id || '?'})\n\n` +
        `📦 Mahsulotlar:\n${itemsText}\n\n` +
        `💰 Jami: ${total.toLocaleString()} so'm`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Tasdiqlash", callback_data: `confirm_${order.id}` },
              { text: "❌ Bekor qilish", callback_data: `cancel_${order.id}` }
            ]]
          }
        }
      );
    } catch (e) {
      console.error('Adminga xabar yuborishda xatolik:', e.message);
    }
  }

  res.json({ ok: true, orderId: order.id });
});

// ─── Admin callback (tasdiqlash/bekor qilish) ─────────────────────────────────
bot.on('callback_query', async (query) => {
  const [action, orderId] = query.data.split('_');
  const order = db.orders.find(o => o.id == orderId);
  if (!order) { bot.answerCallbackQuery(query.id, { text: 'Buyurtma topilmadi' }); return; }

  if (action === 'confirm') {
    order.status = '✅ Tasdiqlangan';
    bot.answerCallbackQuery(query.id, { text: '✅ Tasdiqlandi!' });
    if (order.userId) {
      bot.sendMessage(order.userId,
        `✅ Buyurtma #${order.id} tasdiqlandi!\nYaqin orada yetkazib beriladi. 🚚`
      );
    }
    bot.editMessageText(
      `✅ Tasdiqlangan — Buyurtma #${order.id}\n👤 ${order.userName}`,
      { chat_id: query.message.chat.id, message_id: query.message.message_id }
    );
  } else if (action === 'cancel') {
    order.status = '❌ Bekor qilindi';
    bot.answerCallbackQuery(query.id, { text: '❌ Bekor qilindi' });
    if (order.userId) {
      bot.sendMessage(order.userId,
        `❌ Buyurtma #${order.id} bekor qilindi.\nQo'shimcha ma'lumot uchun operator bilan bog'laning.`
      );
    }
    bot.editMessageText(
      `❌ Bekor — Buyurtma #${order.id}\n👤 ${order.userName}`,
      { chat_id: query.message.chat.id, message_id: query.message.message_id }
    );
  }
});

// ─── Telegram initData tekshirish ─────────────────────────────────────────────
function verifyTelegramData(initData, token) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    const sorted = [...params.entries()].sort(([a],[b]) => a.localeCompare(b));
    const dataStr = sorted.map(([k,v]) => `${k}=${v}`).join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataStr).digest('hex');
    const valid = hmac === hash;
    const user = valid ? JSON.parse(params.get('user') || '{}') : null;
    return { valid, user };
  } catch {
    return { valid: false, user: null };
  }
}

// ─── API: Buyurtmalar ro'yxati (admin uchun) ──────────────────────────────────
app.get('/api/orders', (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(db.orders.slice().reverse());
});

// ─── Server ishga tushirish ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server ishga tushdi: http://localhost:${PORT}`);
  console.log(`🤖 Bot polling...`);
});
