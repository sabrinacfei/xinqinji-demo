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
function renderNowCallingMini() {
  const box = document.getElementById("callMiniNums");
  if (!box) return;

  const ready = JSON.parse(localStorage.getItem("sq_call_ready") || "[]");

  box.innerHTML = ready
    .slice(0, 4)
    .map((n) => `<div class="callMiniNo">${n}</div>`)
    .join("");
}

function renderCallModal() {
  const soonBox = document.getElementById("callSoonList");
  const pickupBox = document.getElementById("callPickupList");
  if (!soonBox || !pickupBox) return;

  const soon = JSON.parse(localStorage.getItem("sq_call_soon") || "[]");
  const pickup = JSON.parse(localStorage.getItem("sq_pickup_now") || "[]");

  soonBox.innerHTML = soon
    .slice(0, 6)
    .map((n) => `<span>${n}</span>`)
    .join("");

  pickupBox.innerHTML = pickup
    .slice(0, 6)
    .map((n, i) => `<span class="${i === 0 ? "isNowPickup" : ""}">${n}</span>`)
    .join("");
}

function renderTakeawayWait() {
  const el = document.getElementById("takeawayWaitMin");
  if (!el) return;

  const pickup = JSON.parse(localStorage.getItem("sq_pickup_now") || "[]");
  const count = pickup.length;
  const mins = count * 5;

  el.textContent = mins;
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

function createWaitNumber() {
  const s = String(Date.now());
  return pad4(Number(s.slice(-4)));
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

function updateOverviewFromQueue() {
  const q = JSON.parse(localStorage.getItem("sq_queue") || "[]");
  const count = (g) => q.filter((x) => x.group === g && x.status === "waiting").length;

  const q12 = count("1-2");
  const q34 = count("3-4");
  const q56 = count("5-6");

  document.getElementById("q12").textContent = q12;
  document.getElementById("q34").textContent = q34;
  document.getElementById("q56").textContent = q56;

  document.getElementById("m12").textContent = q12 * 5;
  document.getElementById("m34").textContent = q34 * 5;
  document.getElementById("m56").textContent = q56 * 5;
}

function openWaitModal() {
  adults = 0;
  kids = 0;
  chairs = 0;
  refreshPeopleUI();

  const phoneInput = document.getElementById("waitPhone");
  if (phoneInput) phoneInput.value = "";

  hidePhoneHint("waitPhoneHint");

  clearTimeout(autoCloseTimer);
  updateOverviewFromQueue();
  renderIndoorWaitingCount();
  showStep("waitStepA");

  bootstrap.Modal.getOrCreateInstance(document.getElementById("waitModal")).show();
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
    const okPeople = adults + kids > 0;

    if (!okPeople) {
      showPhoneHint("waitPhoneHint", "請先選擇人數（至少 1 位）");
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
  function submitWaitQueue() {
  const phone = document.getElementById("waitPhone")?.value.trim() ?? "";
  const number = createWaitNumber();
  const group = calcGroup();

  const readyKey = "sq_call_ready";
  const soonKey = "sq_call_soon";
  const queueKey = "sq_queue";

  const ready = JSON.parse(localStorage.getItem(readyKey) || "[]");
  const soon = JSON.parse(localStorage.getItem(soonKey) || "[]");
  const queue = JSON.parse(localStorage.getItem(queueKey) || "[]");

  const waitingAhead = queue.filter((x) => x.status === "waiting").length;

  if (waitingAhead === 0 && ready.length === 0) {
    ready.push(number);

    queue.push({
      number,
      group,
      adults,
      kids,
      chairs,
      phone,
      createdAt: new Date().toISOString(),
      status: "ready"
    });

    localStorage.setItem(readyKey, JSON.stringify(ready));
  } else {
    soon.push(number);

    queue.push({
      number,
      group,
      adults,
      kids,
      chairs,
      phone,
      createdAt: new Date().toISOString(),
      status: "waiting"
    });

    localStorage.setItem(soonKey, JSON.stringify(soon));
  }

  localStorage.setItem(queueKey, JSON.stringify(queue));

  document.getElementById("waitNumberText").textContent = number;
  document.getElementById("waitMetaText").textContent =
    `人數：${group}｜手機末三碼：${phone.slice(-3)}`;

  updateOverviewFromQueue();
  renderIndoorWaitingCount();
  renderNowCallingMini();
  renderCallModal();

  showStep("waitStepD");

  autoCloseTimer = setTimeout(() => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById("waitModal")).hide();
  }, 10000);
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
const DELIVERY_KEY = "sq_delivery_orders_demo";
let deliveryBound = false;
let deliveryT9Bound = false;

const DELIVERY_SEED = [
  { platform: "foodpanda", code: "A1234", status: "已完成" },
  { platform: "foodpanda", code: "FP9012", status: "已完成" },
  { platform: "foodpanda", code: "B2468", status: "已完成" },
  { platform: "foodpanda", code: "P7788", status: "已完成" },
  { platform: "foodpanda", code: "F3321", status: "已完成" },
  { platform: "foodpanda", code: "K1200", status: "已完成" },
  { platform: "foodpanda", code: "T4456", status: "已完成" },
  { platform: "foodpanda", code: "Z9001", status: "已完成" },

  { platform: "foodpanda", code: "M5678", status: "準備中" },
  { platform: "foodpanda", code: "Q2201", status: "準備中" },
  { platform: "foodpanda", code: "L4512", status: "準備中" },
  { platform: "foodpanda", code: "D8733", status: "準備中" },
  { platform: "foodpanda", code: "X1122", status: "準備中" },
  { platform: "foodpanda", code: "R6670", status: "準備中" },
  { platform: "foodpanda", code: "H4908", status: "準備中" },
  { platform: "foodpanda", code: "N6003", status: "準備中" },

  { platform: "uber", code: "U4455", status: "已完成" },
  { platform: "uber", code: "C3141", status: "已完成" },
  { platform: "uber", code: "D8080", status: "已完成" },
  { platform: "uber", code: "UE2211", status: "已完成" },
  { platform: "uber", code: "E1020", status: "已完成" },
  { platform: "uber", code: "Y7700", status: "已完成" },
  { platform: "uber", code: "G6612", status: "已完成" },
  { platform: "uber", code: "W9018", status: "已完成" },

  { platform: "uber", code: "UE7788", status: "準備中" },
  { platform: "uber", code: "U5501", status: "準備中" },
  { platform: "uber", code: "M4002", status: "準備中" },
  { platform: "uber", code: "J7310", status: "準備中" },
  { platform: "uber", code: "V8882", status: "準備中" },
  { platform: "uber", code: "S2109", status: "準備中" },
  { platform: "uber", code: "B5550", status: "準備中" },
  { platform: "uber", code: "K3008", status: "準備中" }
];

function ensureDeliveryDemoData() {
  localStorage.setItem(DELIVERY_KEY, JSON.stringify(DELIVERY_SEED));
}

function getDeliveryOrders() {
  return JSON.parse(localStorage.getItem(DELIVERY_KEY) || "[]");
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

function renderDeliveryPickupModal() {
  const orders = getDeliveryOrders();

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
}

function openDeliveryModal() {
  renderDeliveryPickupModal();
  bootstrap.Modal.getOrCreateInstance(document.getElementById("deliveryModal")).show();
}

function searchDeliveryOrder(code) {
  const keyword = normalizeOrderCode(code);
  const orders = getDeliveryOrders();
  return orders.find((item) => normalizeOrderCode(item.code) === keyword) || null;
}

function showDeliverySearchResult(text) {
  const result = document.getElementById("deliverySearchResult");
  if (!result) return;
  result.textContent = text;
  result.classList.remove("d-none");
}

function hideDeliverySearchResult() {
  const result = document.getElementById("deliverySearchResult");
  if (!result) return;
  result.classList.add("d-none");
  result.textContent = "";
}

function openDeliverySearchModal() {
  const input = document.getElementById("deliveryOrderInput");
  if (input) input.value = "";
  hideDeliverySearchResult();

  const deliveryEl = document.getElementById("deliveryModal");
  const searchEl = document.getElementById("deliverySearchModal");
  const deliveryModal = bootstrap.Modal.getOrCreateInstance(deliveryEl);
  const searchModal = bootstrap.Modal.getOrCreateInstance(searchEl);

  deliveryEl.addEventListener(
    "hidden.bs.modal",
    function handleHidden() {
      searchModal.show();
      setTimeout(() => input?.blur(), 100);
    },
    { once: true }
  );

  deliveryModal.hide();
}

function closeDeliverySearchModalAndBack() {
  const deliveryEl = document.getElementById("deliveryModal");
  const searchEl = document.getElementById("deliverySearchModal");
  const deliveryModal = bootstrap.Modal.getOrCreateInstance(deliveryEl);
  const searchModal = bootstrap.Modal.getOrCreateInstance(searchEl);

  searchEl.addEventListener(
    "hidden.bs.modal",
    function handleHidden() {
      deliveryModal.show();
    },
    { once: true }
  );

  searchModal.hide();
}

function bindDeliveryKiosk() {
  if (deliveryBound) return;
  deliveryBound = true;

  document.getElementById("openDeliverySearchBtn")?.addEventListener("click", () => {
    openDeliverySearchModal();
  });

  document.getElementById("deliverySearchCloseBtn")?.addEventListener("click", () => {
    closeDeliverySearchModalAndBack();
  });

  document.getElementById("confirmDeliverySearchBtn")?.addEventListener("click", () => {
    const input = document.getElementById("deliveryOrderInput");
    const code = normalizeOrderCode(input?.value || "");

    if (!code) {
      showDeliverySearchResult("請輸入訂單編號");
      return;
    }

    const found = searchDeliveryOrder(code);

    if (!found) {
      showDeliverySearchResult(`${code}－查無此訂單`);
      return;
    }

    showDeliverySearchResult(`${found.code}－${found.status}`);
  });
}
function renderIndoorWaitingCount() {
  const el = document.getElementById("indoorWaitingCount");
  if (!el) return;

  const q = JSON.parse(localStorage.getItem("sq_queue") || "[]");
  const totalWaiting = q.filter((x) => x.status === "waiting").length;

  el.textContent = totalWaiting;
}

function getWaitingQueue() {
  return JSON.parse(localStorage.getItem("sq_queue") || "[]")
    .filter((x) => x.status === "waiting");
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
const EMPLOYEE_MAP = {
  "1111": "Sabrina",
  "2222": "Rich",
  "3333": "麻吉",
  "4444": "小花",
  "5555": "小胡",
  "6666": "阿張",
  "7777": "阿鬚"
};

const CLOCK_LOG_KEY = "sq_clock_logs";
let clockingBound = false;
let clockAutoCloseTimer = null;
let clockingState = { empId: "", name: "" };

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

function loadClockLogs() {
  return JSON.parse(localStorage.getItem(CLOCK_LOG_KEY) || "{}");
}

function saveClockLogs(data) {
  localStorage.setItem(CLOCK_LOG_KEY, JSON.stringify(data));
}

function showClockStep(idToShow) {
  ["clockStepA", "clockStepB", "clockStepC", "clockStepD"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("d-none", id !== idToShow);
  });
}

function resetClockingModal() {
  clockingState = { empId: "", name: "" };

  const input = document.getElementById("clockEmpId");
  if (input) input.value = "";

  document.getElementById("clockEmpHint")?.classList.add("d-none");
  document.getElementById("clockFinishSub").textContent = "";
  document.getElementById("clockFinishMeta").textContent = "";
  clearTimeout(clockAutoCloseTimer);

  showClockStep("clockStepA");
}

function openClockingModal() {
  resetClockingModal();
  bootstrap.Modal.getOrCreateInstance(document.getElementById("clockingModal")).show();
}

function goClockConfirm() {
  const empId = document.getElementById("clockEmpId")?.value.trim() || "";
  const name = EMPLOYEE_MAP[empId];

  if (!name) {
    document.getElementById("clockEmpHint")?.classList.remove("d-none");
    return;
  }

  clockingState = { empId, name };

  document.getElementById("clockConfirmEmpId").textContent = empId;
  document.getElementById("clockConfirmName").textContent = name;
  document.getElementById("clockHelloName").textContent = name;
  document.getElementById("clockEmpHint")?.classList.add("d-none");

  showClockStep("clockStepB");
}

function getTodayEmployeeLogs(empId) {
  const todayKey = getTodayKey();
  const logs = loadClockLogs();
  const dayLogs = logs[todayKey] || {};
  return dayLogs[empId] || [];
}

function submitClockIn() {
  const now = new Date();
  const todayKey = getTodayKey();
  const logs = loadClockLogs();
  const dayLogs = logs[todayKey] || {};
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
    empId: clockingState.empId
  });

  dayLogs[clockingState.empId] = empLogs;
  logs[todayKey] = dayLogs;
  saveClockLogs(logs);

  document.getElementById("clockFinishTitle").textContent = clockingState.name;
  document.getElementById("clockFinishSub").textContent = "哈囉！今天一起加油吧！💪";
  document.getElementById("clockFinishMeta").textContent = `今天 ${formatClockTime(now)} 打卡`;

  showClockStep("clockStepD");

  clockAutoCloseTimer = setTimeout(() => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById("clockingModal")).hide();
  }, 5000);
  if (hasClockIn) return;
}

function submitClockOut() {
  const now = new Date();
  const todayKey = getTodayKey();
  const logs = loadClockLogs();
  const dayLogs = logs[todayKey] || {};
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

  const outRow = {
    type: "out",
    at: now.toISOString(),
    name: clockingState.name,
    empId: clockingState.empId
  };

  empLogs.push(outRow);
  dayLogs[clockingState.empId] = empLogs;
  logs[todayKey] = dayLogs;
  saveClockLogs(logs);

  document.getElementById("clockFinishTitle").textContent = clockingState.name;
  document.getElementById("clockFinishSub").textContent = "辛苦了～好好休息！";
  document.getElementById("clockFinishMeta").textContent =
    `今天 ${formatClockTime(new Date(lastIn.at))} 打卡～${formatClockTime(now)} 離開
共 ${formatDuration(lastIn.at, now)}`;

  showClockStep("clockStepD");

  clockAutoCloseTimer = setTimeout(() => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById("clockingModal")).hide();
  }, 5000);
  if (lastOut) return;
}

function bindClockingKiosk() {
  if (clockingBound) return;
  clockingBound = true;

  const trigger = document.getElementById("clockingLogoBtn");
  let pressTimer = null;

  const startPress = (e) => {
    e.preventDefault();
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      openClockingModal();
    }, 3000);
  };

  const endPress = () => {
    clearTimeout(pressTimer);
  };

  trigger?.addEventListener("pointerdown", startPress);
  trigger?.addEventListener("pointerup", endPress);
  trigger?.addEventListener("pointerleave", endPress);
  trigger?.addEventListener("pointercancel", endPress);

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
  document.getElementById("clockOutBtn")?.addEventListener("click", submitClockOut);

  document.getElementById("clockKeypad")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const k = btn.dataset.k;
    const input = document.getElementById("clockEmpId");
    if (!input) return;

    if (k === "back") {
      input.value = input.value.slice(0, -1);
    } else if (k === "ok") {
      goClockConfirm();
      return;
    } else {
      input.value = (input.value + k).slice(0, 4);
    }

    document.getElementById("clockEmpHint")?.classList.add("d-none");
  });

  document.getElementById("clockingModal")?.addEventListener("hidden.bs.modal", () => {
    clearTimeout(clockAutoCloseTimer);
    resetClockingModal();
  });
}

// ===== 啟動 =====
document.addEventListener("DOMContentLoaded", () => {
  ensureDeliveryDemoData();

  bindNav();
  bindClockingKiosk();
  bindWaitingKiosk();
  bindDeliveryKiosk();
  bindReserveKiosk();
  bindDeliveryT9Keyboard();

  renderNowCallingMini();
  renderTakeawayWait();
  renderDeliveryPickupModal();
  renderIndoorWaitingCount();

  setInterval(() => {
    renderNowCallingMini();
    renderTakeawayWait();
    renderDeliveryPickupModal();
    renderIndoorWaitingCount();
  }, 1000);

  document.getElementById("openCallModal")?.addEventListener("click", (e) => {
    e.stopPropagation();
    renderCallModal();
    bootstrap.Modal.getOrCreateInstance(document.getElementById("callModal")).show();
  });
});



  // 叫下一號
function callNextNumber() {
  const readyKey = "sq_call_ready";
  const soonKey = "sq_call_soon";
  const queueKey = "sq_queue";

  const ready = JSON.parse(localStorage.getItem(readyKey) || "[]");
  const soon = JSON.parse(localStorage.getItem(soonKey) || "[]");
  const queue = JSON.parse(localStorage.getItem(queueKey) || "[]");

  const current = ready.shift();

  if (current) {
    const currentItem = queue.find((x) => x.number === current && x.status === "ready");
    if (currentItem) currentItem.status = "seated";
  }

  const next = soon.shift();
  if (next) {
    ready.push(next);

    const nextItem = queue.find((x) => x.number === next && x.status === "waiting");
    if (nextItem) nextItem.status = "ready";
  }

  localStorage.setItem(readyKey, JSON.stringify(ready));
  localStorage.setItem(soonKey, JSON.stringify(soon));
  localStorage.setItem(queueKey, JSON.stringify(queue));

  renderNowCallingMini();
  renderCallModal();
  updateOverviewFromQueue();
  renderIndoorWaitingCount();
}

// ===== 預約 =====
const RESERVE_TODAY_KEY = "sq_reservations_today";
const RESERVE_FUTURE_KEY = "sq_reservations_future";

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

function loadJson(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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

function getTodayWaitingPeopleCount() {
  const q = loadJson("sq_queue", []);
  return q
    .filter((x) => x.status === "waiting")
    .reduce((sum, x) => sum + (Number(x.adults) || 0) + (Number(x.kids) || 0), 0);
}

function getTodayReservedByTime(time) {
  return loadJson(RESERVE_TODAY_KEY, [])
    .filter((x) => x.date === getTodayStr() && x.time === time)
    .reduce((sum, x) => sum + (Number(x.adults) || 0) + (Number(x.kids) || 0), 0);
}

function getFutureReservedByDateTime(date, time) {
  return loadJson(RESERVE_FUTURE_KEY, [])
    .filter((x) => x.date === date && x.time === time)
    .reduce((sum, x) => sum + (Number(x.adults) || 0) + (Number(x.kids) || 0), 0);
}

function getTodayWaitingPeopleCountByTime(targetTime) {
  const q = loadJson("sq_queue", []).filter((x) => x.status === "waiting");

  const sorted = q.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const timeSlots = getReserveSlotsByPeriod("morning").concat(getReserveSlotsByPeriod("afternoon"));

  const slotMap = {};
  timeSlots.forEach(t => slotMap[t] = 0);

  sorted.forEach((item, idx) => {
    const people = (Number(item.adults) || 0) + (Number(item.kids) || 0);

    const base = new Date();
    const [hh, mm] = targetTime.split(":").map(Number);
    base.setHours(hh, mm, 0, 0);

    const slotIndex = Math.min(Math.floor(idx / 3), timeSlots.length - 1);
    const slot = timeSlots[slotIndex];
    slotMap[slot] = (slotMap[slot] || 0) + people;
  });

  return slotMap[targetTime] || 0;
}

function canBookToday(time, count) {
  const used = getTodayReservedByTime(time) + getTodayWaitingPeopleCountByTime(time);
  return used + count <= 20;
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

function hasFutureCapacityOnDate(date, count = 1) {
  return getFutureAllSlots().some((time) => canBookFuture(date, time, count));
}

function renderFuturePickedInfo() {
  const el = document.getElementById("reserveFuturePickedInfo");
  if (!el) return;

  const chairText = reserveChairs > 0 ? `｜兒童椅 ${reserveChairs}` : "";
  const dateText = reserveDate ? `日期：${reserveDate}` : "請先選日期";
  el.textContent = `${dateText}｜大人 ${reserveAdults}｜兒童 ${reserveKids}${chairText}`;
}

function canBookFuture(date, time, count) {
  const used = getFutureReservedByDateTime(date, time);
  return used + count <= 10;
}


function renderTodayReserveSlots(period = reserveTodayPeriod) {
  const box = document.getElementById("todayTimeGrid");
  if (!box) return;

  reserveTodayPeriod = period;

  const people = getReservePeopleCount();
  if (people <= 0) {
    box.innerHTML = "";
    return;
  }

  const slots = getReserveSlotsByPeriod(period, "today")
    .filter((time) => !isPastTodaySlot(time))
    .filter((time) => canBookToday(time, people));

  box.innerHTML = slots.map((time) => `
    <button type="button"
      class="timeItem ${reserveTime === time ? "active" : ""}"
      data-r-time="${time}">
      ${time}
    </button>
  `).join("");
}

function renderFutureReserveSlots(period = reserveFuturePeriod) {
  const box = document.getElementById("futureTimeGrid");
  if (!box) return;

  reserveFuturePeriod = period;

  const people = getReservePeopleCount();
  if (people <= 0 || !reserveDate) {
    box.innerHTML = "";
    return;
  }

  const slots = getReserveSlotsByPeriod(period, "future")
    .filter((time) => canBookFuture(reserveDate, time, people));

  box.innerHTML = slots.map((time) => `
    <button type="button"
      class="timeItem ${reserveTime === time ? "active" : ""}"
      data-r-time="${time}">
      ${time}
    </button>
  `).join("");
}

function initReserveCalendar() {
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
    disable: [
      function(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`;
        return !hasFutureCapacityOnDate(dateStr, getReservePeopleCount() || 1);
      }
    ],
    onDayCreate: function(_, __, ___, dayElem) {
      const dateObj = dayElem.dateObj;
      if (!dateObj) return;

      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, "0");
      const d = String(dateObj.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

      if (!hasFutureCapacityOnDate(dateStr, getReservePeopleCount() || 1)) {
        dayElem.classList.add("future-day-full");
      } else {
        dayElem.classList.add("future-day-open");
      }
    },
    onChange: function(_, dateStr) {
      reserveDate = dateStr;
      reserveTime = "";
      renderFuturePickedInfo();
      renderFutureReserveSlots(reserveFuturePeriod);
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

function saveReservationRecord(phone) {
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

  const key = reserveType === "today" ? RESERVE_TODAY_KEY : RESERVE_FUTURE_KEY;
  const list = loadJson(key, []);
  list.push(item);
  saveJson(key, list);

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
    done.textContent = "請注意訊息，我們將傳預約提醒給您～";
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

      if (getReservePeopleCount() > 0) {
        document.getElementById("reservePeopleHint")?.classList.add("d-none");
        document.getElementById("reserveFuturePeopleHint")?.classList.add("d-none");
      }

      if (reserveType === "today") renderTodayReserveSlots();
      if (reserveType === "future") {
        renderFuturePickedInfo();
        if (reserveFp) initReserveCalendar();
        renderFutureReserveSlots(reserveFuturePeriod);
      }
    }
  });

  document.getElementById("todayPeopleNextBtn")?.addEventListener("click", () => {
    const hint = document.getElementById("reservePeopleHint");

    if (getReservePeopleCount() <= 0) {
      hint?.classList.remove("d-none");
      return;
    }

    hint?.classList.add("d-none");
    reserveTime = "";
    reserveTodayPeriod = "morning";
    hideInlineHint("reserveTodayTimeHint");

    document.getElementById("periodMorningBtn")?.classList.add("active");
    document.getElementById("periodAfternoonBtn")?.classList.remove("active");

    renderTodayPickedInfo();
    renderTodayReserveSlots("morning");
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

  document.getElementById("reserveFinalBtn")?.addEventListener("click", () => {
    const phone = document.getElementById("reservePhone")?.value.trim() || "";
    const people = getReservePeopleCount();
    const hint = document.getElementById("reservePhoneHint");

    if (!isValidTaiwanMobile(phone)) {
      showPhoneHint("reservePhoneHint");
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

    if (reserveType === "today" && !canBookToday(reserveTime, people)) {
      showInlineHint("reserveTodayTimeHint", "此時段已滿，請重新選擇");
      showReserveStep("reserveStepTodayTime");
      renderTodayReserveSlots();
      return;
    }

    const item = saveReservationRecord(phone);

    console.log("SMS DEMO:", buildReserveSmsMessage(item));
    showReserveDonePage();

    reserveAutoClose = setTimeout(() => {
      bootstrap.Modal.getOrCreateInstance(document.getElementById("reserveModal")).hide();
    }, 10000);
  });
  document.getElementById("periodMorningBtn")?.addEventListener("click", () => {
    reserveTime = "";
    hideInlineHint("reserveTodayTimeHint");
    document.getElementById("periodMorningBtn")?.classList.add("active");
    document.getElementById("periodAfternoonBtn")?.classList.remove("active");
    renderTodayReserveSlots("morning");
  });

  document.getElementById("periodAfternoonBtn")?.addEventListener("click", () => {
    reserveTime = "";
    hideInlineHint("reserveTodayTimeHint");
    document.getElementById("periodAfternoonBtn")?.classList.add("active");
    document.getElementById("periodMorningBtn")?.classList.remove("active");
    renderTodayReserveSlots("afternoon");
  });

  document.getElementById("futurePeopleNextBtn")?.addEventListener("click", () => {
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

    initReserveCalendar();
    renderFuturePickedInfo();
    renderFutureReserveSlots("morning");

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
  document.getElementById("futureMorningBtn")?.addEventListener("click", () => {
    reserveFuturePeriod = "morning";
    reserveTime = "";
    document.getElementById("futureMorningBtn")?.classList.add("active");
    document.getElementById("futureAfternoonBtn")?.classList.remove("active");
    document.getElementById("futureNightBtn")?.classList.remove("active");
    renderFutureReserveSlots("morning");
  });

  document.getElementById("futureAfternoonBtn")?.addEventListener("click", () => {
    reserveFuturePeriod = "afternoon";
    reserveTime = "";
    document.getElementById("futureMorningBtn")?.classList.remove("active");
    document.getElementById("futureAfternoonBtn")?.classList.add("active");
    document.getElementById("futureNightBtn")?.classList.remove("active");
    renderFutureReserveSlots("afternoon");
  });

  document.getElementById("futureNightBtn")?.addEventListener("click", () => {
    reserveFuturePeriod = "night";
    reserveTime = "";
    document.getElementById("futureMorningBtn")?.classList.remove("active");
    document.getElementById("futureAfternoonBtn")?.classList.remove("active");
    document.getElementById("futureNightBtn")?.classList.add("active");
    renderFutureReserveSlots("night");
  });
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#todayTimeGrid .timeItem, #futureTimeGrid .timeItem");
    if (!btn) return;

    const time = btn.dataset.rTime;
    if (!time) return;

    reserveTime = time;

    if (reserveType === "today") {
      hideInlineHint("reserveTodayTimeHint");
      renderTodayReserveSlots(reserveTodayPeriod);
    } else if (reserveType === "future") {
      hideInlineHint("reserveFutureDateTimeHint");
      renderFutureReserveSlots(reserveFuturePeriod);
    }
  });
  document.getElementById("reserveModal")?.addEventListener("hidden.bs.modal", () => {
    clearTimeout(reserveAutoClose);
  });
}
