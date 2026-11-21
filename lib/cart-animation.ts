// Cosmetic only: callers update cart state before starting this animation.
export function flyToCart(source: HTMLImageElement | null) {
  const cart = document.querySelector<HTMLElement>('[data-cart-target="header"]');
  if (!cart) return;
  const pulse = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cart.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 280 });
  };
  if (!source || !source.complete || !source.naturalWidth || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { pulse(); return; }
  const start = source.getBoundingClientRect(), end = cart.getBoundingClientRect();
  if (!start.width || !start.height || start.bottom < 0 || start.top > window.innerHeight) { pulse(); return; }
  const ghost = source.cloneNode() as HTMLImageElement;
  ghost.removeAttribute('id'); ghost.alt = ''; ghost.setAttribute('aria-hidden', 'true');
  ghost.removeAttribute('class');
  Object.assign(ghost.style, { position:'fixed', left:`${start.left}px`, top:`${start.top}px`, width:`${start.width}px`, height:`${start.height}px`, maxWidth:'none', maxHeight:'none', objectFit:'contain', pointerEvents:'none', zIndex:'9999', transformOrigin:'center' });
  document.body.appendChild(ghost);
  if (!ghost.animate) { ghost.remove(); pulse(); return; }
  const dx=end.left+end.width/2-start.left-start.width/2;
  const dy=end.top+end.height/2-start.top-start.height/2;
  const animation=ghost.animate([
    {transform:'translate(0, 0) scale(1)',opacity:0.9},
    {transform:`translate(${dx*0.45}px, ${dy*0.45-50}px) scale(0.65)`,opacity:0.9,offset:0.45},
    {transform:`translate(${dx}px, ${dy}px) scale(0.12)`,opacity:0.15}
  ],{duration:620,easing:'cubic-bezier(0.3,0,0.2,1)',fill:'forwards'});
  const cleanup=setTimeout(()=>ghost.remove(),1000);
  void animation.finished.then(()=>{clearTimeout(cleanup);ghost.remove();if(cart.isConnected)pulse();},()=>{clearTimeout(cleanup);ghost.remove();});
}
