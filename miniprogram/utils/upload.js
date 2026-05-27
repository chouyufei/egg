const app = getApp();

function chooseAndUpload(opts = {}) {
  const { count = 1 } = opts;
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        wx.showLoading({ title: '上传中…', mask: true });
        try {
          const urls = [];
          for (const f of res.tempFiles) {
            const url = await uploadOne(f.tempFilePath);
            urls.push(url);
          }
          wx.hideLoading();
          resolve(urls);
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
          reject(e);
        }
      },
      fail: (e) => {
        if (e && e.errMsg && /cancel/.test(e.errMsg)) return resolve([]);
        reject(e);
      },
    });
  });
}

function uploadOne(filePath) {
  return new Promise((resolve, reject) => {
    const token = (app && app.globalData.token) || wx.getStorageSync('token');
    const base = (app && app.globalData.apiBase) || 'http://localhost:3000/api';
    wx.uploadFile({
      url: base + '/upload',
      filePath,
      name: 'file',
      header: token ? { Authorization: 'Bearer ' + token } : {},
      success(res) {
        try {
          const data = JSON.parse(res.data);
          if (res.statusCode >= 200 && res.statusCode < 300 && data.url) resolve(data.url);
          else reject(new Error(data.error || '上传失败'));
        } catch (e) { reject(e); }
      },
      fail: reject,
    });
  });
}

module.exports = { chooseAndUpload, uploadOne };
