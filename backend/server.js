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

// ── Foydalanuvchilar ──────────────────────────────────────────────────────────
const ADMINS    = [1250991811];
const OPERATORS = [139869420];  // faqat operatorlar buyurtma oladi

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ── Ma'lumotlar ───────────────────────────────────────────────────────────────
const db = {
  products: [
    { id:1, name:"Postel Lelit — Qizil",       price:450000, oldPrice:null, category:"Postel to'plamlari", emoji:"🛏", image:"https://i.ibb.co/Q3Cdq2JR/photo-2026-05-30-11-36-19.jpg", desc:"Material: Supersatin. O'lcham: 180×200 sm. To'plam: choyshab, 2 ta yostiqcha qop." },
    { id:2, name:"Lelit Kolleksiya — Quticha",  price:320000, oldPrice:null, category:"Postel to'plamlari", emoji:"🛏", image:"https://i.ibb.co/FkQw3v04/photo-2026-05-30-14-32-03.jpg", desc:"Material: Supersatin. O'lcham: 160×200 sm. To'plam: choyshab, 2 ta yostiqcha qop." },
    { id:3, name:"Lelit Kolleksiya — Shaftoli", price:320000, oldPrice:null, category:"Postel to'plamlari", emoji:"🛏", image:"https://i.ibb.co/7NBgJBzK/photo-2026-05-30-14-32-08.jpg", desc:"Material: Supersatin. O'lcham: 160×200 sm. To'plam: choyshab, 2 ta yostiqcha qop." },
  ],
  orders: [],
  users: {}  // userId -> { orders: [] }
};

const PAYMENT_NAMES  = { cash:'💵 Naqd pul', card:'💳 Plastik karta', click:'📱 Click', payme:'💚 Payme' };
const DELIVERY_NAMES = { pickup:'🏪 O\'zi olib ketish', delivery:'🚚 Yetkazib berish' };
let orderCounter = 1000;

// ── /start ────────────────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const id   = msg.chat.id;
  const name = msg.from.first_name || 'Mehmon';
  const isAdmin = ADMINS.includes(id);

  const keyboard = [
    [{ text: "🛍 Do'konni ochish", web_app: { url: WEBAPP_URL } }],
    [{ text: "📋 Buyurtmalarim", callback_data: "my_orders" }],
  ];
  if (isAdmin) keyboard.push([{ text: "📊 Admin panel", callback_data: "admin_panel" }]);

  bot.sendMessage(id,
    `Assalomu alaykum, *${name}*! 👋\n\n🌸 *LELIT HOME* — Premium Bed Linen\n\nYuqori sifatli postel to'plamlari bilan uyingizni bezating!`,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
  );
});

// ── /orders — mijoz uchun ─────────────────────────────────────────────────────
bot.onText(/\/orders/, (msg) => {
  showMyOrders(msg.chat.id);
});

function showMyOrders(userId) {
  const userOrders = db.orders.filter(o => o.userId === userId).slice(-10).reverse();
  if (!userOrders.length) {
    bot.sendMessage(userId, '📭 Sizda hali buyurtmalar yo\'q.\n\nDo\'kondan xarid qiling! 🛍',
      { reply_markup: { inline_keyboard: [[{ text:"🛍 Do'konni ochish", web_app:{url:WEBAPP_URL} }]] }}
    );
    return;
  }
  const text = userOrders.map(o => {
    const items = o.items.map(i => `  • ${i.name} ×${i.qty}`).join('\n');
    return `📦 *#${o.id}* | ${o.status}\n${items}\n💰 ${o.total.toLocaleString()} so'm\n📅 ${new Date(o.date).toLocaleDateString('uz-UZ')}`;
  }).join('\n\n─────────────\n\n');
  bot.sendMessage(userId, `📋 *Buyurtmalaringiz:*\n\n${text}`,
    { parse_mode:'Markdown', reply_markup: { inline_keyboard: [[{ text:"🛍 Yana xarid qilish", web_app:{url:WEBAPP_URL} }]] }}
  );
}

// ── Callback handler ──────────────────────────────────────────────────────────
bot.on('callback_query', async (q) => {
  const id   = q.message.chat.id;
  const data = q.data;

  // ── MIJOZ: buyurtmalarim ────────────────────────────────────────────────────
  if (data === 'my_orders') {
    bot.answerCallbackQuery(q.id);
    showMyOrders(id);
    return;
  }

  // ── ADMIN panel ─────────────────────────────────────────────────────────────
  if (data === 'admin_panel') {
    if (!ADMINS.includes(id)) { bot.answerCallbackQuery(q.id, { text:'❌ Ruxsat yo\'q' }); return; }
    bot.answerCallbackQuery(q.id);
    sendAdminPanel(id);
    return;
  }

  if (data === 'admin_stats') {
    if (!ADMINS.includes(id)) return;
    bot.answerCallbackQuery(q.id);
    sendAdminStats(id);
    return;
  }

  if (data === 'admin_orders') {
    if (!ADMINS.includes(id)) return;
    bot.answerCallbackQuery(q.id);
    sendAdminOrders(id);
    return;
  }

  if (data === 'admin_pending') {
    if (!ADMINS.includes(id)) return;
    bot.answerCallbackQuery(q.id);
    sendAdminPending(id);
    return;
  }

  if (data === 'admin_products') {
    if (!ADMINS.includes(id)) return;
    bot.answerCallbackQuery(q.id);
    const list = db.products.map(p => `• ${p.name} — ${p.price.toLocaleString()} so'm`).join('\n');
    bot.sendMessage(id, `📦 *Mahsulotlar (${db.products.length} ta):*\n\n${list}`, { parse_mode:'Markdown' });
    return;
  }

  // ── Tasdiqlash / Bekor ──────────────────────────────────────────────────────
  if (data.startsWith('confirm_') || data.startsWith('cancel_')) {
    const isConfirm = data.startsWith('confirm_');
    const oid = parseInt(data.split('_')[1]);
    const order = db.orders.find(o => o.id === oid);
    if (!order) { bot.answerCallbackQuery(q.id, { text:'Buyurtma topilmadi' }); return; }

    order.status = isConfirm ? '✅ Tasdiqlangan' : '❌ Bekor qilindi';
    bot.answerCallbackQuery(q.id, { text: isConfirm ? '✅ Tasdiqlandi!' : '❌ Bekor qilindi' });

    // Xabarni yangilash
    try {
      bot.editMessageText(
        `${order.status} — Buyurtma #${oid}\n👤 ${order.userName} | 📞 ${order.phone}\n💰 ${order.total.toLocaleString()} so'm`,
        { chat_id: q.message.chat.id, message_id: q.message.message_id }
      );
    } catch {}

    // Mijozga xabar
    if (order.userId) {
      try {
        if (isConfirm) {
          bot.sendMessage(order.userId,
            `✅ *Buyurtma #${oid} tasdiqlandi!*\n\n` +
            (order.delivery === 'delivery'
              ? '🚚 Yetkazib berish tez orada amalga oshiriladi.'
              : '🏪 Do\'kondan olib ketishingiz mumkin.'),
            { parse_mode:'Markdown',
              reply_markup: { inline_keyboard: [[{ text:"🛍 Yana xarid", web_app:{url:WEBAPP_URL} }]] }}
          );
        } else {
          bot.sendMessage(order.userId,
            `❌ *Buyurtma #${oid} bekor qilindi.*\n\nQo'shimcha ma'lumot uchun operator bilan bog'laning.`,
            { parse_mode:'Markdown' }
          );
        }
      } catch {}
    }

    // Adminga ham xabar
    for (const adminId of ADMINS) {
      try {
        bot.sendMessage(adminId,
          `${order.status}\n📦 Buyurtma #${oid} | 👤 ${order.userName} | 💰 ${order.total.toLocaleString()} so'm`
        );
      } catch {}
    }
    return;
  }
});

// ── Admin panel funksiyalari ──────────────────────────────────────────────────
function sendAdminPanel(id) {
  const total    = db.orders.length;
  const today    = db.orders.filter(o => o.date.startsWith(new Date().toISOString().slice(0,10))).length;
  const pending  = db.orders.filter(o => o.status === '⏳ Kutilmoqda').length;
  const revenue  = db.orders.filter(o => o.status === '✅ Tasdiqlangan').reduce((s,o) => s+o.total, 0);

  bot.sendMessage(id,
    `📊 *Admin Panel — LELIT HOME*\n\n` +
    `📦 Jami buyurtmalar: *${total}*\n` +
    `📅 Bugun: *${today}*\n` +
    `⏳ Kutilayotgan: *${pending}*\n` +
    `💰 Tasdiqlangan tushum: *${revenue.toLocaleString()} so'm*`,
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [
        [{ text:"📈 Batafsil statistika", callback_data:"admin_stats" }],
        [{ text:"📋 Oxirgi buyurtmalar",  callback_data:"admin_orders" }],
        [{ text:"⏳ Kutilayotganlar",     callback_data:"admin_pending" }],
        [{ text:"📦 Mahsulotlar",         callback_data:"admin_products" }],
        [{ text:"🛍 Do'konni ochish",     web_app:{ url:WEBAPP_URL } }],
      ]}
    }
  );
}

function sendAdminStats(id) {
  const orders = db.orders;
  const total   = orders.length;
  if (!total) { bot.sendMessage(id, '📊 Hali buyurtmalar yo\'q.'); return; }

  const confirmed = orders.filter(o => o.status === '✅ Tasdiqlangan');
  const cancelled = orders.filter(o => o.status === '❌ Bekor qilindi');
  const pending   = orders.filter(o => o.status === '⏳ Kutilmoqda');
  const revenue   = confirmed.reduce((s,o) => s+o.total, 0);
  const avgOrder  = confirmed.length ? Math.round(revenue / confirmed.length) : 0;

  // Kunlik statistika (oxirgi 7 kun)
  const days = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    days[key] = { count:0, revenue:0 };
  }
  confirmed.forEach(o => {
    const key = o.date.slice(0,10);
    if (days[key]) { days[key].count++; days[key].revenue += o.total; }
  });
  const dailyText = Object.entries(days).map(([d, v]) => {
    const label = new Date(d).toLocaleDateString('uz-UZ', { month:'short', day:'numeric' });
    return `${label}: *${v.count}* ta — ${v.revenue.toLocaleString()} so'm`;
  }).join('\n');

  // To'lov turlari
  const payStats = {};
  orders.forEach(o => { payStats[o.payment] = (payStats[o.payment]||0) + 1; });
  const payText = Object.entries(payStats)
    .map(([k,v]) => `${PAYMENT_NAMES[k]||k}: ${v} ta`)
    .join('\n');

  // Yetkazib berish
  const delivStats = {};
  orders.forEach(o => { delivStats[o.delivery] = (delivStats[o.delivery]||0) + 1; });
  const delivText = Object.entries(delivStats)
    .map(([k,v]) => `${DELIVERY_NAMES[k]||k}: ${v} ta`)
    .join('\n');

  bot.sendMessage(id,
    `📈 *Batafsil statistika*\n\n` +
    `📦 Jami: *${total}* ta buyurtma\n` +
    `✅ Tasdiqlangan: *${confirmed.length}* ta\n` +
    `❌ Bekor: *${cancelled.length}* ta\n` +
    `⏳ Kutilmoqda: *${pending.length}* ta\n\n` +
    `💰 Umumiy tushum: *${revenue.toLocaleString()} so'm*\n` +
    `📊 O'rtacha buyurtma: *${avgOrder.toLocaleString()} so'm*\n\n` +
    `📅 *Oxirgi 7 kun:*\n${dailyText}\n\n` +
    `💳 *To'lov turlari:*\n${payText}\n\n` +
    `🚚 *Yetkazib berish:*\n${delivText}`,
    { parse_mode:'Markdown' }
  );
}

function sendAdminOrders(id) {
  const last = db.orders.slice(-10).reverse();
  if (!last.length) { bot.sendMessage(id, 'Hali buyurtmalar yo\'q.'); return; }
  const text = last.map(o =>
    `#${o.id} | ${o.userName} | ${o.total.toLocaleString()} so'm | ${o.status}`
  ).join('\n');
  bot.sendMessage(id, `📋 *Oxirgi buyurtmalar:*\n\`\`\`\n${text}\n\`\`\``, { parse_mode:'Markdown' });
}

function sendAdminPending(id) {
  const pending = db.orders.filter(o => o.status === '⏳ Kutilmoqda');
  if (!pending.length) { bot.sendMessage(id, '✅ Kutilayotgan buyurtma yo\'q.'); return; }
  pending.forEach(o => {
    const items = o.items.map(i => `• ${i.name} ×${i.qty} — ${(i.price*i.qty).toLocaleString()} so'm`).join('\n');
    bot.sendMessage(id,
      `📦 *Buyurtma #${o.id}*\n` +
      `👤 ${o.userName}\n📞 ${o.phone}\n\n${items}\n\n` +
      `${DELIVERY_NAMES[o.delivery]||o.delivery}\n` +
      `${PAYMENT_NAMES[o.payment]||o.payment}\n` +
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

// ── API: Mahsulotlar ──────────────────────────────────────────────────────────
app.get('/api/products', (req, res) => res.json(db.products));

// ── API: Buyurtma ─────────────────────────────────────────────────────────────
app.post('/api/order', async (req, res) => {
  const { cart, subtotal, delivery, deliveryCost, total, payment, phone, address, initData, user } = req.body;

  let verifiedUser = user;
  if (initData && initData !== 'demo') {
    const check = verifyTg(initData, BOT_TOKEN);
    if (check.valid) verifiedUser = check.user;
  }

  const order = {
    id: ++orderCounter,
    userId:   verifiedUser?.id || 0,
    userName: verifiedUser?.first_name || 'Noma\'lum',
    phone:    phone || '—',
    address:  address || null,
    items: cart,
    subtotal, delivery, deliveryCost, total, payment,
    date:   new Date().toISOString(),
    status: '⏳ Kutilmoqda'
  };
  db.orders.push(order);

  // Foydalanuvchi tarixiga saqlash
  if (order.userId) {
    if (!db.users[order.userId]) db.users[order.userId] = { orders:[] };
    db.users[order.userId].orders.push(order.id);
  }

  const itemsText = cart.map(i => `• ${i.name} ×${i.qty} — ${(i.price*i.qty).toLocaleString()} so'm`).join('\n');
  const orderText =
    `🆕 *Yangi buyurtma #${order.id}*\n\n` +
    `👤 Mijoz: ${order.userName}\n` +
    `📞 Tel: ${order.phone}\n\n` +
    `📦 *Mahsulotlar:*\n${itemsText}\n\n` +
    `${DELIVERY_NAMES[delivery]||delivery}\n` +
    `${PAYMENT_NAMES[payment]||payment}\n` +
    (deliveryCost > 0 ? `🚚 Dostavka: ${deliveryCost.toLocaleString()} so'm\n` : `🚚 Dostavka: Bepul\n`) +
    `💰 *Jami: ${total.toLocaleString()} so'm*`;

  // Faqat operatorlarga yuborish
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

  // Adminga faqat qisqacha bildirishnoma
  for (const adminId of ADMINS) {
    try {
      await bot.sendMessage(adminId,
        `📬 Yangi buyurtma #${order.id} keldi!\n👤 ${order.userName} | 💰 ${total.toLocaleString()} so'm\n\nOperatorga yuborildi.`
      );
    } catch(e) { console.error('Admin xabar:', e.message); }
  }

  // Mijozga tasdiqlash
  if (verifiedUser?.id) {
    try {
      await bot.sendMessage(verifiedUser.id,
        `✅ *Buyurtma #${order.id} qabul qilindi!*\n\n${itemsText}\n\n` +
        `${DELIVERY_NAMES[delivery]||delivery}\n` +
        `${PAYMENT_NAMES[payment]||payment}\n` +
        `💰 Jami: *${total.toLocaleString()} so'm*\n\n` +
        `📞 Operator tez orada bog'lanadi!`,
        { parse_mode:'Markdown',
          reply_markup: { inline_keyboard: [
            [{ text:"📋 Buyurtmalarim", callback_data:"my_orders" }],
            [{ text:"🛍 Yana xarid",    web_app:{url:WEBAPP_URL} }]
          ]}
        }
      );
    } catch(e) { console.error('Mijoz xabar:', e.message); }
  }

  res.json({ ok:true, orderId:order.id });
});

// ── API: Mijoz buyurtmalari ───────────────────────────────────────────────────
app.get('/api/my-orders/:userId', (req, res) => {
  const orders = db.orders.filter(o => o.userId == req.params.userId);
  res.json(orders.slice(-20).reverse());
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
