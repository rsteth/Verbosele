// Resolve before the stylesheet paints. Preferences are independent of game state.
(() => {
    const root = document.documentElement;
    const themeKey = 'verbosele.theme.v1';
    const paletteKey = 'verbosele.palette.v1';
    const palettes = ['standard', 'red-green', 'blue-yellow', 'high-contrast'];
    const system = matchMedia('(prefers-color-scheme: dark)');
    const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
    const write = (key, value) => { try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* Preferences still work for this visit. */ } };
    let choice = read(themeKey);
    if (!['light', 'dark'].includes(choice)) choice = null;
    const palette = read(paletteKey);
    root.dataset.theme = choice || (system.matches ? 'dark' : 'light');
    root.dataset.palette = palettes.includes(palette) ? palette : 'standard';

    document.addEventListener('DOMContentLoaded', () => {
        const toggle = document.getElementById('theme-toggle');
        const open = document.getElementById('accessibility-button');
        const dialog = document.getElementById('accessibility-dialog');
        // Enlarged text can fill the space beside the original heading. Float the
        // toolbar at the viewport edge instead of changing any game geometry.
        const heading = document.querySelector('h1');
        const placeToolbar = () => {
            root.dataset.toolbarPlacement = heading.getBoundingClientRect().width > 180 ? 'bottom' : 'heading';
        };
        new ResizeObserver(placeToolbar).observe(heading);
        window.addEventListener('resize', placeToolbar);
        placeToolbar();
        const sync = () => {
            const dark = root.dataset.theme === 'dark';
            toggle.setAttribute('aria-pressed', String(dark));
            toggle.querySelector('[data-theme-icon]').textContent = dark ? '☾' : '☀';
            document.getElementById('theme-source').textContent = choice ? `Theme: ${root.dataset.theme} (your choice).` : `Theme: ${root.dataset.theme} (system).`;
        };
        toggle.addEventListener('click', () => {
            choice = root.dataset.theme === 'dark' ? 'light' : 'dark';
            root.dataset.theme = choice;
            write(themeKey, choice);
            sync();
        });
        system.addEventListener('change', () => {
            if (!choice) { root.dataset.theme = system.matches ? 'dark' : 'light'; sync(); }
        });
        document.getElementById('system-theme').addEventListener('click', () => {
            choice = null;
            write(themeKey, null);
            root.dataset.theme = system.matches ? 'dark' : 'light';
            sync();
        });
        for (const radio of dialog.querySelectorAll('input[name="palette"]')) {
            radio.checked = radio.value === root.dataset.palette;
            radio.addEventListener('change', () => {
                if (radio.checked) { root.dataset.palette = radio.value; write(paletteKey, radio.value); }
            });
        }
        open.addEventListener('click', () => {
            dialog.showModal();
            dialog.querySelector('input:checked').focus();
        });
        document.getElementById('close-accessibility').addEventListener('click', () => dialog.close());
        dialog.addEventListener('keydown', event => {
            if (event.key !== 'Tab') return;
            const controls = [...dialog.querySelectorAll('button, input:checked')];
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        });
        dialog.addEventListener('close', () => open.focus());
        sync();
    });
})();
