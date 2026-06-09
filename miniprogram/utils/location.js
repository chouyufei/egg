const api = require('./api');

const STORAGE_KEY = 'lastLocation';
const FRESH_MS = 30 * 60 * 1000;  // 30 分钟内复用缓存

function getCached() {
  try {
    const v = wx.getStorageSync(STORAGE_KEY);
    if (v && v.lat && v.lng && (Date.now() - v.ts) < FRESH_MS) return v;
  } catch (e) {}
  return null;
}

function setCached(loc) {
  try { wx.setStorageSync(STORAGE_KEY, { ...loc, ts: Date.now() }); } catch (e) {}
}

// 获取定位：优先用缓存；否则调 wx.getLocation。失败返回 null（不抛错）
async function getLocation({ force = false } = {}) {
  if (!force) {
    const cached = getCached();
    if (cached) return { lat: cached.lat, lng: cached.lng, fromCache: true };
  }
  return new Promise((resolve) => {
    wx.getLocation({
      type: 'gcj02',
      success: (r) => {
        const loc = { lat: r.latitude, lng: r.longitude };
        setCached(loc);
        resolve(loc);
      },
      fail: () => resolve(null),
    });
  });
}

// 获取定位并静默上报到后端（用户未授权 / 失败时静默忽略）
async function getAndReportLocation() {
  const loc = await getLocation();
  if (!loc) return null;
  try { await api.post('/auth/location', { lat: loc.lat, lng: loc.lng }); } catch (e) {}
  return loc;
}

function formatDistance(km) {
  if (km == null) return '';
  if (km < 1) return Math.round(km * 1000) + ' m';
  if (km < 100) return km.toFixed(1) + ' km';
  return Math.round(km) + ' km';
}

module.exports = { getLocation, getAndReportLocation, formatDistance };
