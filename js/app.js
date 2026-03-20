const DB_KEYS = {
  orders: "sq_orders",
  nowCalling: "sq_now_calling",
  queue: "sq_queue"
};

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function pad4(n) { return String(n).padStart(4, "0"); }

// 取號
export function createNumber(prefix = "") {
  const s = String(Date.now());
  return prefix + pad4(Number(s.slice(-4)));
}

export function addOrder(order) {
  const orders = load(DB_KEYS.orders, []);
  orders.unshift(order);
  save(DB_KEYS.orders, orders);
  return orders;
}

export function addQueue(item) {
  const queue = load(DB_KEYS.queue, []);
  queue.unshift(item);
  save(DB_KEYS.queue, queue);
  return queue;
}

export function setNowCalling(list) {
  save(DB_KEYS.nowCalling, list);
}

export function getNowCalling() {
  return load(DB_KEYS.nowCalling, []);
}