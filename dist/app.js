const menus={
  halim:[
    {name:'حلیم سبوس‌دار بوقلمون و گوساله',items:[['کیلویی',400],['پرس بزرگ',200],['پرس کوچک',170]]},
    {name:'آش رشته تهران',items:[['کیلویی',400],['پرسی',200]]},
    {name:'آش دوغ',items:[['کیلویی',400],['پرسی',200]]},
    {name:'آش اوماج تبریز',items:[['کیلویی',400],['پرسی',200]]}
  ],
  soup:[{name:'سوپ جو زعفرانی',items:[['کیلویی',400],['پرسی',200]]}],
  traditional:[{name:'غذاهای سنتی',items:[['کوفته تبریزی',400],['دلمه برگ مو',200],['دیشلیق',170]]}],
  breakfast:[{name:'صبحانه',items:[['املت (با گوجه)',400],['عدسی',200],['چای',170]]}],
  dessert:[{name:'دسر سنتی',items:[['سمنو',400],['شله زرد',200],['حلوا',200]]}]
};
const panel=document.querySelector('#menu-items');
function renderMenu(category){
  panel.innerHTML=menus[category].map(group=>`<section class="menu-group"><h3 class="menu-group-title">${group.name}</h3>${group.items.map(([name,price])=>`<article class="menu-item"><div class="item-title"><h4>${name}</h4><span class="dots"></span><span class="menu-price">${price.toLocaleString('fa-IR')} <small>تومان</small></span></div></article>`).join('')}</section>`).join('');
  document.querySelector('.menu-scroll-content').scrollTop=0;
}
renderMenu('halim');
const mapPreview = document.querySelector('.map-preview');
const mapOpen = document.querySelector('.visit-map-open');
let mapPreviousOverflow = '';
mapOpen.addEventListener('click', () => {
  mapPreviousOverflow = document.body.style.overflow;
  mapPreview.showModal();
  document.body.style.overflow = 'hidden';
});
mapPreview.querySelector('.map-preview-close').addEventListener('click', () => mapPreview.close());
mapPreview.addEventListener('click', event => {
  if (event.target === mapPreview) mapPreview.close();
});
mapPreview.addEventListener('close', () => {
  document.body.style.overflow = mapPreviousOverflow;
  mapOpen.focus({ preventScroll: true });
});
// Daily opening hours follow the shop's timezone, wherever the visitor is.
function getShopStatus(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const minutes = Number(parts.find(part => part.type === 'hour').value) * 60
    + Number(parts.find(part => part.type === 'minute').value);
  if (minutes >= 420 && minutes < 450) {
    return { text: `${450 - minutes} دقیقه دیگه باز می‌کنیم`, open: false, blink: true };
  }
  if (minutes >= 1410) {
    return { text: `${1440 - minutes} دقیقه دیگه می‌بندیم`, open: true, blink: true };
  }
  if (minutes >= 450) return { text: 'در خدمتیم', open: true, blink: true };
  return { text: 'بسته هستیم', open: false, blink: false };
}
const shopStatus = document.querySelector('.shop-status');
function updateShopStatus() {
  const status = getShopStatus();
  const label = shopStatus.querySelector('.shop-status-text');
  if (label.textContent !== status.text) label.textContent = status.text;
  shopStatus.classList.toggle('is-open', status.open);
  shopStatus.classList.toggle('is-blinking', status.blink);
}
updateShopStatus();
setInterval(updateShopStatus, 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateShopStatus();
});
const tabs=[...document.querySelectorAll('[data-category]')];
tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>{tabs.forEach(item=>item.setAttribute('aria-selected',String(item===tab)));renderMenu(tab.dataset.category)});
  tab.addEventListener('keydown',event=>{
    if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
      event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowLeft'?1:-1)+tabs.length)%tabs.length;
      tabs[next].focus();tabs[next].click();
    }
  });
});
const toggle=document.querySelector('.mobile-toggle');
const nav=document.querySelector('.main-nav');
const headerMobile = matchMedia('(max-width:900px)');
function placeShopStatus() {
  if (headerMobile.matches) nav.before(shopStatus);
  else nav.prepend(shopStatus);
}
placeShopStatus();
headerMobile.addEventListener('change', placeShopStatus);
toggle.addEventListener('click',()=>{
  const open=nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-label',open?'بستن منو':'باز کردن منو');
  toggle.textContent=open?'×':'☰';
});
nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-label','باز کردن منو');
  toggle.textContent='☰';
}));
