// dino.js

// Dipanggil saat user menekan tombol Play
function loadGame() {
  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('gameWrapper').style.display = 'block';
  initDinoGame('gameWrapper');
}

// Kembali ke menu utama
// Di file dino.js - fungsi backToMenu yang diperbaiki
function backToMenu() {
  cancelAnimationFrame(gameLoop);
  document.getElementById('gameWrapper').innerHTML = '';
  document.getElementById('gameWrapper').style.display = 'none';
  document.getElementById('mainMenu').style.display = 'flex';
  
  // Bersihkan background bottom layer
  const bottomLayer = document.getElementById('bottomLayer');
  bottomLayer.style.backgroundImage = '';
  bottomLayer.classList.remove('scroll');
}



// Inisialisasi dan jalankan game di dalam elemen containerId
function initDinoGame(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <canvas id="gameCanvas"></canvas>
    <div id="scoreDisplay" style="
      position:absolute; top:10px; left:10px;
      font-size:16px; color:#000000; z-index:50;
    ">POINT: 0</div>
    <div id="gameOver" style="
      display:none; position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%);
      background:rgba(0,0,0,0.9); color:white;
      padding:20px; text-align:center; border-radius:10px;
      width:300px; z-index:100;
    ">
      <h2 style="margin-bottom:15px;">GAME OVER!</h2>
      <p>SCORE: <span id="finalScore">0</span></p>
      <button class="gameButton" onclick="backToMenu()">BACK TO MENU</button>
    </div>
  `;


  // Telegram Web App Init
  const tg = window.Telegram.WebApp;
  tg.expand();
  tg.BackButton.onClick(() => tg.close());

  // --- Game Constants & Images ---
  const OBSTACLE_TYPES = {
    CACTUS_SMALL: { width: 44, height: 50 },
    CACTUS_MEDIUM: { width: 44, height: 50 },
    CACTUS_LARGE: { width: 44, height: 50 },
    BIRD: { width: 44, height: 50 }
  };

  const selectedPack = document.getElementById('packPicker').value; // Ambil nilai dari dropdown


  const bgSprite     = new Image();
  const groundImg    = new Image();
  const dinoSprite   = new Image();
  const cactusSprite = new Image();
  const birdSprite   = new Image();
  const bottomLayer  = document.getElementById('bottomLayer');

  // Setup bottomLayer scroll
  bottomLayer.style.backgroundImage = `url(assets/${selectedPack}/bottom.png)`;
  bottomLayer.classList.add('scroll');

  // Variables
  let groundOffset    = 0;
  let bgFrameIndex    = 0;
  let dinoFrame       = 0;
  let dinoTick        = 0;
  let birdFrame       = 0;
  let birdTick        = 0;

  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');

  let dino = { x:50, y:150, width:44, height:50, velocityY:0, isJumping:false };
  let obstacles = [];
  let score     = 0;
  let gameLoop;
  let isGameOver   = false;
  let isGameStarted= false;
  let baseSpeed    = 4;
  let currentSpeed = baseSpeed;
  let spawnCooldown= 0;
  let speedLevel   = 0;

  const speedLevels = [
    { score:   0, speed: 4,   spawnRange: [120,160], obstacles:[{type:'CACTUS_SMALL',ratio:1}], birdChance:0 },
    { score: 200, speed: 4.5, spawnRange: [100,140], obstacles:[{type:'CACTUS_SMALL',ratio:0.8},{type:'CACTUS_MEDIUM',ratio:0.2}], birdChance:0 },
    { score: 300, speed: 5,   spawnRange: [80,120],  obstacles:[{type:'CACTUS_MEDIUM',ratio:0.6},{type:'BIRD',ratio:0.4}], birdChance:0.3 },
    { score: 400, speed: 5.5, spawnRange: [60,100],  obstacles:[{type:'CACTUS_LARGE',ratio:0.7},{type:'BIRD',ratio:0.3}], birdChance:0.4 },
    { score: 600, speed: 6,   spawnRange: [40,80],   obstacles:[{type:'CACTUS_LARGE',ratio:0.8},{type:'BIRD',ratio:0.2}], birdChance:0.5 }
  ];


  // --- Load sprite images ---
  bgSprite.src     = `assets/${selectedPack}/bg.png`;
  groundImg.src    = `assets/${selectedPack}/ground.png`;
  dinoSprite.src   = `assets/${selectedPack}/dino.png`;
  cactusSprite.src = `assets/${selectedPack}/cactus.png`;
  birdSprite.src   = `assets/${selectedPack}/bird.png`;

  // --- Canvas Setup ---
  function resizeCanvas() {
    canvas.width  = 800;
    canvas.height = 200;
  }
  resizeCanvas();

  // --- Game Logic Functions ---
  function jump() {
    if (!dino.isJumping && isGameStarted) {
      dino.velocityY = -10;
      dino.isJumping  = true;
    }
  }

  function createObstacle() {
    const lvl = speedLevels[speedLevel];
    let arr = [...lvl.obstacles];
    if (score < 300) arr = arr.filter(o => o.type !== 'BIRD');

    const total = arr.reduce((s,o)=>s+o.ratio,0);
    let rnd = Math.random()*total;
    let sel;
    for (let o of arr) {
      if (rnd <= o.ratio) { sel = o.type; break; }
      rnd -= o.ratio;
    }

    const cfg = OBSTACLE_TYPES[sel];
    const isBird = sel==='BIRD';
    obstacles.push({
      type: sel,
      x: canvas.width,
      width: cfg.width,
      height: cfg.height,
      speed: currentSpeed,
      y: isBird ? 100 : canvas.height - cfg.height - 9
    });
    spawnCooldown = lvl.spawnRange[0] + Math.random()*(lvl.spawnRange[1]-lvl.spawnRange[0]);
  }

  function checkCollision(o) {
    const db = { x:dino.x+5, y:dino.y+5, width:dino.width-10, height:dino.height-10 };
    const ob = {
      x: o.x+2,
      y: o.type==='BIRD'? o.y+25 : o.y+2,
      width: o.width-4,
      height: o.type==='BIRD'? 10 : o.height-4
    };
    return (
      db.x < ob.x+ob.width &&
      db.x+db.width > ob.x &&
      db.y < ob.y+ob.height &&
      db.y+db.height > ob.y
    );
  }

  function update() {
    if (!isGameStarted||isGameOver) return;

    // Level & speed
    const nl = speedLevels.findIndex(l=>score<l.score)-1;
    if (nl!==speedLevel && nl>=0) {
      speedLevel = nl;
      currentSpeed = speedLevels[nl].speed;
    }

    // Dino physics
    dino.y += dino.velocityY;
    dino.velocityY += 0.6;
    if (dino.y >= 150) {
      dino.y = 150; dino.isJumping=false; dino.velocityY=0;
    }

    // Move obstacles & collision
    obstacles.forEach((o,i)=>{
      o.x -= o.speed;
      if (checkCollision(o)) gameOver();
      if (o.x+o.width<0) obstacles.splice(i,1);
    });

    // Score
    score++;
    document.getElementById('scoreDisplay').textContent = `POINT: ${Math.floor(score/10)}`;

    // Spawn
    if (spawnCooldown<=0) createObstacle();
    else spawnCooldown--;

    // Scroll ground
    groundOffset -= currentSpeed;
    if (groundOffset<=-canvas.width) groundOffset=0;

    // Background mode
    bgFrameIndex = score>1000?1:0;
  }

  function animateDino() {
    if (!dino.isJumping) {
      dinoTick++;
      if (dinoTick%8===0) dinoFrame=(dinoFrame+1)%4;
    } else {
      dinoFrame = 4;
    }
  }

  function animateBird() {
    birdTick++;
    if (birdTick%6===0) birdFrame=(birdFrame+1)%4;
  }

  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Background siang/malam
    const bgW=400;
    ctx.drawImage(bgSprite,
      bgFrameIndex*bgW,0,bgW,200,
      0,0,canvas.width,canvas.height
    );

    // Ground
    ctx.drawImage(groundImg, groundOffset, canvas.height-32, canvas.width,32);
    ctx.drawImage(groundImg, groundOffset+canvas.width, canvas.height-32, canvas.width,32);

    // Dino
    const sx = dinoFrame*44;
    ctx.drawImage(dinoSprite, sx,0,44,50, dino.x,dino.y,dino.width,dino.height);

    // Obstacles
    obstacles.forEach(o=>{
      if (o.type==='BIRD') {
        const bx = birdFrame*44;
        ctx.drawImage(birdSprite, bx,0,44,50, o.x,o.y,44,50);
      } else {
        let idx=0;
        if (o.type==='CACTUS_MEDIUM') idx=1;
        if (o.type==='CACTUS_LARGE')  idx=2;
        const cx = idx*44;
        ctx.drawImage(cactusSprite, cx,0,44,50, o.x,o.y,44,50);
      }
    });
  }

  function gameOver() {
    bottomLayer.classList.remove('scroll');
    isGameOver = true;
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').textContent = Math.floor(score/10);
    tg.BackButton.show();
    tg.sendData(JSON.stringify({ score: Math.floor(score/10) }));
    cancelAnimationFrame(gameLoop);
  }
 
  function startGame() {
    isGameStarted = true;
    dino.y = 150; dino.isJumping=false; spawnCooldown=0;
    gameLoop = requestAnimationFrame(runGame);
  }

  function runGame() {
    if (!isGameOver && isGameStarted) {
      update();
      animateDino();
      animateBird();
      draw();
      gameLoop = requestAnimationFrame(runGame);
    }
  }

  // Event Listeners
  document.addEventListener('keydown', e => { if (e.code==='Space') jump(); });
  document.addEventListener('touchstart', e => { jump(); e.preventDefault(); });

  // Mulai game segera setelah semua sprite siap
  Promise.all([
    new Promise(r => bgSprite.onload     = r),
    new Promise(r => groundImg.onload    = r),
    new Promise(r => dinoSprite.onload   = r),
    new Promise(r => cactusSprite.onload = r),
    new Promise(r => birdSprite.onload   = r)
  ]).then(() => {
    resizeCanvas();
    startGame();
  });
  
  window.gameLoop = gameLoop;
}