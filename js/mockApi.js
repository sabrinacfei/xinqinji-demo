const MOCK_WAITLIST_KEY = "mock_waitlist_state";
const MOCK_PICKUP_KEY = "mock_pickup_orders_state";
const MOCK_DELIVERY_KEY = "mock_delivery_orders_state";
const MOCK_RESERVATIONS_KEY = "mock_reservations_state";
const MOCK_CLOCK_LOGS_KEY = "mock_clock_logs_state";

const mockCache = {
  menu: null,
  waitlist: null,
  pickup: null,
  delivery: null,
  reservations: null,
  employees: null,
  clockLogs: null
};

async function readJson(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`讀取失敗：${path}`);
  }
  return await res.json();
}

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPhoneLast3(phone) {
  return String(phone || "").slice(-3);
}

function normalizeLookupInput(value) {
  return String(value || "").trim().toUpperCase();
}

/* =========================
   menu
   ========================= */

async function apiGetMenu() {
  if (!mockCache.menu) {
    mockCache.menu = await readJson("./mock/menu.json");
  }
  return mockCache.menu;
}

/* =========================
   waitlist
   ========================= */

async function apiGetWaitlist() {
  if (mockCache.waitlist) return mockCache.waitlist;

  const saved = localStorage.getItem(MOCK_WAITLIST_KEY);
  if (saved) {
    mockCache.waitlist = JSON.parse(saved);
    return mockCache.waitlist;
  }

  try {
    mockCache.waitlist = await readJson("./mock/waitlist.json");
  } catch (err) {
    console.error("apiGetWaitlist failed:", err);
    mockCache.waitlist = {
      queue: [],
      callSoon: [],
      callReady: []
    };
  }

  if (!Array.isArray(mockCache.waitlist.queue)) mockCache.waitlist.queue = [];
  if (!Array.isArray(mockCache.waitlist.callSoon)) mockCache.waitlist.callSoon = [];
  if (!Array.isArray(mockCache.waitlist.callReady)) mockCache.waitlist.callReady = [];

  return mockCache.waitlist;
}

async function saveWaitlistState(data) {
  mockCache.waitlist = data;
  localStorage.setItem(MOCK_WAITLIST_KEY, JSON.stringify(data));
  return data;
}

function makeWaitNumber(queue) {
  const nums = (queue || [])
    .map((x) => Number(String(x.number || "").replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));

  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return String(next).padStart(4, "0");
}

async function apiCreateWaiting(item) {
  const data = await apiGetWaitlist();
  const queue = Array.isArray(data.queue) ? [...data.queue] : [];
  const callSoon = Array.isArray(data.callSoon) ? [...data.callSoon] : [];
  const callReady = Array.isArray(data.callReady) ? [...data.callReady] : [];

  const number = makeWaitNumber(queue);
  const waitingAhead = queue.filter((x) => x.status === "waiting").length;

  let status = "waiting";

  if (waitingAhead === 0 && callReady.length === 0) {
    status = "ready";
    callReady.push(number);
  } else {
    callSoon.push(number);
  }

  const savedItem = {
    number,
    group: item.group,
    adults: item.adults,
    kids: item.kids,
    chairs: item.chairs,
    phone: item.phone,
    createdAt: new Date().toISOString(),
    status
  };

  queue.push(savedItem);

  const nextData = {
    ...data,
    queue,
    callSoon,
    callReady
  };

  await saveWaitlistState(nextData);
  return savedItem;
}

async function apiCallNextWaiting() {
  const data = await apiGetWaitlist();

  const queue = Array.isArray(data.queue) ? [...data.queue] : [];
  const callSoon = Array.isArray(data.callSoon) ? [...data.callSoon] : [];
  const callReady = Array.isArray(data.callReady) ? [...data.callReady] : [];

  const calledNumber = callReady.shift() || null;
  const nextSoon = callSoon.shift() || null;

  if (calledNumber) {
    const calledRow = queue.find((x) => x.number === calledNumber);
    if (calledRow) calledRow.status = "called";
  }

  if (nextSoon) {
    callReady.push(nextSoon);
    const nextRow = queue.find((x) => x.number === nextSoon);
    if (nextRow) nextRow.status = "ready";
  }

  const nextData = { ...data, queue, callSoon, callReady };
  await saveWaitlistState(nextData);

  return {
    calledNumber,
    nextReady: nextSoon,
    callReady,
    callSoon
  };
}

/* =========================
   pickup orders
   ========================= */

async function apiGetPickupOrders() {
  if (mockCache.pickup) return mockCache.pickup;

  const saved = localStorage.getItem(MOCK_PICKUP_KEY);
  if (saved) {
    mockCache.pickup = JSON.parse(saved);
    return mockCache.pickup;
  }

  try {
    mockCache.pickup = await readJson("./mock/pickup_orders.json");
  } catch (err) {
    console.error("apiGetPickupOrders failed:", err);
    mockCache.pickup = { orders: [] };
  }

  if (!Array.isArray(mockCache.pickup.orders)) mockCache.pickup.orders = [];
  return mockCache.pickup;
}

async function savePickupOrdersState(data) {
  mockCache.pickup = data;
  localStorage.setItem(MOCK_PICKUP_KEY, JSON.stringify(data));
  return data;
}
async function apiCreatePickupOrder(phone, cart) {
  const data = await apiGetPickupOrders();
  const orders = Array.isArray(data.orders) ? [...data.orders] : [];

  const nums = orders
    .map((x) => Number(String(x.pickupNo || "").replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));

  const nextNo = nums.length ? Math.max(...nums) + 1 : 1;
  const pickupNo = "P" + String(nextNo).padStart(3, "0");

  const order = {
    pickupNo,
    phone,
    items: Array.isArray(cart) ? cart.map((x) => ({
      id: x.id,
      name: x.name,
      price: x.price,
      qty: x.qty
    })) : [],
    status: orders.length === 0 ? "ready" : "準備中",
    createdAt: new Date().toISOString()
  };

  orders.push(order);
  await savePickupOrdersState({ ...data, orders });

  return order;
}

async function apiGetTakeawayWaitMin() {
  const data = await apiGetPickupOrders();
  const count = (data.orders || []).filter((x) => {
    const status = String(x.status || "");
    return status !== "已完成" && status !== "ready";
  }).length;
  return count * 5;
}

/* =========================
   delivery orders
   ========================= */

async function apiGetDeliveryOrders() {
  if (mockCache.delivery) return mockCache.delivery;

  const saved = localStorage.getItem(MOCK_DELIVERY_KEY);
  if (saved) {
    mockCache.delivery = JSON.parse(saved);
    return mockCache.delivery;
  }

  try {
    mockCache.delivery = await readJson("./mock/delivery_orders.json");
  } catch {
    try {
      mockCache.delivery = await readJson("./mock/delivery-orders.json");
    } catch (err) {
      console.error("apiGetDeliveryOrders failed:", err);
      mockCache.delivery = { orders: [] };
    }
  }

  if (!Array.isArray(mockCache.delivery.orders)) mockCache.delivery.orders = [];
  return mockCache.delivery;
}

async function apiFindDeliveryOrder(code) {
  const keyword = normalizeLookupInput(code);
  const data = await apiGetDeliveryOrders();
  const orders = data.orders || [];

  return orders.find((item) => {
    return normalizeLookupInput(item.code) === keyword;
  }) || null;
}

/* =========================
   reservations
   ========================= */

async function apiGetReservations() {
  if (mockCache.reservations) {
    return mockCache.reservations;
  }

  const saved = localStorage.getItem(MOCK_RESERVATIONS_KEY);
  if (saved) {
    mockCache.reservations = JSON.parse(saved);
    return mockCache.reservations;
  }

  try {
    mockCache.reservations = await readJson("./mock/reservations.json");
  } catch (err) {
    console.error("apiGetReservations failed:", err);
    mockCache.reservations = [];
  }

  if (!Array.isArray(mockCache.reservations)) {
    mockCache.reservations = [];
  }

  return mockCache.reservations;
}

async function saveReservationsState(list) {
  mockCache.reservations = list;
  localStorage.setItem(MOCK_RESERVATIONS_KEY, JSON.stringify(list));
  return list;
}

async function getTodayReservations() {
  const list = await apiGetReservations();
  const today = getTodayStr();
  return list.filter((x) => x.type === "today" && x.date === today);
}

async function getFutureReservations() {
  const list = await apiGetReservations();
  return list.filter((x) => x.type === "future");
}

async function apiCreateReservation(item) {
  const list = await apiGetReservations();

  const nextId = "R" + String(list.length + 1).padStart(3, "0");
  const savedItem = {
    id: nextId,
    ...item,
    status: "booked"
  };

  list.push(savedItem);
  await saveReservationsState(list);

  console.log("mock POST /reservations", savedItem);
  return savedItem;
}

/* =========================
   employees / clock
   ========================= */

async function apiGetEmployees() {
  if (mockCache.employees) return mockCache.employees;

  try {
    mockCache.employees = await readJson("./mock/employees.json");
  } catch (err) {
    console.error("apiGetEmployees failed:", err);
    mockCache.employees = { employees: [] };
  }

  if (!Array.isArray(mockCache.employees.employees)) {
    mockCache.employees.employees = [];
  }

  return mockCache.employees;
}

async function apiGetClockLogs() {
  if (mockCache.clockLogs) return mockCache.clockLogs;

  const saved = localStorage.getItem(MOCK_CLOCK_LOGS_KEY);
  if (saved) {
    mockCache.clockLogs = JSON.parse(saved);
    return mockCache.clockLogs;
  }

  try {
    mockCache.clockLogs = await readJson("./mock/clock_logs.json");
  } catch (err) {
    console.error("apiGetClockLogs failed:", err);
    mockCache.clockLogs = { logsByDate: {} };
  }

  if (!mockCache.clockLogs.logsByDate) {
    mockCache.clockLogs.logsByDate = {};
  }

  return mockCache.clockLogs;
}

async function apiSaveClockLogs(data) {
  mockCache.clockLogs = data;
  localStorage.setItem(MOCK_CLOCK_LOGS_KEY, JSON.stringify(data));
  return data;
}

/* =========================
   shared lookup
   ========================= */

async function apiHasActiveBookingByPhone(phone, mode, date = "", time = "") {
  const normalizedPhone = String(phone || "").trim();
  const normalizedDate = String(date || "").trim();
  const normalizedTime = String(time || "").trim();

  if (mode === "wait") {
    const waitlist = await apiGetWaitlist();
    return (waitlist.queue || []).some((x) => {
      return String(x.phone || "").trim() === normalizedPhone &&
             ["waiting", "ready"].includes(String(x.status || ""));
    });
  }

  if (mode === "todayReserve" || mode === "futureReserve") {
    const list = await apiGetReservations();
    return list.some((x) => {
      if (String(x.phone || "").trim() !== normalizedPhone) return false;
      if (normalizedDate && String(x.date || "").trim() !== normalizedDate) return false;
      if (normalizedTime && String(x.time || "").trim() !== normalizedTime) return false;
      if (String(x.status || "").trim() !== "booked") return false;

      if (mode === "todayReserve") return x.type === "today";
      if (mode === "futureReserve") return x.type === "future";
      return false;
    });
  }

  return false;
}

async function apiLookupStatus(input) {
  const keyword = normalizeLookupInput(input);

  const isPhoneLike = /^09\d+$/.test(keyword);
  const isStrictFullPhone = /^09\d{8}$/.test(keyword);

  if (isPhoneLike && keyword.length > 4 && keyword.length !== 10) {
    return {
      found: false,
      message: "若輸入手機號碼，必須為 10 碼（09 開頭）"
    };
  }

  const isFullPhone = isStrictFullPhone;
  const isPickupNo = /^P\d+$/.test(keyword);
  const isWaitNo = /^\d{4,}$/.test(keyword);
  const isPhoneLast3 = /^\d{3}$/.test(keyword);

  const waitData = await apiGetWaitlist();
  const pickupData = await apiGetPickupOrders();

  const waitQueue = waitData.queue || [];
  const callReady = waitData.callReady || [];
  const pickupOrders = pickupData.orders || [];

  if (isPickupNo) {
    const found = pickupOrders.find(
      (x) => normalizeLookupInput(x.pickupNo) === keyword
    );

    if (!found) return { found: false, message: "查無資料" };

    const idx = pickupOrders.findIndex((x) => x.pickupNo === found.pickupNo);

    if (found.status === "ready" || idx === 0) {
      return {
        type: "pickup",
        found: true,
        phoneLast3: getPhoneLast3(found.phone),
        pickupNo: found.pickupNo,
        statusText: "可取餐"
      };
    }

    return {
      type: "pickup",
      found: true,
      pickupNo: found.pickupNo,
      phoneLast3: getPhoneLast3(found.phone),
      statusText: "準備中",
      aheadCount: idx,
      waitMin: idx * 5
    };
  }

  // 先查完整手機 / 手機末三碼
  if (isFullPhone || isPhoneLast3) {
    const waitMatches = waitQueue.filter((x) => {
      const phone = String(x.phone || "").trim();
      return isFullPhone ? phone === keyword : getPhoneLast3(phone) === keyword;
    });

    const pickupMatches = pickupOrders.filter((x) => {
      const phone = String(x.phone || "").trim();
      return isFullPhone ? phone === keyword : getPhoneLast3(phone) === keyword;
    });

    const totalMatches = waitMatches.length + pickupMatches.length;

    if (totalMatches === 0) {
      return { found: false, message: "查無資料" };
    }

    if (!isFullPhone && totalMatches > 1) {
      return {
        found: false,
        needFullPhone: true,
        message: "查到多筆相同手機末三碼，請輸入完整電話號碼查詢。"
      };
    }

    if (waitMatches.length) {
      const target = waitMatches[waitMatches.length - 1];
      return apiLookupStatus(String(target.number));
    }

    if (pickupMatches.length) {
      const target = pickupMatches[pickupMatches.length - 1];
      return apiLookupStatus(String(target.pickupNo));
    }
  }

  // 最後才查候位號碼
  if (isWaitNo) {
    const found = waitQueue.find((x) => String(x.number) === keyword);
    if (!found) return { found: false, message: "查無資料" };

    if (callReady.includes(found.number) || found.status === "ready") {
      return {
        type: "wait",
        found: true,
        waitNo: found.number,
        phoneLast3: getPhoneLast3(found.phone),
        statusText: "可入場！"
      };
    }

    if (found.status === "called" || found.status === "seated") {
      return {
        type: "wait",
        found: true,
        waitNo: found.number,
        phoneLast3: getPhoneLast3(found.phone),
        statusText: "已經過號囉！請洽服務人員！"
      };
    }

    const waitingOnly = waitQueue.filter((x) => x.status === "waiting");
    const aheadIndex = waitingOnly.findIndex((x) => x.number === found.number);
    const aheadCount = aheadIndex < 0 ? 0 : aheadIndex;

    return {
      type: "wait",
      found: true,
      waitNo: found.number,
      phoneLast3: getPhoneLast3(found.phone),
      statusText: "等候入場",
      aheadCount,
      waitMin: aheadCount * 5
    };
  }

  return { found: false, message: "請輸入手機末三碼、完整電話、候位號碼或外帶號碼" };
}