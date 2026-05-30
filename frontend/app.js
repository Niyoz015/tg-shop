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
  {
    id: 2,
    name: "Lelit Kolleksiya — Quticha",
    price: 320000,
    oldPrice: null,
    category: "Postel to'plamlari",
    emoji: "🛏",
    image: "https://i.ibb.co/FkQw3v04/photo-2026-05-30-14-32-03.jpg",
    desc: "Material: Supersatin. O'lcham: 160×200 sm. Chiroyli qadoqlangan. To'plam: choyshab, 2 ta yostiqcha qop."
  },
  {
    id: 3,
    name: "Lelit Kolleksiya — Shaftoli",
    price: 320000,
    oldPrice: null,
    category: "Postel to'plamlari",
    emoji: "🛏",
    image: "https://i.ibb.co/7NBgJBzK/photo-2026-05-30-14-32-08.jpg",
    desc: "Material: Supersatin. O'lcham: 160×200 sm. Nafis shaftoli rang. To'plam: choyshab, 2 ta yostiqcha qop."
  },
];

const DELIVERY_FREE_FROM = 1000000; // 1 mln dan bepul dostavka
const DELIVERY_PRICE = 30000;       // dostavka narxi

let allProducts = [];
let cart = [];
let activeCategory = 'Hammasi';
let selectedDelivery = 'pickup'; // pickup | delivery
let selectedPayment = 'cash';    // cash | card | click | payme
let userPhone = '';

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
          ${inCart ? '✓ Savatda' : "+ Qo'shish"}
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
    showToast('Olib tashlandi');
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

function getSubtotal() { return cart.reduce((s, c) => s + c.price * c.qty, 0); }
function getDeliveryCost() {
  if (selectedDelivery === 'pickup') return 0;
  return getSubtotal() >= DELIVERY_FREE_FROM ? 0 : DELIVERY_PRICE;
}
function getTotal() { return getSubtotal() + getDeliveryCost(); }

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

  // Dostavka tanlash
  const sub = getSubtotal();
  const delivFree = sub >= DELIVERY_FREE_FROM;
  el.innerHTML += `
    <div class="section-title">Yetkazib berish</div>
    <div class="option-group">
      <div class="option-btn ${selectedDelivery==='pickup'?'active':''}" onclick="setDelivery('pickup')">
        <span class="opt-icon">🏪</span>
        <div class="opt-body">
          <div class="opt-name">O'zi olib ketish</div>
          <div class="opt-sub">Do'kondan bepul</div>
        </div>
      </div>
      <div class="option-btn ${selectedDelivery==='delivery'?'active':''}" onclick="setDelivery('delivery')">
        <span class="opt-icon">🚚</span>
        <div class="opt-body">
          <div class="opt-name">Yetkazib berish</div>
          <div class="opt-sub">${delivFree ? '✓ Bepul (1 mln dan oshdi)' : fmt(DELIVERY_PRICE) + ' · 1 mln dan bepul'}</div>
        </div>
      </div>
    </div>

    <div class="section-title">To'lov turi</div>
    <div class="option-group">
      <div class="option-btn ${selectedPayment==='cash'?'active':''}" onclick="setPayment('cash')">
        <span class="opt-icon">💵</span>
        <div class="opt-body"><div class="opt-name">Naqd pul</div></div>
      </div>
      <div class="option-btn ${selectedPayment==='card'?'active':''}" onclick="setPayment('card')">
        <span class="opt-icon">💳</span>
        <div class="opt-body"><div class="opt-name">Plastik karta</div></div>
      </div>
      <div class="option-btn ${selectedPayment==='click'?'active':''}" onclick="setPayment('click')">
        <span class="opt-icon">📱</span>
        <div class="opt-body"><div class="opt-name">Click</div></div>
      </div>
      <div class="option-btn ${selectedPayment==='payme'?'active':''}" onclick="setPayment('payme')">
        <span class="opt-icon">💚</span>
        <div class="opt-body"><div class="opt-name">Payme</div></div>
      </div>
    </div>

    <div class="section-title">Telefon raqam</div>
    <input class="phone-input" id="phoneInput" type="tel" placeholder="+998 90 000 00 00"
      value="${userPhone}" oninput="userPhone=this.value">
  `;

  const delivCost = getDeliveryCost();
  document.getElementById('cartTotal').innerHTML = `
    <div class="total-row"><span>Mahsulotlar</span><span>${fmt(sub)}</span></div>
    ${selectedDelivery==='delivery' ? `<div class="total-row"><span>Dostavka</span><span>${delivCost===0?'Bepul':fmt(delivCost)}</span></div>` : ''}
    <div class="total-row total-final"><span>Jami</span><span>${fmt(getTotal())}</span></div>
  `;
}

function setDelivery(type) {
  selectedDelivery = type;
  renderCart();
}
function setPayment(type) {
  selectedPayment = type;
  renderCart();
}

async function placeOrder() {
  if (!cart.length) return;
  const phone = document.getElementById('phoneInput')?.value || userPhone;
  if (!phone || phone.length < 9) {
    showToast('Telefon raqamini kiriting!');
    return;
  }
  const btn = document.getElementById('orderBtn');
  btn.disabled = true;
  btn.textContent = 'Yuborilmoqda...';
  const orderData = {
    cart: cart.map(c => ({ id:c.id, name:c.name, price:c.price, qty:c.qty })),
    subtotal: getSubtotal(),
    delivery: selectedDelivery,
    deliveryCost: getDeliveryCost(),
    total: getTotal(),
    payment: selectedPayment,
    phone,
    initData: tg?.initData || 'demo',
    user: tg?.initDataUnsafe?.user || { id:0, first_name:'Test' }
  };
  try {
    const res = await fetch(`${API}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    await res.json();
  } catch {}
  cart = [];
  updateCartBadge();
  closeCart();
  showSuccess();
  haptic('success');
}

function showSuccess() {
  ['products-grid','categories','search-wrap','hero'].forEach(c => {
    const el = document.querySelector('.'+c) || document.getElementById(c);
    if (el) el.style.display = 'none';
  });
  const screen = document.createElement('div');
  screen.className = 'success-screen show';
  screen.innerHTML = `
    <div class="success-line"></div>
    <div class="success-title">Buyurtma qabul qilindi</div>
    <div class="success-sub">Tez orada operator<br>siz bilan bog'lanadi</div>`;
  document.querySelector('main').after(screen);
  if (tg) setTimeout(() => tg.close(), 3500);
}

function openModal(id) { document.getElementById(id).classList.add('open'); document.body.style.overflow='hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow=''; }
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
}
function showSkeletons() {
  document.getElementById('productsGrid').innerHTML = Array(3).fill(`
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
