const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const API = 'https://tg-shop-production-b693.up.railway.app';

const DEMO_PRODUCTS = [
  { id:1, name:"Postel Lelit — Qizil",       price:450000, oldPrice:null, category:"Postel to'plamlari", emoji:"🛏", image:"https://i.ibb.co/Q3Cdq2JR/photo-2026-05-30-11-36-19.jpg", desc:"Material: Supersatin. O'lcham: 180×200 sm. To'plam: choyshab, 2 ta yostiqcha qop." },
  { id:2, name:"Lelit Kolleksiya — Quticha",  price:320000, oldPrice:null, category:"Postel to'plamlari", emoji:"🛏", image:"https://i.ibb.co/FkQw3v04/photo-2026-05-30-14-32-03.jpg", desc:"Material: Supersatin. O'lcham: 160×200 sm. To'plam: choyshab, 2 ta yostiqcha qop." },
  { id:3, name:"Lelit Kolleksiya — Shaftoli", price:320000, oldPrice:null, category:"Postel to'plamlari", emoji:"🛏", image:"https://i.ibb.co/7NBgJBzK/photo-2026-05-30-14-32-08.jpg", desc:"Material: Supersatin. O'lcham: 160×200 sm. To'plam: choyshab, 2 ta yostiqcha qop." },
];

const DELIVERY_FREE_FROM = 1000000;
const DELIVERY_PRICE     = 30000;

let allProducts      = [];
let cart             = [];
let activeCategory   = 'Hammasi';
let selectedDelivery = 'pickup';
let selectedPayment  = 'cash';
let userPhone        = '';
let userAddress      = '';
let userLocation     = null;  // { lat, lon, mapUrl }
let receiptFile      = null;  // to'lov cheki

// ── Yuklash ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  showSkeletons();
  try {
    const res = await fetch(`${API}/api/products`);
    if (!res.ok) throw new Error();
    allProducts = await res.json();
  } catch { allProducts = DEMO_PRODUCTS; }
  buildCategories();
  renderProducts(allProducts);
});

// ── Kategoriyalar ─────────────────────────────────────────────────────────────
function buildCategories() {
  const cats = ['Hammasi', ...new Set(allProducts.map(p => p.category))];
  document.getElementById('categories').innerHTML = cats.map(c =>
    `<button class="cat-btn ${c===activeCategory?'active':''}" onclick="selectCategory('${c}')">${c}</button>`
  ).join('');
}
function selectCategory(cat) {
  activeCategory = cat;
  buildCategories();
  filterProducts(cat==='Hammasi' ? allProducts : allProducts.filter(p=>p.category===cat));
}
function filterProducts(base) {
  const q = document.getElementById('searchInput').value.toLowerCase();
  renderProducts((base||getBaseList()).filter(p =>
    p.name.toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q)
  ));
}
function getBaseList() {
  return activeCategory==='Hammasi' ? allProducts : allProducts.filter(p=>p.category===activeCategory);
}
function getFilteredList() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  return getBaseList().filter(p=>p.name.toLowerCase().includes(q));
}

// ── Mahsulotlar ───────────────────────────────────────────────────────────────
function renderProducts(list) {
  const grid = document.getElementById('productsGrid');
  if (!list.length) { grid.innerHTML='<div class="no-results">Mahsulot topilmadi</div>'; return; }
  grid.innerHTML = list.map((p,i) => {
    const inCart   = cart.find(c=>c.id===p.id);
    const discount = p.oldPrice ? Math.round((1-p.price/p.oldPrice)*100) : 0;
    const img      = p.image
      ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;display:block;">`
      : `<span style="font-size:52px">${p.emoji}</span>`;
    return `
    <div class="product-card" style="animation-delay:${i*0.06}s" onclick="openDetail(${p.id})">
      <div class="product-img" style="padding:0;overflow:hidden;">
        ${discount>0?`<span class="product-badge">-${discount}%</span>`:''}${img}
      </div>
      <div class="product-info">
        <div class="product-cat">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-price-row">
          <span class="product-price">${fmt(p.price)}</span>
          ${p.oldPrice?`<span class="product-old-price">${fmt(p.oldPrice)}</span>`:''}
        </div>
        <button class="add-btn ${inCart?'in-cart':''}" onclick="event.stopPropagation();toggleCart(${p.id})">
          ${inCart?'✓ Savatda':"+ Qo'shish"}
        </button>
      </div>
    </div>`;
  }).join('');
}

// ── Detail ────────────────────────────────────────────────────────────────────
function openDetail(id) {
  const p = allProducts.find(x=>x.id===id); if (!p) return;
  const inCart   = cart.find(c=>c.id===p.id);
  const discount = p.oldPrice ? Math.round((1-p.price/p.oldPrice)*100) : 0;
  const img      = p.image
    ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;display:block;">`
    : `<span style="font-size:88px">${p.emoji}</span>`;
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-img" style="padding:0;overflow:hidden;">${img}</div>
    <div class="detail-body">
      <div class="detail-cat">${p.category}${discount>0?` · -${discount}%`:''}</div>
      <div class="detail-name">${p.name}</div>
      <div class="detail-price">${fmt(p.price)}${p.oldPrice?`<span class="old">${fmt(p.oldPrice)}</span>`:''}</div>
      <div class="detail-desc">${p.desc||''}</div>
      <button class="detail-add-btn ${inCart?'in-cart':''}" onclick="toggleCart(${p.id});closeDetail()">
        ${inCart?'✓ Savatda':"Savatga qo'shish"}
      </button>
    </div>`;
  openModal('detailModal');
}
function closeDetail() { closeModal('detailModal'); }

// ── Savat logikasi ────────────────────────────────────────────────────────────
function toggleCart(id) {
  const p = allProducts.find(x=>x.id===id); if (!p) return;
  const idx = cart.findIndex(c=>c.id===id);
  if (idx===-1) { cart.push({...p,qty:1}); showToast(`${p.name} savatga qo'shildi`); haptic('light'); }
  else { cart.splice(idx,1); showToast('Olib tashlandi'); }
  updateCartBadge(); renderProducts(getFilteredList());
  if (document.getElementById('cartModal').classList.contains('open')) renderCart();
}
function changeQty(id, d) {
  const item = cart.find(c=>c.id===id); if (!item) return;
  item.qty += d;
  if (item.qty<=0) cart = cart.filter(c=>c.id!==id);
  updateCartBadge(); renderCart(); renderProducts(getFilteredList());
}
function updateCartBadge() {
  const total = cart.reduce((s,c)=>s+c.qty,0);
  const badge = document.getElementById('cartCount');
  badge.textContent = total;
  badge.style.display = total>0?'flex':'none';
}
function getSubtotal()    { return cart.reduce((s,c)=>s+c.price*c.qty,0); }
function getDeliveryCost(){ return selectedDelivery==='pickup'?0:(getSubtotal()>=DELIVERY_FREE_FROM?0:DELIVERY_PRICE); }
function getTotal()       { return getSubtotal()+getDeliveryCost(); }

// ── Savat render ──────────────────────────────────────────────────────────────
function openCart() { renderCart(); openModal('cartModal'); }
function closeCart(){ closeModal('cartModal'); }

function renderCart() {
  const el     = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const empty  = document.getElementById('cartEmpty');
  if (!cart.length) { el.innerHTML=''; footer.style.display='none'; empty.style.display='block'; return; }
  empty.style.display = 'none';
  footer.style.display = 'block';

  const sub      = getSubtotal();
  const delivFree= sub >= DELIVERY_FREE_FROM;
  const needReceipt = ['card','click','payme'].includes(selectedPayment);

  el.innerHTML = cart.map(item=>`
    <div class="cart-item">
      <div class="cart-item-emoji" style="overflow:hidden;padding:0;">
        ${item.image?`<img src="${item.image}" style="width:100%;height:100%;object-fit:cover;">`:item.emoji}
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${fmt(item.price*item.qty)}</div>
      </div>
      <div class="qty-controls">
        <button class="qty-btn" onclick="changeQty(${item.id},-1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${item.id},+1)">+</button>
      </div>
    </div>`).join('') + `

  <div class="section-title">Yetkazib berish</div>
  <div class="option-group">
    <div class="option-btn ${selectedDelivery==='pickup'?'active':''}" onclick="setDelivery('pickup')">
      <span class="opt-icon">🏪</span>
      <div class="opt-body"><div class="opt-name">O'zi olib ketish</div><div class="opt-sub">Do'kondan bepul</div></div>
    </div>
    <div class="option-btn ${selectedDelivery==='delivery'?'active':''}" onclick="setDelivery('delivery')">
      <span class="opt-icon">🚚</span>
      <div class="opt-body">
        <div class="opt-name">Yetkazib berish</div>
        <div class="opt-sub">${delivFree?'✓ Bepul (1 mln dan oshdi)':fmt(DELIVERY_PRICE)+' · 1 mln dan bepul'}</div>
      </div>
    </div>
  </div>

  <div class="section-title">To'lov turi</div>
  <div class="option-group">
    ${['cash','card','click','payme'].map(type=>`
    <div class="option-btn ${selectedPayment===type?'active':''}" onclick="setPayment('${type}')">
      <span class="opt-icon">${{cash:'💵',card:'💳',click:'📱',payme:'💚'}[type]}</span>
      <div class="opt-body"><div class="opt-name">${{cash:'Naqd pul',card:'Plastik karta',click:'Click',payme:'Payme'}[type]}</div></div>
    </div>`).join('')}
  </div>

  <div class="section-title">Telefon raqam</div>
  <input class="phone-input" id="phoneInput" type="tel" placeholder="+998 90 000 00 00"
    value="${userPhone}" oninput="userPhone=this.value">

  ${selectedDelivery==='delivery'?`
  <div class="section-title">Yetkazib berish manzili</div>
  <textarea class="phone-input address-input" id="addressInput"
    placeholder="Shahar, ko'cha, uy raqami, mo'ljal..."
    oninput="userAddress=this.value">${userAddress}</textarea>
  <div class="address-hint">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
    To'liq manzil kiriting
  </div>
  <button class="location-btn" onclick="shareLocation()" id="locationBtn">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
    ${userLocation?'✓ Lokatsiya biriktirildi':'📍 Lokatsiya yuborish'}
  </button>
  `:''}

  ${needReceipt?`
  <div class="section-title">To'lov cheki</div>
  <div class="receipt-upload" onclick="document.getElementById('receiptInput').click()">
    <input type="file" id="receiptInput" accept="image/*" style="display:none" onchange="handleReceipt(event)">
    ${receiptFile
      ?`<div class="receipt-preview">
          <img src="${receiptFile.preview}" alt="chek" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">
          <div class="receipt-ok">✓ Chek biriktirildi</div>
        </div>`
      :`<div class="receipt-placeholder">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17,8 12,3 7,8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>To'lov chekini yuklang</span>
          <span class="receipt-sub">JPG, PNG — rasm olish yoki fayldan tanlang</span>
        </div>`}
  </div>
  `:''}`;

  const delivCost = getDeliveryCost();
  document.getElementById('cartTotal').innerHTML = `
    <div class="total-row"><span>Mahsulotlar</span><span>${fmt(sub)}</span></div>
    ${selectedDelivery==='delivery'?`<div class="total-row"><span>Dostavka</span><span>${delivCost===0?'Bepul':fmt(delivCost)}</span></div>`:''}
    <div class="total-row total-final"><span>Jami</span><span>${fmt(getTotal())}</span></div>`;
}

function setDelivery(type) { selectedDelivery=type; renderCart(); }
function setPayment(type)  { selectedPayment=type; receiptFile=null; renderCart(); }

// ── Lokatsiya ─────────────────────────────────────────────────────────────────
function shareLocation() {
  const btn = document.getElementById('locationBtn');
  if (btn) btn.textContent = '⏳ Aniqlanmoqda...';
  if (!navigator.geolocation) { showToast('Qurilma lokatsiyani qo\'llab-quvvatlamaydi'); return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLocation = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        mapUrl: `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`
      };
      showToast('✓ Lokatsiya biriktirildi!');
      haptic('light');
      renderCart();
    },
    err => {
      showToast('Lokatsiya aniqlanmadi. Manzilni yozing.');
      if (btn) btn.textContent = '📍 Lokatsiya yuborish';
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

// ── To'lov cheki ──────────────────────────────────────────────────────────────
function handleReceipt(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { showToast('Fayl hajmi 10MB dan oshmasin'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    receiptFile = { name: file.name, preview: e.target.result, base64: e.target.result };
    showToast('✓ Chek biriktirildi!');
    haptic('light');
    renderCart();
  };
  reader.readAsDataURL(file);
}

// ── Buyurtma berish ───────────────────────────────────────────────────────────
async function placeOrder() {
  if (!cart.length) return;
  const phone = document.getElementById('phoneInput')?.value || userPhone;
  if (!phone || phone.length < 9) { showToast('Telefon raqamini kiriting!'); return; }

  const address = document.getElementById('addressInput')?.value || userAddress;
  if (selectedDelivery==='delivery' && (!address || address.trim().length<5)) {
    showToast('Yetkazib berish manzilini kiriting!');
    document.getElementById('addressInput')?.focus();
    return;
  }

  const btn = document.getElementById('orderBtn');
  btn.disabled = true; btn.textContent = 'Yuborilmoqda...';

  const orderData = {
    cart: cart.map(c=>({id:c.id,name:c.name,price:c.price,qty:c.qty})),
    subtotal: getSubtotal(),
    delivery: selectedDelivery,
    deliveryCost: getDeliveryCost(),
    total: getTotal(),
    payment: selectedPayment,
    phone, address: selectedDelivery==='delivery'?address:null,
    location: userLocation,
    receipt: receiptFile ? receiptFile.base64 : null,
    initData: tg?.initData || 'demo',
    user: tg?.initDataUnsafe?.user || {id:0,first_name:'Test'}
  };

  try {
    const res = await fetch(`${API}/api/order`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(orderData)
    });
    await res.json();
  } catch {}

  cart=[]; userLocation=null; receiptFile=null;
  updateCartBadge(); closeCart(); showSuccess(); haptic('success');
}

// ── Mening buyurtmalarim ──────────────────────────────────────────────────────
async function openMyOrders() {
  const userId = tg?.initDataUnsafe?.user?.id;
  const content = document.getElementById('ordersContent');
  content.innerHTML = '<div style="padding:32px;text-align:center;color:var(--gray)">Yuklanmoqda...</div>';
  openModal('ordersModal');
  let orders = [];
  if (userId) {
    try { const r = await fetch(`${API}/api/my-orders/${userId}`); orders = await r.json(); } catch {}
  }
  if (!orders.length) {
    content.innerHTML = `<div style="padding:48px 20px;text-align:center;color:var(--gray)">
      <div style="font-size:36px;margin-bottom:12px;opacity:0.3">📭</div>
      <div style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase">Buyurtmalar yo'q</div>
    </div>`; return;
  }
  const statusColor = {'✅ Tasdiqlangan':'#4caf50','❌ Bekor qilindi':'#f44336','⏳ Kutilmoqda':'#c9a96e'};
  content.innerHTML = orders.map(o=>{
    const items = o.items.map(i=>`${i.name} ×${i.qty}`).join(', ');
    const date  = new Date(o.date).toLocaleDateString('uz-UZ',{day:'numeric',month:'long'});
    const color = statusColor[o.status]||'var(--gold)';
    return `<div style="padding:14px 20px;border-bottom:1px solid rgba(201,169,110,0.08)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
        <span style="font-family:var(--font-display);font-size:15px;color:var(--white)">#${o.id}</span>
        <span style="font-size:11px;color:${color};font-weight:500">${o.status}</span>
      </div>
      <div style="font-size:12px;color:var(--gray);margin-bottom:4px">${items}</div>
      <div style="display:flex;justify-content:space-between">
        <span style="font-size:13px;color:var(--gold);font-weight:500">${fmt(o.total)}</span>
        <span style="font-size:11px;color:var(--gray2)">${date}</span>
      </div>
    </div>`;
  }).join('');
}
function closeMyOrders() { closeModal('ordersModal'); }

// ── Muvaffaqiyat ──────────────────────────────────────────────────────────────
function showSuccess() {
  ['products-grid','categories','search-wrap','hero'].forEach(c=>{
    const el=document.querySelector('.'+c)||document.getElementById(c);
    if(el) el.style.display='none';
  });
  const screen=document.createElement('div');
  screen.className='success-screen show';
  screen.innerHTML=`
    <div class="success-line"></div>
    <div class="success-title">Buyurtma qabul qilindi</div>
    <div class="success-sub">Tez orada operator<br>siz bilan bog'lanadi</div>`;
  document.querySelector('main').after(screen);
  if(tg) setTimeout(()=>tg.close(),3500);
}

// ── Yordamchi ─────────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); document.body.style.overflow='hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow=''; }
function showToast(msg) {
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2200);
}
function showSkeletons() {
  document.getElementById('productsGrid').innerHTML=Array(3).fill(`
    <div class="product-card">
      <div class="skeleton" style="aspect-ratio:1;width:100%"></div>
      <div style="padding:12px 14px">
        <div class="skeleton" style="height:10px;width:50%;margin-bottom:8px"></div>
        <div class="skeleton" style="height:16px;width:80%;margin-bottom:12px"></div>
        <div class="skeleton" style="height:13px;width:40%"></div>
      </div>
    </div>`).join('');
}
function fmt(n) { return n.toLocaleString('uz-UZ')+' so\'m'; }
function haptic(t) {
  if(!tg?.HapticFeedback) return;
  if(t==='light') tg.HapticFeedback.impactOccurred('light');
  if(t==='success') tg.HapticFeedback.notificationOccurred('success');
}
function scrollToTop() { window.scrollTo({top:0,behavior:'smooth'}); }
