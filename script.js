const tonearm = document.getElementById('tonearm');
const volumeDial = document.getElementById('volumeDial');
const albumReadout = document.getElementById('albumReadout');
const speedButtons = [...document.querySelectorAll('.speed-btn')];
const spines = [...document.querySelectorAll('.spine')];

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const gainNode = audioContext.createGain();
gainNode.connect(audioContext.destination);
gainNode.gain.value = 0.65;

let isPlaying = false;
let currentSpeed = 1;
let sequenceIndex = 0;
let timer = null;

const notes = [261.63, 293.66, 329.63, 392.0, 329.63, 293.66, 261.63, 220.0];

function playStep() {
  if (!isPlaying || currentSpeed === 0) {
    return;
  }

  const osc = audioContext.createOscillator();
  const env = audioContext.createGain();

  osc.type = 'square';
  osc.frequency.value = notes[sequenceIndex % notes.length];
  sequenceIndex += 1;

  env.gain.setValueAtTime(0, audioContext.currentTime);
  env.gain.linearRampToValueAtTime(0.65, audioContext.currentTime + 0.02);
  env.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.24);

  osc.connect(env);
  env.connect(gainNode);

  osc.start();
  osc.stop(audioContext.currentTime + 0.26);
}

function restartSequencer() {
  clearInterval(timer);

  if (!isPlaying || currentSpeed === 0) {
    return;
  }

  const interval = 330 / currentSpeed;
  timer = setInterval(playStep, interval);
  playStep();
}

function setPlaying(nextState) {
  isPlaying = nextState && currentSpeed !== 0;
  document.querySelector('.record').style.animationPlayState = isPlaying ? 'running' : 'paused';

  tonearm.setAttribute('aria-valuenow', isPlaying ? '1' : '0');
  tonearm.style.transform = isPlaying ? 'rotate(8deg)' : 'rotate(-36deg)';

  restartSequencer();
}

function setSpeed(speed) {
  currentSpeed = speed;

  speedButtons.forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.speed) === speed);
  });

  if (speed === 0) {
    setPlaying(false);
    tonearm.style.transform = 'rotate(-36deg)';
    tonearm.setAttribute('aria-valuenow', '0');
    return;
  }

  if (tonearm.getAttribute('aria-valuenow') === '1') {
    setPlaying(true);
  }
}

volumeDial.addEventListener('input', () => {
  const value = Number(volumeDial.value) / 100;
  gainNode.gain.setTargetAtTime(value, audioContext.currentTime, 0.02);

  const degrees = -130 + value * 260;
  volumeDial.style.transform = `rotate(${degrees}deg)`;
});

speedButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    await audioContext.resume();
    setSpeed(Number(button.dataset.speed));
  });
});

spines.forEach((spine) => {
  spine.addEventListener('click', () => {
    albumReadout.textContent = `Reading spine: ${spine.dataset.album}`;
  });
});

let dragging = false;

function updateTonearmFromPointer(x) {
  const zoneRect = tonearm.parentElement.getBoundingClientRect();
  const ratio = Math.min(Math.max((x - zoneRect.left) / zoneRect.width, 0), 1);

  if (ratio > 0.64 && currentSpeed !== 0) {
    setPlaying(true);
  } else {
    setPlaying(false);
  }
}

tonearm.addEventListener('pointerdown', async (event) => {
  await audioContext.resume();
  dragging = true;
  tonearm.classList.add('dragging');
  tonearm.setPointerCapture(event.pointerId);
  updateTonearmFromPointer(event.clientX);
});

tonearm.addEventListener('pointermove', (event) => {
  if (!dragging) {
    return;
  }

  updateTonearmFromPointer(event.clientX);
});

function endDrag() {
  dragging = false;
  tonearm.classList.remove('dragging');
}

tonearm.addEventListener('pointerup', endDrag);
tonearm.addEventListener('pointercancel', endDrag);

window.addEventListener('beforeunload', () => {
  clearInterval(timer);
  audioContext.close();
});

volumeDial.dispatchEvent(new Event('input'));
