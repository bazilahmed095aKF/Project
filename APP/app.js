const API = "https://dummyjson.com/products?limit=100";
let products = [];
let currentCategory = "all";
let cart = {}; // id -> {product, qty}

const grid = document.getElementById('grid');
const categoriesEl = document.getElementById('categories');
const searchInput = document.getElementById('searchInput');
const cartCount = document.getElementById('cartCount');
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('overlay');
const drawerItems = document.getElementById('drawerItems');
const totalAmt = document.getElementById('totalAmt');
const checkoutBtn = document.getElementById('checkoutBtn');
const toast = document.getElementById('toast');

async function loadProducts(){
  try{
    const res = await fetch(API);
    if(!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    products = data.products.map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      category: p.category,
      image: p.thumbnail,
      rating: { rate: p.rating, count: p.stock }
    }));
    buildCategories();
    renderGrid();
  }catch(err){
    grid.innerHTML = `<div class="empty">Couldn't load products right now.<br>${err.message}</div>`;
  }
}

function buildCategories(){
  const cats = ['all', ...new Set(products.map(p => p.category))];
  categoriesEl.innerHTML = cats.map(c =>
    `<button class="tab ${c === currentCategory ? 'active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');
  categoriesEl.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.cat;
      buildCategories();
      renderGrid();
    });
  });
}

function renderGrid(){
  const term = searchInput.value.trim().toLowerCase();
  const filtered = products.filter(p =>
    (currentCategory === 'all' || p.category === currentCategory) &&
    p.title.toLowerCase().includes(term)
  );

  if(filtered.length === 0){
    grid.innerHTML = `<div class="empty">No products match your search.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="card">
      <div class="punch-hole"></div>
      <div class="thumb"><img src="${p.image}" alt="${escapeHtml(p.title)}"></div>
      <div class="cat">${p.category}</div>
      <p class="title">${escapeHtml(p.title)}</p>
      <div class="bottom-row">
        <span class="price">$${p.price.toFixed(2)}</span>
        <span class="rating">★ ${p.rating?.rate ?? '–'} (${p.rating?.count ?? 0})</span>
      </div>
      <button class="add-btn" data-id="${p.id}">Add to cart</button>
    </div>
  `).join('');

  grid.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => addToCart(Number(btn.dataset.id), btn));
  });
}

function addToCart(id, btnEl){
  const product = products.find(p => p.id === id);
  if(!product) return;
  if(cart[id]) cart[id].qty += 1;
  else cart[id] = { product, qty: 1 };

  updateCartUI();
  showToast(`Added: ${product.title.slice(0,28)}${product.title.length>28?'…':''}`);

  if(btnEl){
    btnEl.textContent = 'Added ✓';
    btnEl.classList.add('added');
    setTimeout(() => { btnEl.textContent = 'Add to cart'; btnEl.classList.remove('added'); }, 900);
  }
}

function changeQty(id, delta){
  if(!cart[id]) return;
  cart[id].qty += delta;
  if(cart[id].qty <= 0) delete cart[id];
  updateCartUI();
}

function removeItem(id){
  delete cart[id];
  updateCartUI();
}

function updateCartUI(){
  const items = Object.values(cart);
  const totalQty = items.reduce((s,i) => s + i.qty, 0);
  const totalPrice = items.reduce((s,i) => s + i.qty * i.product.price, 0);

  cartCount.textContent = totalQty;
  totalAmt.textContent = `$${totalPrice.toFixed(2)}`;
  checkoutBtn.disabled = items.length === 0;

  if(items.length === 0){
    drawerItems.innerHTML = `<div class="cart-empty">Your cart is empty.</div>`;
    return;
  }

  drawerItems.innerHTML = items.map(({product, qty}) => `
    <div class="cart-item">
      <img src="${product.image}" alt="">
      <div class="info">
        <p class="name">${escapeHtml(product.title)}</p>
        <div class="qty-row">
          <button data-action="dec" data-id="${product.id}">–</button>
          <span>${qty}</span>
          <button data-action="inc" data-id="${product.id}">+</button>
          <button class="remove-btn" data-action="rm" data-id="${product.id}">remove</button>
        </div>
      </div>
      <span class="item-price">$${(product.price * qty).toFixed(2)}</span>
    </div>
  `).join('');

  drawerItems.querySelectorAll('button[data-action]').forEach(btn => {
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    btn.addEventListener('click', () => {
      if(action === 'inc') changeQty(id, 1);
      if(action === 'dec') changeQty(id, -1);
      if(action === 'rm') removeItem(id);
    });
  });
}

let toastTimer;
function showToast(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById('cartBtn').addEventListener('click', () => {
  drawer.classList.add('open'); overlay.classList.add('open');
});
document.getElementById('closeDrawer').addEventListener('click', closeDrawer);
overlay.addEventListener('click', closeDrawer);
function closeDrawer(){ drawer.classList.remove('open'); overlay.classList.remove('open'); }

checkoutBtn.addEventListener('click', () => {
  showToast('Checked out! (demo only — no real order placed)');
  cart = {};
  updateCartUI();
  closeDrawer();
});

let searchDebounce;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(renderGrid, 200);
});

loadProducts();