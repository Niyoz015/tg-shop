// ─── Telegram Web App ───────────────────────────────────────────────────────
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

// ─── Backend URL (o'zgartiring) ──────────────────────────────────────────────
const API = 'https://your-backend.railway.app'; // yoki localhost:3000

// ─── Ma'lumotlar ─────────────────────────────────────────────────────────────
let allProducts = [];
let cart = [];          // [{id, name, price, emoji, qty}]
let activeCategory = 'Hammasi';

// ─── Sahifa yuklanganda ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  showSkeletons();
  try {
    const res = await fetch(`${API}/api/products`);
    allProducts = await res.json();
  } catch (e) {
    // Fallback: demo mahsulotlar (backend yo'q bo'lsa)
    allProducts = DEMO_PRODUCTS;
  }
  buildCategories();
  renderProducts(allProducts);
});

// ─── Demo mahsulotlar (backend ulanmaguncha) ──────────────────────────────────
const DEMO_PRODUCTS = [
  { id:1,  name:"Oq ko'ylak",        price:89000,  oldPrice:120000, category:"Kiyim",    emoji:"👕", desc:"Yumshoq paxta material. O'lcham: S-XXL." },
  { id:2,  name:"Ko'k jins shim",    price:145000, oldPrice:null,   category:"Kiyim",    emoji:"👖", desc:"Stretch denim. Qulay va chidamli." },
  { id:3,  name:"Teri sumka",        price:220000, oldPrice:280000, category:"Aksessuar",emoji:"👜", desc:"Haqiqiy charm. Qo'lda ishlangan." },
  { id:4,  name:"Qora krossovka",    price:310000, oldPrice:null,   category:"Poyabzal", emoji:"👟", desc:"Engil va nafas oladigan material." },
  { id:5,  name:"Qishki sharf",      price:65000,  oldPrice:null,   category:"Aksessuar",emoji:"🧣", desc:"Issiq akril tolasi. 180×30 sm." },
  { id:6,  name:"Sport kepka",       price:45000,  oldPrice:60000,  category:"Aksessuar",emoji:"🧢", desc:"Adjustable. Universal o'lcham." },
  { id:7,  name:"Termal futbolka",   price:78000,  oldPrice:null,   category:"Kiyim",    emoji:"👔", desc:"Sporty dizayn. Tez quriydigan." },
  { id:8,  name:"Sandal",            price:95000,  oldPrice:130000, category:"Poyabzal", emoji:"🩴", desc:"Yoz uchun ideal. Yumshoq taglik." },
  { id:9,  name:"Charm kamar",       price:55000,  oldPrice:null,   category:"Aksessuar",emoji:"🪢", desc:"Haqiqiy charm. 3 ta rang varianti." },
  { id:10, name:"Paypoq to'plami",   price:28000,  oldPrice:null,   category:"Kiyim",    emoji:"🧦", desc:"5 juft. Paxta + elastan." },
];

// ─── Kategoriyalar ────────────────────────────────────────────────────────────
function buildCategories() {
  const cats = ['Hammasi', ...new Set(allProducts.map(p => p.category))];
  const el = document.getElementById('categories');
  el.innerHTML = cats.map(c => `
    <button class="cat-btn ${c === activeCategory ? 'active' : ''}"
      onclick="selectCategory('${c}')">${c}</button>
  `).join('');
}

function selectCategory(cat) {
  activeCategory = cat;
  buildCategories();
  const filtered = cat === 'Hammasi'
    ? allProducts
    : allProducts.filter(p => p.category === cat);
  filterProducts(filtered);
}

// ─── Qidiruv ──────────────────────────────────────────────────────────────────
function filterProducts(base) {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const list = (base || allProducts).filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.category || '').toLowerCase().includes(q)
  );
  renderProducts(list);
}

// ─── Mahsulotlarni chizish ────────────────────────────────────────────────────
function renderProducts(list) {
  const grid = document.getElementById('productsGrid');
  if (!list.length) {
    grid.innerHTML = '<div class="no-results">😕 Mahsulot topilmadi</div>';
    return;
  }
  grid.innerHTML = list.map((p, i) => {
    const inCart = cart.find(c => c.id === p.id);
    return `
    <div class="product-card" style="animation-delay:${i*0.05}s"
         onclick="openDetail(${p.id})">
      <div class="product-img emoji">${p.emoji}</div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-price">
          ${formatPrice(p.price)} so'm
          ${p.oldPrice ? `<span class="old-price">${formatPrice(p.oldPrice)}</span>` : ''}
        </div>
        <button class="add-btn ${inCart ? 'in-cart' : ''}"
          onclick="event.stopPropagation(); toggleCart(${p.id})">
          ${inCart ? `✓ Savatda (${inCart.qty})` : '+ Savatga'}
        </button>
      </div>
    </div>`;
  }).join('');
}

// ─── Mahsulot detail ──────────────────────────────────────────────────────────
function openDetail(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  const inCart = cart.find(c => c.id === p.id);
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-img">${p.emoji}</div>
    <div class="detail-body">
      <span class="detail-badge">${p.category}</span>
      <div class="detail-name">${p.name}</div>
      <div class="detail-price">${formatPrice(p.price)} so'm
        ${p.oldPrice ? `<span class="old-price" style="font-size:15px;color:var(--hint);text-decoration:line-through;margin-left:6px">${formatPrice(p.oldPrice)}</span>` : ''}
      </div>
      <div class="detail-desc">${p.desc || ''}</div>
      <button class="detail-add-btn ${inCart ? 'in-cart' : ''}"
        onclick="toggleCart(${p.id}); closeDetail(); showToast('${p.name} savatga qo\'shildi')">
        ${inCart ? '✓ Savatda' : '🛒 Savatga qo\'shish'}
      </button>
    </div>`;
  openModal('detailModal');
}
function closeDetail() { closeModal('detailModal'); }

// ─── Savat logikasi ───────────────────────────────────────────────────────────
function toggleCart(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  const idx = cart.findIndex(c => c.id === id);
  if (idx === -1) {
    cart.push({ ...p, qty: 1 });
    showToast(`${p.name} savatga qo'shildi ✓`);
    haptic('light');
  } else {
    cart.splice(idx, 1);
  }
  updateCartBadge();
  renderProducts(getFilteredList());
  if (document.getElementById('cartModal').classList.contains('open')) renderCart();
}

function changeQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
  updateCartBadge();
  renderCart();
  renderProducts(getFilteredList());
}

function getFilteredList() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  let list = activeCategory === 'Hammasi'
    ? allProducts
    : allProducts.filter(p => p.category === activeCategory);
  return list.filter(p => p.name.toLowerCase().includes(q));
}

function updateCartBadge() {
  const total = cart.reduce((s, c) => s + c.qty, 0);
  const badge = document.getElementById('cartCount');
  badge.textContent = total;
  badge.style.display = total > 0 ? 'flex' : 'none';
}

// ─── Savatni ko'rsatish ───────────────────────────────────────────────────────
function openCart() {
  renderCart();
  openModal('cartModal');
}
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
        <div class="cart-item-price">${formatPrice(item.price * item.qty)} so'm</div>
      </div>
      <div class="qty-controls">
        <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${item.id}, +1)">+</button>
      </div>
    </div>`).join('');

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  document.getElementById('cartTotal').textContent = formatPrice(total);
}

// ─── Buyurtma berish ──────────────────────────────────────────────────────────
async function placeOrder() {
  if (!cart.length) return;
  const btn = document.getElementById('orderBtn');
  btn.disabled = true;
  btn.textContent = 'Yuborilmoqda...';

  const orderData = {
    cart: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
    total: cart.reduce((s, c) => s + c.price * c.qty, 0),
    initData: tg?.initData || 'demo',
    user: tg?.initDataUnsafe?.user || { id: 0, first_name: 'Test' }
  };

  try {
    const res = await fetch(`${API}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const data = await res.json();
    if (data.ok) {
      cart = [];
      updateCartBadge();
      closeCart();
      showSuccess();
      haptic('success');
    } else {
      throw new Error(data.error || 'Xatolik');
    }
  } catch (e) {
    // Demo rejimida muvaffaqiyat ko'rsatish
    cart = [];
    updateCartBadge();
    closeCart();
    showSuccess();
  }
}

function showSuccess() {
  document.querySelector('.products-grid').style.display = 'none';
  document.querySelector('.categories').style.display = 'none';
  document.querySelector('.search-wrap').style.display = 'none';
  const screen = document.createElement('div');
  screen.className = 'success-screen show';
  screen.innerHTML = `
    <div class="success-icon">🎉</div>
    <div class="success-title">Buyurtma qabul qilindi!</div>
    <div class="success-sub">Tez orada bot orqali\ntasdiqlash xabarini olasiz.</div>`;
  document.querySelector('main').after(screen);
  if (tg) setTimeout(() => tg.close(), 3000);
}

// ─── Yordamchi funksiyalar ────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function showSkeletons() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = Array(6).fill(`
    <div class="product-card">
      <div class="skeleton" style="aspect-ratio:1;width:100%"></div>
      <div class="product-info">
        <div class="skeleton" style="height:14px;margin-bottom:8px;width:80%"></div>
        <div class="skeleton" style="height:18px;width:50%"></div>
      </div>
    </div>`).join('');
}

function formatPrice(n) {
  return n.toLocaleString('uz-UZ');
}

function haptic(type) {
  if (!tg?.HapticFeedback) return;
  if (type === 'light') tg.HapticFeedback.impactOccurred('light');
  if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
}
