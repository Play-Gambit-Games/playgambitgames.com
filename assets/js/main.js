clearTimeout(window.__revealWatchdog);

const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

const revealEls = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

(function () {
  const canvas = document.getElementById('oddsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const buttons = document.querySelectorAll('.odds__picker-btn');
  const rangeLabel = document.getElementById('oddsRangeLabel');
  const spinsLabel = document.getElementById('oddsSpinsLabel');

  const halfWidthBySpins = { '100': 70, '1000': 14, '10000': 6, '100000': 1.5 };
  const domainHalfWidth = Math.max(...Object.values(halfWidthBySpins)) * 2.2;

  function drawChart(spins) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const halfWidth = halfWidthBySpins[spins] || 14;
    const stddev = halfWidth / 2;
    const mean = 96;
    const padding = 40;
    const plotW = w - padding * 2;
    const plotH = h - padding * 2;
    const xMin = mean - domainHalfWidth;
    const xMax = mean + domainHalfWidth;

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, h - padding);
    ctx.lineTo(w - padding, h - padding);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding, h - padding);
    for (let i = 0; i <= plotW; i++) {
      const x = xMin + (i / plotW) * (xMax - xMin);
      const y = Math.exp(-0.5 * Math.pow((x - mean) / stddev, 2));
      const px = padding + i;
      const py = h - padding - y * plotH;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(w - padding, h - padding);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= plotW; i++) {
      const x = xMin + (i / plotW) * (xMax - xMin);
      const y = Math.exp(-0.5 * Math.pow((x - mean) / stddev, 2));
      const px = padding + i;
      const py = h - padding - y * plotH;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    const meanX = padding + ((mean - xMin) / (xMax - xMin)) * plotW;
    ctx.strokeStyle = 'rgba(255, 47, 208, 0.7)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(meanX, padding);
    ctx.lineTo(meanX, h - padding);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const spins = btn.dataset.spins;
      const range = btn.dataset.range;
      if (rangeLabel) rangeLabel.textContent = range;
      if (spinsLabel) spinsLabel.textContent = Number(spins).toLocaleString() + ' spins';
      drawChart(spins);
    });
  });

  drawChart('1000');
})();
