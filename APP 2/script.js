const API = 'https://fakestoreapi.com';
let allProducts = [];
let activeCategory = 'all';
let searchTerm = '';
let cart = {}; // id -> {product, qty}

const grid = document.getElementById('grid');
const categoriesEl = document.getElementById('categories');
const cartCount = document.getElementById('cartCount');
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('overlay');
const drawerItems = document.getElementById('drawerItems');
const subtotalEl = document.getElementById('subtotal');
const toast = document.getElementById('toast');
const checkoutBtn = document.getElementById('checkoutBtn');

async function init(){
  try{
    const [productsRes, categoriesRes] = await Promise.all([
      fetch(`${API}/products`),
      fetch(`${API}/products/categories`)
    ]);
    if(!productsRes.ok || !categoriesRes.ok) throw new Error('bad response');
    allProducts = await productsRes.json();
    const categories = await categoriesRes.json();
    renderCategories(categories);
    renderProducts();
  }catch(err){
    grid.innerHTML = `<div class="state-msg">Couldn't reach the warehouse. Check your connection and refresh.</div>`;
    console.error(err);
  }
}

function renderCategories(categories){
  const pills = ['all', ...categories];
  categoriesEl.innerHTML = pills.map(c => `
    <button class="pill ${c === activeCategory ? 'active' : ''}" data-cat="${c}">
      ${c === 'all' ? 'All Crates' : c}
    </button>
  `).join('');
  categoriesEl.querySelectorAll('.pill').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      activeCategory = btn.dataset.cat;
      categoriesEl.querySelectorAll('.pill').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      renderProducts();
    });
  });
}

function renderProducts(){
  let list = allProducts.filter(p => activeCategory === 'all' || p.category === activeCategory);
  if(searchTerm.trim()){
    const t = searchTerm.toLowerCase();
    list = list.filter(p => p.title.toLowerCase().includes(t));
  }
  if(list.length === 0){
    grid.innerHTML = `<div class="state-msg">Nothing in this crate. Try another search.</div>`;
    return;
  }
  grid.innerHTML = list.map((p, i) => `
    <div class="card" style="animation-delay:${Math.min(i*0.04,0.4)}s">
      <span class="card-badge">${p.category}</span>
      <div class="card-img"><img src="${p.image}" alt="${escapeHtml(p.title)}"></div>
      <div class="card-title">${escapeHtml(p.title)}</div>
      <div class="card-rating">★ ${p.rating?.rate ?? '—'} · ${p.rating?.count ?? 0} sold</div>
      <div class="card-footer">
        <span class="card-price">$${p.price.toFixed(2)}</span>
        <button class="add-btn" data-id="${p.id}" title="Add to crate">+</button>
      </div>
    </div>
  `).join('');
  grid.querySelectorAll('.add-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> addToCart(Number(btn.dataset.id)));
  });
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function addToCart(id){
  const product = allProducts.find(p => p.id === id);
  if(!product) return;
  if(cart[id]) cart[id].qty += 1;
  else cart[id] = { product, qty: 1 };
  updateCartUI();
  showToast(`Added "${product.title.slice(0,30)}${product.title.length>30?'…':''}" to crate`);
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
  const totalQty = items.reduce((s,i)=> s + i.qty, 0);
  cartCount.textContent = totalQty;

  if(items.length === 0){
    drawerItems.innerHTML = `<div class="drawer-empty">Your crate is empty.<br>Go grab something.</div>`;
    checkoutBtn.disabled = true;
  }else{
    checkoutBtn.disabled = false;
    drawerItems.innerHTML = items.map(({product, qty}) => `
      <div class="drawer-item">
        <img src="${product.image}" alt="">
        <div class="drawer-item-info">
          <div class="drawer-item-title">${escapeHtml(product.title)}</div>
          <div class="qty-row">
            <button data-id="${product.id}" data-delta="-1">−</button>
            <span>${qty}</span>
            <button data-id="${product.id}" data-delta="1">+</button>
            <button class="remove-link" data-remove="${product.id}">Remove</button>
          </div>
        </div>
        <div class="drawer-item-price">$${(product.price * qty).toFixed(2)}</div>
      </div>
    `).join('');
    drawerItems.querySelectorAll('[data-delta]').forEach(btn=>{
      btn.addEventListener('click', ()=> changeQty(Number(btn.dataset.id), Number(btn.dataset.delta)));
    });
    drawerItems.querySelectorAll('[data-remove]').forEach(btn=>{
      btn.addEventListener('click', ()=> removeItem(Number(btn.dataset.remove)));
    });
  }

  const subtotal = items.reduce((s,i)=> s + i.product.price * i.qty, 0);
  subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
}

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> toast.classList.remove('show'), 2200);
}

document.getElementById('cartBtn').addEventListener('click', ()=>{
  drawer.classList.add('open');
  overlay.classList.add('open');
});
document.getElementById('closeBtn').addEventListener('click', closeDrawer);
overlay.addEventListener('click', closeDrawer);
function closeDrawer(){
  drawer.classList.remove('open');
  overlay.classList.remove('open');
}

checkoutBtn.addEventListener('click', ()=>{
  showToast('Crate sealed! (This is a demo — no real order was placed.)');
  cart = {};
  updateCartUI();
  closeDrawer();
});

let searchDebounce;
document.getElementById('searchInput').addEventListener('input', (e)=>{
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(()=>{
    searchTerm = e.target.value;
    renderProducts();
  }, 200);
});

updateCartUI();
init();