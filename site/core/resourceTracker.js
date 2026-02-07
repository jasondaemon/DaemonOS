const listeners = new Set();
const tokens = new Map();
const appCategoryTokens = new Map();
const appTotals = new Map();
const categoryTotals = new Map();
let totalBytes = 0;
let nextTokenId = 1;

function notify() {
  const snapshot = getTotals();
  listeners.forEach((fn) => fn(snapshot));
}

function addTotals(appId, category, bytes) {
  if (!appId) return;
  const appEntry = appTotals.get(appId) || { total: 0, categories: new Map() };
  appEntry.total += bytes;
  const catTotal = appEntry.categories.get(category) || 0;
  appEntry.categories.set(category, catTotal + bytes);
  appTotals.set(appId, appEntry);

  const categoryTotal = categoryTotals.get(category) || 0;
  categoryTotals.set(category, categoryTotal + bytes);
  totalBytes += bytes;
}

function subtractTotals(appId, category, bytes) {
  if (!appId) return;
  const appEntry = appTotals.get(appId);
  if (appEntry) {
    appEntry.total -= bytes;
    const catTotal = (appEntry.categories.get(category) || 0) - bytes;
    if (catTotal <= 0) appEntry.categories.delete(category);
    else appEntry.categories.set(category, catTotal);
    if (appEntry.total <= 0) appTotals.delete(appId);
  }

  const categoryTotal = (categoryTotals.get(category) || 0) - bytes;
  if (categoryTotal <= 0) categoryTotals.delete(category);
  else categoryTotals.set(category, categoryTotal);

  totalBytes -= bytes;
  if (totalBytes < 0) totalBytes = 0;
}

export const resourceTracker = {
  claim(appId, category, bytes, label = "") {
    const token = `rt_${nextTokenId++}`;
    const entry = { appId, category, bytes: Math.max(0, bytes || 0), label };
    tokens.set(token, entry);
    addTotals(appId, category, entry.bytes);
    notify();
    return token;
  },
  release(token) {
    if (!tokens.has(token)) return;
    const entry = tokens.get(token);
    tokens.delete(token);
    subtractTotals(entry.appId, entry.category, entry.bytes);
    notify();
  },
  setAppTotal(appId, category, bytes, label = "") {
    const key = `${appId}:${category}`;
    const existingToken = appCategoryTokens.get(key);
    if (existingToken) {
      const entry = tokens.get(existingToken);
      if (entry) {
        subtractTotals(entry.appId, entry.category, entry.bytes);
        entry.bytes = Math.max(0, bytes || 0);
        entry.label = label;
        addTotals(entry.appId, entry.category, entry.bytes);
      }
    } else {
      const token = this.claim(appId, category, bytes, label);
      appCategoryTokens.set(key, token);
    }
    notify();
  },
  clearApp(appId) {
    const toRemove = [];
    tokens.forEach((entry, token) => {
      if (entry.appId === appId) toRemove.push(token);
    });
    toRemove.forEach((token) => this.release(token));
    appCategoryTokens.forEach((token, key) => {
      if (key.startsWith(`${appId}:`)) appCategoryTokens.delete(key);
    });
    notify();
  },
  getTotals,
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

function getTotals() {
  const byApp = {};
  appTotals.forEach((value, appId) => {
    const categories = {};
    value.categories.forEach((bytes, category) => {
      categories[category] = bytes;
    });
    byApp[appId] = {
      totalBytes: value.total,
      categories,
    };
  });

  const byCategory = {};
  categoryTotals.forEach((bytes, category) => {
    byCategory[category] = bytes;
  });

  return {
    totalBytes,
    byApp,
    byCategory,
  };
}
