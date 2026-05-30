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

const BOT_TOKEN  = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;

// ── Admin va operatorlar ───────────────────────────────────────────────────────
const ADMINS    = [1250991811];          // admin ID lar
const OPERATORS = [1250991811, 139869420]; // barcha xabar oladiganlar

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ── Ma'lumotlar ───────────────────────────────────────────────────────────────
const db = {
  products: [
    { id:1, name:"Postel Lelit — Qizil",         price:450000, oldPrice:null, category:"Postel to'plamlari", emoji:"🛏", image:"https://i.ibb.co/Q3Cdq2JR/photo-2026-05-30-11-36-19.jpg", desc:"Material: Supersatin. O'lcham: 180×200 sm. To'plam: choyshab, 2 ta yostiqcha qop." },
    { id:2, name:"Lelit Kolleksiya — Quticha",    price:320000, oldPrice:null, category:"Postel to'plamlari", emoji:"🛏", image:"https://i.ibb.co/FkQw3v04/photo-2026-05-30-14-32-03.jpg", desc:"Material: Supersatin. O'lcham: 160×200 sm. To'plam: choyshab, 2 ta yostiqcha qop." },
    { id:3, name:"Lelit Kolleksiya — Shaftoli",   price:320000, oldPrice:null, category:"Postel to'plamlari", emoji:"🛏", image:"https://i.ibb.co/7NBgJBzK/photo-2026-05-30-14-32-08.jpg", desc:"Material: Supersatin. O'lcham: 160×200 sm. To'plam: choyshab, 2 ta yostiqcha qop." },
  ],
  orders: []
};

const PAYMENT_NAMES = { cash:'💵 Naqd pul', card:'💳 Plastik karta', click:'📱 Click', payme:'💚 Payme' };
const DELIVERY_NAMES = { pickup:'🏪 O\'zi olib ketish', delivery:'🚚 Yetkazib berish' };
let orderCounter = 1000;

// ── Bot buyruqlari ────────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const id   = msg.chat.id;
  const name = msg.from.first_name || 'Mehmon';
  const isAdmin = ADMINS.includes(id);

  bot.sendMessage(id,
    `Assalomu alaykum, ${name}! 👋\n\n🛍 *LELIT HOME* — Premium Bed Linen\n\nYuqori sifatli postель to'plamlari bilan uyingizni bezating!`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛍 Do'konni ochish", web_app: { url: WEBAPP_URL } }],
          ...(isAdmin ? [[{ text: "📊 Admin panel", callback_data: "admin_panel" }]] : [])
        ]
      }
    }
  );
});

// ── Admin panel ───────────────────────────────────────────────────────────────
bot.on('callback_query', async (q) => {
  const id   = q.message.chat.id;
  const data = q.data;

  if (data === 'admin_panel') {
    if (!ADMINS.includes(id)) { bot.answerCallbackQuery(q.id, { text: '❌ Ruxsat yo\'q' }); return; }
    const total   = db.orders.length;
    const today   = db.orders.filter(o => o.date.startsWith(new Date().toISOString().slice(0,10))).length;
    const revenue = db.orders.filter(o => o.status !== '❌ Bekor').reduce((s,o) => s+o.total, 0);
    bot.answerCallbackQuery(q.id);
    bot.sendMessage(id,
      `📊 *Admin Panel — LELIT HOME*\n\n` +
      `📦 Jami buyurtmalar: *${total}*\n` +
      `📅 Bugun: *${today}*\n` +
      `💰 Umumiy tushum: *${revenue.toLocaleString()} so'm*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: "📋 Oxirgi buyurtmalar", callback_data: "admin_orders" }],
            [{ text: "⏳ Kutilayotganlar",    callback_data: "admin_pending" }],
            [{ text: "🛍 Do'konni ochish",    web_app: { url: WEBAPP_URL } }]
          ]
        }
      }
    );
  }

  else if (data === 'admin_orders') {
    if (!ADMINS.includes(id)) return;
    bot.answerCallbackQuery(q.id);
    const last = db.orders.slice(-8).reverse();
    if (!last.length) { bot.sendMessage(id, 'Hali buyurtmalar yo\'q.'); return; }
    const text = last.map(o =>
      `#${o.id} | ${o.userName} | ${o.total.toLocaleString()} so'm | ${o.status}`
    ).join('\n');
    bot.sendMessage(id, `📋 *Oxirgi buyurtmalar:*\n\n${text}`, { parse_mode:'Markdown' });
  }

  else if (data === 'admin_pending') {
    if (!ADMINS.includes(id)) return;
    bot.answerCallbackQuery(q.id);
    const pending = db.orders.filter(o => o.status === '⏳ Kutilmoqda');
    if (!pending.length) { bot.sendMessage(id, '✅ Kutilayotgan buyurtma yo\'q.'); return; }
    pending.forEach(o => {
      const items = o.items.map(i => `• ${i.name} × ${i.qty} — ${(i.price*i.qty).toLocaleString()} so'm`).join('\n');
      bot.sendMessage(id,
        `📦 *Buyurtma #${o.id}*\n👤 ${o.userName}\n📞 ${o.phone}\n\n${items}\n\n` +
        `${DELIVERY_NAMES[o.delivery]||o.delivery}\n${PAYMENT_NAMES[o.payment]||o.payment}\n` +
        `💰 Jami: *${o.total.toLocaleString()} so'm*`,
        {
          parse_mode:'Markdown',
          reply_markup: { inline_keyboard: [[
            { text:"✅ Tasdiqlash", callback_data:`confirm_${o.id}` },
            { text:"❌ Bekor",      callback_data:`cancel_${o.id}` }
          ]]}
        }
      );
    });
  }

  else if (data.startsWith('confirm_')) {
    const oid = parseInt(data.split('_')[1]);
    const order = db.orders.find(o => o.id === oid);
    if (!order) return;
    order.status = '✅ Tasdiqlangan';
    bot.answerCallbackQuery(q.id, { text: '✅ Tasdiqlandi!' });
    bot.editMessageText(`✅ Tasdiqlangan — Buyurtma #${oid}`, {
      chat_id: q.message.chat.id, message_id: q.message.message_id
    });
    if (order.userId) {
      bot.sendMessage(order.userId,
        `✅ Buyurtma #${oid} tasdiqlandi!\n\n` +
        (order.delivery === 'delivery'
          ? '🚚 Yetkazib berish tez orada amalga oshiriladi.'
          : '🏪 Do\'kondan olib ketishingiz mumkin.'),
        { reply_markup: { inline_keyboard: [[{ text:"🛍 Yana xarid qilish", web_app:{ url:WEBAPP_URL } }]] }}
      );
    }
  }

  else if (data.startsWith('cancel_')) {
    const oid = parseInt(data.split('_')[1]);
    const order = db.orders.find(o => o.id === oid);
    if (!order) return;
    order.status = '❌ Bekor qilindi';
    bot.answerCallbackQuery(q.id, { text: '❌ Bekor qilindi' });
    bot.editMessageText(`❌ Bekor — Buyurtma #${oid}`, {
      chat_id: q.message.chat.id, message_id: q.message.message_id
    });
    if (order.userId) {
      bot.sendMessage(order.userId, `❌ Buyurtma #${oid} bekor qilindi.\nQo'shimcha ma'lumot uchun operator bilan bog'laning.`);
    }
  }
});

// ── API: Mahsulotlar ──────────────────────────────────────────────────────────
app.get('/api/products', (req, res) => res.json(db.products));

// ── API: Buyurtma ─────────────────────────────────────────────────────────────
app.post('/api/order', async (req, res) => {
  const { cart, subtotal, delivery, deliveryCost, total, payment, phone, initData, user } = req.body;

  let verifiedUser = user;
  if (initData && initData !== 'demo') {
    const check = verifyTg(initData, BOT_TOKEN);
    if (!check.valid) return res.status(403).json({ ok:false, error:'Invalid initData' });
    verifiedUser = check.user;
  }

  const order = {
    id: ++orderCounter,
    userId:   verifiedUser?.id || 0,
    userName: verifiedUser?.first_name || 'Noma\'lum',
    phone:    phone || '—',
    items:    cart,
    subtotal, delivery, deliveryCost, total, payment,
    date:   new Date().toISOString(),
    status: '⏳ Kutilmoqda'
  };
  db.orders.push(order);

  const itemsText = cart.map(i => `• ${i.name} × ${i.qty} — ${(i.price*i.qty).toLocaleString()} so'm`).join('\n');
  const orderText =
    `🆕 *Yangi buyurtma #${order.id}*\n\n` +
    `👤 Mijoz: ${order.userName}\n` +
    `📞 Tel: ${order.phone}\n\n` +
    `📦 *Mahsulotlar:*\n${itemsText}\n\n` +
    `${DELIVERY_NAMES[delivery]||delivery}\n` +
    `${PAYMENT_NAMES[payment]||payment}\n` +
    (deliveryCost > 0 ? `🚚 Dostavka: ${deliveryCost.toLocaleString()} so'm\n` : '') +
    `💰 *Jami: ${total.toLocaleString()} so'm*`;

  // Barcha operatorlarga yuborish
  for (const opId of OPERATORS) {
    try {
      await bot.sendMessage(opId, orderText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[
          { text:"✅ Tasdiqlash", callback_data:`confirm_${order.id}` },
          { text:"❌ Bekor",      callback_data:`cancel_${order.id}` }
        ]]}
      });
    } catch(e) { console.error('Operator xabar:', e.message); }
  }

  // Mijozga tasdiqlash
  if (verifiedUser?.id) {
    try {
      await bot.sendMessage(verifiedUser.id,
        `✅ *Buyurtma #${order.id} qabul qilindi!*\n\n${itemsText}\n\n💰 Jami: *${total.toLocaleString()} so'm*\n\n📞 Operator tez orada bog'lanadi.`,
        { parse_mode:'Markdown' }
      );
    } catch(e) { console.error('Mijoz xabar:', e.message); }
  }

  res.json({ ok:true, orderId:order.id });
});

// ── Admin API ─────────────────────────────────────────────────────────────────
app.get('/api/orders', (req, res) => {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET)
    return res.status(403).json({ error:'Forbidden' });
  res.json(db.orders.slice().reverse());
});

// ── initData tekshirish ───────────────────────────────────────────────────────
function verifyTg(initData, token) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash'); params.delete('hash');
    const dataStr = [...params.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
    const secret = crypto.createHmac('sha256','WebAppData').update(token).digest();
    const hmac   = crypto.createHmac('sha256',secret).update(dataStr).digest('hex');
    const valid  = hmac === hash;
    return { valid, user: valid ? JSON.parse(params.get('user')||'{}') : null };
  } catch { return { valid:false, user:null }; }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ LELIT HOME server: http://localhost:${PORT}`);
  console.log(`🤖 Bot polling...`);
});
