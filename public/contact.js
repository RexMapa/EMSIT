const menu = document.querySelector('.menu');
const header = document.querySelector('header');

function setMenu(open) {
  header.classList.toggle('open', open);
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.textContent = open ? '×' : '☰';
}

menu.addEventListener('click', () => setMenu(!header.classList.contains('open')));
header.querySelector('nav a[href="/contact#top"]').addEventListener('click', () => setMenu(false));

document.querySelector('#year').textContent = new Date().getFullYear();
