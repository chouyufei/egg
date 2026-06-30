const app = getApp();

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const token = (app && app.globalData.token) || wx.getStorageSync('token');
    const base = (app && app.globalData.apiBase) || 'http://localhost:3000/api';
    wx.request({
      url: base + path,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const msg = (res.data && res.data.error) || '请求失败 (' + res.statusCode + ')';
          if (res.statusCode === 401) {
            wx.removeStorageSync('token');
            wx.removeStorageSync('user');
            if (app) app.setAuth('', null);
            wx.reLaunch({ url: '/pages/login/login' });
          }
          wx.showToast({ title: msg, icon: 'none' });
          reject(new Error(msg));
        }
      },
      fail(err) {
        wx.showToast({ title: '网络错误', icon: 'none' });
        reject(err);
      },
    });
  });
}

module.exports = {
  get: (path, params) => {
    if (params) {
      const qs = Object.keys(params)
        .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
        .join('&');
      if (qs) path += (path.indexOf('?') >= 0 ? '&' : '?') + qs;
    }
    return request('GET', path);
  },
  post: (path, data) => request('POST', path, data),
  patch: (path, data) => request('PATCH', path, data),
  del: (path) => request('DELETE', path),
};
