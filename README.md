Made for mom, play at https://stethem.com/verbosele/index.html

## Appearance and accessibility

The sun/moon **Dark mode** button toggles light and dark themes. Without an explicit choice, the app follows system appearance. **Accessibility** opens four independent palette choices: Standard, Red–green friendly (protan/deutan), Blue–yellow friendly (tritan), and High contrast. **Use system theme** clears only the explicit theme choice. These are presentation preferences, not claims to correct color vision.

Revealed guesses use ✓ for correct position, ◆ for present elsewhere, and × for absent in every palette. Symbols, accessible tile names, colors, and the existing repeated-letter outline appear together after the flip completes. Previously absent letters are struck through when typed, with newly absent letters withheld until their own tile feedback becomes visible. The existing app uses the device/physical keyboard and has no on-screen letter keyboard. Palettes never reset guesses, lives, or levels. Preferences use separate app-scoped localStorage keys and still work for the current visit if storage is blocked.

The light palette uses warm ivory, charcoal and restrained earthy accents; dark palettes use the same semantic tokens. Theme resolution runs before the stylesheet. Native modal semantics, keyboard focus cycling, Escape/Close and focus return, visible focus, reduced motion, forced-color support, and responsive nine-letter rows are included.

### Local verification

Serve this directory, for example `python3 -m http.server 4175 --bind 127.0.0.1`, then run `node tests/appearance.cjs`. The standalone browser regression script uses the existing local Playwright/browser installation; override `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, or `BASE_URL` for another machine. It adds no production dependencies and mocks dictionary/thesaurus traffic.

`review/contrast-report.json` records actual computed foreground/background and meaningful boundary contrast in all eight theme/palette combinations, including modal text. Text checks require at least 4.5:1 and boundaries at least 3:1. The suite also verifies gameplay lives/history, feedback privacy during flips, independent persisted choices, live system changes, invalid preferences, denied storage, modal keyboard navigation and focus return, 390px nine-letter fit, desktop, 200% text scaling, reduced-motion and forced-color rendering. Representative actual Chromium screenshots are in `review/`.

No framework build or lint configuration exists in this static repository. JavaScript syntax and `git diff --check` are checked separately. Browser checks are desktop Chromium emulation; physical devices, screen-reader speech output and other browser engines have not been tested. This is focused regression coverage, not a blanket accessibility conformance claim.

Focused follow-up regressions: `node tests/reset-contrast.cjs` samples reset-button contrast immediately after preference events, on the next two frames, and after settling in all eight combinations; `node tests/feedback-privacy.cjs` checks typed-letter reveal timing, prior known absences, reduced motion and reload. Color changes are atomic; only tile transforms animate.
