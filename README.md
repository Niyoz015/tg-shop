# 🛍 Telegram Mini App Do'kon

Telegram Mini App asosida qurilgan to'liq online do'kon.

## 📁 Fayl tuzilmasi

```
tg-shop/
├── frontend/
│   ├── index.html    ← Asosiy sahifa
│   ├── style.css     ← Telegram temiga mos dizayn
│   └── app.js        ← Savat, buyurtma, SDK logikasi
├── backend/
│   └── server.js     ← Express + Telegram Bot
├── .env.example      ← Muhit o'zgaruvchilari namunasi
├── package.json
└── README.md
```

## 🚀 Ishga tushirish

### 1. Reponi yuklab oling
```bash
git clone https://github.com/yourname/tg-shop
cd tg-shop
npm install
```

### 2. .env fayl yarating
```bash
cp .env.example .env
# .env faylini tahrir qiling va tokenlarni kiriting
```

### 3. Lokal ishga tushirish
```bash
npm run dev
# http://localhost:3000
```

## 🤖 Bot sozlash (@BotFather)

```
1. @BotFather ga yozing
2. /newbot → nom → username
3. Olingan TOKEN ni .env ga qo'ying
4. /mybots → Bot → Bot Settings → Menu Button
5. Title: Do'kon  |  URL: https://your-site.vercel.app
```

## ☁️ Deploy

### Frontend → Vercel (bepul)
```bash
cd tg-shop
npx vercel
# URL olasiz: https://tg-shop-xxx.vercel.app
```

### Backend → Railway (bepul)
```
1. railway.app ga kiring
2. New Project → Deploy from GitHub
3. Variables bo'limiga .env qiymatlarini qo'shing
4. URL olasiz: https://tg-shop-xxx.railway.app
```

### app.js da URL ni yangilang
```js
// app.js 5-qator:
const API = 'https://tg-shop-xxx.railway.app';
```

## ⚙️ Muhim o'zgaruvchilar (.env)

| O'zgaruvchi | Tavsif |
|---|---|
| `BOT_TOKEN` | @BotFather dan olingan token |
| `ADMIN_CHAT_ID` | Buyurtmalar keladigan Telegram ID |
| `WEBAPP_URL` | Frontend URL (Vercel) |
| `ADMIN_SECRET` | Admin API kaliti |

## 🛒 Imkoniyatlar

- ✅ Mahsulot katalogi (kategoriya + qidiruv)
- ✅ Savat (miqdorni o'zgartirish)
- ✅ Buyurtma berish
- ✅ Bot orqali tasdiqlash/bekor qilish
- ✅ Admin xabarlari
- ✅ Telegram dizayn themiga mos
- ✅ Haptic feedback
- ✅ Skeleton loader
- ✅ initData xavfsizlik tekshiruvi

## 📦 Mahsulot qo'shish

`backend/server.js` da `db.products` massiviga yangi mahsulot qo'shing:

```js
{
  id: 11,
  name: "Yangi mahsulot",
  price: 99000,
  oldPrice: 120000,   // null bo'lsa ko'rsatilmaydi
  category: "Kiyim",
  emoji: "👗",
  desc: "Mahsulot tavsifi..."
}
```

## 🔐 Xavfsizlik

- Barcha buyurtmalar `initData` orqali tekshiriladi
- HMAC-SHA256 imzo tekshiruvi
- Admin API `x-admin-secret` header bilan himoyalangan

## 📞 Texnik yordam

Savollar uchun: @yourhandle
