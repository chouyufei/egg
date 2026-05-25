Component({
  properties: {
    endAt: { type: Number, value: 0 },
  },
  data: { hh: '00', mm: '00', ss: '00' },
  lifetimes: {
    attached() { this.tick(); this.timer = setInterval(() => this.tick(), 1000); },
    detached() { clearInterval(this.timer); },
  },
  observers: {
    endAt() { this.tick(); },
  },
  methods: {
    pad(n) { return n < 10 ? '0' + n : '' + n; },
    tick() {
      const left = Math.max(0, (this.data.endAt || 0) - Date.now());
      const hh = Math.floor(left / 3600000);
      const mm = Math.floor((left % 3600000) / 60000);
      const ss = Math.floor((left % 60000) / 1000);
      this.setData({ hh: this.pad(hh), mm: this.pad(mm), ss: this.pad(ss) });
      if (left === 0 && this._wasPositive) this.triggerEvent('end');
      if (left > 0) this._wasPositive = true;
    },
  },
});
