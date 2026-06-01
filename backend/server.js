require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto');
const TelegramBot = require('node-telegram-bot-api');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

const BOT_TOKEN  = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;

const ADMINS    = [1250991811];
const OPERATORS = [139869420];

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const db = {
  products: [
    { id:1, name:"Postel Lelit — Qizil",       price:450000, oldPrice:null, category:"Postel to'plamlari", emoji:"🛏", image:"https://i.ibb.co/Q3Cdq2JR/photo-2026-05-30-11-36-19.jpg", desc:"Material: Supersatin. O'lcham: 180×200 sm. To'plam: choyshab, 2 ta yostiqcha qop." },
    { id:2, name:"Lelit Kolleksiya — Quticha",  price:320000, oldPrice:null, category:"Postel to'plamlari", emoji:"🛏", image:"https://i.ibb.co/FkQw3v04/photo-2026-05-30-14-32-03.jpg", desc:"Material: Supersatin. O'lcham: 160×200 sm. To'plam: choyshab, 2 ta yostiqcha qop." },
    { id:3, name:"Lelit Kolleksiya — Shaftoli", price:320000, oldPrice:null, category:"Postel to'plamlari", emoji:"🛏", image:"https://i.ibb.co/7NBgJBzK/photo-2026-05-30-14-32-08.jpg", desc:"Material: Supersatin. O'lcham: 160×200 sm. To'plam: choyshab, 2 ta yostiqcha qop." },
  ],
  orders: [],
  users: {}
};

const PAYMENT_NAMES  = { cash:'💵 Naqd pul', card:'💳 Plastik karta', click:'📱 Click', payme:'💚 Payme' };
const DELIVERY_NAMES = { pickup:"🏪 O'zi olib ketish", delivery:'🚚 Yetkazib berish' };
let orderCounter = 1000;

// ── /start ────────────────────────────────────────────────────────────────────
bot.onText(/\/start/, msg => {
  const id = msg.chat.id, name = msg.from.first_name || 'Mehmon';
  const isAdmin = ADMINS.includes(id);
  const kb = [
    [{ text:"🛍 Do'konni ochish", web_app:{ url:WEBAPP_URL } }],
    [{ text:"📋 Buyurtmalarim", callback_data:"my_orders" }],
    ...(isAdmin ? [[{ text:"📊 Admin panel", callback_data:"admin_panel" }]] : [])
  ];
  bot.sendMessage(id,
    `Assalomu alaykum, *${name}*! 👋\n\n🌸 *LELIT HOME* — Premium Bed Linen\n\nYuqori sifatli postel to'plamlari!`,
    { parse_mode:'Markdown', reply_markup:{ inline_keyboard:kb } }
  );
});

// ── Callback ──────────────────────────────────────────────────────────────────
bot.on('callback_query', async q => {
  const id = q.message.chat.id, data = q.data;

  if (data==='my_orders') { bot.answerCallbackQuery(q.id); showMyOrders(id); return; }
  if (data==='admin_panel') {
    if (!ADMINS.includes(id)) { bot.answerCallbackQuery(q.id,{text:'❌ Ruxsat yo\'q'}); return; }
    bot.answerCallbackQuery(q.id); sendAdminPanel(id); return;
  }
  if (data==='admin_stats')    { if(!ADMINS.includes(id)) return; bot.answerCallbackQuery(q.id); sendAdminStats(id); return; }
  if (data==='admin_orders')   { if(!ADMINS.includes(id)) return; bot.answerCallbackQuery(q.id); sendAdminOrders(id); return; }
  if (data==='admin_pending')  { if(!ADMINS.includes(id)) return; bot.answerCallbackQuery(q.id); sendAdminPending(id); return; }
  if (data==='admin_excel')    { if(!ADMINS.includes(id)) return; bot.answerCallbackQuery(q.id); sendExcel(id); return; }
  if (data==='admin_products') {
    if(!ADMINS.includes(id)) return; bot.answerCallbackQuery(q.id);
    const list = db.products.map(p=>`• ${p.name} — ${p.price.toLocaleString()} so'm`).join('\n');
    bot.sendMessage(id,`📦 *Mahsulotlar (${db.products.length} ta):*\n\n${list}`,{parse_mode:'Markdown'}); return;
  }

  if (data.startsWith('confirm_') || data.startsWith('cancel_')) {
    const isOk = data.startsWith('confirm_');
    const oid  = parseInt(data.split('_')[1]);
    const order = db.orders.find(o=>o.id===oid);
    if (!order) { bot.answerCallbackQuery(q.id,{text:'Topilmadi'}); return; }
    order.status = isOk ? '✅ Tasdiqlangan' : '❌ Bekor qilindi';
    bot.answerCallbackQuery(q.id,{text: isOk?'✅ Tasdiqlandi!':'❌ Bekor qilindi'});
    try {
      bot.editMessageText(
        `${order.status} — #${oid}\n👤 ${order.userName} | 📞 ${order.phone}\n💰 ${order.total.toLocaleString()} so'm`,
        { chat_id:q.message.chat.id, message_id:q.message.message_id }
      );
    } catch {}
    if (order.userId) {
      try {
        bot.sendMessage(order.userId,
          isOk
            ? `✅ *Buyurtma #${oid} tasdiqlandi!*\n\n${order.delivery==='delivery'?'🚚 Yetkazib berish amalga oshiriladi.':'🏪 Do\'kondan olib ketishingiz mumkin.'}`
            : `❌ *Buyurtma #${oid} bekor qilindi.*\nOperator bilan bog'laning.`,
          { parse_mode:'Markdown' }
        );
      } catch {}
    }
    for (const adminId of ADMINS) {
      try { bot.sendMessage(adminId,`${order.status} — #${oid} | ${order.userName} | ${order.total.toLocaleString()} so'm`); } catch {}
    }
  }
});

// ── Admin panel ───────────────────────────────────────────────────────────────
function sendAdminPanel(id) {
  const total   = db.orders.length;
  const today   = db.orders.filter(o=>o.date.startsWith(new Date().toISOString().slice(0,10))).length;
  const pending = db.orders.filter(o=>o.status==='⏳ Kutilmoqda').length;
  const revenue = db.orders.filter(o=>o.status==='✅ Tasdiqlangan').reduce((s,o)=>s+o.total,0);
  bot.sendMessage(id,
    `📊 *Admin Panel — LELIT HOME*\n\n📦 Jami: *${total}*\n📅 Bugun: *${today}*\n⏳ Kutilmoqda: *${pending}*\n💰 Tushum: *${revenue.toLocaleString()} so'm*`,
    { parse_mode:'Markdown', reply_markup:{ inline_keyboard:[
      [{ text:"📈 Batafsil statistika", callback_data:"admin_stats" }],
      [{ text:"📋 Oxirgi buyurtmalar",  callback_data:"admin_orders" }],
      [{ text:"⏳ Kutilayotganlar",     callback_data:"admin_pending" }],
      [{ text:"📦 Mahsulotlar",         callback_data:"admin_products" }],
      [{ text:"📥 Excel yuklash",       callback_data:"admin_excel" }],
      [{ text:"🛍 Do'konni ochish",     web_app:{ url:WEBAPP_URL } }],
    ]}}
  );
}

function sendAdminStats(id) {
  const orders = db.orders;
  if (!orders.length) { bot.sendMessage(id,'📊 Hali buyurtmalar yo\'q.'); return; }
  const confirmed = orders.filter(o=>o.status==='✅ Tasdiqlangan');
  const cancelled = orders.filter(o=>o.status==='❌ Bekor qilindi');
  const pending   = orders.filter(o=>o.status==='⏳ Kutilmoqda');
  const revenue   = confirmed.reduce((s,o)=>s+o.total,0);
  const avg       = confirmed.length ? Math.round(revenue/confirmed.length) : 0;

  // Oxirgi 10 kun
  const days = {};
  for (let i=9; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    days[d.toISOString().slice(0,10)] = { count:0, revenue:0 };
  }
  confirmed.forEach(o => {
    const k = o.date.slice(0,10);
    if (days[k]) { days[k].count++; days[k].revenue+=o.total; }
  });
  const dailyText = Object.entries(days).map(([d,v])=>{
    const label = new Date(d).toLocaleDateString('uz-UZ',{month:'short',day:'numeric'});
    return `${label}: *${v.count}* ta — ${v.revenue.toLocaleString()} so'm`;
  }).join('\n');

  const payStats = {};
  orders.forEach(o=>{ payStats[o.payment]=(payStats[o.payment]||0)+1; });
  const payText = Object.entries(payStats).map(([k,v])=>`${PAYMENT_NAMES[k]||k}: ${v} ta`).join('\n');

  const delivStats = {};
  orders.forEach(o=>{ delivStats[o.delivery]=(delivStats[o.delivery]||0)+1; });
  const delivText = Object.entries(delivStats).map(([k,v])=>`${DELIVERY_NAMES[k]||k}: ${v} ta`).join('\n');

  bot.sendMessage(id,
    `📈 *Batafsil statistika*\n\n`+
    `📦 Jami: *${orders.length}* ta\n✅ Tasdiqlangan: *${confirmed.length}*\n❌ Bekor: *${cancelled.length}*\n⏳ Kutilmoqda: *${pending.length}*\n\n`+
    `💰 Umumiy tushum: *${revenue.toLocaleString()} so'm*\n📊 O'rtacha: *${avg.toLocaleString()} so'm*\n\n`+
    `📅 *Oxirgi 10 kun:*\n${dailyText}\n\n`+
    `💳 *To'lov turlari:*\n${payText}\n\n`+
    `🚚 *Yetkazib berish:*\n${delivText}`,
    { parse_mode:'Markdown' }
  );
}

function sendAdminOrders(id) {
  const last = db.orders.slice(-10).reverse();
  if (!last.length) { bot.sendMessage(id,'Hali buyurtmalar yo\'q.'); return; }
  last.forEach(o => {
    const items = o.items.map(i=>`• ${i.name} ×${i.qty} — ${(i.price*i.qty).toLocaleString()} so'm`).join('\n');
    bot.sendMessage(id,
      `📦 *#${o.id}* | ${o.status}\n👤 ${o.userName}\n📞 ${o.phone}\n`+
      (o.address?`📍 ${o.address}\n`:'')+
      (o.location?`🗺 [Xaritada ko'rish](${o.location.mapUrl})\n`:'')+
      `\n${items}\n\n${DELIVERY_NAMES[o.delivery]||o.delivery}\n${PAYMENT_NAMES[o.payment]||o.payment}\n`+
      `💰 *${o.total.toLocaleString()} so'm*\n📅 ${new Date(o.date).toLocaleString('uz-UZ')}`,
      { parse_mode:'Markdown' }
    );
  });
}

function sendAdminPending(id) {
  const pending = db.orders.filter(o=>o.status==='⏳ Kutilmoqda');
  if (!pending.length) { bot.sendMessage(id,'✅ Kutilayotgan buyurtma yo\'q.'); return; }
  pending.forEach(o => {
    const items = o.items.map(i=>`• ${i.name} ×${i.qty} — ${(i.price*i.qty).toLocaleString()} so'm`).join('\n');
    bot.sendMessage(id,
      `📦 *Buyurtma #${o.id}*\n👤 ${o.userName}\n📞 ${o.phone}\n`+
      (o.address?`📍 Manzil: ${o.address}\n`:'')+
      (o.location?`🗺 [Lokatsiyani ko'rish](${o.location.mapUrl})\n`:'')+
      `\n${items}\n\n${DELIVERY_NAMES[o.delivery]||o.delivery}\n${PAYMENT_NAMES[o.payment]||o.payment}\n`+
      (o.deliveryCost>0?`🚚 Dostavka: ${o.deliveryCost.toLocaleString()} so'm\n`:'')+
      `💰 *Jami: ${o.total.toLocaleString()} so'm*`,
      { parse_mode:'Markdown',
        reply_markup:{ inline_keyboard:[[
          { text:"✅ Tasdiqlash", callback_data:`confirm_${o.id}` },
          { text:"❌ Bekor",      callback_data:`cancel_${o.id}` }
        ]]}
      }
    );
  });
}

// ── Excel eksport ─────────────────────────────────────────────────────────────
async function sendExcel(id) {
  if (!db.orders.length) { bot.sendMessage(id,'📊 Hali buyurtmalar yo\'q.'); return; }

  // CSV formatda (Excel ochadi)
  const BOM = '\uFEFF';
  const headers = ['#','Sana','Mijoz','Telefon','Mahsulotlar','Yetkazib berish','Manzil','To\'lov','Dostavka narxi','Jami','Status'];
  const rows = db.orders.map(o => [
    o.id,
    new Date(o.date).toLocaleString('uz-UZ'),
    o.userName,
    o.phone,
    o.items.map(i=>`${i.name} x${i.qty}`).join('; '),
    DELIVERY_NAMES[o.delivery]||o.delivery,
    o.address||'—',
    PAYMENT_NAMES[o.payment]||o.payment,
    o.deliveryCost||0,
    o.total,
    o.status
  ]);

  const csv = BOM + [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')
  ).join('\n');

  const buf = Buffer.from(csv, 'utf8');
  const date = new Date().toISOString().slice(0,10);
  await bot.sendDocument(id, buf, {
    caption: `📊 LELIT HOME buyurtmalar — ${date}\nJami: ${db.orders.length} ta buyurtma`
  }, {
    filename: `lelit-home-orders-${date}.csv`,
    contentType: 'text/csv; charset=utf-8'
  });
}

// ── Mijoz buyurtmalari ────────────────────────────────────────────────────────
function showMyOrders(userId) {
  const list = db.orders.filter(o=>o.userId===userId).slice(-10).reverse();
  if (!list.length) {
    bot.sendMessage(userId,'📭 Buyurtmalaringiz yo\'q.\n\nDo\'kondan xarid qiling! 🛍',
      { reply_markup:{ inline_keyboard:[[{ text:"🛍 Do'konni ochish", web_app:{url:WEBAPP_URL} }]] }}
    ); return;
  }
  const text = list.map(o=>{
    const items = o.items.map(i=>`  • ${i.name} ×${i.qty}`).join('\n');
    return `📦 *#${o.id}* | ${o.status}\n${items}\n💰 ${o.total.toLocaleString()} so'm\n📅 ${new Date(o.date).toLocaleDateString('uz-UZ')}`;
  }).join('\n\n─────────\n\n');
  bot.sendMessage(userId,`📋 *Buyurtmalaringiz:*\n\n${text}`,
    { parse_mode:'Markdown', reply_markup:{ inline_keyboard:[[{ text:"🛍 Yana xarid", web_app:{url:WEBAPP_URL} }]] }}
  );
}

// ── API: Mahsulotlar ──────────────────────────────────────────────────────────
app.get('/api/products', (req,res) => res.json(db.products));
app.get('/api/my-orders/:userId', (req,res) => {
  res.json(db.orders.filter(o=>o.userId==req.params.userId).slice(-20).reverse());
});

// ── API: Buyurtma ─────────────────────────────────────────────────────────────
app.post('/api/order', async (req,res) => {
  const { cart, subtotal, delivery, deliveryCost, total, payment, phone, address, location, receipt, initData, user } = req.body;

  let verifiedUser = user;
  if (initData && initData !== 'demo') {
    const check = verifyTg(initData, BOT_TOKEN);
    if (check.valid) verifiedUser = check.user;
  }

  const order = {
    id: ++orderCounter,
    userId:   verifiedUser?.id || 0,
    userName: verifiedUser?.first_name || 'Noma\'lum',
    phone: phone||'—', address: address||null, location: location||null,
    items: cart, subtotal, delivery, deliveryCost, total, payment,
    date: new Date().toISOString(), status: '⏳ Kutilmoqda'
  };
  db.orders.push(order);

  if (order.userId) {
    if (!db.users[order.userId]) db.users[order.userId] = { orders:[] };
    db.users[order.userId].orders.push(order.id);
  }

  const itemsText = cart.map(i=>`• ${i.name} ×${i.qty} — ${(i.price*i.qty).toLocaleString()} so'm`).join('\n');
  const orderText =
    `🆕 *Yangi buyurtma #${order.id}*\n\n`+
    `👤 Mijoz: ${order.userName}\n📞 Tel: ${order.phone}\n`+
    (address?`📍 Manzil: ${address}\n`:'')+
    (location?`🗺 [Lokatsiyani ko'rish](${location.mapUrl})\n`:'')+
    `\n📦 *Mahsulotlar:*\n${itemsText}\n\n`+
    `${DELIVERY_NAMES[delivery]||delivery}\n${PAYMENT_NAMES[payment]||payment}\n`+
    (deliveryCost>0?`🚚 Dostavka: ${deliveryCost.toLocaleString()} so'm\n`:'')+
    `💰 *Jami: ${total.toLocaleString()} so'm*`;

  // Faqat operatorlarga
  for (const opId of OPERATORS) {
    try {
      await bot.sendMessage(opId, orderText, {
        parse_mode:'Markdown',
        reply_markup:{ inline_keyboard:[[
          { text:"✅ Tasdiqlash", callback_data:`confirm_${order.id}` },
          { text:"❌ Bekor",      callback_data:`cancel_${order.id}` }
        ]]}
      });

      // Lokatsiya
      if (location?.lat) {
        await bot.sendLocation(opId, location.lat, location.lon);
      }

      // To'lov cheki
      if (receipt && receipt.startsWith('data:image')) {
        const base64 = receipt.split(',')[1];
        const buf    = Buffer.from(base64, 'base64');
        await bot.sendPhoto(opId, buf, { caption:`💳 To'lov cheki — Buyurtma #${order.id}` });
      }
    } catch(e) { console.error('Operator:', e.message); }
  }

  // Adminga qisqacha
  for (const adminId of ADMINS) {
    try {
      await bot.sendMessage(adminId,
        `📬 Yangi buyurtma #${order.id}\n👤 ${order.userName} | 💰 ${total.toLocaleString()} so'm\nOperatorga yuborildi.`
      );
    } catch(e) { console.error('Admin:', e.message); }
  }

  // Mijozga
  if (verifiedUser?.id) {
    try {
      await bot.sendMessage(verifiedUser.id,
        `✅ *Buyurtma #${order.id} qabul qilindi!*\n\n${itemsText}\n\n`+
        `${DELIVERY_NAMES[delivery]||delivery}\n${PAYMENT_NAMES[payment]||payment}\n`+
        `💰 Jami: *${total.toLocaleString()} so'm*\n\n📞 Operator tez orada bog'lanadi!`,
        { parse_mode:'Markdown',
          reply_markup:{ inline_keyboard:[
            [{ text:"📋 Buyurtmalarim", callback_data:"my_orders" }],
            [{ text:"🛍 Yana xarid",    web_app:{url:WEBAPP_URL} }]
          ]}
        }
      );
    } catch(e) { console.error('Mijoz:', e.message); }
  }

  res.json({ ok:true, orderId:order.id });
});

// ── initData tekshirish ───────────────────────────────────────────────────────
function verifyTg(initData, token) {
  try {
    const p = new URLSearchParams(initData);
    const hash = p.get('hash'); p.delete('hash');
    const str  = [...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
    const sec  = crypto.createHmac('sha256','WebAppData').update(token).digest();
    const hmac = crypto.createHmac('sha256',sec).update(str).digest('hex');
    return { valid: hmac===hash, user: hmac===hash ? JSON.parse(p.get('user')||'{}') : null };
  } catch { return { valid:false, user:null }; }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ LELIT HOME server: http://localhost:${PORT}`);
  console.log(`🤖 Bot polling...`);
});
