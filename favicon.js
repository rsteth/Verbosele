// Reused from stethem.com script.js (rsteth/rsteth.github.io, 52fe2bf).
// Keep the original 64px drawing, colors, motion and 12fps timing.
// The linked PNG remains available without JavaScript or canvas support.
(function () {
    'use strict';
    const size = 64;
    const floor = 48;
    const radius = 11;
    const fps = 12;

    let canvas, ctx, link;
    let frame = 0;

    function createFavicon() {
        canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        ctx = canvas.getContext('2d');
        if (!ctx) return;

        link = document.querySelector('link[rel~="icon"]') || document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.sizes = `${size}x${size}`;

        if (!link.parentNode) {
            document.head.appendChild(link);
        }

        draw();
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let timer;
        function updateAnimation() {
            clearInterval(timer);
            if (!motion.matches && !document.hidden) {
                timer = setInterval(draw, 1000 / fps);
            }
        }
        motion.addEventListener('change', updateAnimation);
        document.addEventListener('visibilitychange', updateAnimation);
        updateAnimation();
    }

    function draw() {
        const bounce = Math.abs(Math.sin(frame * 0.28));
        const x = 32 + Math.sin(frame * 0.1) * 13;
        const y = floor - radius - bounce * 24;
        const isLanding = bounce < 0.14;
        const squishX = isLanding ? 1.18 : 1;
        const squishY = isLanding ? 0.82 : 1;

        ctx.clearRect(0, 0, size, size);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.beginPath();
        ctx.ellipse(x, floor + 5, radius * (1.3 - bounce * 0.55), 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(squishX, squishY);

        ctx.fillStyle = '#e91b1b';
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff7777';
        ctx.beginPath();
        ctx.arc(-4, -4, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(-3, -1, 1.4, 0, Math.PI * 2);
        ctx.arc(4, -1, 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(1, 2, 4, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();

        ctx.restore();

        link.href = canvas.toDataURL('image/png');
        frame += 1;
    }

    createFavicon();

})();
