(()=>{
 const root=document.documentElement,button=document.querySelector('.theme-toggle'),logo=document.querySelector('header .logo');
 const icons={light:'<circle cx="12" cy="12" r="3.5"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',dark:'<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z"/>'};
 function apply(theme){
  root.dataset.theme=theme;
  logo.src=logo.dataset[theme];
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[theme]+'</svg><span>'+ (theme==='light'?'Светлая':'Тёмная')+'</span>';
  button.setAttribute('aria-label',theme==='light'?'Включить тёмную тему':'Включить светлую тему');
  button.title=button.getAttribute('aria-label');
  try{localStorage.setItem('duppel-theme',theme)}catch{}
 }
 button.addEventListener('click',()=>apply(root.dataset.theme==='light'?'dark':'light'));
 apply(root.dataset.theme);
})();
