function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }
function showTakeawayEmptyHint(msg = "目前沒有點餐內容，請先加入購物車。"){
  const el = $("#takeawayEmptyHint");
  if(!el) return;
  el.textContent = msg;
  el.classList.remove("d-none");
}

function hideTakeawayEmptyHint(){
  $("#takeawayEmptyHint")?.classList.add("d-none");
}

function isPortraitTakeaway(){
  return document.documentElement.dataset.screenOrientation === "portrait";
}

let state = {
  cat: "",
  categories: [],
  items: []
};

// ===== 購物車 =====
const CART_KEY = "sq_takeaway_cart";
const QR_SERVICE_URL = "https://api.qrserver.com/v1/create-qr-code/";
const PAYMENT_API_BASE_URL = "https://xinqinji-payment.onrender.com";

const checkoutState = {
  phone: "",
  order: null,
  paymentUrl: "",
  qrUrl: ""
};
let paymentBusy = false;

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

  const categories = isPortraitTakeaway()
    ? [{ key: "all", title: "全部" }, ...state.categories.filter(c => c.key !== "all")]
    : state.categories;

  host.innerHTML = categories.map(c => `
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
function fixMenuImgPath(path) {
  const img = String(path || "");

  if (img.includes("Marinated_Pork_Neck.png")) {
    return "images/Marinated_Pork_Neck1.jpg";
  }

  return img;
}

// ===== 右側餐點 =====
function renderMenu() {
  const grid = $("#menuGrid");
  if (!grid) return;

  const list = state.cat === "all"
    ? state.items
    : state.items.filter(m => m.cat === state.cat);

  grid.innerHTML = list.map(item => {
    const imgPath = fixMenuImgPath(item.img);

    return `
      <div class="col-4">
        <div class="menuCard" data-id="${item.id}">
          <img src="${imgPath}" alt="${item.name}">
        </div>
        <h2 class="mealName">${item.name}</h2>
        <div class="mealPrice">$${item.price}</div>
      </div>
    `;
  }).join("");

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
  $("#orderModalImg").src = fixMenuImgPath(item.img);
  const descText = item.desc || "";
  const parts = descText.split("|");

  const mainDesc = (parts[0] || "").trim();
  const originDesc = parts[1] ? `|${parts[1].trim()}` : "";

  $("#orderModalDesc").innerHTML = `
    <div class="orderDescMain">${mainDesc.replace(/\n/g, "<br>")}</div>
    ${originDesc ? `<div class="orderDescOrigin">${originDesc}</div>` : ""}
  `;
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
    hideTakeawayEmptyHint();
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById("orderModal")).hide();
  });
}

// ===== 明細 =====
const sumState = { source:"checkout", editing:false };

function calcTotal(cart){
  return cart.reduce((sum, x) => sum + (Number(x.qty)||0) * (Number(x.price)||0), 0);
}
function clearCart(){
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
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
    showTakeawayEmptyHint("目前沒有點餐內容，請先加入購物車。");
    return;
  }

  hideTakeawayEmptyHint();

  sumState.source = source;      
  sumState.editing = false;

  const primary = $("#sumPrimaryBtn");
  document.querySelector('.sumFoot').innerHTML = `
    <button class="btn" id="sumBackBtn" type="button" style="background:#A9E1E6;color:#2E241F;border-radius:16px;font-weight:900;min-width:100px;height:50px;border:0;">返回</button>
    <button class="btn" id="sumEditBtn" type="button" style="background:#A9E1E6;color:#2E241F;border-radius:16px;font-weight:900;min-width:100px;height:50px;border:0;">編輯訂單</button>
    <button class="btn" id="sumPrimaryBtn" type="button" style="background:#FF7A1A;color:#fff;border-radius:16px;font-weight:900;min-width:100px;height:50px;border:0;">結帳</button>
  `;

  renderSumRows(false);
  $("#sumOverlay").classList.remove("d-none");
}

// ===== 外帶取餐：電話 + 付款方式 =====
function showPickupStep(step){ 
  $("#pickupStepA")?.classList.toggle("d-none", step !== "A");
  $("#pickupStepC")?.classList.toggle("d-none", step !== "C");
  $("#pickupStepD")?.classList.toggle("d-none", step !== "D");
  $("#pickupStepG")?.classList.toggle("d-none", step !== "G");
  $("#pickupStepE")?.classList.toggle("d-none", step !== "E");
  $("#pickupStepF")?.classList.toggle("d-none", step !== "F");
  $("#pickupStepB")?.classList.toggle("d-none", step !== "B");

  $("#pickupFooterA")?.classList.toggle("d-none", step !== "A");
  $("#pickupFooterC")?.classList.toggle("d-none", step !== "C");
  $("#pickupFooterD")?.classList.toggle("d-none", step !== "D");
  $("#pickupFooterG")?.classList.toggle("d-none", step !== "G");
  $("#pickupFooterE")?.classList.toggle("d-none", step !== "E");
  $("#pickupFooterF")?.classList.toggle("d-none", step !== "F");
  $("#pickupFooterB")?.classList.toggle("d-none", step !== "B");
}

function openPickupModal(){
  checkoutState.phone = "";
  checkoutState.order = null;
  checkoutState.paymentUrl = "";
  checkoutState.qrUrl = "";
  showPickupStep("A");
  $("#pickupPhoneHint")?.classList.add("d-none");
  $("#paymentHint")?.classList.add("d-none");
  $("#cardPayHint")?.classList.add("d-none");
  window.bootstrap.Modal.getOrCreateInstance(document.getElementById("pickupModal")).show();
}

function isValidTWPhone(s){ return /^09\d{8}$/.test(String(s||"").trim()); }

function buildPaymentPayload(order, amount) {
  return {
    orderNo: order.pickupNo,
    phone: order.phone,
    amount: amount,
    items: order.items.map(x => ({
      id: x.id,
      name: x.name,
      price: x.price,
      qty: x.qty
    }))
  };
}

function setPaymentBusy(isBusy, message = "") {
  paymentBusy = isBusy;

  document.querySelectorAll(".paymentMethodCard").forEach((card) => {
    card.disabled = isBusy;
    card.classList.toggle("is-loading", isBusy);
  });

  const hint = $("#paymentHint");
  if (!hint) return;

  if (message) {
    hint.textContent = message;
    hint.classList.remove("d-none");
  } else if (!isBusy) {
    hint.classList.add("d-none");
  }
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    const text = await res.text();
    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {
        success: false,
        message: text || `HTTP ${res.status}`
      };
    }

    return { res, data };
  } finally {
    clearTimeout(timer);
  }
}

async function postPaymentLink(endpoints, payload, timeoutMs = 45000) {
  const list = Array.isArray(endpoints) ? endpoints : [endpoints];
  let lastError = null;

  for (const endpoint of list) {
    try {
      const result = await fetchJsonWithTimeout(`${PAYMENT_API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }, timeoutMs);

      if (result.res.ok && result.data?.success && result.data?.paymentUrl) {
        return result;
      }

      lastError = new Error(result.data?.message || "payment link failed");
      lastError.status = result.res.status;
      lastError.detail = result.data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("payment link failed");
}

async function createCheckoutOrder(phone) {
  if (checkoutState.order) return checkoutState.order;

  const cart = loadCart();

  if (!cart.length) {
    showTakeawayEmptyHint("目前沒有點餐內容，請先加入購物車。");
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById("pickupModal")).hide();
    throw new Error("empty cart");
  }

  const order = await apiCreatePickupOrder(phone, cart);
  checkoutState.order = order;
  return order;
}

function showPickupNumber(order, metaText) {
  $("#pickupNumberText").textContent = order.pickupNo;
  $("#pickupMetaText").textContent = metaText;
  showPickupStep("B");

  setTimeout(() => {
    window.location.href = "index.html";
  }, 10000);
}

function renderLinePayPayment(order, amount, paymentUrl) {
  const qrUrl = `${QR_SERVICE_URL}?size=280x280&margin=12&data=${encodeURIComponent(paymentUrl)}`;
  const qrImg = $("#linePayQrImg");
  const qrLoading = $("#linePayQrLoading");

  if (qrImg) {
    qrImg.classList.add("d-none");
    qrImg.removeAttribute("src");
  }

  if (qrLoading) {
    qrLoading.textContent = "正在產生 QR code...";
    qrLoading.classList.remove("d-none");
  }

  const remoteQr = new Image();
  remoteQr.onload = () => {
    if (qrImg) {
      qrImg.src = qrUrl;
      qrImg.classList.remove("d-none");
    }
    qrLoading?.classList.add("d-none");
  };
  remoteQr.onerror = () => {
    if (qrLoading) {
      qrLoading.textContent = "LINE Pay QR code 載入失敗，請稍後再試";
      qrLoading.classList.remove("d-none");
    }
  };
  remoteQr.src = qrUrl;

  $("#linePayOrderNo").textContent = order.pickupNo;
  $("#linePayAmount").textContent = `$${amount}`;
  $("#linePayItemList").innerHTML = order.items.map((x) => {
    const qty = Number(x.qty) || 0;
    const price = Number(x.price) || 0;
    return `
      <div class="linePayItemRow">
        <span>${x.name} × ${qty}</span>
        <strong>$${qty * price}</strong>
      </div>
    `;
  }).join("");
}

async function startOnlinePayment(phone) {
  if (paymentBusy) return;

  try {
    setPaymentBusy(true, "正在建立 LINE Pay 付款連結，請稍候...");

    const cart = loadCart();
    const amount = calcTotal(cart);
    const order = await createCheckoutOrder(phone);
    const paymentPayload = buildPaymentPayload(order, amount);

    const { data } = await postPaymentLink("/api/create-line-pay-link", paymentPayload);

    checkoutState.paymentUrl = data.paymentUrl;
    checkoutState.qrUrl = data.qrUrl || data.paymentUrl;
    renderLinePayPayment(order, amount, checkoutState.qrUrl);
    setPaymentBusy(false);
    showPickupStep("G");

  } catch (err) {
    setPaymentBusy(false);
    if (err.message !== "empty cart") {
      console.error("startOnlinePayment failed:", err);
      $("#paymentHint").textContent =
        err.name === "AbortError"
          ? "LINE Pay 付款連結逾時，請稍後再試"
          : err.status === 404
            ? "LINE Pay 後端尚未部署，請先更新付款伺服器"
            : err.detail?.message || "LINE Pay 尚未完成串接或憑證未設定，請確認後端 LINE Pay 設定";
      $("#paymentHint").classList.remove("d-none");
    }
  }
}

function buildCounterQrPayload(order, amount) {
  return JSON.stringify({
    type: "takeaway-counter-payment",
    pickupNo: order.pickupNo,
    phoneLast3: String(order.phone || "").slice(-3),
    amount,
    items: order.items.map(x => ({
      name: x.name,
      qty: Number(x.qty) || 0,
      price: Number(x.price) || 0
    }))
  });
}

function renderCounterPayment(order, amount) {
  const qrPayload = buildCounterQrPayload(order, amount);
  const qrUrl = `${QR_SERVICE_URL}?size=280x280&margin=12&data=${encodeURIComponent(qrPayload)}`;

  const qrImg = $("#counterQrImg");
  if (qrImg) {
    qrImg.src = "images/qrcode.png";

    const remoteQr = new Image();
    remoteQr.onload = () => {
      qrImg.src = qrUrl;
    };
    remoteQr.onerror = () => {
      qrImg.src = "images/qrcode.png";
    };
    remoteQr.src = qrUrl;
  }

  $("#counterOrderNo").textContent = order.pickupNo;
  $("#counterAmount").textContent = `$${amount}`;
  $("#counterItemList").innerHTML = order.items.map((x) => {
    const qty = Number(x.qty) || 0;
    const price = Number(x.price) || 0;
    return `
      <div class="counterItemRow">
        <span>${x.name} × ${qty}</span>
        <strong>$${qty * price}</strong>
      </div>
    `;
  }).join("");
}

async function startCounterPayment(phone) {
  try {
    const cart = loadCart();
    const amount = calcTotal(cart);
    const order = await createCheckoutOrder(phone);

    renderCounterPayment(order, amount);
    clearCart();
    showPickupStep("E");
  } catch (err) {
    if (err.message !== "empty cart") {
      console.error("startCounterPayment failed:", err);
      $("#paymentHint").textContent = "臨櫃付款 QR code 建立失敗，請稍後再試";
      $("#paymentHint").classList.remove("d-none");
    }
  }
}

function formatCardNumber(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatCardExpiry(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

async function startCreditPayment(phone) {
  try {
    const cart = loadCart();
    const amount = calcTotal(cart);
    const order = await createCheckoutOrder(phone);

    $("#cardPayAmount").textContent = `$${amount}`;
    $("#cardPayHint")?.classList.add("d-none");
    if ($("#cardNumberInput")) $("#cardNumberInput").value = "";
    if ($("#cardExpiryInput")) $("#cardExpiryInput").value = "";
    if ($("#cardCvcInput")) $("#cardCvcInput").value = "";
    showPickupStep("F");
  } catch (err) {
    if (err.message !== "empty cart") {
      console.error("startCreditPayment failed:", err);
      $("#paymentHint").textContent = "信用卡付款頁建立失敗，請稍後再試";
      $("#paymentHint").classList.remove("d-none");
    }
  }
}

function setCardPaymentBusy(isBusy, message = "") {
  const submitBtn = $("#cardSubmitBtn");
  if (submitBtn) submitBtn.disabled = isBusy;

  const hint = $("#cardPayHint");
  if (!hint) return;

  if (message) {
    hint.textContent = message;
    hint.classList.remove("d-none");
  } else if (!isBusy) {
    hint.classList.add("d-none");
  }
}

async function submitCreditPayment() {
  if (!checkoutState.order || paymentBusy) return;

  try {
    paymentBusy = true;
    setCardPaymentBusy(true, "正在建立藍新信用卡付款頁，請稍候...");

    const amount = calcTotal(loadCart());
    const paymentPayload = buildPaymentPayload(checkoutState.order, amount);
    const { data } = await postPaymentLink([
      "/api/create-card-payment-link",
      "/api/create-payment-link"
    ], paymentPayload);

    checkoutState.paymentUrl = data.paymentUrl;
    clearCart();
    location.href = data.paymentUrl;
  } catch (err) {
    console.error("submitCreditPayment failed:", err);
    setCardPaymentBusy(false, err.name === "AbortError"
      ? "藍新信用卡付款頁建立逾時，請稍後再試"
      : "藍新信用卡付款頁建立失敗，請稍後再試");
  } finally {
    paymentBusy = false;
  }
}

function validateCardPayment() {
  const cardNo = ($("#cardNumberInput")?.value || "").replace(/\D/g, "");
  const expiry = $("#cardExpiryInput")?.value || "";
  const cvc = ($("#cardCvcInput")?.value || "").replace(/\D/g, "");

  if (cardNo.length < 16 || !/^\d{2}\/\d{2}$/.test(expiry) || cvc.length < 3) {
    $("#cardPayHint").textContent = "請輸入完整信用卡卡號、有效期限與安全碼";
    $("#cardPayHint").classList.remove("d-none");
    return false;
  }

  $("#cardPayHint")?.classList.add("d-none");
  return true;
}

function bindSumOverlay(){
  // 關閉按鈕（這個不會被重新產生，所以只綁一次沒問題）
  $("#sumCloseBtn")?.addEventListener("click", closeSum);

  // 用事件委派，綁在不會消失的父元素上
  $("#sumOverlay")?.addEventListener("click", (e) => {

    // 返回
    if(e.target.closest("#sumBackBtn")){
      closeSum();
      return;
    }

    // 編輯訂單
    if(e.target.closest("#sumEditBtn")){
      sumState.editing = !sumState.editing;
      const editBtn = $("#sumEditBtn");
      if(editBtn) editBtn.textContent = sumState.editing ? "完成編輯" : "編輯訂單";
      renderSumRows(sumState.editing);
      return;
    }

    // 結帳
    if(e.target.closest("#sumPrimaryBtn")){
      closeSum();
      openPickupModal();
      return;
    }
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
    checkoutState.phone = phone.trim();
    $("#paymentStepSub").textContent = `手機 ${checkoutState.phone}，請選擇付款方式`;
    $("#paymentHint")?.classList.add("d-none");
    showPickupStep("D");
  });

  $("#pickupCloseBtn")?.addEventListener("click", () => {
    location.href = "index.html";
  });

  $("#paymentBackPhoneBtn")?.addEventListener("click", () => {
    showPickupStep("C");
  });

  document.querySelector(".paymentMethodGrid")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-payment-method]");
    if (!btn || paymentBusy) return;

    const method = btn.dataset.paymentMethod;
    const phone = checkoutState.phone || ($("#pickupPhone")?.value || "").trim();

    if (!isValidTWPhone(phone)) {
      showPickupStep("A");
      $("#pickupPhoneHint")?.classList.remove("d-none");
      return;
    }

    $("#paymentHint")?.classList.add("d-none");

    if (method === "online") await startOnlinePayment(phone);
    if (method === "counter") await startCounterPayment(phone);
    if (method === "credit") await startCreditPayment(phone);
  });

  $("#counterDoneBtn")?.addEventListener("click", () => {
    if (!checkoutState.order) {
      location.href = "index.html";
      return;
    }

    showPickupNumber(checkoutState.order, "請至櫃檯付款，完成後依取餐號碼等候叫號。");
  });

  $("#cardBackPaymentBtn")?.addEventListener("click", () => {
    showPickupStep("D");
  });

  $("#linePayBackPaymentBtn")?.addEventListener("click", () => {
    showPickupStep("D");
  });

  $("#linePayDoneBtn")?.addEventListener("click", () => {
    if (!checkoutState.order) {
      location.href = "index.html";
      return;
    }

    clearCart();
    showPickupNumber(checkoutState.order, "LINE Pay 付款完成，請依取餐號碼至櫃檯或取餐區取餐。");
  });

  $("#cardSubmitBtn")?.addEventListener("click", () => {
    submitCreditPayment();
  });

  $("#cardNumberInput")?.addEventListener("input", (e) => {
    e.target.value = formatCardNumber(e.target.value);
  });

  $("#cardExpiryInput")?.addEventListener("input", (e) => {
    e.target.value = formatCardExpiry(e.target.value);
  });

  $("#cardCvcInput")?.addEventListener("input", (e) => {
    e.target.value = String(e.target.value || "").replace(/\D/g, "").slice(0, 4);
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
    state.cat = isPortraitTakeaway() ? "all" : (state.categories[0]?.key || "");

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

  const params = new URLSearchParams(location.search);

  if (params.get("promoCheckout") === "1") {
    setTimeout(() => {
      openCheckoutSummary("checkout");
    }, 300);
  }

  if (params.get("payment") === "success") {
    const pickupNo = params.get("pickupNo") || "P000";

    setTimeout(() => {
      $("#pickupNumberText").textContent = pickupNo;
      $("#pickupMetaText").textContent = "付款完成，請依取餐號碼至櫃檯或取餐區取餐。";

      showPickupStep("B");

      window.bootstrap.Modal.getOrCreateInstance(
        document.getElementById("pickupModal")
      ).show();

      // 清掉網址參數，避免重新整理一直跳彈窗
      history.replaceState(null, "", "takeaway.html");

      // 10 秒後自動回首頁
      setTimeout(() => {
        window.location.href = "index.html";
      }, 10000);

    }, 400);
  }
});
