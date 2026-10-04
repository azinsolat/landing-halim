const menus={
  halim:[['حلیم سنتی تبریز','گندم و گوشت؛ پخته‌شده با حوصله.','امضای حلیم‌سرا'],['حلیم با کره و دارچین','کره و دارچین، به سلیقهٔ شما.','خوش‌عطر'],['حلیم ویژه','کنجد و مخلفاتِ دلخواه.','ویژه']],
  breakfast:[['نان و پنیر','نان تازه، پنیر، گردو و سبزی.','کلاسیک'],['خامه و عسل','خامه و عسل؛ همراه سفرهٔ صبح.','شیرین'],['مخلفات حلیم','دارچین، کنجد، شکر یا نمک.','به سلیقهٔ شما']],
  tea:[['چای ایرانی','چای دم‌کشیده در استکان.','خوش‌عطر'],['چای دارچین','یک فنجان چای با عطر دارچین.','گرم'],['دمنوش زعفران','زعفران با رنگ و عطر دل‌نشین.','طلایی']]
};
const panel=document.querySelector('#menu-items');
function renderMenu(category){panel.innerHTML=menus[category].map(([name,description,tag])=>`<article class="menu-item"><div class="item-title"><h3>${name}</h3><span class="dots"></span><span class="tag">${tag}</span></div><p>${description}</p></article>`).join('')}
renderMenu('halim');
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
