const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const API = 'https://your-backend.railway.app';

const DEMO_PRODUCTS = [
  {
    id: 1,
    name: "Postel Lelit — Qizil",
    price: 450000,
    oldPrice: null,
    category: "Postel to'plamlari",
    emoji: "🛏",
    image: "https://i.ibb.co/Q3Cdq2JR/photo-2026-05-30-11-36-19.jpg",
    desc: "Material: Supersatin. O'lcham: 180×200 sm. Yumshoq va nafis qizil rang. To'plam: choyshab, 2 ta yostiqcha qop."
  },
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
    const imgContent = p.image
      ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;display:block;">`
      : `<span style="font-size:52px">${p.emoji}</span>`;
    return `
    <div class="product-card" style="animation-delay:${i*0.06}s" onclick="openDetail(${p.id})">
      <div class="product-img" style="padding:0;overflow:hidden;">
        ${discount > 0 ? `<span class="product-badge">-${discount}%</span>` : ''}
        ${imgContent}
      </div>
      <div class="product-info">
        <div class="product-cat">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-price-row">
          <span class="product-price">${fmt(p.price)}</span>
          ${p.oldPrice ? `<span class="product-old-price">${fmt(p.oldPrice)}</span>` : ''}
        </div>
        <button class="add-btn ${inCart ? 'in-cart' : ''}" onclick="event.stopPropagation();toggleCart(${p.id})">
          ${inCart ? `✓ Savatda` : "+ Qo'shish"}
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
  const imgContent = p.image
    ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;display:block;">`
    : `<span style="font-size:88px">${p.emoji}</span>`;
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-img" style="padding:0;overflow:hidden;">${imgContent}</div>
    <div class="detail-body">
      <div class="detail-cat">${p.category}${discount > 0 ? ` · -${discount}%` : ''}</div>
      <div class="detail-name">${p.name}</div>
      <div class="detail-price">
        ${fmt(p.price)}
        ${p.oldPrice ? `<span class="old">${fmt(p.oldPrice)}</span>` : ''}
      </div>
      <div class="detail-desc">${p.desc||''}</div>
      <button class="detail-add-btn ${inCart?'in-cart':''}" onclick="toggleCart(${p.id});closeDetail()">
        ${inCart ? '✓ Savatda' : "Savatga qo'shish"}
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
    showToast(`Olib tashlandi`);
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
      <div class="cart-item-emoji" style="overflow:hidden;padding:0;">
        ${item.image
          ? `<img src="${item.image}" style="width:100%;height:100%;object-fit:cover;">`
          : item.emoji}
      </div>
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
  document.getElementById('cartTotal').textContent = fmt(total);
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
  document.getElementById('productsGrid').innerHTML = Array(2).fill(`
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
