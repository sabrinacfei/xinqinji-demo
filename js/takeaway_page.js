function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

// 分類
const CATS = [
  { key:"signature", title:"招牌" },
  { key:"chicken",   title:"雞" },
  { key:"pork",      title:"豬" },
  { key:"lurou",     title:"滷肉" },
  { key:"other",     title:"綜合/雙拼" },
  { key:"Egg",     title:"人氣便當加安心鴨蛋" },
];

// 餐點資料
const MENU = [
  { id:"B01", name:"特級招牌便當", price:170, cat:"signature", img:"images/Signature＿Bento.png", desc:"集合了鬍鬚張饕客必點經典美食--唐山排骨(唐山里肌豬排)、招牌粹魯和雞肉絲，讓您一次就能品嘗到。\n\n|豬原料產地：台灣、巴拉圭、加拿大、法國、荷蘭" },
  { id:"B05", name:"香酥雞腿便當", price:130, cat:"chicken",   img:"images/drumstick.png", desc:"如需現炸，請耐心等候20分鐘。\n採用7兩重的台灣雞腿，用獨特粉漿醃漬入味，灑上黑胡椒粒，外皮酥脆，肉嫩多汁，搭配當日現炒配副菜，誠心推薦給您。\n\n|豬原料產地：台灣、巴拉圭、加拿大、法國、荷蘭" },
  { id:"B12", name:"紅糟豆乳腿排便當", price:110, cat:"chicken", img:"images/Soy＿Milk＿Chicken.avif", desc:"附醬微辣。\n便當配副菜依季節調整，實際以門市現場為準特選無骨雞腿排以天然發酵紅糟和豆乳…等獨特醬料醃漬入味，沾粉後放入油鍋炸至外酥內嫩，佐上經典椒麻醬，您一定要嚐嚐!當日現炒配副菜，誠心推薦。\n\n|豬原料產地：台灣、巴拉圭、加拿大、法國、荷蘭" },
  { id:"B03", name:"蹄膀便當(大)", price:145, cat:"pork",      img:"images/Pork＿Knuckle.avif", desc:"蹄膀：115g\n家傳特殊魯汁配方文火精燉，肉汁橫流，層次分明，唇間微黏口感，搭配當日現炒配副菜，大大滿足您的味蕾。\n\n|豬原料產地：台灣、巴拉圭、加拿大、法國、荷蘭" },
  { id:"B06", name:"御品豬腳便當", price:130, cat:"pork",          img:"images/pork_trotter.avif", desc:"鬍鬚張靈魂獨家粹魯，經長時間慢火熬煮，魯汁底蘊醇厚、鹹甜交織，每一滴都透著琥珀色的光澤。嚴選肉質紮實的豬腳，慢魯工藝完整保留了豬腳的天然膠質，彈牙黏口，是饕客的首選。\n\n|豬原料產地：台灣、巴拉圭、加拿大、法國、荷蘭" },
  { id:"B07", name:"魯肉飯便當", price:80, cat:"lurou",        img:"images/lurou.avif", desc:"小火慢熬6小時以上，香而不膩，入口即化，淋在香Q晶亮的100%台灣米飯上，搭配當日現炒配副菜，誠心推薦。\n\n|豬原料產地：台灣、巴拉圭、加拿大、法國、荷蘭" },
  { id:"B08", name:"石板鹹豬肉便當", price:110, cat:"pork",    img:"images/Salted_Pork.png", desc:"嚴選鹹香入味的豬肉，以石板煎製帶出迷人香氣，肉質紮實帶有彈性，搭配熱騰騰白飯與當日現炒配菜，鹹香下飯、風味十足，呈現經典又滿足的台式便當享受。" },
  { id:"B09", name:"綜合豬腳滷肉便當", price:125, cat:"other",    img:"images/no＿photo.avif", desc:"嚴選豬腳搭配經典魯肉飯，肉香濃郁、口感豐富，配菜依季節調整，呈現飽足又道地的台式便當風味。\n\n|豬肉產地：台灣。" },
  { id:"B10", name:"綜合豬腳雞肉便當", price:125, cat:"other",    img:"images/no＿photo.avif", desc:"精選入味豬腳與鮮嫩雞肉雙重搭配，口感豐富、層次十足，搭配香Q白飯與當日現炒配菜，鹹香滿足、經典對味，讓每一口都吃得到台式便當的豐盛滋味。" },
  { id:"B11", name:"唐山排骨便當", price:119, cat:"pork",    img:"images/Tangshan_Pork.jpg", desc:"香酥可口的唐山排骨，搭配白飯與季節配菜，外酥內嫩、香氣十足，讓人一口接一口。" },
  { id:"B12", name:"胭脂梅花肉香腸雙拼便當", price:115, cat:"other",    img:"images/no＿photo.avif", desc:"鮮嫩梅花肉搭配香腸雙拼，肉香濃郁、鹹香下飯，配上白飯與季節配菜，豐盛又滿足。" },
  { id:"B13", name:"蒜泥白肉便當", price:105, cat:"pork",    img:"images/menu01.jpg", desc:"精選油脂分布均勻的雪花豬肉片，淋上特調濃郁蒜泥醬，入口蒜香四溢，多汁鮮美，搭配當日現炒配副菜。\n\n|豬原料產地：台灣、巴拉圭、加拿大、法國、荷蘭" },
  { id:"B14", name:"雞魯飯便當", price:105, cat:"lurou",    img:"images/chichen_lurou.avif", desc:"老饕久等了！香而不膩粹魯肉，加上肉質鮮嫩雞肉絲，雙重口感，一次滿足！配上當日現炒青菜，老饕的您不能錯過。\n\n|豬原料產地：台灣、巴拉圭、加拿大、法國、荷蘭" },
  { id:"B15", name:"雞肉飯便當＋安心鴨蛋", price:105, cat:"Egg",    img:"images/G_duck_egg.png", desc:"嚴選優質雞胸肉製作成雞肉絲，香濃特調醬汁，淋在香Q晶亮的100%台灣米飯上，搭配魯製新鮮鴨蛋，蛋香濃郁、蛋黃飽滿。當日現炒配副菜，體驗簡單幸福。\n\n|豬原料產地：台灣、巴拉圭、加拿大、法國、荷蘭" },
  { id:"B16", name:"滷肉飯便當＋安心鴨蛋", price:100, cat:"Egg",    img:"images/lurou_egg.png", desc:"每頭豬只取0.6公斤，極為珍貴難得的新鮮「禁臠肉」，小火慢熬6小時以上，香而不膩，入口即化，淋在香Q晶亮的100%台灣米飯上，搭配魯製新鮮鴨蛋，蛋香濃郁、蛋黃飽滿。當日現炒配副菜，誠心推薦。\n\n|豬肉產地：台灣" },
  { id:"B17", name:"胭脂梅花肉便當", price:100, cat:"pork",    img:"images/Marinated_Pork_Neck.png", desc:"胭脂梅花肉（西班牙），其餘台灣豬肉。配菜依季節調整。餐點不提供客製。" },
  { id:"B18", name:"雞肉飯便當", price:85, cat:"chicken",    img:"images/chicken_rice.avif", desc:"嚴選優質雞胸肉製作成雞肉絲，香濃特調醬汁，淋在香Q晶亮的100%台灣米飯上，搭配當日現炒配副菜，體驗簡單幸福。\n\n|豬原料產地：台灣、巴拉圭、加拿大、法國、荷蘭" },
  { id:"B19", name:"香腸雞肉便當", price:85, cat:"other",      img:"images/chicken_sausage.png", desc:"鬍鬚張招牌雞肉飯，搭配每口都吃到得蒜粒的蒜味香腸，配上當日現炒青菜，老饕的您不能錯過。\n\n|豬肉產地：台灣" },
  { id:"B20", name:"唐山排骨便當＋安心鴨蛋", price:139, cat:"Egg",    img:"images/Tangshan_Pork_egg.png", desc:"採用上選的里肌肉，加上獨家唐山醬精心料理。薄漿手法裹覆豬排，現點現炸，搭配當日現炒配副菜，人氣第一名，常年熱銷。搭配魯製新鮮鴨蛋，蛋香濃郁、蛋黃飽滿。當日現炒配副菜，誠心推薦給您。\n\n|豬肉產地：台灣" },
  { id:"B21", name:"香腸魯肉飯便當", price:139, cat:"other",    img:"images/sausage_lurou.png", desc:"鬍鬚張招牌魯肉飯，搭配每口都吃到得蒜粒的蒜味香腸，配上當日現炒青菜，老饕的您不能錯過。\n\n|豬肉產地：台灣" },
];

let state = { cat:"signature" };

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
function renderCats(){
  const host = $("#categoryTree");
  if(!host) return;

  host.innerHTML = CATS.map(c => `
    <div class="${state.cat === c.key ? "active":""}" data-cat="${c.key}">
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
function renderMenu(){
  const grid = $("#menuGrid");
  if(!grid) return;

  const list = MENU.filter(m => m.cat === state.cat);
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
      const item = MENU.find(x => x.id === card.dataset.id);
      if(item) openOrderModal(item);
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
function nextPickupNo(){
  const last = Number(localStorage.getItem("sq_pickup_last") || "0") + 1;
  localStorage.setItem("sq_pickup_last", String(last));
  return "P" + pad3(last);
}
function updateTakeawayWaitByQueue(){
  const arr = JSON.parse(localStorage.getItem("sq_pickup_now") || "[]");
  const waitMin = arr.length * 5;
  localStorage.setItem("sq_takeaway_wait_min", String(waitMin));
}

function finalizeCheckout(phone){
  const pickupNo = nextPickupNo();

  const key = "sq_pickup_now";
  const arr = JSON.parse(localStorage.getItem(key) || "[]");

  // 新單排最後
  arr.push(pickupNo);

  localStorage.setItem(key, JSON.stringify(arr));

  updateTakeawayWaitByQueue();

  localStorage.removeItem(CART_KEY);
  updateCartBadge();

  $("#pickupNumberText").textContent = pickupNo;
  $("#pickupMetaText").textContent = `手機：${phone}`;
  showPickupStep("B");

  setTimeout(() => location.href = "index.html", 10000);
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

document.addEventListener("DOMContentLoaded", () => {
  renderCats();
  renderMenu();
  bindOrderModal();
  bindSumOverlay();
  bindCheckoutAndCart();
  bindPickupFlow();
  updateCartBadge();
});

