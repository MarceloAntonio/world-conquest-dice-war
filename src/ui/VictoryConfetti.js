export function victoryConfetti(){
  const colors=['#8aefac','#CCE5FF','#84AEDB','#f7d774','#b4a0ff'];
  return `<span class="name-confetti" aria-hidden="true">${Array.from({length:24},(_,i)=>{
    const direction=i%2?-1:1;
    return `<i class="name-confetti-piece" style="--dx:${direction*(18+(i*17)%94)}px;--lift:${-35-(i*13)%58}px;--fall:${35+(i*23)%55}px;--spin:${direction*(120+(i*47)%480)}deg;--launch-delay:${(i%5)*0.025};--piece-color:${colors[i%colors.length]}"></i>`;
  }).join('')}</span>`;
}
