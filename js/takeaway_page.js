function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

let state = {
  cat: "",
  categories: [],
  items: []
};

// ===== 購物車 =====
const CART_KEY = "sq_takeaway_cart";
function loadCart(){
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}
function getCartCount(){
  return loadCart().reduce((sum, x) => sum + (Number(x.qty) || 0), 0);
}
function updateCartBadge(){
  const badge = $("#cartBadge");
  if(!badge) return;
  const n = getCartCount();
  badge.textContent = String(n);
  badge.classList.toggle("isZero", n === 0);
}
function addToCart(item, qty){
  const cart = loadCart();
  const found = cart.find(x => x.id === item.id);
  if(found) found.qty = (Number(found.qty) || 0) + qty;
  else cart.push({ id:item.id, name:item.name, price:item.price, qty });
  saveCart(cart);
}

// ===== 左側分類 =====
function renderCats() {
  const host = $("#categoryTree");
  if (!host) return;

  host.innerHTML = state.categories.map(c => `
    <div class="${state.cat === c.key ? "active" : ""}" data-cat="${c.key}">
      ${c.title}
    </div>
  `).join("");

  $all("#categoryTree > div").forEach(btn => {
    btn.addEventListener("click", () => {
      state.cat = btn.dataset.cat;
      renderCats();
      renderMenu();
    });
  });
}

// ===== 右側餐點 =====
function renderMenu() {
  const grid = $("#menuGrid");
  if (!grid) return;

  const list = state.items.filter(m => m.cat === state.cat);

  grid.innerHTML = list.map(item => `
    <div class="col-4">
      <div class="menuCard" data-id="${item.id}">
        <img src="${item.img}" alt="${item.name}">
      </div>
      <h2 class="mealName">${item.name}</h2>
      <div class="mealPrice">$${item.price}</div>
    </div>
  `).join("");

  $all(".menuCard").forEach(card => {
    card.addEventListener("click", () => {
      const item = state.items.find(x => x.id === card.dataset.id);
      if (item) openOrderModal(item);
    });
  });
}

// ===== 餐點彈窗 =====
let modalState = { item:null, qty:1 };

function openOrderModal(item){
  modalState = { item, qty:1 };
  $("#orderModalTitle").textContent = `${item.name}  $${item.price}`;
  $("#orderModalImg").src = item.img;
  $("#orderModalDesc").textContent = item.desc || "";
  $("#qtyText").textContent = "1";
  window.bootstrap.Modal.getOrCreateInstance(document.getElementById("orderModal")).show();
}

function bindOrderModal(){
  $("#qtyMinus")?.addEventListener("click", () => {
    modalState.qty = Math.max(1, modalState.qty - 1);
    $("#qtyText").textContent = String(modalState.qty);
  });
  $("#qtyPlus")?.addEventListener("click", () => {
    modalState.qty = Math.min(99, modalState.qty + 1);
    $("#qtyText").textContent = String(modalState.qty);
  });

  $("#confirmAddBtn")?.addEventListener("click", () => {
    if(!modalState.item) return;
    addToCart(modalState.item, modalState.qty);
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById("orderModal")).hide();
  });
}

// ===== 明細 =====
const sumState = { source:"checkout", editing:false };

function calcTotal(cart){
  return cart.reduce((sum, x) => sum + (Number(x.qty)||0) * (Number(x.price)||0), 0);
}
function closeSum(){ $("#sumOverlay")?.classList.add("d-none"); }

function renderSumRows(editable){
  const cart = loadCart();
  const rowsHost = $("#sumRows");
  const totalEl = $("#sumTotal");

  rowsHost.innerHTML = cart.map(x => {
    const qty = Number(x.qty) || 0;
    const price = Number(x.price) || 0;
    const sub = qty * price;

    if(!editable){
      return `
        <div class="sumRow">
          <div class="colItem">${x.name}</div>
          <div class="colQty">× ${qty}</div>
          <div class="colSub">$${sub}</div>
        </div>
      `;
    }

    // 編輯模式
    return `
      <div class="sumRow" data-id="${x.id}">
        <div class="colItem">${x.name}</div>
        <div class="colQty">
          <button class="sumBtn" data-act="minus">－</button>
          <span class="sumQtyNum">${qty}</span>
          <button class="sumBtn" data-act="plus">＋</button>
        </div>
        <div class="colSub">$${sub}</div>
      </div>
    `;
  }).join("");

  totalEl.textContent = `$${calcTotal(cart)}`;

  if(editable){
    $all("#sumRows .sumRow").forEach(row => {
      row.addEventListener("click", (e) => {
        const btn = e.target.closest(".sumBtn");
        if(!btn) return;
        const id = row.dataset.id;
        const act = btn.dataset.act;
        const cart2 = loadCart();
        const item = cart2.find(x => x.id === id);
        if(!item) return;

        if(act === "plus") item.qty = (Number(item.qty)||0) + 1;
        if(act === "minus") item.qty = Math.max(0, (Number(item.qty)||0) - 1);

        const next = cart2.filter(x => (Number(x.qty)||0) > 0);
        saveCart(next);

        renderSumRows(true);
      });
    });
  }
}

function openCheckoutSummary(source){
  const cart = loadCart();
  if(!cart.length){
    alert("目前沒有點餐內容，請先加入購物車。");
    return;
  }

  sumState.source = source;      
  sumState.editing = false;

  const primary = $("#sumPrimaryBtn");
  primary.textContent = (source === "cart") ? "編輯訂單" : "結帳";

  renderSumRows(false);
  $("#sumOverlay").classList.remove("d-none");
}

// ===== 外帶取餐：三段式 =====
function showPickupStep(step){ 
  $("#pickupStepA")?.classList.toggle("d-none", step !== "A");
  $("#pickupStepC")?.classList.toggle("d-none", step !== "C");
  $("#pickupStepB")?.classList.toggle("d-none", step !== "B");

  $("#pickupFooterA")?.classList.toggle("d-none", step !== "A");
  $("#pickupFooterC")?.classList.toggle("d-none", step !== "C");
  $("#pickupFooterB")?.classList.toggle("d-none", step !== "B");
}

function openPickupModal(){
  showPickupStep("A");
  $("#pickupPhoneHint")?.classList.add("d-none");
  window.bootstrap.Modal.getOrCreateInstance(document.getElementById("pickupModal")).show();
}

function isValidTWPhone(s){ return /^09\d{8}$/.test(String(s||"").trim()); }
function pad3(n){ return String(n).padStart(3,"0"); }
async function finalizeCheckout(phone) {
  try {
    const cart = loadCart();

    const result = await apiCreatePickupOrder(phone, cart);

    localStorage.removeItem(CART_KEY);
    updateCartBadge();

    $("#pickupNumberText").textContent = result.pickupNo;
    $("#pickupMetaText").textContent = `手機：${phone}`;
    showPickupStep("B");

    setTimeout(() => {
      location.href = "index.html";
    }, 10000);
  } catch (err) {
    console.error("finalizeCheckout failed:", err);
    alert("取號失敗，請稍後再試");
  }
}


function bindSumOverlay(){
  $("#sumCloseBtn")?.addEventListener("click", closeSum);
  $("#sumBackBtn")?.addEventListener("click", closeSum);

  $("#sumPrimaryBtn")?.addEventListener("click", () => {
    if(sumState.source === "checkout"){
      closeSum();
      openPickupModal();
      return;
    }
    sumState.editing = !sumState.editing;
    $("#sumPrimaryBtn").textContent = sumState.editing ? "完成編輯" : "編輯訂單";
    renderSumRows(sumState.editing);
  });
}

function bindCheckoutAndCart(){
  $("#checkoutBtn")?.addEventListener("click", () => openCheckoutSummary("checkout"));
  $("#cartIconWrap")?.addEventListener("click", () => openCheckoutSummary("cart"));
  $("#takeawayBackBtn")?.addEventListener("click", () => {
    location.href = "index.html";
  });
}

function bindPickupFlow(){
  $("#pickupConfirmBtn")?.addEventListener("click", () => {
    const phone = $("#pickupPhone").value;
    if(!isValidTWPhone(phone)){
      $("#pickupPhoneHint")?.classList.remove("d-none");
      return;
    }
    $("#pickupPhoneHint")?.classList.add("d-none");
    $("#pickupConfirmPhoneText").textContent = phone.trim();
    showPickupStep("C");
  });

  $("#pickupEditBtn")?.addEventListener("click", () => {
    showPickupStep("A");
  });

  $("#pickupFinalBtn")?.addEventListener("click", () => {
    const phone = $("#pickupPhone").value;
    if(!isValidTWPhone(phone)){
      showPickupStep("A");
      $("#pickupPhoneHint")?.classList.remove("d-none");
      return;
    }
    finalizeCheckout(phone.trim());
  });

  $("#pickupCloseBtn")?.addEventListener("click", () => {
    location.href = "index.html";
  });

  $("#pickupKeypad")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".keyBtn");
    if(!btn) return;
    const k = btn.dataset.k;
    const input = $("#pickupPhone");

    if(k === "back"){ input.value = input.value.slice(0,-1); return; }
    if(/^\d$/.test(k) && input.value.length < 10) input.value += k;
  });
}
async function initMenu() {
  try {
    const data = await apiGetMenu();

    state.categories = data.categories || [];
    state.items = data.items || [];
    state.cat = state.categories[0]?.key || "";

    renderCats();
    renderMenu();
  } catch (err) {
    console.error("initMenu failed:", err);
    const grid = $("#menuGrid");
    if (grid) {
      grid.innerHTML = `<div style="padding:24px;font-size:20px;">菜單載入失敗</div>`;
    }
  }
}


document.addEventListener("DOMContentLoaded", async () => {
  await initMenu();
  bindOrderModal();
  bindSumOverlay();
  bindCheckoutAndCart();
  bindPickupFlow();
  updateCartBadge();
});

