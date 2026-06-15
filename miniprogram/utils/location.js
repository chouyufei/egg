const api = require('./api');

const STORAGE_KEY = 'lastLocation';      // 自动 GPS 定位的缓存
const CUSTOM_KEY = 'customLoc';          // 用户手动选择的位置（首页可设置，跨页面复用）
const FRESH_MS = 30 * 60 * 1000;         // GPS 缓存 30 分钟
const FAR_THRESHOLD_KM = 500;            // 超过此距离统一显示 ">500 km"

function getCustom() {
  try {
    const v = wx.getStorageSync(CUSTOM_KEY);
    if (v && v.lat && v.lng) return v;   // 自选位置无过期，用户主动改才清
  } catch (e) {}
  return null;
}

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

// 获取定位：
//   1) 用户手动选择的位置（永久优先，除非清除）
//   2) GPS 缓存（30 分钟内）
//   3) 拉起 wx.getLocation
async function getLocation({ force = false } = {}) {
  if (!force) {
    const custom = getCustom();
    if (custom) return { lat: custom.lat, lng: custom.lng, name: custom.name, source: 'custom' };
    const cached = getCached();
    if (cached) return { lat: cached.lat, lng: cached.lng, source: 'cache' };
  }
  return new Promise((resolve) => {
    wx.getLocation({
      type: 'gcj02',
      success: (r) => {
        const loc = { lat: r.latitude, lng: r.longitude, source: 'gps' };
        setCached(loc);
        resolve(loc);
      },
      fail: () => resolve(null),
    });
  });
}

// 让用户在地图上挑位置（带搜索、可漂移）。返回 {lat, lng, name, address} 或 null
// 选完会同时写入 customLoc（持久自选）+ lastLocation 缓存，保证所有页面读取一致
function chooseLocation() {
  return new Promise((resolve) => {
    wx.chooseLocation({
      success: (r) => {
        const loc = { lat: r.latitude, lng: r.longitude, name: r.name || '', address: r.address || '' };
        try { wx.setStorageSync(CUSTOM_KEY, loc); } catch (e) {}
        setCached(loc);
        resolve(loc);
      },
      fail: () => resolve(null),
    });
  });
}

// 清除自选位置，恢复 GPS 优先
function clearCustomLocation() {
  try { wx.removeStorageSync(CUSTOM_KEY); } catch (e) {}
}

// 获取定位并静默上报到后端（用户未授权 / 失败时静默忽略）
async function getAndReportLocation() {
  const loc = await getLocation();
  if (!loc) return null;
  try { await api.post('/auth/location', { lat: loc.lat, lng: loc.lng }); } catch (e) {}
  return loc;
}

// Haversine 距离（公里）。lat/lng 为十进制度数。任一缺失返回 null
function distanceKm(lat1, lng1, lat2, lng2) {
  if (![lat1, lng1, lat2, lng2].every(v => Number.isFinite(Number(v)))) return null;
  const R = 6371;
  const toRad = (d) => (Number(d) * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// 距离展示规则：
//   < 1 km    精确到米，例 "342 m"
//   1-500 km  保留 1 位小数，例 "12.3 km" / "186 km"
//   > 500 km  统一 ">500 km"（视为"超出推荐范围"）
function formatDistance(km) {
  if (km == null) return '';
  if (km > FAR_THRESHOLD_KM) return '>' + FAR_THRESHOLD_KM + ' km';
  if (km < 1) return Math.round(km * 1000) + ' m';
  if (km < 100) return km.toFixed(1) + ' km';
  return Math.round(km) + ' km';
}

module.exports = { getLocation, getAndReportLocation, chooseLocation, clearCustomLocation, distanceKm, formatDistance, FAR_THRESHOLD_KM };
