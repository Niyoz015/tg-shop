const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const API = 'https://your-backend.railway.app'; // Railway URL ingizni kiriting

// ─── LELIT HOME mahsulotlari ─────────────────────────────────────────────────
const DEMO_PRODUCTS = [
  // YOTOQXONA
  { id:1,  name:"Monarx krovat",         price:4850000,  oldPrice:5900000, category:"Yotoqxona",  emoji:"🛏", desc:"Italyan to'shak. O'lcham: 180×200. Charm qoplama, aylanadigan bosh qismi." },
  { id:2,  name:"Ipak ko'rpato'shak",     price:1250000,  oldPrice:null,    category:"Yotoqxona",  emoji:"🌸", desc:"100% tabiiy ipak. Gippoallergen. 4 fasl uchun." },
  { id:3,  name:"Tungi stol — Duo",       price:890000,   oldPrice:1100000, category:"Yotoqxona",  emoji:"🪔", desc:"Qora yong'oq daraxti. 2 ta tortma. Mis tutqichlar." },
  { id:4,  name:"Gardirob — Noire",       price:6200000,  oldPrice:null,    category:"Yotoqxona",  emoji:"🚪", desc:"6 eshikli. Ko'zgu, ichki yoritish. O'lcham: 240×220." },
  { id:5,  name:"Belbog' o'rindiq",       price:420000,   oldPrice:550000,  category:"Yotoqxona",  emoji:"🪑", desc:"Velyur to'shama. Oyoqlari metaldan. Ranglar: krema, ko'mir." },

  // MEHMONXONA
  { id:6,  name:"Loft divan — Velvet",    price:7900000,  oldPrice:9500000, category:"Mehmonxona", emoji:"🛋", desc:"4 o'rinlik. Velyur to'shama. Modulli. Ranglar: ko'k, yashil, qora." },
  { id:7,  name:"Mramor kofe stoli",      price:2100000,  oldPrice:null,    category:"Mehmonxona", emoji:"◻",  desc:"Haqiqiy mramor ustligi. Metaldan oyoqlar. 90×50 sm." },
  { id:8,  name:"Devor shami — Arc",      price:380000,   oldPrice:480000,  category:"Mehmonxona", emoji:"💡", desc:"Bukiluvchan qo'l. E27 patron. Qora metall. Skandinav uslub." },
  { id:9,  name:"Gilam — Casablanca",     price:3400000,  oldPrice:null,    category:"Mehmonxona", emoji:"🟫", desc:"Handmade. Jundan to'qilgan. 200×300. Geometrik naqsh." },
  { id:10, name:"Kitob javoni — Grid",    price:1850000,  oldPrice:2200000, category:"Mehmonxona", emoji:"📚", desc:"Ochiq modul tizimi. Qalin po'lat. Yong'oq taglik. 5 qavat." },
  { id:11, name:"TV stend — Float",       price:2650000,  oldPrice:null,    category:"Mehmonxona", emoji:"📺", desc:"Devorga osiladigan. 180 sm. Yopiq va ochiq bo'limlar. LED." },

  // OSHXONA
  { id:12, name:"Oshxona stoli — Slab",   price:5100000,  oldPrice:6200000, category:"Oshxona",    emoji:"🍽", desc:"Mramor top, po'lat oyoqlar. 6 kishilik. 180×90." },
  { id:13, name:"Stul — Murano",          price:680000,   oldPrice:null,    category:"Oshxona",    emoji:"🪑", desc:"Aylanuvchi o'rindiq. Charm to'shama. Mis oyoqlar. Jarayonli." },
  { id:14, name:"Buyum javoni",           price:1450000,  oldPrice:1750000, category:"Oshxona",    emoji:"🫙", desc:"Shisha eshikli. Ichki yoritish. 3 qavat. Oq yoki qora." },
  { id:15, name:"Barcha qozon to'plam",   price:920000,   oldPrice:null,    category:"Oshxona",    emoji:"🍳", desc:"8 ta qozon. Granit qoplama. Induktsiyon uchun. Kafolat 5 yil." },

  // HAMMOM
  { id:16, name:"Vannaxona javon",        price:1680000,  oldPrice:2000000, category:"Hammom",     emoji:"🪥", desc:"Temir-beton ustligi. Mis jo'mrak. O'rnatilgan yoritish." },
  { id:17, name:"Bambuk aksesuarlar",     price:340000,   oldPrice:null,    category:"Hammom",     emoji:"🌿", desc:"7 ta to'plam: o'rikcha, qutichalar, sochiq ilgich, oyna." },
  { id:18, name:"Havo filtri — Aria",     price:1950000,  oldPrice:2400000, category:"Hammom",     emoji:"💨", desc:"HEPA filtr. 3 bosqichli tozalash. Nozik dizayn. Tez-soz." },

  // DEKORATSIYA
  { id:19, name:"Bronza vaza — Trio",     price:760000,   oldPrice:null,    category:"Dekoratsiya",emoji:"🏺", desc:"Qo'lda quyilgan bronza. 3 xil balandlik: 20, 35, 50 sm." },
  { id:20, name:"Ko'zgu — Arco",          price:1320000,  oldPrice:1600000, category:"Dekoratsiya",emoji:"🪞", desc:"Oval. Oltin ramka. 80×120. Devorga va oyoqda turadigan." },
  { id:21, name:"Sun'iy o'simliklar",     price:290000,   oldPrice:null,    category:"Dekoratsiya",emoji:"🌿", desc:"Premium sifat. Fiddle leaf fig, Monstera, Cactus. Suvlamasiz." },
  { id:22, name:"Shamlar to'plami",       price:185000,   oldPrice:240000,  category:"Dekoratsiya",emoji:"🕯", desc:"12 ta. Soya paxta va atirgul isirlari. Yonish 40 soat." },
];

let allProducts = [];
let cart = [];
let activeCategory = 'Hammasi';

document.addEventListener('DOMContentLoaded', async () => {
  showSkeletons();
  try {
    const res = await fetch(`${API}/api/products`);
    if (!res.ok) throw new Error();
    allProducts = await res.json();
  } catch {
    allProducts = DEMO_PRODUCTS;
  }
  buildCategories();
  renderProducts(allProducts);
});

function buildCategories() {
  const cats = ['Hammasi', ...new Set(allProducts.map(p => p.category))];
  document.getElementById('categories').innerHTML = cats.map(c => `
    <button class="cat-btn ${c === activeCategory ? 'active' : ''}" onclick="selectCategory('${c}')">${c}</button>
  `).join('');
}

function selectCategory(cat) {
  activeCategory = cat;
  buildCategories();
  filterProducts(activeCategory === 'Hammasi' ? allProducts : allProducts.filter(p => p.category === cat));
}

function filterProducts(base) {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const list = (base || getBaseList()).filter(p =>
    p.name.toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q)
  );
  renderProducts(list);
}

function getBaseList() {
  return activeCategory === 'Hammasi' ? allProducts : allProducts.filter(p => p.category === activeCategory);
}

function renderProducts(list) {
  const grid = document.getElementById('productsGrid');
  if (!list.length) {
    grid.innerHTML = '<div class="no-results">Mahsulot topilmadi</div>';
    return;
  }
  grid.innerHTML = list.map((p, i) => {
    const inCart = cart.find(c => c.id === p.id);
    const discount = p.oldPrice ? Math.round((1 - p.price/p.oldPrice)*100) : 0;
    return `
    <div class="product-card" style="animation-delay:${i*0.04}s" onclick="openDetail(${p.id})">
      <div class="product-img">
        ${discount > 0 ? `<span class="product-badge">-${discount}%</span>` : ''}
        ${p.emoji}
      </div>
      <div class="product-info">
        <div class="product-cat">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-price-row">
          <span class="product-price">${fmt(p.price)}</span>
          ${p.oldPrice ? `<span class="product-old-price">${fmt(p.oldPrice)}</span>` : ''}
        </div>
        <button class="add-btn ${inCart ? 'in-cart' : ''}" onclick="event.stopPropagation();toggleCart(${p.id})">
          ${inCart ? `✓ Savatda` : '+ Qo\'shish'}
        </button>
      </div>
    </div>`;
  }).join('');
}

function openDetail(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  const inCart = cart.find(c => c.id === p.id);
  const discount = p.oldPrice ? Math.round((1 - p.price/p.oldPrice)*100) : 0;
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-img">${p.emoji}</div>
    <div class="detail-body">
      <div class="detail-cat">${p.category}${discount > 0 ? ` · -${discount}%` : ''}</div>
      <div class="detail-name">${p.name}</div>
      <div class="detail-price">
        ${fmt(p.price)}
        ${p.oldPrice ? `<span class="old">${fmt(p.oldPrice)}</span>` : ''}
      </div>
      <div class="detail-desc">${p.desc||''}</div>
      <button class="detail-add-btn ${inCart?'in-cart':''}" onclick="toggleCart(${p.id});closeDetail()">
        ${inCart ? '✓ Savatda' : 'Savatga qo\'shish'}
      </button>
    </div>`;
  openModal('detailModal');
}
function closeDetail() { closeModal('detailModal'); }

function toggleCart(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  const idx = cart.findIndex(c => c.id === id);
  if (idx === -1) {
    cart.push({ ...p, qty: 1 });
    showToast(`${p.name} savatga qo'shildi`);
    haptic('light');
  } else {
    cart.splice(idx, 1);
    showToast(`${p.name} olib tashlandi`);
  }
  updateCartBadge();
  renderProducts(getFilteredList());
  if (document.getElementById('cartModal').classList.contains('open')) renderCart();
}

function changeQty(id, d) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += d;
  if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
  updateCartBadge();
  renderCart();
  renderProducts(getFilteredList());
}

function getFilteredList() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  return getBaseList().filter(p => p.name.toLowerCase().includes(q));
}

function updateCartBadge() {
  const total = cart.reduce((s, c) => s + c.qty, 0);
  const badge = document.getElementById('cartCount');
  badge.textContent = total;
  badge.style.display = total > 0 ? 'flex' : 'none';
}

function openCart() { renderCart(); openModal('cartModal'); }
function closeCart() { closeModal('cartModal'); }

function renderCart() {
  const el = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const empty = document.getElementById('cartEmpty');
  if (!cart.length) {
    el.innerHTML = '';
    footer.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  footer.style.display = 'block';
  el.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-emoji">${item.emoji}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${fmt(item.price * item.qty)}</div>
      </div>
      <div class="qty-controls">
        <button class="qty-btn" onclick="changeQty(${item.id},-1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${item.id},+1)">+</button>
      </div>
    </div>`).join('');
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  document.getElementById('cartTotal').textContent = fmt(total) + ' so\'m';
}

async function placeOrder() {
  if (!cart.length) return;
  const btn = document.getElementById('orderBtn');
  btn.disabled = true;
  btn.textContent = 'Yuborilmoqda...';
  const orderData = {
    cart: cart.map(c => ({ id:c.id, name:c.name, price:c.price, qty:c.qty })),
    total: cart.reduce((s,c) => s + c.price*c.qty, 0),
    initData: tg?.initData || 'demo',
    user: tg?.initDataUnsafe?.user || { id:0, first_name:'Test' }
  };
  try {
    const res = await fetch(`${API}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const data = await res.json();
    if (!data.ok) throw new Error();
  } catch {}
  cart = [];
  updateCartBadge();
  closeCart();
  showSuccess();
  haptic('success');
}

function showSuccess() {
  document.querySelector('.products-grid').style.display = 'none';
  document.querySelector('.categories').style.display = 'none';
  document.querySelector('.search-wrap').style.display = 'none';
  document.querySelector('.hero').style.display = 'none';
  const screen = document.createElement('div');
  screen.className = 'success-screen show';
  screen.innerHTML = `
    <div class="success-line"></div>
    <div class="success-title">Buyurtma qabul qilindi</div>
    <div class="success-sub">Tez orada operator<br>siz bilan bog'lanadi</div>`;
  document.querySelector('main').after(screen);
  if (tg) setTimeout(() => tg.close(), 3500);
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2000);
}
function showSkeletons() {
  document.getElementById('productsGrid').innerHTML = Array(6).fill(`
    <div class="product-card">
      <div class="skeleton" style="aspect-ratio:1;width:100%"></div>
      <div style="padding:12px 14px">
        <div class="skeleton" style="height:10px;width:50%;margin-bottom:8px"></div>
        <div class="skeleton" style="height:16px;width:80%;margin-bottom:12px"></div>
        <div class="skeleton" style="height:13px;width:40%"></div>
      </div>
    </div>`).join('');
}
function fmt(n) { return n.toLocaleString('uz-UZ') + ' so\'m'; }
function haptic(t) {
  if (!tg?.HapticFeedback) return;
  if (t==='light') tg.HapticFeedback.impactOccurred('light');
  if (t==='success') tg.HapticFeedback.notificationOccurred('success');
}
