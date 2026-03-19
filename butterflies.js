(function () {
  'use strict';

  const BUTTERFLY_COUNT = 28;
  const WING_FPS        = 6;
  const WING_MS         = 1000 / WING_FPS;
  const SVG_SRCS        = ['b1.svg', 'b2.svg', 'b3.svg', 'b4.svg', 'b3.svg', 'b2.svg'];

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function loadImages(srcs) {
    return Promise.all(
      srcs.map(
        src =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload  = () => resolve(img);
            img.onerror = reject;
            img.src     = src;
          })
      )
    );
  }

  function createButterflies(count) {
    return Array.from({ length: count }, (_, i) => {
      const baseSizeFrac = rand(0.018, 0.048);
      const angle = rand(-Math.PI * 11/12, -Math.PI / 12);
      const ageMult = Math.random() < 0.25 ? rand(0.4, 0.65) : 1;
      return {
        originXFrac: rand(0.125, 0.875),
        angle,
        distFrac:    rand(0.18, 0.44) * ageMult,
        baseSizeFrac,
        spawnDelay:  i * rand(40, 75),
        lifespan:    Math.min(rand(1400, 2400) / (baseSizeFrac / 0.03), 2800) * ageMult,
        frameOffset: Math.floor(rand(0, SVG_SRCS.length)),
        wobbleFreq:  rand(0.8, 2.0),
        wobbleAmp:   baseSizeFrac * baseSizeFrac * rand(5, 12),
        tiltRad:     (angle + Math.PI / 2) * 0.4 + rand(-0.12, 0.12),
      };
    });
  }

  function launch(frames) {
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position:      'fixed',
      inset:         '0',
      width:         '100%',
      height:        '100%',
      pointerEvents: 'none',
      zIndex:        '50',
    });
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const butterflies = createButterflies(BUTTERFLY_COUNT);
    const startTime   = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      const sizeW     = Math.min(W, window.screen.width * 2 / 3);
      const sizeScale = Math.min(1, Math.pow(700 / sizeW, 0.38));

      let anyActive = false;

      for (const b of butterflies) {
        const t = elapsed - b.spawnDelay;

        if (t < 0) {
          anyActive = true;
          continue;
        }

        const progress = t / b.lifespan;

        if (progress >= 1) continue;

        anyActive = true;

        const eased    = 1 - Math.pow(1 - progress, 1.5);
        const baseSize = b.baseSizeFrac * sizeW * sizeScale;

        const size = baseSize * (1 - Math.pow(progress, 0.55) * 0.74);
        if (size <= 0) continue;

        const dist    = b.distFrac * H;
        const wobble  = Math.sin(elapsed * 0.001 * b.wobbleFreq * Math.PI * 2) * b.wobbleAmp * W;
        const originX = b.originXFrac * W;
        const originY = H + baseSize * 0.5;
        const x = originX + Math.cos(b.angle) * eased * dist + wobble;
        const y = originY + Math.sin(b.angle) * eased * dist;

        let alpha;
        if      (progress < 0.07) alpha = progress / 0.07;
        else if (progress > 0.40) alpha = (1 - progress) / 0.60;
        else                      alpha = 1;
        alpha = Math.max(0, Math.min(1, alpha));

        const frameIdx = Math.floor(t / WING_MS + b.frameOffset) % SVG_SRCS.length;
        const img = frames[frameIdx];

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(b.tiltRad);
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
      }

      if (anyActive) {
        requestAnimationFrame(tick);
      } else {
        canvas.remove();
        window.removeEventListener('resize', resize);
      }
    }

    requestAnimationFrame(tick);
  }

  async function init() {
    const frames = await loadImages(SVG_SRCS);

    launch(frames);

    const logo = document.querySelector('.logo');
    if (logo) {
      logo.addEventListener('click', (e) => {
        e.preventDefault();
        launch(frames);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
