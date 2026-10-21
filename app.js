document.getElementById('year').textContent = new Date().getFullYear();
// Keep the complete signature visible even with a fallback or enlarged font.
function fitHeroTitle() {
  const title = document.querySelector('.hero h1');
  if (!title) return;
  title.style.fontSize = '';
  const range = document.createRange();
  range.selectNodeContents(title);
  const width = range.getBoundingClientRect().width;
  if (width > title.clientWidth) {
    const font = parseFloat(getComputedStyle(title).fontSize);
    title.style.fontSize = (font * title.clientWidth / width * 0.98) + 'px';
  }
}
fitHeroTitle();
if (document.fonts) document.fonts.ready.then(fitHeroTitle);
window.addEventListener('resize', fitHeroTitle);
// Review screenshot lightbox
(() => {
  const box = document.getElementById('lightbox');
  if (!box || !box.showModal) return;
  const img = box.querySelector('img');
  document.querySelectorAll('[data-lightbox]').forEach(link => link.addEventListener('click', e => {
    e.preventDefault(); img.src = link.href; img.alt = link.dataset.alt || (link.querySelector('img') || {}).alt || ''; box.showModal();
  }));
  box.addEventListener('click', e => { if (e.target === box || e.target.closest('.lightbox-close')) box.close(); });
})();
