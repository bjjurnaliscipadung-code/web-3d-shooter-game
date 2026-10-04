import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const gameOverPanel = document.getElementById('gameOver');
const healthText = document.getElementById('healthText');
const scoreText = document.getElementById('scoreText');
const waveText = document.getElementById('waveText');
const enemyText = document.getElementById('enemyText');
const finalScoreText = document.getElementById('finalScoreText');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07131b);
scene.fog = new THREE.Fog(0x07131b, 18, 70);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 250);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

const arenaSize = 24;
const player = {
  position: new THREE.Vector3(0, 1.8, 12),
  velocity: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  speed: 10,
  sprintSpeed: 15,
  hp: 100,
  maxHp: 100,
  score: 0,
  wave: 1,
  started: false,
  gameOver: false,
};

const mouse = {
  down: false,
  lastShot: 0,
};

const keys = {};
const world = {
  bounds: arenaSize / 2,
  floor: null,
  enemies: [],
  bullets: [],
  muzzleFlash: null,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateHud() {
  healthText.textContent = Math.max(0, Math.ceil(player.hp));
  scoreText.textContent = String(player.score);
  waveText.textContent = String(player.wave);
  enemyText.textContent = String(world.enemies.length);
}

function resetPlayer() {
  player.position.set(0, 1.8, 12);
  player.yaw = Math.PI;
  player.pitch = 0;
  player.hp = player.maxHp;
}

function createArena() {
  const ambient = new THREE.HemisphereLight(0xbfe3ff, 0x101820, 1.15);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(10, 18, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.left = -35;
  dirLight.shadow.camera.right = 35;
  dirLight.shadow.camera.top = 35;
  dirLight.shadow.camera.bottom = -35;
  scene.add(dirLight);

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c2b33,
    roughness: 0.9,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  world.floor = floor;

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x32495e, roughness: 0.9 });
  const wallData = [
    { size: [42, 4, 1], pos: [0, 2, -21] },
    { size: [42, 4, 1], pos: [0, 2, 21] },
    { size: [1, 4, 42], pos: [-21, 2, 0] },
    { size: [1, 4, 42], pos: [21, 2, 0] },
  ];

  wallData.forEach(({ size, pos }) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(...size), wallMat);
    wall.position.set(...pos);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  });

  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x5b7f94, roughness: 0.8 });
  for (let i = 0; i < 8; i++) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 5.5, 10), pillarMat);
    const angle = (i / 8) * Math.PI * 2;
    const radius = 9 + (i % 2) * 3;
    pillar.position.set(Math.cos(angle) * radius, 2.75, Math.sin(angle) * radius);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);
  }
}

function spawnEnemy() {
  const material = new THREE.MeshStandardMaterial({ color: 0xff5a5f, emissive: 0x230505, metalness: 0.2, roughness: 0.6 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const safeRadius = 10;
  let x = 0;
  let z = 0;
  do {
    x = (Math.random() - 0.5) * 30;
    z = (Math.random() - 0.5) * 30;
  } while (Math.hypot(x, z) < safeRadius);

  mesh.position.set(x, 0.8, z);
  scene.add(mesh);

  world.enemies.push({
    mesh,
    health: 100,
    speed: 1.6 + Math.random() * 1.3 + player.wave * 0.15,
    damagePerSecond: 10 + player.wave * 2,
  });
}

function spawnWave() {
  const count = 5 + player.wave * 2;
  for (let i = 0; i < count; i++) {
    spawnEnemy();
  }
  updateHud();
}

function createMuzzleFlash() {
  if (world.muzzleFlash) {
    scene.remove(world.muzzleFlash);
  }

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffec99 })
  );

  const cameraPos = new THREE.Vector3();
  camera.getWorldPosition(cameraPos);
  flash.position.copy(cameraPos).add(new THREE.Vector3(0.25, -0.2, -0.5).applyQuaternion(camera.quaternion));

  scene.add(flash);
  world.muzzleFlash = flash;
  setTimeout(() => {
    if (world.muzzleFlash) {
      scene.remove(world.muzzleFlash);
      world.muzzleFlash = null;
    }
  }, 80);
}

function shoot() {
  if (!player.started || player.gameOver) return;
  if (performance.now() - mouse.lastShot < 180) return;
  mouse.lastShot = performance.now();

  createMuzzleFlash();

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  let hitEnemy = null;
  let closestHit = Infinity;

  for (const enemy of world.enemies) {
    const hit = raycaster.intersectObject(enemy.mesh, false)[0];
    if (hit) {
      const distance = hit.distance;
      if (distance < closestHit) {
        closestHit = distance;
        hitEnemy = enemy;
      }
    }
  }

  if (hitEnemy) {
    hitEnemy.health -= 35;
    if (hitEnemy.health <= 0) {
      scene.remove(hitEnemy.mesh);
      world.enemies = world.enemies.filter((e) => e !== hitEnemy);
      player.score += 10;
      if (world.enemies.length === 0) {
        player.wave += 1;
        spawnWave();
      }
    }
  }

  updateHud();
}

function updatePlayer(dt) {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  direction.y = 0;
  direction.normalize();

  const right = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
  const move = new THREE.Vector3();

  if (keys['KeyW']) move.add(direction);
  if (keys['KeyS']) move.sub(direction);
  if (keys['KeyA']) move.sub(right);
  if (keys['KeyD']) move.add(right);

  if (move.lengthSq() > 0) {
    move.normalize();
    const currentSpeed = keys['ShiftLeft'] || keys['ShiftRight'] ? player.sprintSpeed : player.speed;
    player.velocity.x = move.x * currentSpeed;
    player.velocity.z = move.z * currentSpeed;
  } else {
    player.velocity.x *= 0.72;
    player.velocity.z *= 0.72;
  }

  player.position.x += player.velocity.x * dt;
  player.position.z += player.velocity.z * dt;
  player.position.x = clamp(player.position.x, -world.bounds + 1, world.bounds - 1);
  player.position.z = clamp(player.position.z, -world.bounds + 1, world.bounds - 1);

  camera.position.copy(player.position);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

function updateEnemies(dt) {
  for (const enemy of world.enemies) {
    const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.mesh.position);
    toPlayer.y = 0;
    const distance = toPlayer.length();

    if (distance > 0.001) {
      toPlayer.normalize();
      enemy.mesh.position.addScaledVector(toPlayer, enemy.speed * dt);
      enemy.mesh.lookAt(player.position.x, enemy.mesh.position.y, player.position.z);
    }

    if (distance < 1.4) {
      player.hp -= enemy.damagePerSecond * dt;
      if (player.hp <= 0) {
        player.hp = 0;
        endGame();
      }
    }
  }
  updateHud();
}

function endGame() {
  if (player.gameOver) return;
  player.gameOver = true;
  player.started = false;
  gameOverPanel.classList.remove('hidden');
  finalScoreText.textContent = `Score: ${player.score}`;
  document.exitPointerLock();
}

function resetGame() {
  player.score = 0;
  player.wave = 1;
  player.gameOver = false;
  player.started = true;
  resetPlayer();

  world.enemies.forEach((enemy) => scene.remove(enemy.mesh));
  world.enemies = [];

  spawnWave();
  updateHud();
  gameOverPanel.classList.add('hidden');
  overlay.classList.add('hidden');
}

function startGame() {
  resetGame();
  renderer.domElement.requestPointerLock();
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (event.code === 'KeyR' && player.gameOver) {
    startGame();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

window.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== renderer.domElement || player.gameOver) return;

  player.yaw -= event.movementX * 0.0022;
  player.pitch -= event.movementY * 0.0018;
  player.pitch = clamp(player.pitch, -1.4, 1.4);
});

window.addEventListener('mousedown', (event) => {
  if (event.button !== 0) return;
  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
    return;
  }
  shoot();
});

window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== renderer.domElement && player.started && !player.gameOver) {
    overlay.classList.remove('hidden');
    overlay.querySelector('.panel').innerHTML = `
      <h1>Paused</h1>
      <p>Move: WASD</p>
      <p>Aim: Mouse</p>
      <p>Shoot: Left Click</p>
      <p>Press resume to continue</p>
      <button id="resumeButton">Resume</button>
    `;
    const resumeButton = document.getElementById('resumeButton');
    resumeButton.addEventListener('click', () => {
      overlay.classList.add('hidden');
      renderer.domElement.requestPointerLock();
    });
  }
});

createArena();
resetPlayer();
updateHud();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);

  if (player.started && !player.gameOver) {
    updatePlayer(dt);
    updateEnemies(dt);
  }

  renderer.render(scene, camera);
}

animate();
