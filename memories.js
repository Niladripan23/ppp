// ============================================
//   SHARED JOURNEY NAVIGATION
// ============================================
const JourneyNav = {
  KEY: 'birthdayJourneyState',
  NAV_MARKER: 'birthdayInternalNavigation',
  TRANSITION_MS: 600,
  getState() {
    try { return JSON.parse(sessionStorage.getItem(this.KEY)) || {}; }
    catch (e) { return {}; }
  },
  consumeNavigationMarker() {
    const isInternal = sessionStorage.getItem(this.NAV_MARKER) === '1';
    sessionStorage.removeItem(this.NAV_MARKER);
    if (!isInternal) sessionStorage.removeItem(this.KEY);
  },
  markInternalNavigation() {
    sessionStorage.setItem(this.NAV_MARKER, '1');
  },
  setState(partial) {
    const current = this.getState();
    sessionStorage.setItem(this.KEY, JSON.stringify(Object.assign(current, partial)));
  },
  goTo(url, rootSelector = '.page-root') {
    window.BirthdaySound?.play('page');
    const root = document.querySelector(rootSelector);
    if (!root) { this.markInternalNavigation(); window.location.href = url; return; }
    root.classList.add('page-exit');
    setTimeout(() => { this.markInternalNavigation(); window.location.href = url; }, this.TRANSITION_MS);
  },
  renderBackButton(targetUrl, onClickOverride = null) {
    const btn = document.createElement('button');
    btn.className = 'smart-back-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Go back');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 6L9 12L15 18" stroke="#ffe8f3" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    btn.addEventListener('click', onClickOverride || (() => JourneyNav.goTo(targetUrl)));
    document.body.appendChild(btn);
    return btn;
  }
};

JourneyNav.consumeNavigationMarker();
JourneyNav.setState({ reachedMemories: true });
JourneyNav.renderBackButton('poem.html');

function goToJar() {
  JourneyNav.setState({ reachedJar: true });
  JourneyNav.goTo('jar.html', '#memoriesPage');
}


// ============================================
//   PHOTO STACK CONFIG
// ============================================
// To add more photos, just push more paths here.
// The counter logic will automatically adapt to the total number of photos.
const PHOTOS = [
  'photo1.jpg',
  'photo2.jpg',
  'photo3.jpg',
  // 'photo4.jpg',  â† uncomment and add more as needed
];

// Three stack slot definitions: back â†’ mid â†’ front
const SLOTS = [
  { tx: -28, ty: 18,  rotate: -9.5, scale: 0.84 },  // slot 0 = back
  { tx:  20, ty: 10,  rotate:  7.5, scale: 0.92 },  // slot 1 = mid
  { tx:   0, ty:  0,  rotate: -2.0, scale: 1.00 },  // slot 2 = front
];

// z-index per slot
const SLOT_Z = [1, 2, 3];

function buildTransform({ tx, ty, rotate, scale }) {
  return `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rotate}deg) scale(${scale})`;
}


// ============================================
//   STACK STATE
// ============================================
const frames    = [0, 1, 2].map(i => document.getElementById(`frame-${i}`));
const floater   = document.getElementById('stackFloater');
const tapHint   = document.getElementById('tapHint');
const continueW = document.getElementById('continueWrap');

let slotOf = [0, 1, 2]; // frame-0=back, frame-1=mid, frame-2=front
let nextPhotoIdx = PHOTOS.length % PHOTOS.length === 0 ? 3 : 3;
let isAnimating = false;

// Dedicated tracker for progress
let flips = 0;
const totalPhotos = PHOTOS.length;


// â”€â”€ Apply a slot instantly (no animation) â”€â”€
function snapToSlot(frame, slotIdx) {
  frame.style.transition = 'none';
  frame.style.transform  = buildTransform(SLOTS[slotIdx]);
  frame.style.zIndex     = SLOT_Z[slotIdx];
}

// â”€â”€ Animate a frame into a slot â”€â”€
function animateToSlot(frame, slotIdx, duration = 680, easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)') {
  frame.style.transition = `transform ${duration}ms ${easing}`;
  frame.style.transform  = buildTransform(SLOTS[slotIdx]);
  frame.style.zIndex     = SLOT_Z[slotIdx];
}

// â”€â”€ Assign initial photos and positions â”€â”€
function initStack() {
  frames.forEach((frame, i) => {
    const img = frame.querySelector('.frame-img');
    if (img && PHOTOS[i]) img.src = PHOTOS[i];
    snapToSlot(frame, slotOf[i]);
  });
}


// ============================================
//   CYCLE ANIMATION & PROGRESS LOGIC
// ============================================
function cyclePhoto() {
  if (isAnimating) return;
  window.BirthdaySound?.play('photoFlip');
  isAnimating = true;
  
  // â”€â”€ PROGRESS TRACKER â”€â”€
  flips++;
  
  if (flips < totalPhotos) {
    // Update text while still cycling through the initial stack
    tapHint.textContent = `${flips} / ${totalPhotos} viewed`;
  } else if (flips === totalPhotos) {
    // Reached the end of the stack! Hide hint and reveal Continue button
    tapHint.classList.add('hidden');
    setTimeout(() => continueW.classList.add('visible'), 720);
  }

  // Pause the float so it doesn't fight with the cycle transforms
  floater.classList.add('float-paused');

  // Identify which frame is in each slot
  const fiFront = slotOf.indexOf(2);
  const fiMid   = slotOf.indexOf(1);
  const fiBack  = slotOf.indexOf(0);

  const fFront = frames[fiFront];
  const fMid   = frames[fiMid];
  const fBack  = frames[fiBack];

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // PHASE 1 â€” Front frame arcs out to the right
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fFront.style.transition = 'transform 380ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  fFront.style.transform = `translate(calc(-50% + 125px), calc(-50% - 25px)) rotate(14deg) scale(1.02)`;
  fFront.style.zIndex = 4; // Keep actively on top while swinging out

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // PHASE 1b â€” Mid and Back frames step forward
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  setTimeout(() => {
    animateToSlot(fMid,  2, 550);  // mid  â†’ front
    animateToSlot(fBack, 1, 500);  // back â†’ mid
  }, 120);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // PHASE 2 â€” Front card drops behind and slides into the back slot
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  setTimeout(() => {
    fFront.style.zIndex = 0; // instantly slip behind
    animateToSlot(fFront, 0, 450); // slide into back

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // PHASE 3 â€” State update & invisible image swap
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    setTimeout(() => {
      // If there are more than 3 photos, load the next image quietly while it's in the back
      if (PHOTOS.length > 3) {
        const img = fFront.querySelector('.frame-img');
        if (img) {
          img.src = PHOTOS[nextPhotoIdx % PHOTOS.length];
          nextPhotoIdx++;
        }
      }

      // Update logical slot assignments
      slotOf[fiFront] = 0; // was front â†’ now back
      slotOf[fiMid]   = 2; // was mid   â†’ now front
      slotOf[fiBack]  = 1; // was back  â†’ now mid

      // Resume float and unlock cycling
      floater.classList.remove('float-paused');
      isAnimating = false;

    }, 470); // Wait for the slide-behind to finish

  }, 390); // Wait for the swing-out to finish
}

// â”€â”€ Boot â”€â”€
initStack();


// ============================================
//   FLOATING HEARTS
// ============================================
const hCanvas    = document.getElementById('hearts-canvas');
const hCtx       = hCanvas.getContext('2d');
const heartCache = [];
const heartsArray = [];

function resizeHCanvas() {
  hCanvas.width  = window.innerWidth;
  hCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeHCanvas);
resizeHCanvas();

function generateHeartCache() {
  const pinks = ['#ffccd5', '#ffb3c1', '#ff85a1', '#f8bbd0', '#ffe8f3'];
  for (let i = 0; i < 15; i++) {
    const cc   = document.createElement('canvas');
    const cctx = cc.getContext('2d');
    const size = Math.random() * 10 + 6;
    const blur = Math.random() * 3;
    const color = pinks[Math.floor(Math.random() * pinks.length)];
    const pad  = blur * 3 + 12;
    cc.width  = size + pad * 2;
    cc.height = size + pad * 2;
    cctx.filter = `blur(${blur}px)`;
    cctx.fillStyle = color;
    cctx.shadowBlur = 8;
    cctx.shadowColor = color;
    const cx = pad + size / 2, cy = pad, t = size * 0.3;
    cctx.beginPath();
    cctx.moveTo(cx, cy + t);
    cctx.bezierCurveTo(cx, cy, cx - size/2, cy, cx - size/2, cy + t);
    cctx.bezierCurveTo(cx - size/2, cy + (size+t)/2, cx, cy + (size+t)/2, cx, cy + size);
    cctx.bezierCurveTo(cx, cy + (size+t)/2, cx + size/2, cy + (size+t)/2, cx + size/2, cy + t);
    cctx.bezierCurveTo(cx + size/2, cy, cx, cy, cx, cy + t);
    cctx.closePath();
    cctx.fill();
    heartCache.push({ canvas: cc, width: cc.width, height: cc.height });
  }
}

class Heart {
  constructor() {
    this.ci = Math.floor(Math.random() * heartCache.length);
    this.reset(true);
  }
  reset(initial = false) {
    const t = heartCache[this.ci];
    this.x  = Math.random() * hCanvas.width;
    this.y  = initial ? Math.random() * hCanvas.height : hCanvas.height + t.height + 50;
    this.speedY     = Math.random() * 0.3 + 0.2;
    this.swaySpeed  = Math.random() * 0.015 + 0.005;
    this.swayOffset = Math.random() * Math.PI * 2;
    this.swayWidth  = Math.random() * 0.5 + 0.2;
    this.baseOpacity = Math.random() * 0.35 + 0.1;
    this.opacity = initial ? this.baseOpacity : 0;
  }
  update() {
    this.y -= this.speedY;
    this.swayOffset += this.swaySpeed;
    this.x += Math.sin(this.swayOffset) * this.swayWidth;
    const fd = 150;
    let target = this.baseOpacity;
    if (this.y < fd)                   target = this.baseOpacity * (this.y / fd);
    else if (hCanvas.height - this.y < fd) target = this.baseOpacity * ((hCanvas.height - this.y) / fd);
    this.opacity += (target - this.opacity) * 0.05;
    if (this.y < -50) this.reset(false);
  }
  draw() {
    const t = heartCache[this.ci];
    hCtx.save();
    hCtx.globalAlpha = Math.max(0, this.opacity);
    hCtx.drawImage(t.canvas, this.x - t.width / 2, this.y - t.height / 2);
    hCtx.restore();
  }
}

generateHeartCache();
(function initHearts() {
  const n = window.innerWidth < 480 ? 10 : 18;
  for (let i = 0; i < n; i++) heartsArray.push(new Heart());
})();

(function animateHearts() {
  hCtx.clearRect(0, 0, hCanvas.width, hCanvas.height);
  heartsArray.forEach(h => { h.update(); h.draw(); });
  requestAnimationFrame(animateHearts);
})();



