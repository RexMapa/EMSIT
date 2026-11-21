const menu = document.querySelector('.menu');
const header = document.querySelector('header');

menu.addEventListener('click', () => {
  const open = header.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.textContent = open ? '×' : '☰';
});

document.querySelector('#year').textContent = new Date().getFullYear();
