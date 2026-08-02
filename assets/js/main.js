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
  const form = document.getElementById('integrate-form');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.getElementById('integrate-email').value;
    const studio = document.getElementById('integrate-studio').value;
    const subject = encodeURIComponent('Integration Inquiry');
    const body = encodeURIComponent('Studio/Operator: ' + studio + '\nEmail: ' + email);
    window.location.href = 'mailto:hello@playgambitgames.com?subject=' + subject + '&body=' + body;
  });
})();
