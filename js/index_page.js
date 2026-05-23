function $(sel) { return document.querySelector(sel); }
function isValidTaiwanMobile(phone) {
  return /^09\d{8}$/.test((phone || "").trim());
}
function showPhoneHint(id, text = "請輸入正確手機號碼（10 碼，09 開頭）") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.remove("d-none");
  el.style.display = "block";
}

function hidePhoneHint(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("d-none");
  el.style.display = "none";
}
function showInlineHint(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.remove("d-none");
}

function hideInlineHint(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("d-none");
}

// ===== 導頁 / 功能按鈕 =====
function bindNav() {
  const goTakeaway = () => (location.href = "takeaway.html");
  const goIndoor = () => (location.href = "indoor.html");

  $(".pickupIndoor")?.addEventListener("click", goIndoor);
  $(".orderingBox")?.addEventListener("click", goTakeaway);
  $(".orderingBox div")?.addEventListener("click", goTakeaway);
  $(".waitBox")?.addEventListener("click", openWaitModal);
  $(".pickupUber")?.addEventListener("click", openDeliveryModal);

  $(".reserveBox")?.addEventListener("click", openReserveModal);
}

// ===== 首頁：現在叫號 =====
async function renderNowCallingMini() {
  const box = document.getElementById("callMiniNums");
  if (!box) return;

  try {
    const data = await apiGetWaitlist();
    const ready = data.callReady || [];

    box.innerHTML = ready.length
      ? ready.slice(0, 4).map((n) => `<div class="callMiniNo">${n}</div>`).join("")
      : `<div class="callMiniNo">—</div>`;
  } catch (err) {
    console.error("renderNowCallingMini failed:", err);
    box.innerHTML = `<div class="callMiniNo">—</div>`;
  }
}
let callingFlashTimer = null;
let autoCallingBusy = false;

function triggerNowCallingFlash(nextNumber = "") {
  const mini = document.getElementById("openCallModal");
  const modalTitle = document.querySelector("#callModal .modal-title");

  mini?.classList.add("is-calling-flash");
  modalTitle?.classList.add("is-calling-flash-text");

  // 如果現在叫號彈窗有打開，也讓剛叫到的號碼變紅放大
  if (nextNumber) {
    document.querySelectorAll("#callModal #callSoonList span, #callModal #callPickupList span").forEach((el) => {
      if (el.textContent.trim() === nextNumber) {
        el.classList.add("is-calling-flash-number");
      }
    });
  }

  clearTimeout(callingFlashTimer);

  callingFlashTimer = setTimeout(() => {
    mini?.classList.remove("is-calling-flash");
    modalTitle?.classList.remove("is-calling-flash-text");

    document.querySelectorAll(".is-calling-flash-number").forEach((el) => {
      el.classList.remove("is-calling-flash-number");
    });
  }, 1500);
}
function forceUpdateNowCallingMini(number) {
  const box = document.getElementById("callMiniNums");
  if (!box) return;

  box.innerHTML = number
    ? `<div class="callMiniNo">${number}</div>`
    : `<div class="callMiniNo">—</div>`;
}

async function renderCallModal() {
  const soonBox = document.getElementById("callSoonList");
  const pickupBox = document.getElementById("callPickupList");
  if (!soonBox || !pickupBox) return;

  try {
    const waitData = await apiGetWaitlist();
    const pickupData = await apiGetPickupOrders();

    const soon = waitData.callSoon || [];
    const pickupOrders = pickupData.orders || [];

    soonBox.innerHTML = soon.length
      ? soon.slice(0, 6).map((n) => `<span>${n}</span>`).join("")
      : `<span>—</span>`;

    pickupBox.innerHTML = pickupOrders.length
      ? pickupOrders.slice(0, 6).map((item, i) => {
          const cls = i === 0 ? "isNowPickup" : "";
          return `<span class="${cls}">${item.pickupNo}</span>`;
        }).join("")
      : `<span>—</span>`;
  } catch (err) {
    console.error("renderCallModal failed:", err);
    soonBox.innerHTML = `<span>—</span>`;
    pickupBox.innerHTML = `<span>—</span>`;
  }
}

async function renderTakeawayWait() {
  const el = document.getElementById("takeawayWaitMin");
  if (!el) return;

  try {
    const mins = await apiGetTakeawayWaitMin();
    el.textContent = mins;
  } catch (err) {
    console.error("renderTakeawayWait failed:", err);
    el.textContent = "0";
  }
}

// ===== 候位 =====
let adults = 0;
let kids = 0;
let chairs = 0;
let autoCloseTimer = null;
let waitBound = false;

const LIMITS = {
  totalMax: 6,
  adultMax: 6,
  kidMax: 6,
  chairMax: 4
};

function pad4(n) {
  return String(n).padStart(4, "0");
}

function showStep(idToShow) {
  ["waitStepA", "waitStepB", "waitStepC", "waitStepD"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("d-none", id !== idToShow);
  });
}

function calcGroup() {
  const total = adults + kids;
  if (total <= 2) return "1-2";
  if (total <= 4) return "3-4";
  return "5-6";
}

function refreshPeopleUI() {
  document.getElementById("adultCnt").textContent = adults;
  document.getElementById("kidCnt").textContent = kids;
  document.getElementById("chairCnt").textContent = chairs;
}

async function updateOverviewFromQueue() {
  const box12 = document.getElementById("q12");
  const box34 = document.getElementById("q34");
  const box56 = document.getElementById("q56");
  const wait12 = document.getElementById("m12");
  const wait34 = document.getElementById("m34");
  const wait56 = document.getElementById("m56");

  if (!box12 || !box34 || !box56 || !wait12 || !wait34 || !wait56) return;

  try {
    const data = await apiGetWaitlist();
    const queue = data.queue || [];

    const waitingOnly = queue.filter((x) => x.status === "waiting");

    const activeForMinutes = queue.filter((x) => x.status === "waiting" || x.status === "ready");

    const c12 = waitingOnly.filter((x) => x.group === "1-2").length;
    const c34 = waitingOnly.filter((x) => x.group === "3-4").length;
    const c56 = waitingOnly.filter((x) => x.group === "5-6").length;

    const m12Count = activeForMinutes.filter((x) => x.group === "1-2").length;
    const m34Count = activeForMinutes.filter((x) => x.group === "3-4").length;
    const m56Count = activeForMinutes.filter((x) => x.group === "5-6").length;

    box12.textContent = c12;
    box34.textContent = c34;
    box56.textContent = c56;

    wait12.textContent = m12Count * 5;
    wait34.textContent = m34Count * 5;
    wait56.textContent = m56Count * 5;

  } catch (err) {
    console.error("updateOverviewFromQueue failed:", err);
    box12.textContent = "0";
    box34.textContent = "0";
    box56.textContent = "0";
    wait12.textContent = "0";
    wait34.textContent = "0";
    wait56.textContent = "0";
  }
}

async function openWaitModal() {
  try {
    adults = 0;
    kids = 0;
    chairs = 0;
    refreshPeopleUI();

    const phoneInput = document.getElementById("waitPhone");
    if (phoneInput) phoneInput.value = "";

    hidePhoneHint("waitPhoneHint");
    clearTimeout(autoCloseTimer);

    await updateOverviewFromQueue();
    await renderIndoorWaitingCount();

    showStep("waitStepA");
    bootstrap.Modal.getOrCreateInstance(document.getElementById("waitModal")).show();
  } catch (err) {
    console.error("openWaitModal failed:", err);
    bootstrap.Modal.getOrCreateInstance(document.getElementById("waitModal")).show();
  }
}

function bindWaitingKiosk() {
  if (waitBound) return;
  waitBound = true;

  document.getElementById("openJoinBtn")?.addEventListener("click", () => {
    showStep("waitStepB");
  });

  document.getElementById("waitCloseBtn")?.addEventListener("click", () => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById("waitModal")).hide();
  });

  document.getElementById("waitEditBtn")?.addEventListener("click", () => {
    showStep("waitStepB");
  });

  // 數字鍵盤
  document.getElementById("keypad")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const k = btn.dataset.k;
    const input = document.getElementById("waitPhone");
    if (!input) return;

    if (k === "back") {
      input.value = input.value.slice(0, -1);
      hidePhoneHint("waitPhoneHint");
      return;
    }

    if (k === "ok") {
      goWaitConfirm();
      return;
    }

    input.value = (input.value + k).slice(0, 10);
    hidePhoneHint("waitPhoneHint");
  });
  function goWaitConfirm() {
    const phone = document.getElementById("waitPhone")?.value.trim() || "";
    const okPeople = adults > 0;

    if (!okPeople) {
      showPhoneHint("waitPhoneHint", "要有一位大人以上 才可完成候位喔！");
      showStep("waitStepB");
      return;
    }

    if (!isValidTaiwanMobile(phone)) {
      showPhoneHint("waitPhoneHint", "請輸入正確手機號碼（10 碼，09 開頭）");
      showStep("waitStepB");
      return;
    }

    hidePhoneHint("waitPhoneHint");

    document.getElementById("waitConfirmPhoneText").textContent = phone;
    document.getElementById("waitConfirmMetaText").textContent =
      `人數：${calcGroup()}｜大人 ${adults} 位｜小孩 ${kids} 位｜兒童座椅 ${chairs} 張`;

    showStep("waitStepC");
  }

  // 正式送出
  async function submitWaitQueue() {
    const phone = (document.getElementById("waitPhone")?.value || "").trim();
    const people = adults + kids;
    const confirmHint = document.getElementById("waitConfirmHint");
    if (confirmHint) {
      confirmHint.textContent = "";
      confirmHint.classList.add("d-none");
      confirmHint.style.display = "none";
    }

    if (adults <= 0) {
      showPhoneHint("waitPhoneHint", "要有一位大人以上 才可完成候位喔！");
      showStep("waitStepB");
      return;
    }

    if (!isValidTaiwanMobile(phone)) {
      showPhoneHint("waitPhoneHint", "請輸入正確手機號碼（10 碼，09 開頭）");
      showStep("waitStepB");
      return;
    }

    try {
      const duplicated = await apiHasActiveBookingByPhone(phone, "wait");
      if (duplicated) {
        if (confirmHint) {
          confirmHint.textContent = "請勿重複候位";
          confirmHint.classList.remove("d-none");
          confirmHint.style.display = "block";
        }
        return;
      }

      hidePhoneHint("waitPhoneHint");

      const group = people <= 2 ? "1-2" : people <= 4 ? "3-4" : "5-6";

      const saved = await apiCreateWaiting({
        group,
        adults,
        kids,
        chairs,
        phone
      });

      showStep("waitStepD");

      const noEl = document.getElementById("waitNumberText");
      const metaEl = document.getElementById("waitMetaText");

      if (noEl) noEl.textContent = saved?.number || "0000";
      if (metaEl) {
        metaEl.textContent =
          `手機末三碼：${phone.slice(-3)}｜大人 ${adults} 位｜小孩 ${kids} 位｜兒童座椅 ${chairs} 張`;
      }

      clearTimeout(autoCloseTimer);
      autoCloseTimer = setTimeout(() => {
        bootstrap.Modal.getOrCreateInstance(document.getElementById("waitModal")).hide();
      }, 10000);

      setTimeout(async () => {
        try {
          await renderNowCallingMini();
          await renderCallModal();
          await updateOverviewFromQueue();
        } catch (err) {
          console.error("wait post-render failed:", err);
        }
      }, 0);

    } catch (err) {
      console.error("submitWaitQueue failed:", err);
      if (confirmHint) {
        confirmHint.textContent = "候位送出失敗，請稍後再試一次";
        confirmHint.classList.remove("d-none");
        confirmHint.style.display = "block";
      }
    }
  }

  document.getElementById("waitPhone")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      goWaitConfirm();
    }
  });

  // 確認送出按鈕
  document.getElementById("waitFinalBtn")?.addEventListener("click", () => {
    submitWaitQueue();
  });

  // 人數 
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const op = btn.dataset.op;
    if (!op) return;

    const clamp0 = (x) => Math.max(0, x);
    const total = () => adults + kids;
    const canAddPerson = () => total() < LIMITS.totalMax;

    if (op === "adult+") {
      if (adults < LIMITS.adultMax && canAddPerson()) adults++;
    }
    if (op === "adult-") adults = clamp0(adults - 1);

    if (op === "kid+") {
      if (kids < LIMITS.kidMax && canAddPerson()) kids++;
    }
    if (op === "kid-") kids = clamp0(kids - 1);

    if (op === "chair+") {
      const chairCapByKids = kids;
      const chairMax = Math.min(LIMITS.chairMax, chairCapByKids);
      if (chairs < chairMax) chairs++;
    }
    if (op === "chair-") chairs = clamp0(chairs - 1);

    if (chairs > kids) chairs = kids;
    refreshPeopleUI();
  });

  document.getElementById("waitModal")?.addEventListener("hidden.bs.modal", () => {
    clearTimeout(autoCloseTimer);
  });
}

// ===== 外送取餐 =====
function hideAllDeliveryMasks() {
  document.getElementById("deliveryLoadingMask")?.classList.add("d-none");
  document.getElementById("deliveryConsentMask")?.classList.add("d-none");
  document.getElementById("deliveryThanksMask")?.classList.add("d-none");
  document.getElementById("deliveryStatusMask")?.classList.add("d-none");
}

function saveDeliveryPhotoToLocal(key, photoItem) {
  try {
    const saved = localStorage.getItem(key);
    const data = saved ? JSON.parse(saved) : { photos: [] };

    data.photos = Array.isArray(data.photos) ? data.photos : [];
    data.photos.unshift(photoItem);

    // localStorage 容量有限，先保留最近 80 張
    data.photos = data.photos.slice(0, 80);

    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error("saveDeliveryPhotoToLocal failed:", err);
  }
}

function stopDeliveryCamera() {
  if (deliveryCameraStream) {
    deliveryCameraStream.getTracks().forEach(track => track.stop());
    deliveryCameraStream = null;
  }

  const video = document.getElementById("deliveryCameraVideo");
  if (video) {
    video.srcObject = null;
  }
}

async function startDeliveryCamera() {
  const video = document.getElementById("deliveryCameraVideo");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn("此瀏覽器不支援相機");
    return false;
  }

  try {
    stopDeliveryCamera();

    deliveryCameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    if (video) {
      video.srcObject = deliveryCameraStream;
      await video.play();
    }

    return true;
  } catch (err) {
    console.error("startDeliveryCamera failed:", err);
    return false;
  }
}

function captureDeliveryPhoto() {
  const video = document.getElementById("deliveryCameraVideo");
  const canvas = document.getElementById("deliveryCameraCanvas");

  if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
    return "";
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.82);
}

function buildDeliveryPhotoItem(choice) {
  return {
    id: deliveryPendingPhotoId,
    orderCode: deliveryPendingCode,
    choice: choice,
    photo: deliveryPendingPhoto,
    createdAt: new Date().toISOString()
  };
}

function getDeliveryStatusText(code, found) {
  if (!found) {
    return "查詢不到訂單，請詢問櫃檯。";
  }

  if (found.status === "已完成") {
    return "訂單已完成，請至外送櫃拿取。";
  }

  return "訂單需再等候 5 分鐘，請耐心等候，謝謝您！";
}

function showDeliveryStatusPopup() {
  const orderNoEl = document.getElementById("deliveryStatusOrderNo");
  const textEl = document.getElementById("deliveryStatusText");

  if (orderNoEl) orderNoEl.textContent = deliveryPendingCode || "—";
  if (textEl) textEl.textContent = getDeliveryStatusText(deliveryPendingCode, deliveryPendingFoundOrder);

  hideAllDeliveryMasks();
  document.getElementById("deliveryStatusMask")?.classList.remove("d-none");
}

function finishDeliveryConsent(choice) {
  if (deliveryPendingPhoto) {
    const photoItem = buildDeliveryPhotoItem(choice);

    if (choice === "agree") {
      // 同意：櫃檯可調取
      saveDeliveryPhotoToLocal(DELIVERY_FRONT_PHOTOS_KEY, photoItem);
    } else {
      // 不同意：不顯示在前台，只保留給管理者稽核
      saveDeliveryPhotoToLocal(DELIVERY_MANAGER_PHOTOS_KEY, photoItem);
    }
  }

  hideAllDeliveryMasks();
  document.getElementById("deliveryThanksMask")?.classList.remove("d-none");

  setTimeout(() => {
    showDeliveryStatusPopup();
  }, 5000);
}

async function runDeliveryCheckFlow(code) {
  deliveryPendingCode = code;
  deliveryPendingPhoto = "";
  deliveryPendingPhotoId = `${code}_${Date.now()}`;
  deliveryPendingFoundOrder = null;

  hideAllDeliveryMasks();
  document.getElementById("deliveryLoadingMask")?.classList.remove("d-none");

  const cameraReady = await startDeliveryCamera();

  try {
    deliveryPendingFoundOrder = await apiFindDeliveryOrder(code);
  } catch (err) {
    console.error("apiFindDeliveryOrder failed:", err);
    deliveryPendingFoundOrder = null;
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  if (cameraReady) {
    deliveryPendingPhoto = captureDeliveryPhoto();
  }

  stopDeliveryCamera();

  hideAllDeliveryMasks();

  if (deliveryPendingPhoto) {
    document.getElementById("deliveryConsentMask")?.classList.remove("d-none");
  } else {
    showDeliveryStatusPopup();
  }
}
let deliveryBound = false;
let deliveryT9Bound = false;

let deliveryCameraStream = null;
let deliveryPendingPhoto = "";
let deliveryPendingPhotoId = "";
let deliveryPendingCode = "";
let deliveryPendingFoundOrder = null;

const DELIVERY_FRONT_PHOTOS_KEY = "mock_delivery_front_photos";
const DELIVERY_MANAGER_PHOTOS_KEY = "mock_delivery_manager_photos";

async function renderDeliveryPickupModal() {
  try {
    const data = await apiGetDeliveryOrders();
    const orders = data.orders || [];

    renderDeliveryCodes(
      orders.filter((x) => x.platform === "foodpanda" && x.status === "已完成"),
      "foodpandaDoneList"
    );
    renderDeliveryCodes(
      orders.filter((x) => x.platform === "foodpanda" && x.status === "準備中"),
      "foodpandaPreparingList"
    );
    renderDeliveryCodes(
      orders.filter((x) => x.platform === "uber" && x.status === "已完成"),
      "uberDoneList"
    );
    renderDeliveryCodes(
      orders.filter((x) => x.platform === "uber" && x.status === "準備中"),
      "uberPreparingList"
    );
  } catch (err) {
    console.error("renderDeliveryPickupModal failed:", err);
  }
}
async function renderIndoorWaitingCount() {
  const el = document.getElementById("indoorWaitingCount");
  if (!el) return;

  try {
    const data = await apiGetWaitlist();
    const q = data.queue || [];
    const totalWaiting = q.filter((x) => x.status === "waiting").length;
    el.textContent = totalWaiting;
  } catch (err) {
    console.error("renderIndoorWaitingCount failed:", err);
    el.textContent = "0";
  }
}

function showDeliverySearchResult(text) {
  const result = document.getElementById("deliverySearchResult");
  if (!result) return;
  result.textContent = text;
  result.classList.remove("d-none");
}

function bindDeliveryKiosk() {
  if (deliveryBound) return;
  deliveryBound = true;

  document.getElementById("deliverySearchCloseBtn")?.addEventListener("click", () => {
    stopDeliveryCamera();
    hideAllDeliveryMasks();
    hideDeliverySearchResult();

    const input = document.getElementById("deliveryOrderInput");
    if (input) input.value = "";

    bootstrap.Modal.getOrCreateInstance(document.getElementById("deliverySearchModal")).hide();
  });

  document.getElementById("confirmDeliverySearchBtn")?.addEventListener("click", async () => {
    const code = (document.getElementById("deliveryOrderInput")?.value || "").trim().toUpperCase();

    if (!code) {
      showDeliverySearchResult("請輸入訂單編號");
      return;
    }

    hideDeliverySearchResult();
    await runDeliveryCheckFlow(code);
  });

  document.getElementById("deliveryConsentYesBtn")?.addEventListener("click", () => {
    finishDeliveryConsent("agree");
  });

  document.getElementById("deliveryConsentNoBtn")?.addEventListener("click", () => {
    finishDeliveryConsent("reject");
  });

  document.getElementById("deliveryStatusOkBtn")?.addEventListener("click", () => {
    hideAllDeliveryMasks();
    hideDeliverySearchResult();

    const input = document.getElementById("deliveryOrderInput");
    if (input) input.value = "";

    bootstrap.Modal.getOrCreateInstance(document.getElementById("deliverySearchModal")).hide();
  });

  document.getElementById("deliverySearchModal")?.addEventListener("hidden.bs.modal", () => {
    stopDeliveryCamera();
    hideAllDeliveryMasks();
    hideDeliverySearchResult();

    const input = document.getElementById("deliveryOrderInput");
    if (input) input.value = "";
  });
}

async function openDeliveryModal() {
  const input = document.getElementById("deliveryOrderInput");
  if (input) input.value = "";

  hideDeliverySearchResult();
  hideAllDeliveryMasks();

  bootstrap.Modal.getOrCreateInstance(document.getElementById("deliverySearchModal")).show();
}

function normalizeOrderCode(code) {
  return String(code || "").trim().toUpperCase();
}

function renderDeliveryCodes(list, containerId) {
  const box = document.getElementById(containerId);
  if (!box) return;

  if (!list.length) {
    box.innerHTML = `<div class="deliveryEmptyText">—</div>`;
    return;
  }

  box.innerHTML = list
    .slice(0, 8)
    .map((item) => `<span class="deliveryCode">${item.code}</span>`)
    .join("");
}

function hideDeliverySearchResult() {
  const result = document.getElementById("deliverySearchResult");
  if (!result) return;
  result.classList.add("d-none");
  result.textContent = "";
}



// ===== 外送查詢 =====
function bindDeliveryT9Keyboard() {
  if (deliveryT9Bound) return;
  deliveryT9Bound = true;

  const pad = document.getElementById("deliveryNinePad");
  const input = document.getElementById("deliveryOrderInput");
  const picker = document.getElementById("letterPicker");
  const clearBtn = document.getElementById("deliveryClearBtn");
  const backBtn = document.getElementById("deliveryBackBtn");

  if (!pad || !input || !picker) return;

  let pressTimer = null;
  let longPressTriggered = false;
  let activeBtn = null;
  let activeLetters = [];
  let activeOptionIndex = -1;
  let pointerActive = false;
  let pointerId = null;

  const LONG_PRESS_MS = 380;

  function addChar(ch) {
    input.value = (input.value + ch).toUpperCase().slice(0, 10);
    hideDeliverySearchResult();
  }

  function backspace() {
    input.value = input.value.slice(0, -1);
    hideDeliverySearchResult();
  }

  function clearInput() {
    input.value = "";
    hideDeliverySearchResult();
  }

  function hidePicker() {
    picker.classList.add("d-none");
    picker.innerHTML = "";
    activeLetters = [];
    activeOptionIndex = -1;
  }

  function setActiveOption(index) {
    activeOptionIndex = index;
    picker.querySelectorAll(".letterOption").forEach((el, i) => {
      el.classList.toggle("active", i === index);
    });
  }

  function showPicker(btn, letters) {
    if (!letters) return;

    const chars = letters.split("");
    activeLetters = chars;

    picker.innerHTML = chars
      .map((ch, idx) => `<div class="letterOption" data-index="${idx}" data-letter="${ch}">${ch}</div>`)
      .join("");

    picker.classList.remove("d-none");

    const btnRect = btn.getBoundingClientRect();

    requestAnimationFrame(() => {
      const pickerRect = picker.getBoundingClientRect();

      let left = btnRect.left + btnRect.width / 2 - pickerRect.width / 2;
      let top = btnRect.top - pickerRect.height - 12;

      if (left < 12) left = 12;
      if (left + pickerRect.width > window.innerWidth - 12) {
        left = window.innerWidth - pickerRect.width - 12;
      }
      if (top < 12) {
        top = btnRect.bottom + 12;
      }

      picker.style.left = `${left}px`;
      picker.style.top = `${top}px`;
      setActiveOption(0);
    });
  }

  function detectOptionByPoint(x, y) {
    const options = [...picker.querySelectorAll(".letterOption")];
    return options.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
  }

  function resetPointerState() {
    clearTimeout(pressTimer);
    if (activeBtn) activeBtn.classList.remove("is-pressed");
    activeBtn = null;
    longPressTriggered = false;
    pointerActive = false;
    pointerId = null;
    activeLetters = [];
    activeOptionIndex = -1;
  }

  function finishLongPressSelection() {
    if (longPressTriggered && activeOptionIndex >= 0 && activeLetters[activeOptionIndex]) {
      addChar(activeLetters[activeOptionIndex]);
    }
    hidePicker();
    resetPointerState();
  }

  clearBtn?.addEventListener("click", clearInput);
  backBtn?.addEventListener("click", backspace);

  pad.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".nineKey");
    if (!btn) return;

    e.preventDefault();

    activeBtn = btn;
    pointerActive = true;
    pointerId = e.pointerId;
    longPressTriggered = false;
    activeBtn.classList.add("is-pressed");

    const letters = btn.dataset.letters || "";
    pressTimer = setTimeout(() => {
      if (!pointerActive || !activeBtn || !letters) return;
      longPressTriggered = true;
      showPicker(activeBtn, letters);
    }, LONG_PRESS_MS);
  });

  pad.addEventListener("pointermove", (e) => {
    if (!pointerActive || e.pointerId !== pointerId || !longPressTriggered) return;
    const idx = detectOptionByPoint(e.clientX, e.clientY);
    if (idx >= 0) setActiveOption(idx);
  });

  function handlePointerEnd(e) {
    if (!pointerActive || e.pointerId !== pointerId || !activeBtn) return;

    clearTimeout(pressTimer);

    if (longPressTriggered) {
      finishLongPressSelection();
      return;
    }

    const num = activeBtn.dataset.num;
    if (num) addChar(num);

    resetPointerState();
    hidePicker();
  }

  pad.addEventListener("pointerup", handlePointerEnd);
  pad.addEventListener("pointercancel", handlePointerEnd);

  document.addEventListener("pointermove", (e) => {
    if (!pointerActive || !longPressTriggered) return;
    const idx = detectOptionByPoint(e.clientX, e.clientY);
    if (idx >= 0) setActiveOption(idx);
  });

  document.addEventListener("pointerup", (e) => {
    if (!pointerActive || !activeBtn) return;

    if (longPressTriggered) {
      const idx = detectOptionByPoint(e.clientX, e.clientY);
      if (idx >= 0) setActiveOption(idx);
      finishLongPressSelection();
    }
  });
}

let clockingBound = false;
let clockAutoCloseTimer = null;
let clockingState = {
  empId: "",
  name: "",
  facePhoto: "",
  facePhotoId: ""
};

let clockCameraStream = null;
let clockAutoPhotoTimer = null;

const CLOCK_FACE_PHOTOS_KEY = "mock_clock_face_photos_state";

function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatClockTime(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatDuration(fromISO, toISO) {
  const diffMs = Math.max(0, new Date(toISO) - new Date(fromISO));
  const mins = Math.round(diffMs / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;

  if (m === 0) return `${h} 小時`;
  return `${h} 小時 ${m} 分`;
}
function loadClockFacePhotos() {
  try {
    const saved = localStorage.getItem(CLOCK_FACE_PHOTOS_KEY);
    return saved ? JSON.parse(saved) : { photos: [] };
  } catch (err) {
    console.error("loadClockFacePhotos failed:", err);
    return { photos: [] };
  }
}

function saveClockFacePhoto(photoItem) {
  const data = loadClockFacePhotos();

  data.photos = Array.isArray(data.photos) ? data.photos : [];
  data.photos.unshift(photoItem);

  // localStorage 容量有限，先保留最近 80 張
  data.photos = data.photos.slice(0, 80);

  localStorage.setItem(CLOCK_FACE_PHOTOS_KEY, JSON.stringify(data));
}

function stopClockCamera() {
  clearTimeout(clockAutoPhotoTimer);
  clockAutoPhotoTimer = null;

  if (clockCameraStream) {
    clockCameraStream.getTracks().forEach(track => track.stop());
    clockCameraStream = null;
  }

  const video = document.getElementById("clockCameraVideo");
  if (video) {
    video.srcObject = null;
  }
}

async function startClockCamera() {

  const video = document.getElementById("clockCameraVideo");
  const hint = document.getElementById("clockPhotoHint");
  const captureBtn = document.getElementById("clockCaptureBtn");
  const confirmBtn = document.getElementById("clockPhotoConfirmBtn");
  const preview = document.getElementById("clockPhotoPreview");

  clockingState.facePhoto = "";
  clockingState.facePhotoId = "";

  if (preview) {
    preview.src = "";
    preview.classList.add("d-none");
  }

  if (confirmBtn) confirmBtn.disabled = true;
  if (captureBtn) captureBtn.disabled = false;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (hint) {
      hint.textContent = "目前瀏覽器或網址不支援開啟鏡頭，請使用 localhost 或 HTTPS。";
      hint.classList.remove("d-none");
    }
    return;
  }

  try {
    stopClockCamera();

    clockCameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    if (video) {
      video.srcObject = clockCameraStream;
      await video.play();
    }

    if (hint) {
      hint.textContent = "請看向鏡頭，系統即將自動拍照...";
      hint.classList.remove("d-none");
    }

    clearTimeout(clockAutoPhotoTimer);
    clockAutoPhotoTimer = setTimeout(() => {
      captureClockFacePhoto(true);
    }, 1200);
  } catch (err) {
    console.error("startClockCamera failed:", err);

    if (hint) {
      hint.textContent = "無法開啟鏡頭，請確認瀏覽器已允許相機權限。";
      hint.classList.remove("d-none");
    }
  }
}

function openClockPhotoStep() {
  const nameEl = document.getElementById("clockPhotoName");
  if (nameEl) nameEl.textContent = clockingState.name;

  showClockStep("clockStepPhoto");
  startClockCamera();
}

function captureClockFacePhoto(autoNext = false) {
  const video = document.getElementById("clockCameraVideo");
  const canvas = document.getElementById("clockCameraCanvas");
  const preview = document.getElementById("clockPhotoPreview");
  const hint = document.getElementById("clockPhotoHint");
  const confirmBtn = document.getElementById("clockPhotoConfirmBtn");

  if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
    if (hint) {
      hint.textContent = "鏡頭還沒準備好，請稍等一下再拍。";
      hint.classList.remove("d-none");
    }
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  const photoId = `${clockingState.empId}_${Date.now()}`;

  clockingState.facePhoto = dataUrl;
  clockingState.facePhotoId = photoId;

  saveClockFacePhoto({
    id: photoId,
    empId: clockingState.empId,
    name: clockingState.name,
    photo: dataUrl,
    createdAt: new Date().toISOString()
  });

  if (preview) {
    preview.src = dataUrl;
    preview.classList.remove("d-none");
  }

  if (confirmBtn) {
    confirmBtn.disabled = false;
  }

  if (hint) {
    hint.textContent = autoNext ? "已完成拍照，正在進入打卡選擇..." : "為維護員工權益，照片已暫存在本機。";
    hint.classList.remove("d-none");
  }

  if (autoNext) {
    setTimeout(() => {
      confirmClockFacePhoto();
    }, 700);
  }
}

function confirmClockFacePhoto() {
  if (!clockingState.facePhoto) {
    const hint = document.getElementById("clockPhotoHint");

    if (hint) {
      hint.textContent = "請先拍照，再繼續打卡。";
      hint.classList.remove("d-none");
    }

    return;
  }

  stopClockCamera();
  showClockStep("clockStepC");
}

async function loadClockLogs() {
  return await apiGetClockLogs();
}

async function saveClockLogs(data) {
  return await apiSaveClockLogs(data);
}

function showClockStep(idToShow) {
  ["clockStepA", "clockStepPhoto", "clockStepC", "clockStepRating", "clockStepD"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("d-none", id !== idToShow);
  });
}

function resetClockingModal() {
  clockingState = {
    empId: "",
    name: "",
    facePhoto: "",
    facePhotoId: ""
  };

  const input = document.getElementById("clockEmpId");
  if (input) input.value = "";

  document.getElementById("clockConfirmEmpId").textContent = "";
  document.getElementById("clockHelloName").textContent = "";
  document.getElementById("clockEmpHint")?.classList.add("d-none");
  document.getElementById("clockFinishSub").textContent = "";
  document.getElementById("clockFinishMeta").textContent = "";
  clearTimeout(clockAutoCloseTimer);

  stopClockCamera();

  document.getElementById("clockStepAdmin")?.classList.add("d-none");

  showClockStep("clockStepA");
}

// ===== 管理查詢面板 =====

function showClockStepAdmin() {
  ["clockStepA", "clockStepPhoto", "clockStepB", "clockStepC",
   "clockStepRating", "clockStepD", "clockStepAdmin"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("d-none", id !== "clockStepAdmin");
  });
}

async function openClockAdmin() {
  showClockStepAdmin();

  // 填充員工下拉
  try {
    const empData = await apiGetEmployees();
    const sel = document.getElementById("adminEmpFilter");
    if (sel) {
      sel.innerHTML = '<option value="">全部員工</option>';
      (empData.employees || []).forEach((emp) => {
        const opt = document.createElement("option");
        opt.value = emp.id;
        opt.textContent = `${emp.name}（${emp.id}）`;
        sel.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("openClockAdmin load employees failed:", err);
  }

  // 預設日期為今天
  const dateInput = document.getElementById("adminDateFilter");
  if (dateInput && !dateInput.value) {
    dateInput.value = getTodayKey();
  }

  await renderAdminRecords();

  // 綁定查詢按鈕（只綁一次）
  const searchBtn = document.getElementById("adminSearchBtn");
  if (searchBtn && !searchBtn._adminBound) {
    searchBtn._adminBound = true;
    searchBtn.addEventListener("click", renderAdminRecords);
  }
}

async function renderAdminRecords() {
  const list = document.getElementById("adminRecordList");
  if (!list) return;

  list.innerHTML = '<div class="adminNoData">載入中...</div>';

  try {
    const empId = document.getElementById("adminEmpFilter")?.value || "";
    const dateVal = document.getElementById("adminDateFilter")?.value || "";

    const clockData = await apiGetClockLogs();
    const logsByDate = clockData.logsByDate || {};

    // 收集所有符合條件的 (date, empId) 組合
    const records = [];

    Object.entries(logsByDate).forEach(([date, dayLogs]) => {
      if (dateVal && date !== dateVal) return;

      Object.entries(dayLogs).forEach(([eid, logs]) => {
        if (empId && eid !== empId) return;

        const inLog  = (logs || []).find(r => r.type === "in");
        const outLog = (logs || []).find(r => r.type === "out");

        if (!inLog && !outLog) return;

        const name = inLog?.name || outLog?.name || eid;
        const inAt  = inLog?.at  || null;
        const outAt = outLog?.at || null;

        let hoursText = "—";
        let hoursNum  = null;
        if (inAt && outAt) {
          const diffMs = Math.max(0, new Date(outAt) - new Date(inAt));
          const mins = Math.round(diffMs / 60000);
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          hoursNum  = diffMs / 3600000;
          hoursText = m === 0 ? `${h}h` : `${h}h ${m}m`;
        }

        records.push({
          date,
          empId: eid,
          name,
          inAt,
          outAt,
          hoursText,
          hoursNum,
          inPhoto:  inLog?.facePhoto  || "",
          outPhoto: outLog?.facePhoto || "",
          rating:   outLog?.rating    || "",
        });
      });
    });

    // 依日期倒序
    records.sort((a, b) => b.date.localeCompare(a.date) || a.empId.localeCompare(b.empId));

    if (records.length === 0) {
      list.innerHTML = '<div class="adminNoData">查無出勤紀錄</div>';
      return;
    }

    list.innerHTML = records.map((r, idx) => {
      const inTime  = r.inAt  ? formatClockTime(new Date(r.inAt))  : "—";
      const outTime = r.outAt ? formatClockTime(new Date(r.outAt)) : "—";

      const inPhotoHtml = r.inPhoto
        ? `<img class="adminPhotoImg" src="${r.inPhoto}" alt="上班照">`
        : `<div class="adminPhotoImgEmpty">無照片</div>`;

      const outPhotoHtml = r.outPhoto
        ? `<img class="adminPhotoImg" src="${r.outPhoto}" alt="下班照">`
        : `<div class="adminPhotoImgEmpty">無照片</div>`;

      const overtime = r.hoursNum !== null && r.hoursNum > 8;

      return `
        <div class="adminRecord" data-idx="${idx}">
          <div class="adminRecordHeader">
            <div class="adminRecordLeft">
              <div class="adminRecordName">${r.name} <span style="font-size:0.78rem;color:#aaa;font-weight:400;">#${r.empId}</span></div>
              <div class="adminRecordDate">${r.date}</div>
            </div>
            <div class="adminRecordRight">
              <div class="adminRecordTimes">🟢${inTime} ／ 🔴${outTime}</div>
              <div class="adminRecordHours" style="${overtime ? 'color:#e67e22;' : ''}">${r.hoursText}${overtime ? ' ⚡' : ''}</div>
              <div class="adminRecordArrow">▼</div>
            </div>
          </div>
          <div class="adminRecordDetail">
            <div class="adminPhotoRow">
              <div class="adminPhotoItem">
                <div class="adminPhotoLabel">上班打卡照</div>
                ${inPhotoHtml}
              </div>
              <div class="adminPhotoItem">
                <div class="adminPhotoLabel">下班打卡照</div>
                ${outPhotoHtml}
              </div>
            </div>
            <div class="adminDetailStats">
              <div class="adminDetailStat">
                <div class="adminDetailStatLabel">上班時間</div>
                <div class="adminDetailStatValue">${inTime}</div>
              </div>
              <div class="adminDetailStat">
                <div class="adminDetailStatLabel">下班時間</div>
                <div class="adminDetailStatValue">${outTime}</div>
              </div>
              <div class="adminDetailStat">
                <div class="adminDetailStatLabel">工時</div>
                <div class="adminDetailStatValue">${r.hoursText}</div>
              </div>
              ${r.hoursNum !== null ? `
              <div class="adminDetailStat">
                <div class="adminDetailStatLabel">加班</div>
                <div class="adminDetailStatValue">${overtime ? (r.hoursNum - 8).toFixed(1) + 'h' : '無'}</div>
              </div>` : ''}
              <div class="adminDetailStat">
                <div class="adminDetailStatLabel">感受</div>
                <div class="adminDetailStatValue">${
                  r.rating === 'good'   ? '🙂 很好' :
                  r.rating === 'normal' ? '😐 普通' :
                  r.rating === 'bad'    ? '☹️ 不太好' : '—'
                }</div>
              </div>
            </div>
      `;
    }).join("");

    // 下拉展開邏輯
    list.querySelectorAll(".adminRecordHeader").forEach((header) => {
      header.addEventListener("click", () => {
        const card = header.closest(".adminRecord");
        card.classList.toggle("is-open");
      });
    });

  } catch (err) {
    console.error("renderAdminRecords failed:", err);
    list.innerHTML = '<div class="adminNoData">載入失敗，請稍後再試</div>';
  }
}

function openClockingModal() {
  resetClockingModal();
  bootstrap.Modal.getOrCreateInstance(document.getElementById("clockingModal")).show();
}

async function goClockConfirm() {
  const empId = document.getElementById("clockEmpId")?.value.trim() ?? "";
  const hintEl = document.getElementById("clockEmpHint");

  if (hintEl) {
    hintEl.textContent = "";
    hintEl.classList.add("d-none");
  }

  try {
    const data = await apiGetEmployees();
    const emp = (data.employees || []).find((x) => x.id === empId);

    if (!emp) {
      if (hintEl) {
        hintEl.textContent = "查無此員工編號";
        hintEl.classList.remove("d-none");
      }
      return;
    }

    clockingState = { empId: emp.id, name: emp.name };

    document.getElementById("clockConfirmEmpId").textContent = emp.id;
    document.getElementById("clockConfirmName").textContent = emp.name;
    document.getElementById("clockHelloName").textContent = emp.name;
    document.getElementById("clockRatingName").textContent = emp.name;

    openClockPhotoStep();
  } catch (err) {
    console.error("goClockConfirm failed:", err);
    if (hintEl) {
      hintEl.textContent = "讀取員工資料失敗";
      hintEl.classList.remove("d-none");
    }
  }
}

async function getTodayEmployeeLogs(empId) {
  const data = await apiGetClockLogs();
  const todayKey = getTodayKey();
  const logsByDate = data.logsByDate || {};
  const dayLogs = logsByDate[todayKey] || {};
  return dayLogs[empId] || [];
}
async function submitClockIn() {
  if (!clockingState.facePhoto) {
    openClockPhotoStep();
    return;
  }
  const now = new Date();
  const todayKey = getTodayKey();
  const data = await loadClockLogs();

  data.logsByDate = data.logsByDate || {};
  const dayLogs = data.logsByDate[todayKey] || {};
  const empLogs = dayLogs[clockingState.empId] || [];

  const hasClockIn = empLogs.some(row => row.type === "in");

  if (hasClockIn) {
    document.getElementById("clockFinishTitle").textContent = clockingState.name;
    document.getElementById("clockFinishSub").textContent = "今天已經打過上班卡囉";
    document.getElementById("clockFinishMeta").textContent = "同一天不能重複上班打卡";

    showClockStep("clockStepD");
    clockAutoCloseTimer = setTimeout(() => {
      bootstrap.Modal.getOrCreateInstance(document.getElementById("clockingModal")).hide();
    }, 5000);
    return;
  }

  empLogs.push({
    type: "in",
    at: now.toISOString(),
    name: clockingState.name,
    empId: clockingState.empId,
    facePhotoId: clockingState.facePhotoId,
    facePhoto: clockingState.facePhoto
  });

  dayLogs[clockingState.empId] = empLogs;
  data.logsByDate[todayKey] = dayLogs;

  await saveClockLogs(data);

  document.getElementById("clockFinishTitle").textContent = clockingState.name;
  document.getElementById("clockFinishSub").textContent = "哈囉！今天一起加油吧！💪";
  document.getElementById("clockFinishMeta").textContent = `今天 ${formatClockTime(now)} 打卡`;

  showClockStep("clockStepD");
  clockAutoCloseTimer = setTimeout(() => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById("clockingModal")).hide();
  }, 5000);
}

async function submitClockOut(rating = "") {
  if (!clockingState.facePhoto) {
    openClockPhotoStep();
    return;
  }
  const now = new Date();
  const todayKey = getTodayKey();
  const data = await loadClockLogs();

  data.logsByDate = data.logsByDate || {};
  const dayLogs = data.logsByDate[todayKey] || {};
  const empLogs = dayLogs[clockingState.empId] || [];

  const lastIn = empLogs.find(row => row.type === "in");
  const lastOut = empLogs.find(row => row.type === "out");

  if (!lastIn) {
    document.getElementById("clockFinishTitle").textContent = clockingState.name;
    document.getElementById("clockFinishSub").textContent = "今天還沒有上班打卡紀錄喔";
    document.getElementById("clockFinishMeta").textContent = "請先完成上班打卡，再進行下班打卡";

    showClockStep("clockStepD");
    clockAutoCloseTimer = setTimeout(() => {
      bootstrap.Modal.getOrCreateInstance(document.getElementById("clockingModal")).hide();
    }, 5000);
    return;
  }

  if (lastOut) {
    document.getElementById("clockFinishTitle").textContent = clockingState.name;
    document.getElementById("clockFinishSub").textContent = "今天已經打過下班卡囉";
    document.getElementById("clockFinishMeta").textContent = "同一天不能重複下班打卡";

    showClockStep("clockStepD");
    clockAutoCloseTimer = setTimeout(() => {
      bootstrap.Modal.getOrCreateInstance(document.getElementById("clockingModal")).hide();
    }, 5000);
    return;
  }

  empLogs.push({
    type: "out",
    at: now.toISOString(),
    name: clockingState.name,
    empId: clockingState.empId,
    rating: rating,
    facePhotoId: clockingState.facePhotoId,
    facePhoto: clockingState.facePhoto
  });

  dayLogs[clockingState.empId] = empLogs;
  data.logsByDate[todayKey] = dayLogs;

  await saveClockLogs(data);

  const ratingTextMap = {
    good: "今天狀態：很好 🙂",
    normal: "今天狀態：普通 😐",
    bad: "今天狀態：不太好 ☹️"
  };

  document.getElementById("clockFinishTitle").textContent = clockingState.name;
  document.getElementById("clockFinishSub").textContent = "辛苦了～好好休息！";
  document.getElementById("clockFinishMeta").textContent =
    `今天 ${formatClockTime(new Date(lastIn.at))} 打卡～${formatClockTime(now)} 離開\n共 ${formatDuration(lastIn.at, now)}\n${ratingTextMap[rating] || ""}`;

  showClockStep("clockStepD");

  clockAutoCloseTimer = setTimeout(() => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById("clockingModal")).hide();
  }, 5000);
}

function bindClockingKiosk() {
  if (clockingBound) return;
  clockingBound = true;

  const trigger = document.getElementById("clockingLogoBtn");
  let pressTimer = null;
  let clockOpened = false;

  const startPress = (e) => {
  e.preventDefault();
  clockOpened = false;
  clearTimeout(pressTimer);

  pressTimer = setTimeout(() => {
    clockOpened = true;
    openClockingModal();
  }, 3000);
  };

  const endPress = (e) => {
    if (e) e.preventDefault();
    clearTimeout(pressTimer);
  };

  trigger?.addEventListener("pointerdown", startPress, { passive: false });
  trigger?.addEventListener("pointerup", endPress, { passive: false });
  trigger?.addEventListener("pointerleave", endPress, { passive: false });
  trigger?.addEventListener("pointercancel", endPress, { passive: false });

  trigger?.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  trigger?.addEventListener("touchstart", startPress, { passive: false });
  trigger?.addEventListener("touchend", endPress, { passive: false });
  trigger?.addEventListener("touchcancel", endPress, { passive: false });

  window.addEventListener("pointercancel", endPress);

  document.getElementById("clockingCloseBtn")?.addEventListener("click", () => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById("clockingModal")).hide();
  });

  document.getElementById("clockEditBtn")?.addEventListener("click", () => {
    showClockStep("clockStepA");
  });

  document.getElementById("clockConfirmBtn")?.addEventListener("click", () => {
    showClockStep("clockStepC");
  });

  document.getElementById("clockInBtn")?.addEventListener("click", submitClockIn);

  document.getElementById("clockOutBtn")?.addEventListener("click", async () => {
    const logs = await getTodayEmployeeLogs(clockingState.empId);
    const lastIn = logs.find(row => row.type === "in");
    const lastOut = logs.find(row => row.type === "out");

    if (!lastIn || lastOut) {
      submitClockOut();
      return;
    }

    document.getElementById("clockRatingName").textContent = clockingState.name;
    showClockStep("clockStepRating");
  });

  document.querySelectorAll(".clockRatingBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const rating = btn.dataset.rating;
      submitClockOut(rating);
    });
  });

  document.getElementById("clockKeypad")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const k = btn.dataset.k;
    const input = document.getElementById("clockEmpId");
    if (!input) return;

    if (k === "back") {
      input.value = input.value.slice(0, -1);
    } else if (k === "ok") {
      if ((input.value || "").trim() === "8888") {
        openClockAdmin();
      } else {
        goClockConfirm();
      }
      return;
    } else {
      input.value = (input.value + k).slice(0, 4);
    }

    document.getElementById("clockEmpHint")?.classList.add("d-none");
  });

  document.getElementById("clockingModal")?.addEventListener("hidden.bs.modal", () => {
    clearTimeout(clockAutoCloseTimer);
    stopClockCamera();
    resetClockingModal();
  });

  document.getElementById("clockConfirmBtn")?.addEventListener("click", openClockPhotoStep);

  document.getElementById("clockCaptureBtn")?.addEventListener("click", captureClockFacePhoto);

  document.getElementById("clockRetakeBtn")?.addEventListener("click", () => {
    clockingState.facePhoto = "";
    clockingState.facePhotoId = "";
    startClockCamera();
  });

  document.getElementById("clockPhotoConfirmBtn")?.addEventListener("click", confirmClockFacePhoto);
}

// ===== 啟動 =====
document.addEventListener("DOMContentLoaded", () => {
  updateOverviewFromQueue();

  bindNav();
  bindQueryStatusKiosk();
  bindClockingKiosk();
  bindWaitingKiosk();
  bindDeliveryKiosk();
  bindReserveKiosk();
  bindDeliveryT9Keyboard();

  renderNowCallingMini();
  renderCallModal();
  renderTakeawayWait();
  renderDeliveryPickupModal();
  renderIndoorWaitingCount();

  setInterval(async () => {
    console.log("每 10 秒自動叫下一號");

    const result = await callNextNumber();

    console.log("自動叫號結果：", result);

    renderTakeawayWait();
    renderDeliveryPickupModal();
  }, 10000);

});

// 叫下一號
async function callNextNumber() {
  try {
    const result = await apiCallNextWaiting();

    console.log("callNextNumber result:", result);

    if (result && result.nextReady) {
      const box = document.getElementById("callMiniNums");

      if (box) {
        box.innerHTML = `<div class="callMiniNo">${result.nextReady}</div>`;
      }

      renderCallModal();
      renderIndoorWaitingCount();
      updateOverviewFromQueue();

      triggerNowCallingFlash(result.nextReady);
    } else {
      renderNowCallingMini();
      renderCallModal();
      renderIndoorWaitingCount();
      updateOverviewFromQueue();
    }

    return result;
  } catch (err) {
    console.error("callNextNumber failed:", err);
    return null;
  }
}

// ===== 預約 =====
let reserveType = "";
let reserveAdults = 0;
let reserveKids = 0;
let reserveChairs = 0;
let reserveDate = "";
let reserveTime = "";
let reserveAutoClose = null;
let reserveBound = false;
let reserveFp = null;
let reserveTodayPeriod = "morning";
let reserveFuturePeriod = "morning";

async function getTodayReservations() {
  const list = await apiGetReservations();
  const today = getTodayStr();
  return list.filter((x) => x.type === "today" && x.date === today);
}

async function getFutureReservations() {
  const list = await apiGetReservations();
  return list.filter((x) => x.type === "future");
}

async function getTodayWaitingQueue() {
  const data = await apiGetWaitlist();
  return (data.queue || []).filter((x) => x.status === "waiting");
}

function getTodayStr() {
  return getTaipeiTodayStr();
}

function buildSlots(startH, startM, endH, endM) {
  const arr = [];
  const cur = new Date();
  cur.setHours(startH, startM, 0, 0);

  const end = new Date();
  end.setHours(endH, endM, 0, 0);

  while (cur <= end) {
    const hh = String(cur.getHours()).padStart(2, "0");
    const mm = String(cur.getMinutes()).padStart(2, "0");
    arr.push(`${hh}:${mm}`);
    cur.setMinutes(cur.getMinutes() + 30);
  }
  return arr;
}

function getReserveSlotsByPeriod(period, mode = reserveType) {
  const slots = getFutureAllSlots();

  if (period === "morning") {
    return slots.filter((t) => t >= "09:00" && t <= "12:30");
  }

  if (period === "afternoon") {
    if (mode === "today") {
      return slots.filter((t) => t >= "13:00" && t <= "22:00");
    }
    return slots.filter((t) => t >= "13:00" && t <= "17:30");
  }

  if (period === "night") {
    return slots.filter((t) => t >= "18:00" && t <= "22:00");
  }

  return slots;
}

function getTaipeiNow() {
  const now = new Date();
  const taipeiStr = now.toLocaleString("sv-SE", { timeZone: "Asia/Taipei" });
  return new Date(taipeiStr.replace(" ", "T"));
}

function getTaipeiTodayStr() {
  const now = getTaipeiNow();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isPastTodaySlot(time) {
  if (reserveDate !== getTaipeiTodayStr()) return false;

  const now = getTaipeiNow();
  const [hh, mm] = time.split(":").map(Number);

  const slotDate = new Date(now);
  slotDate.setHours(hh, mm, 0, 0);

  return slotDate < now;
}
function showReserveStep(idToShow) {
  [
    "reserveStepA",
    "reserveStepTodayPeople",
    "reserveStepTodayTime",
    "reserveStepFuturePeople",
    "reserveStepFutureDateTime",
    "reserveStepPhone",
    "reserveStepConfirm",
    "reserveStepDone"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("d-none", id !== idToShow);
  });
}

function renderTodayPickedInfo() {
  const el = document.getElementById("reserveTodayPickedInfo");
  if (!el) return;

  const chairText = reserveChairs > 0 ? `｜兒童椅 ${reserveChairs}` : "";
  el.textContent = `目前人數：大人 ${reserveAdults}｜兒童 ${reserveKids}${chairText}`;
}

function refreshReservePeopleUI() {
  ["rAdultCnt", "fAdultCnt"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = reserveAdults;
  });

  ["rKidCnt", "fKidCnt"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = reserveKids;
  });

  ["rChairCnt", "fChairCnt"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = reserveChairs;
  });
}

function getReservePeopleCount() {
  return reserveAdults + reserveKids;
}

async function getTodayWaitingPeopleCount() {
  const q = await getTodayWaitingQueue();
  return q.reduce((sum, x) => sum + (Number(x.adults) || 0) + (Number(x.kids) || 0), 0);
}

async function getTodayReservedByTime(time) {
  const list = await getTodayReservations();
  return list
    .filter((x) => x.date === getTodayStr() && x.time === time)
    .reduce((sum, x) => sum + (Number(x.adults) || 0) + (Number(x.kids) || 0), 0);
}

async function getFutureReservedByDateTime(date, time) {
  const list = await getFutureReservations();
  return list
    .filter((x) => x.date === date && x.time === time)
    .reduce((sum, x) => sum + (Number(x.adults) || 0) + (Number(x.kids) || 0), 0);
}

async function getTodayWaitingPeopleCountByTime(targetTime) {
  const q = await getTodayWaitingQueue();

  const sorted = q.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const timeSlots = getReserveSlotsByPeriod("morning").concat(getReserveSlotsByPeriod("afternoon"));

  const slotMap = {};
  timeSlots.forEach((t) => (slotMap[t] = 0));

  sorted.forEach((item, idx) => {
    const people = (Number(item.adults) || 0) + (Number(item.kids) || 0);
    const slotIndex = Math.min(Math.floor(idx / 3), timeSlots.length - 1);
    const slot = timeSlots[slotIndex];
    slotMap[slot] = (slotMap[slot] || 0) + people;
  });

  return slotMap[targetTime] || 0;
}

async function canBookToday(time, count) {
  const used = await getTodayReservedByTime(time);
  const waiting = await getTodayWaitingPeopleCountByTime(time);
  return used + waiting + count <= 20;
}

function getFutureAllSlots() {
  return [
    ...buildSlots(9, 0, 12, 30),
    ...buildSlots(13, 0, 22, 0)
  ];
}

function getTomorrowStr() {
  const d = getTaipeiNow();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function hasFutureCapacityOnDate(date, count = 1) {
  const slots = getFutureAllSlots();
  for (const time of slots) {
    if (await canBookFuture(date, time, count)) return true;
  }
  return false;
}

function renderFuturePickedInfo() {
  const el = document.getElementById("reserveFuturePickedInfo");
  if (!el) return;

  const chairText = reserveChairs > 0 ? `｜兒童椅 ${reserveChairs}` : "";
  const dateText = reserveDate ? `日期：${reserveDate}` : "請先選日期";
  el.textContent = `${dateText}｜大人 ${reserveAdults}｜兒童 ${reserveKids}${chairText}`;
}

async function canBookFuture(date, time, count) {
  const used = await getFutureReservedByDateTime(date, time);
  return used + count <= 10;
}


async function renderTodayReserveSlots(period = reserveTodayPeriod) {
  const box = document.getElementById("todayTimeGrid");
  if (!box) return;

  reserveTodayPeriod = period;

  const people = getReservePeopleCount();
  if (people <= 0) {
    box.innerHTML = "";
    return;
  }

  const allSlots = getReserveSlotsByPeriod(period, "today").filter((time) => !isPastTodaySlot(time));
  const result = [];

  for (const time of allSlots) {
    if (await canBookToday(time, people)) result.push(time);
  }

  if (!result.length) {
    box.innerHTML = `<div class="reserveEmptyText">今日已無可預約時段</div>`;
    return;
  }

  box.innerHTML = result.map((time) => `
    <button type="button"
      class="timeItem ${reserveTime === time ? "active" : ""}"
      data-r-time="${time}">
      ${time}
    </button>
  `).join("");
}   
async function renderFutureReserveSlots(period = reserveFuturePeriod) {
  const box = document.getElementById("futureTimeGrid");
  if (!box) return;

  reserveFuturePeriod = period;

  const people = getReservePeopleCount();
  if (people <= 0 || !reserveDate) {
    box.innerHTML = "";
    return;
  }

  const allSlots = getReserveSlotsByPeriod(period, "future");
  const result = [];

  for (const time of allSlots) {
    if (await canBookFuture(reserveDate, time, people)) {
      result.push(time);
    }
  }

  if (!result.length) {
    box.innerHTML = `<div class="reserveEmptyText">此日期此時段已無可預約時段</div>`;
    return;
  }

  box.innerHTML = result.map((time) => `
    <button type="button"
      class="timeItem ${reserveTime === time ? "active" : ""}"
      data-r-time="${time}">
      ${time}
    </button>
  `).join("");
}
async function initReserveCalendar() {
  const cal = document.getElementById("calendar");
  if (!cal || typeof flatpickr === "undefined") return;

  if (reserveFp) {
    reserveFp.destroy();
    reserveFp = null;
  }

  reserveFp = flatpickr("#calendar", {
    inline: true,
    locale: flatpickr.l10ns.zh_tw,
    defaultDate: reserveDate || getTomorrowStr(),
    minDate: getTomorrowStr(),
    monthSelectorType: "dropdown",
    prevArrow: "",
    nextArrow: "",
    showMonths: 1,
    onChange: async function(_, dateStr) {
      reserveDate = dateStr;
      reserveTime = "";
      renderFuturePickedInfo();
      await renderFutureReserveSlots(reserveFuturePeriod);
    }
  });
}

function openReserveModal() {
  reserveType = "";
  reserveAdults = 0;
  reserveKids = 0;
  reserveChairs = 0;
  reserveDate = getTodayStr();
  reserveTime = "";

  const phone = document.getElementById("reservePhone");

  if (phone) phone.value = "";
  hidePhoneHint("reservePhoneHint");
  hideInlineHint("reserveTodayTimeHint");
  hideInlineHint("reserveFutureDateTimeHint");

  clearTimeout(reserveAutoClose);
  refreshReservePeopleUI();
  setReserveModalTitle("預約");
  showReserveStep("reserveStepA");

  const modalEl = document.getElementById("reserveModal");
  if (!modalEl) return;

  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function setReserveModalTitle(text) {
  const title = document.querySelector("#reserveModal .modal-title");
  if (title) title.textContent = text;
}

function buildReserveConfirmText() {
  const chairText = reserveChairs > 0 ? `，${reserveChairs}張兒童椅` : "";
  return `時間：${reserveDate} ${reserveTime}｜人數：${reserveAdults}大${reserveKids}小${chairText}`;
}

async function saveReservationRecord(phone) {
  const item = {
    id: "R" + Date.now(),
    type: reserveType,
    date: reserveDate,
    time: reserveTime,
    adults: reserveAdults,
    kids: reserveKids,
    chairs: reserveChairs,
    phone,
    createdAt: new Date().toISOString()
  };

  await apiCreateReservation(item);
  return item;
}

function buildReserveSmsMessage(item) {
  return `您好～感謝您預約鬍鬚張-XX店！
時間：${item.date} ${item.time}
地點：台北市○○路○○號
若需要更改時間，歡迎提前和我們聯繫，謝謝您！
我們的聯絡方式：（02)8888-8888`;
}

function showReserveDonePage() {
  const done = document.getElementById("reserveDoneText");
  if (done) {
    done.innerHTML = `
      請注意訊息，我們將傳預約提醒給您～<br>
      <span style="font-size: 0.8em; line-height: 1.5;">
      提醒您：請於預約時間前到店，並向店員告知手機末三碼；座位將保留 10 分鐘，逾時視同取消。
      </span>
    `;
  }
  showReserveStep("reserveStepDone");
}

function bindReserveKiosk() {
  if (reserveBound) return;
  reserveBound = true;

  document.getElementById("reserveCloseBtn")?.addEventListener("click", () => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById("reserveModal")).hide();
  });
  document.getElementById("goReserveToday")?.addEventListener("click", () => {
    reserveType = "today";
    reserveDate = getTodayStr();
    reserveTime = "";
    reserveAdults = 0;
    reserveKids = 0;
    reserveChairs = 0;
    reserveTodayPeriod = "morning";

    refreshReservePeopleUI();
    setReserveModalTitle("當日預約");
    showReserveStep("reserveStepTodayPeople");
  });

  document.getElementById("goReserveFuture")?.addEventListener("click", () => {
    reserveType = "future";
    reserveDate = "";
    reserveTime = "";
    reserveAdults = 0;
    reserveKids = 0;
    reserveChairs = 0;

    refreshReservePeopleUI();
    setReserveModalTitle("未來預約");
    showReserveStep("reserveStepFuturePeople");
  });
  document.getElementById("todayTimeBackBtn")?.addEventListener("click", () => {
    reserveTime = "";
    showReserveStep("reserveStepTodayPeople");
  });

  document.getElementById("todayTimeConfirmBtn")?.addEventListener("click", () => {
    if (!reserveTime) {
      showInlineHint("reserveTodayTimeHint", "請先選擇時間");
      return;
    }

    hideInlineHint("reserveTodayTimeHint");
    showReserveStep("reserveStepPhone");
  });



  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const op = btn.dataset.rOp || btn.dataset.fOp;
    if (op) {
      const total = () => reserveAdults + reserveKids;
      const clamp0 = (x) => Math.max(0, x);

      if (op === "adult+" && total() < 20) reserveAdults++;
      if (op === "adult-") reserveAdults = clamp0(reserveAdults - 1);

      if (op === "kid+" && total() < 20) reserveKids++;
      if (op === "kid-") reserveKids = clamp0(reserveKids - 1);

      if (op === "chair+" && reserveChairs < reserveKids && reserveChairs < 4) reserveChairs++;
      if (op === "chair-") reserveChairs = clamp0(reserveChairs - 1);

      if (reserveChairs > reserveKids) reserveChairs = reserveKids;

      refreshReservePeopleUI();

      if (reserveAdults > 0) {
        const todayHint = document.getElementById("reservePeopleHint");
        const futureHint = document.getElementById("reserveFuturePeopleHint");

        if (todayHint) {
          todayHint.textContent = "請先選擇人數";
          todayHint.classList.add("d-none");
        }

        if (futureHint) {
          futureHint.textContent = "請先選擇人數";
          futureHint.classList.add("d-none");
        }
      }

      if (reserveType === "today") renderTodayReserveSlots();
      if (reserveType === "future") {
        renderFuturePickedInfo();
        if (reserveFp) initReserveCalendar();
        renderFutureReserveSlots(reserveFuturePeriod);
      }
    }
  });

  document.getElementById("todayPeopleNextBtn")?.addEventListener("click", async () => {
    const hint = document.getElementById("reservePeopleHint");

    if (reserveAdults <= 0) {
      if (hint) {
        hint.textContent = "要有一位大人以上 才可完成訂位喔！";
        hint.classList.remove("d-none");
      }
      return;
    }

    hint?.classList.add("d-none");
    reserveTime = "";
    reserveTodayPeriod = "morning";
    hideInlineHint("reserveTodayTimeHint");

    document.getElementById("periodMorningBtn")?.classList.add("active");
    document.getElementById("periodAfternoonBtn")?.classList.remove("active");

    renderTodayPickedInfo();
    await renderTodayReserveSlots("morning");
    showReserveStep("reserveStepTodayTime");
  });

  document.getElementById("futureNextBtn")?.addEventListener("click", () => {
    if (getReservePeopleCount() <= 0 || !reserveDate || !reserveTime) {
      showInlineHint("reserveFutureDateTimeHint", "請先選擇日期、時間與人數");
      return;
    }

    hideInlineHint("reserveFutureDateTimeHint");
    showReserveStep("reserveStepPhone");
  });
  document.getElementById("reserveKeypad")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const key = btn.dataset.rKey;
    const input = document.getElementById("reservePhone");
    const hint = document.getElementById("reservePhoneHint");
    if (!input) return;

    if (key === "back") {
      input.value = input.value.slice(0, -1);
    } else if (key) {
      input.value = (input.value + key).slice(0, 10);
    }

    hidePhoneHint("reservePhoneHint");
  });


  document.getElementById("reserveToConfirmBtn")?.addEventListener("click", () => {
    const phone = document.getElementById("reservePhone")?.value.trim() || "";
    const hint = document.getElementById("reservePhoneHint");

    if (!isValidTaiwanMobile(phone)) {
      showPhoneHint("reservePhoneHint");
      showReserveStep("reserveStepPhone");
      return;
    }

    hidePhoneHint("reservePhoneHint");

    document.getElementById("reserveConfirmPhone").textContent = phone;
    document.getElementById("reserveConfirmMeta").textContent = buildReserveConfirmText();
    showReserveStep("reserveStepConfirm");
  });

  document.getElementById("reserveEditBtn")?.addEventListener("click", () => {
    if (reserveType === "today") {
      showReserveStep("reserveStepTodayPeople");
    } else {
      showReserveStep("reserveStepFuturePeople");
    }
  });

  document.getElementById("reserveFinalBtn")?.addEventListener("click", async () => {
    const phone = document.getElementById("reservePhone")?.value.trim() || "";
    const people = getReservePeopleCount();

    if (!isValidTaiwanMobile(phone)) {
      showPhoneHint("reservePhoneHint");
      showReserveStep("reserveStepPhone");
      return;
    }

    hidePhoneHint("reservePhoneHint");

    if (!reserveTime || !reserveDate || people <= 0) {
      if (reserveType === "today") {
        showInlineHint("reserveTodayTimeHint", "預約資料不完整，請重新確認");
        showReserveStep("reserveStepTodayTime");
      } else {
        showInlineHint("reserveFutureDateTimeHint", "預約資料不完整，請重新確認");
        showReserveStep("reserveStepFutureDateTime");
      }
      return;
    }

    if (reserveType === "today") {
      const duplicated = await apiHasActiveBookingByPhone(
        phone,
        "todayReserve",
        reserveDate,
        reserveTime
      );
      if (duplicated) {
        showPhoneHint("reservePhoneHint", "此手機同一時段已有當日預約");
        showReserveStep("reserveStepPhone");
        return;
      }
    }

    if (reserveType === "future") {
      const duplicated = await apiHasActiveBookingByPhone(
        phone,
        "futureReserve",
        reserveDate,
        reserveTime
      );
      if (duplicated) {
        showPhoneHint("reservePhoneHint", "此手機同一時段已有未來預約");
        showReserveStep("reserveStepPhone");
        return;
      }
    }

    const payload = {
      type: reserveType === "today" ? "today" : "future",
      phone,
      date: reserveDate,
      time: reserveTime,
      adults: reserveAdults,
      kids: reserveKids,
      chairs: reserveChairs
    };

    try {
      const saved = await apiCreateReservation(payload);

      console.log("reserve saved:", saved);

      showReserveDonePage();

      reserveAutoClose = setTimeout(() => {
        bootstrap.Modal.getOrCreateInstance(document.getElementById("reserveModal")).hide();
      }, 10000);
    } catch (err) {
      console.error("reserveFinalBtn failed:", err);
      showPhoneHint("reservePhoneHint", "預約送出失敗，請稍後再試一次");
      showReserveStep("reserveStepPhone");
    }
  });
  document.getElementById("periodMorningBtn")?.addEventListener("click",async () => {
    reserveTime = "";
    hideInlineHint("reserveTodayTimeHint");
    document.getElementById("periodMorningBtn")?.classList.add("active");
    document.getElementById("periodAfternoonBtn")?.classList.remove("active");
    await renderTodayReserveSlots("morning");

  });

  document.getElementById("periodAfternoonBtn")?.addEventListener("click",async () => {
    reserveTime = "";
    hideInlineHint("reserveTodayTimeHint");
    document.getElementById("periodAfternoonBtn")?.classList.add("active");
    document.getElementById("periodMorningBtn")?.classList.remove("active");
    await renderTodayReserveSlots("afternoon");
  });
  document.getElementById("futurePeopleNextBtn")?.addEventListener("click", async () => {
    const hint = document.getElementById("reserveFuturePeopleHint");

    if (getReservePeopleCount() <= 0) {
      hint?.classList.remove("d-none");
      return;
    }

    hint?.classList.add("d-none");
    reserveDate = getTomorrowStr();
    reserveTime = "";
    reserveFuturePeriod = "morning";
    hideInlineHint("reserveFutureDateTimeHint");

    await initReserveCalendar();
    renderFuturePickedInfo();
    await renderFutureReserveSlots("morning");

    document.getElementById("futureMorningBtn")?.classList.add("active");
    document.getElementById("futureAfternoonBtn")?.classList.remove("active");
    document.getElementById("futureNightBtn")?.classList.remove("active");

    showReserveStep("reserveStepFutureDateTime");
  });

  document.getElementById("futureDateBackBtn")?.addEventListener("click", () => {
    reserveDate = "";
    reserveTime = "";
    showReserveStep("reserveStepFuturePeople");
  });
  document.getElementById("futureMorningBtn")?.addEventListener("click", async () => {
    reserveFuturePeriod = "morning";
    reserveTime = "";
    document.getElementById("futureMorningBtn")?.classList.add("active");
    document.getElementById("futureAfternoonBtn")?.classList.remove("active");
    document.getElementById("futureNightBtn")?.classList.remove("active");
    await renderFutureReserveSlots("morning");
  });

  document.getElementById("futureAfternoonBtn")?.addEventListener("click", async () => {
    reserveFuturePeriod = "afternoon";
    reserveTime = "";
    document.getElementById("futureMorningBtn")?.classList.remove("active");
    document.getElementById("futureAfternoonBtn")?.classList.add("active");
    document.getElementById("futureNightBtn")?.classList.remove("active");
    await renderFutureReserveSlots("afternoon");
  });

  document.getElementById("futureNightBtn")?.addEventListener("click", async () => {
    reserveFuturePeriod = "night";
    reserveTime = "";
    document.getElementById("futureMorningBtn")?.classList.remove("active");
    document.getElementById("futureAfternoonBtn")?.classList.remove("active");
    document.getElementById("futureNightBtn")?.classList.add("active");
    await renderFutureReserveSlots("night");
  });

  document.addEventListener("click", async(e) => {
    const btn = e.target.closest("#todayTimeGrid .timeItem, #futureTimeGrid .timeItem");
    if (!btn) return;

    const time = btn.dataset.rTime;
    if (!time) return;

    reserveTime = time;

    if (reserveType === "today") {
      hideInlineHint("reserveTodayTimeHint");
      await renderTodayReserveSlots(reserveTodayPeriod);
    } else if (reserveType === "future") {
      hideInlineHint("reserveFutureDateTimeHint");
      await renderFutureReserveSlots(reserveFuturePeriod);
    }
  });
  document.getElementById("reserveModal")?.addEventListener("hidden.bs.modal", () => {
    clearTimeout(reserveAutoClose);
  });
}
let queryStatusBound = false;
let queryStatusValue = "";

function renderQueryStatusInput() {
  const box = document.getElementById("queryStatusInput");
  if (!box) return;
  box.textContent = queryStatusValue || "請輸入查詢號碼";
}

function showQueryStatusResult(html) {
  const box = document.getElementById("queryStatusResult");
  if (!box) return;
  box.innerHTML = html;
  box.classList.remove("d-none");
}

function hideQueryStatusResult() {
  const box = document.getElementById("queryStatusResult");
  if (!box) return;
  box.classList.add("d-none");
  box.innerHTML = "";
}

function getLast3(phone) {
  return String(phone || "").slice(-3);
}

function buildQueryStatusHtml(result) {
  if (!result || !result.found) {
    return `<div class="queryResultStatus">${result?.message || "查無資料"}</div>`;
  }

  if (result.type === "wait") {
    return `
      <div class="queryResultBigNo">${result.waitNo}</div>
      <div class="queryResultStatus">${result.statusText}</div>
      <div class="queryResultMeta">手機末三碼：${result.phoneLast3 || "—"}</div>
      <div class="queryResultMeta">前面尚有：${result.aheadCount ?? 0}組</div>
      <div class="queryResultMeta">預估等待：${result.waitMin ?? 0}分鐘</div>
    `;
  }

  if (result.type === "pickup") {
    return `
      <div class="queryResultBigNo">${result.pickupNo}</div>
      <div class="queryResultStatus">${result.statusText}</div>
      <div class="queryResultMeta">手機末三碼：${result.phoneLast3 || "—"}</div>
      <div class="queryResultMeta">前面尚有：${result.aheadCount ?? 0}單</div>
      <div class="queryResultMeta">預估等待：${result.waitMin ?? 0}分鐘</div>
    `;
  }

  return `<div class="queryResultStatus">查無資料</div>`;
}

function bindQueryStatusKiosk() {
  if (queryStatusBound) return;
  queryStatusBound = true;

  document.getElementById("openQueryStatusBtn")?.addEventListener("click", () => {
    queryStatusValue = "";
    renderQueryStatusInput();
    hideQueryStatusResult();
    clearQueryStatusHint();

    const callModalEl = document.getElementById("callModal");
    const inputModalEl = document.getElementById("queryStatusInputModal");

    bootstrap.Modal.getOrCreateInstance(callModalEl).hide();

    setTimeout(() => {
      bootstrap.Modal.getOrCreateInstance(inputModalEl).show();
    }, 200);
  });

  document.querySelectorAll(".queryKeypad button[data-k]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.k;
      if (!key) return;

    if (key === "back") {
      queryStatusValue = queryStatusValue.slice(0, -1);
    } else {
      const nextValue = queryStatusValue + key;

      if (/^09\d+$/.test(nextValue) && nextValue.length > 10) {
        return;
      }

      queryStatusValue = nextValue;
    }

      renderQueryStatusInput();
    });
  });

  document.getElementById("confirmQueryStatusBtn")?.addEventListener("click", async () => {
    const value = (queryStatusValue || "").trim().toUpperCase();

    if (!value) {
      showQueryStatusHint("請輸入查詢號碼");
      return;
    }

    if (/^09\d+$/.test(value) && value.length > 4 && value.length !== 10) {
      showQueryStatusHint("若輸入手機號碼，必須為 10 碼（09 開頭）");
      return;
    }

    clearQueryStatusHint();

    const inputModal = bootstrap.Modal.getOrCreateInstance(
      document.getElementById("queryStatusInputModal")
    );
    const resultModal = bootstrap.Modal.getOrCreateInstance(
      document.getElementById("queryStatusResultModal")
    );

    try {
      const result = await apiLookupStatus(value);
      showQueryStatusResult(buildQueryStatusHtml(result));

      inputModal.hide();

      setTimeout(() => {
        resultModal.show();
      }, 180);
    } catch (err) {
      console.error("query status failed:", err);
      showQueryStatusResult(`<div class="queryResultStatus">查詢失敗，請稍後再試</div>`);

      inputModal.hide();

      setTimeout(() => {
        resultModal.show();
      }, 180);
    }
  });
  document.getElementById("queryStatusResultModal")?.addEventListener("hidden.bs.modal", () => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById("queryStatusInputModal")).hide();
    bootstrap.Modal.getOrCreateInstance(document.getElementById("callModal")).show();
  });
}

function showQueryStatusHint(text) {
  const el = document.getElementById("queryStatusHint");
  if (!el) return;
  el.textContent = text || "";
}

function clearQueryStatusHint() {
  const el = document.getElementById("queryStatusHint");
  if (!el) return;
  el.textContent = "";
}

/* ===== 首頁 banner2：套餐輪播，可直接進外帶結帳 ===== */

const HOME_PROMOS = [
  {
    id: "promo_chicken_bento",
    title: "今日主推",
    name: "雞肉便當套餐",
    desc: "主餐＋配菜＋飲品",
    price: 120,
    img: "images/promo-chicken.png"
  },
  {
    id: "promo_new_bento",
    title: "新品上市",
    name: "新品雙拼套餐",
    desc: "新品限定組合",
    price: 150,
    img: "images/promo_new_bento.png"
  },
  {
    id: "promo_lunch_set",
    title: "午餐優惠",
    name: "經典午餐套餐",
    desc: "人氣主餐＋小菜",
    price: 99,
    img: "images/romo_lunch_set.png"
  },
  {
    id: "promo_family_set",
    title: "多人分享",
    name: "家庭分享套餐",
    desc: "適合 2~3 人一起吃",
    price: 299,
    img: "images/promo_family_set.png"
  }
];

let promoIndex = 0;
let promoTimer = null;
let promoStartX = 0;

function renderPromoCarousel() {
  const track = document.getElementById("promoTrack");
  const dots = document.getElementById("promoDots");
  if (!track || !dots) return;

  track.innerHTML = HOME_PROMOS.map((item, index) => `
    <div class="promoSlide ${index === promoIndex ? "active" : ""}" data-index="${index}">
      <div class="promoText">
        <div class="promoTag">${item.title}</div>
        <div class="promoName">${item.name}</div>
        <div class="promoDesc">${item.desc}</div>
        <div class="promoPrice">$${item.price}</div>
        <div class="promoHint">點選直接加入結帳</div>
      </div>

      <div class="promoImgBox">
        <img src="${item.img}" alt="${item.name}" onerror="this.style.display='none'">
      </div>
    </div>
  `).join("");

  dots.innerHTML = HOME_PROMOS.map((_, index) => `
    <button type="button" class="promoDot ${index === promoIndex ? "active" : ""}" data-index="${index}"></button>
  `).join("");

  document.querySelectorAll(".promoSlide").forEach((slide) => {
    slide.addEventListener("click", () => {
      const index = Number(slide.dataset.index);
      goPromoCheckout(HOME_PROMOS[index]);
    });
  });

  document.querySelectorAll(".promoDot").forEach((dot) => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      promoIndex = Number(dot.dataset.index);
      renderPromoCarousel();
      restartPromoTimer();
    });
  });
}

function nextPromo() {
  promoIndex = (promoIndex + 1) % HOME_PROMOS.length;
  renderPromoCarousel();
}

function prevPromo() {
  promoIndex = (promoIndex - 1 + HOME_PROMOS.length) % HOME_PROMOS.length;
  renderPromoCarousel();
}

function restartPromoTimer() {
  clearInterval(promoTimer);
  promoTimer = setInterval(nextPromo, 5000);
}

function goPromoCheckout(item) {
  const CART_KEY = "sq_takeaway_cart";

  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    cart = [];
  }

  const found = cart.find((x) => x.id === item.id);

  if (found) {
    found.qty = Number(found.qty || 0) + 1;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: 1
    });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart));

  location.href = "takeaway.html?promoCheckout=1";
}

function bindPromoCarousel() {
  const carousel = document.getElementById("promoCarousel");
  if (!carousel) return;

  renderPromoCarousel();
  restartPromoTimer();

  document.getElementById("promoNextBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    nextPromo();
    restartPromoTimer();
  });

  document.getElementById("promoPrevBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    prevPromo();
    restartPromoTimer();
  });

  carousel.addEventListener("pointerdown", (e) => {
    promoStartX = e.clientX;
  });

  carousel.addEventListener("pointerup", (e) => {
    const diff = e.clientX - promoStartX;

    if (Math.abs(diff) < 40) return;

    if (diff < 0) {
      nextPromo();
    } else {
      prevPromo();
    }

    restartPromoTimer();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindPromoCarousel();
});

