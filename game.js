/* ============================================================
   Valentine's Game Series – game.js
   Game 1: Heart Catcher  |  Game 2: Memory Match
   Game 3: Flower Picker  |  Game 4: Balloon Pop
   ============================================================ */

// ─── CONFIG ─────────────────────────────────────────────────
const CONFIG = {
  // Game 1 — Heart Catcher
  heartsToWin: 15,
  maxLives: 3,
  baseSpeed: 1.6,
  speedRampPct: 0.04,
  speedRampEvery: 4,
  spawnInterval: 1200,
  minSpawnInterval: 550,
  obstacleChance: 0.15,
  basketWidthRatio: 0.18,
  basketMinPx: 74,
  basketMaxPx: 140,
  playerSpeed: 8,

  // Game 2 — Memory Match
  memoryPairs: 6,

  // Game 3 — Flower Picker
  flowersToPick: 10,
  flowerLives: 2,
  flowerBadChance: 0.25,

  // Game 4 — Balloon Pop
  balloonsToPop: 12,
  balloonLives: 2,
  balloonBadChance: 0.2,
  balloonSpawnMs: 700,
};

// ─── DOM REFS ───────────────────────────────────────────────
const $ = s => document.getElementById(s);
const screens = {
  intro:       $('screen-intro'),
  game:        $('screen-game'),
  over:        $('screen-gameover'),
  gift1:       $('screen-gift-1'),
  memory:      $('screen-memory'),
  trans1:      $('screen-trans1'),
  flowers:     $('screen-flowers'),
  flowerOver:  $('screen-flower-over'),
  gift2:       $('screen-gift-2'),
  balloons:    $('screen-balloons'),
  balloonOver: $('screen-balloon-over'),
  gift3:       $('screen-gift-3'),
  proposal:    $('screen-proposal'),
  final:       $('screen-final'),
  victory:     $('screen-victory'),
};

const canvas      = $('game-canvas');
const ctx         = canvas.getContext('2d');
const scoreVal    = $('score-val');
const scoreTarget = $('score-target');
const livesVal    = $('lives-val');
const bgHearts    = $('bg-hearts');
const finalHearts = $('final-hearts');

const memoryBoard = $('memory-board');
const movesVal    = $('moves-val');
const pairsVal    = $('pairs-val');
const pairsTarget = $('pairs-target');

const flowerGarden  = $('flower-garden');
const flowerVal     = $('flower-val');
const flowerLivesEl = $('flower-lives');

const balloonSky     = $('balloon-sky');
const balloonVal     = $('balloon-val');
const balloonLivesEl = $('balloon-lives');

const victoryText = $('victory-text');

// ═══════════════════════════════════════════════════════════
//  SHARED
// ═══════════════════════════════════════════════════════════
function rand(a, b) { return Math.random() * (b - a) + a; }
function pick(arr)  { return arr[Math.floor(Math.random() * arr.length)]; }

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function showVictory(text, nextScreen) {
  victoryText.textContent = text;
  showScreen('victory');
  burstAt(window.innerWidth / 2, window.innerHeight / 2, ['✨', '🎉', '💖']);
  setTimeout(() => {
    burstAt(window.innerWidth / 3, window.innerHeight / 3, ['✨', '🎉', '💖']);
  }, 400);
  setTimeout(() => {
    burstAt(window.innerWidth * 0.66, window.innerHeight * 0.66, ['✨', '🎉', '💖']);
  }, 800);

  // Wait longer for the scroll animation and reading
  setTimeout(() => {
    showScreen(nextScreen);
  }, 5000);
}

function spawnFloatingHearts(container, count) {
  container.innerHTML = '';
  const e = ['💗','💖','❤️','💕','💓','✨'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'float-heart';
    el.textContent = pick(e);
    el.style.left = rand(0,100)+'%';
    el.style.setProperty('--dur', rand(4,9)+'s');
    el.style.animationDelay = rand(0,6)+'s';
    el.style.fontSize = rand(1,2.4)+'rem';
    container.appendChild(el);
  }
}

function burstAt(x, y, emojis = ['💗','✨','💖']) {
  for (let i = 0; i < 8; i++) {
    const el = document.createElement('span');
    el.className = 'particle';
    el.textContent = pick(emojis);
    el.style.left = x+'px'; el.style.top = y+'px';
    el.style.setProperty('--dx', rand(-50,50)+'px');
    el.style.setProperty('--dy', rand(-70,-20)+'px');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 600);
  }
}

// ═══════════════════════════════════════════════════════════
//  GAME 1 — HEART CATCHER
// ═══════════════════════════════════════════════════════════
let score, lives, fallingObjects, speedMultiplier;
let basketX, basketW, basketH;
let running = false, keys = {}, touchDir = 0;
const HEART_EMOJIS = ['❤️','💖','💗','💓','💘'];
const OBSTACLE_EMOJIS = ['💔','🖤','⛈️'];

function resizeCanvas() {
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  basketW = Math.min(CONFIG.basketMaxPx, Math.max(CONFIG.basketMinPx, canvas.width * CONFIG.basketWidthRatio));
  basketH = basketW * 0.62;
  if (basketX === undefined) basketX = (canvas.width - basketW) / 2;
  basketX = Math.min(canvas.width - basketW, Math.max(0, basketX));
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function renderLives() {
  livesVal.textContent = '❤️'.repeat(lives) + '🤍'.repeat(CONFIG.maxLives - lives);
}

let spawnId = null;
function startSpawning() {
  clearInterval(spawnId); spawn();
  let iv = Math.max(CONFIG.minSpawnInterval, CONFIG.spawnInterval / speedMultiplier);
  spawnId = setInterval(() => {
    spawn();
    iv = Math.max(CONFIG.minSpawnInterval, CONFIG.spawnInterval / speedMultiplier);
    clearInterval(spawnId); spawnId = setInterval(spawn, iv);
  }, iv);
}
function spawn() {
  if (!running) return;
  const bad = Math.random() < CONFIG.obstacleChance;
  const sz = rand(28,40);
  fallingObjects.push({ x: rand(sz, canvas.width-sz), y: -sz, size: sz,
    speed: CONFIG.baseSpeed * speedMultiplier * rand(.85,1.2),
    emoji: bad ? pick(OBSTACLE_EMOJIS) : pick(HEART_EMOJIS), bad });
}

function drawBasket() {
  const bx=basketX, by=canvas.height-basketH-18, w=basketW, h=basketH;
  ctx.save();
  const g=ctx.createLinearGradient(bx,by,bx,by+h);
  g.addColorStop(0,'#ffb3c6'); g.addColorStop(1,'#ff8fab');
  ctx.fillStyle=g; ctx.beginPath();
  ctx.moveTo(bx+8,by); ctx.lineTo(bx+w-8,by);
  ctx.quadraticCurveTo(bx+w,by,bx+w-2,by+h*.85);
  ctx.quadraticCurveTo(bx+w/2,by+h+6,bx+2,by+h*.85);
  ctx.quadraticCurveTo(bx,by,bx+8,by); ctx.fill();
  ctx.strokeStyle='#e05780'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(bx,by+2); ctx.lineTo(bx+w,by+2); ctx.stroke();
  ctx.font=`${w*.32}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('💕',bx+w/2,by+h*.48);
  ctx.restore();
}
function drawFalling(o) {
  ctx.font=`${o.size}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(o.emoji, o.x, o.y);
}

function checkCollisions() {
  const by = canvas.height-basketH-18;
  for (let i=fallingObjects.length-1; i>=0; i--) {
    const o=fallingObjects[i], hs=o.size/2;
    if (o.y+hs>=by && o.y-hs<=by+basketH && o.x+hs>=basketX && o.x-hs<=basketX+basketW) {
      fallingObjects.splice(i,1);
      if (o.bad) { lives--; renderLives(); burstAt(o.x,by,['💔','💢']); if(lives<=0){endG1(false);return;} }
      else { score++; scoreVal.textContent=score; burstAt(o.x,by);
        if(score%CONFIG.speedRampEvery===0) speedMultiplier+=CONFIG.speedRampPct;
        if(score>=CONFIG.heartsToWin){endG1(true);return;} }
      continue;
    }
    if (o.y-hs>canvas.height) fallingObjects.splice(i,1);
  }
}
function endG1(won) { 
  running=false; clearInterval(spawnId); 
  if (won) {
    showVictory("You caught my heart,\nRight from the start.\nMy love for you,\nIs forever true. ❤️", 'gift1');
  } else {
    setTimeout(()=>showScreen('over'),350); 
  }
}

function loop() {
  if(!running)return;
  let dx=0;
  if(keys.ArrowLeft||keys.a||keys.A||touchDir===-1) dx=-CONFIG.playerSpeed;
  if(keys.ArrowRight||keys.d||keys.D||touchDir===1) dx=CONFIG.playerSpeed;
  basketX=Math.min(canvas.width-basketW,Math.max(0,basketX+dx));
  fallingObjects.forEach(o=>{o.y+=o.speed;});
  ctx.clearRect(0,0,canvas.width,canvas.height);
  fallingObjects.forEach(drawFalling); drawBasket(); checkCollisions();
  requestAnimationFrame(loop);
}

function initG1() {
  score=0; lives=CONFIG.maxLives; fallingObjects=[]; speedMultiplier=1;
  basketX=(canvas.width-basketW)/2;
  scoreVal.textContent='0'; scoreTarget.textContent=CONFIG.heartsToWin;
  renderLives(); running=true; startSpawning(); loop();
}

// Input
window.addEventListener('keydown', e=>{keys[e.key]=true;});
window.addEventListener('keyup',   e=>{keys[e.key]=false;});
function bindMobileBtn(id,dir) {
  const el=$(id);
  const s=()=>{touchDir=dir;}, e=()=>{if(touchDir===dir)touchDir=0;};
  el.addEventListener('touchstart',ev=>{ev.preventDefault();s();},{passive:false});
  el.addEventListener('touchend',e); el.addEventListener('mousedown',s); el.addEventListener('mouseup',e);
}
bindMobileBtn('btn-left',-1); bindMobileBtn('btn-right',1);
let touchStartX=null;
canvas.addEventListener('touchstart',e=>{e.preventDefault();touchStartX=e.touches[0].clientX;},{passive:false});
canvas.addEventListener('touchmove',e=>{
  e.preventDefault(); if(touchStartX===null)return;
  const cx=e.touches[0].clientX; basketX=Math.min(canvas.width-basketW,Math.max(0,basketX+(cx-touchStartX))); touchStartX=cx;
},{passive:false});
canvas.addEventListener('touchend',()=>{touchStartX=null;});


// ═══════════════════════════════════════════════════════════
//  GAME 2 — MEMORY MATCH
// ═══════════════════════════════════════════════════════════
const MEM_EMOJIS = ['💖','💗','❤️','💘','💝','💕','🌹','🦋','🎀','🍫','💌','🧸'];
let memCards, memFlipped, memMatched, memMoves, memLocked;

function shuffle(a) { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

function initMem() {
  memFlipped=[]; memMatched=0; memMoves=0; memLocked=false;
  movesVal.textContent='0'; pairsVal.textContent='0'; pairsTarget.textContent=CONFIG.memoryPairs;
  const chosen=shuffle([...MEM_EMOJIS]).slice(0,CONFIG.memoryPairs);
  memCards=shuffle([...chosen,...chosen]);
  memoryBoard.innerHTML='';
  memCards.forEach((emoji,idx)=>{
    const c=document.createElement('div'); c.className='mem-card';
    c.innerHTML=`<div class="mem-card-inner"><div class="mem-face mem-front"></div><div class="mem-face mem-back">${emoji}</div></div>`;
    c.onclick=()=>flipCard(c,idx); memoryBoard.appendChild(c);
  });
}

function endG2() {
  setTimeout(() => {
    showVictory("We match so perfectly,\nIt's plain to see.\nYou're the only one,\nThat's right for me. 🧩", 'trans1');
  }, 350);
}

function flipCard(c,idx) {
  if(memLocked||c.classList.contains('flipped')||c.classList.contains('matched'))return;
  c.classList.add('flipped'); memFlipped.push({card:c,idx,emoji:memCards[idx]});
  if(memFlipped.length===2) {
    memMoves++; movesVal.textContent=memMoves; memLocked=true;
    const [a,b]=memFlipped;
    if(a.emoji===b.emoji) {
      setTimeout(()=>{
        a.card.classList.add('matched'); b.card.classList.add('matched');
        memMatched++; pairsVal.textContent=memMatched;
        const ra=a.card.getBoundingClientRect(), rb=b.card.getBoundingClientRect();
        burstAt(ra.left+ra.width/2,ra.top+ra.height/2);
        burstAt(rb.left+rb.width/2,rb.top+rb.height/2);
        memFlipped=[]; memLocked=false;
        if(memMatched>=CONFIG.memoryPairs) endG2();
      },350);
    } else {
      setTimeout(()=>{a.card.classList.remove('flipped');b.card.classList.remove('flipped');memFlipped=[];memLocked=false;},800);
    }
  }
}


// ═══════════════════════════════════════════════════════════
//  GAME 3 — FLOWER PICKER
// ═══════════════════════════════════════════════════════════
const FLOWER_E=['🌹','🌷','🌻','🌼','🌺','💐'];
const BAD_FLOWER_E=['🌵','🥀','🍂','🕸️'];
let pickedFlowers=0, fLives=0, fInterval=null;

function renderFLives(){ flowerLivesEl.textContent='❤️'.repeat(fLives)+'🤍'.repeat(CONFIG.flowerLives-fLives); }

function initFlowers() {
  pickedFlowers=0; fLives=CONFIG.flowerLives;
  flowerVal.textContent='0'; renderFLives();
  flowerGarden.innerHTML='';
  spawnFlowerItem(); spawnFlowerItem();
  clearInterval(fInterval); fInterval=setInterval(spawnFlowerItem,600);
}
function spawnFlowerItem() {
  if(!screens.flowers.classList.contains('active'))return;
  const bad=Math.random()<CONFIG.flowerBadChance;
  const el=document.createElement('div');
  el.className='flower-item'+(bad?' bad-flower':'');
  el.textContent=bad?pick(BAD_FLOWER_E):pick(FLOWER_E);
  el.dataset.bad=bad?'1':'0';
  el.style.fontSize=rand(50,80)+'px';
  el.style.left=rand(5,85)+'%'; el.style.top=rand(5,80)+'%';
  el.onmousedown=el.ontouchstart=e=>{e.preventDefault();e.stopPropagation();clickFlower(el);};
  flowerGarden.appendChild(el);
  setTimeout(()=>{if(el.parentNode)el.remove();},rand(2000,4000));
}

function endG3() {
  clearInterval(fInterval);
  showVictory("Roses are red,\nViolets are blue,\nNo flower is as\nBeautiful as you. 🌸", 'gift2');
}

function clickFlower(el) {
  if(!el.parentNode)return;
  const r=el.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  if(el.dataset.bad==='1') {
    burstAt(cx,cy,['💔','🥀','💢']); el.remove(); fLives--; renderFLives();
    if(fLives<=0){clearInterval(fInterval);flowerGarden.innerHTML='';setTimeout(()=>showScreen('flowerOver'),400);}
  } else {
    burstAt(cx,cy,['✨','🌸','🌿']); el.remove(); pickedFlowers++; flowerVal.textContent=pickedFlowers;
    if(pickedFlowers>=CONFIG.flowersToPick) endG3();
  }
}


// ═══════════════════════════════════════════════════════════
//  GAME 4 — BALLOON POP
// ═══════════════════════════════════════════════════════════
const BALLOON_E = ['🎈','❤️','🩷','🩵','💜'];
const BAD_BALLOON_E = ['💣','🦇','🖤'];
let poppedBalloons=0, bLives=0, bInterval=null;

function renderBLives(){ balloonLivesEl.textContent='❤️'.repeat(bLives)+'🤍'.repeat(CONFIG.balloonLives-bLives); }

function initBalloons() {
  poppedBalloons=0; bLives=CONFIG.balloonLives;
  balloonVal.textContent='0'; renderBLives();
  balloonSky.innerHTML='';
  clearInterval(bInterval);
  bInterval=setInterval(spawnBalloon, CONFIG.balloonSpawnMs);
  spawnBalloon(); spawnBalloon();
}

function spawnBalloon() {
  if(!screens.balloons.classList.contains('active'))return;
  const bad=Math.random()<CONFIG.balloonBadChance;
  const el=document.createElement('div');
  el.className='balloon'+(bad?' bad-balloon':'');
  el.textContent=bad?pick(BAD_BALLOON_E):pick(BALLOON_E);
  el.dataset.bad=bad?'1':'0';
  el.style.fontSize=rand(40,65)+'px';
  el.style.left=rand(5,85)+'%';
  el.style.bottom='-70px';
  el.style.setProperty('--speed', rand(3,5.5)+'s');
  el.onmousedown=el.ontouchstart=e=>{e.preventDefault();e.stopPropagation();popBalloon(el);};
  balloonSky.appendChild(el);
  // remove after animation ends
  const dur=parseFloat(el.style.getPropertyValue('--speed'))*1000;
  setTimeout(()=>{if(el.parentNode)el.remove();}, dur+200);
}

function endG4() {
  clearInterval(bInterval);
  showVictory("My heart soars high,\nUp in the sky.\nBursting with glee,\nJust you and me. 🎈", 'gift3');
}

function popBalloon(el) {
  if(!el.parentNode)return;
  const r=el.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  if(el.dataset.bad==='1') {
    burstAt(cx,cy,['💔','💣','💢']); el.remove(); bLives--; renderBLives();
    if(bLives<=0){clearInterval(bInterval);balloonSky.innerHTML='';setTimeout(()=>showScreen('balloonOver'),400);}
  } else {
    burstAt(cx,cy,['✨','🎉','💖']); el.remove(); poppedBalloons++; balloonVal.textContent=poppedBalloons;
    if(poppedBalloons>=CONFIG.balloonsToPop) endG4();
  }
}


// ═══════════════════════════════════════════════════════════
//  GIFT LOGIC
// ═══════════════════════════════════════════════════════════
function setupGift(id) {
  const un=$(id+'-unopened'), op=$(id+'-opened');
  un.onclick=()=>{ un.classList.add('hidden'); op.classList.remove('hidden');
    burstAt(window.innerWidth/2,window.innerHeight/2,['✨','🎉','💖']); };
}
setupGift('gift1'); setupGift('gift2'); setupGift('gift3');


// ═══════════════════════════════════════════════════════════
//  BUTTON WIRING
// ═══════════════════════════════════════════════════════════
$('btn-start').onclick          = ()=>{ showScreen('game'); resizeCanvas(); initG1(); };
$('btn-retry').onclick          = ()=>{ showScreen('game'); resizeCanvas(); initG1(); };

$('btn-next-game2').onclick     = ()=>{ showScreen('memory'); initMem(); };

$('btn-go-flowers').onclick     = ()=>{ showScreen('flowers'); initFlowers(); };
$('btn-retry-flowers').onclick  = ()=>{ showScreen('flowers'); initFlowers(); };

$('btn-go-balloons').onclick    = ()=>{ showScreen('balloons'); initBalloons(); };
$('btn-retry-balloons').onclick = ()=>{ showScreen('balloons'); initBalloons(); };

$('btn-goto-proposal').onclick  = ()=> showScreen('proposal');

$('btn-yes').onclick  = ()=>{ showScreen('final'); spawnFloatingHearts(finalHearts,40); };
$('btn-yes2').onclick = ()=>{ showScreen('final'); spawnFloatingHearts(finalHearts,40); };

// No button dodge
const noBtn=$('btn-no');
function dodge(){ const p=noBtn.parentElement.getBoundingClientRect();
  noBtn.style.position='relative';
  noBtn.style.left=rand(-p.width/3,p.width/3)+'px';
  noBtn.style.top=rand(-p.height/3,p.height/3)+'px'; }
noBtn.onmouseenter=dodge;
noBtn.ontouchstart=e=>{e.preventDefault();dodge();};


// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
spawnFloatingHearts(bgHearts, 18);
scoreTarget.textContent = CONFIG.heartsToWin;

// ─── DEBUG: Press S to skip current game (remove before sharing!) ───
window.addEventListener('keydown', e => {
  if (e.key !== 's' && e.key !== 'S') return;
  if (screens.game.classList.contains('active'))      { endG1(true); }
  else if (screens.memory.classList.contains('active'))  { endG2(); }
  else if (screens.flowers.classList.contains('active')) { endG3(); }
  else if (screens.balloons.classList.contains('active')){ endG4(); }
});
