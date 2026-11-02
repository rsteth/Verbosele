Made for mom, play at https://stethem.com/verbosele/index.html

## Appearance and accessibility

**Standard light restores the original `a358aaa` appearance**, including the `#f4f4f4` page, original tile/control sizes, spacing, fonts, green/yellow/gray feedback, solid gold repeated-letter outline, and original glyphs. **Standard dark changes colors only**: it uses the same app geometry and glyphs. Neither Standard theme displays added feedback symbols, a legend, or strike-through letters.

The sun/moon **Dark mode** button and separate **Accessibility** button sit beside the original heading without consuming layout space. At enlarged text sizes, they float at the bottom instead of overlapping the heading or moving the game. Original controls keep their original dimensions. The accessibility dialog offers Standard, Red–green friendly (protan/deutan), Blue–yellow friendly (tritan), and High contrast. The optional palettes use ✓ for correct position, ◆ for present elsewhere, × for absent, a legend, and strike-through previously absent typed letters. These are presentation preferences, not claims to correct color vision.

The app follows the system theme until an explicit choice is saved. **Use system theme** clears only that choice. Theme and palette preferences are independent of game state and still work for the visit when storage is denied. Native modal semantics, focus entry/cycling, Escape/Close, focus return, visible focus on the new controls and opt-in formats, reduced motion and forced colors remain supported. Palette changes never reset guesses, lives or levels. Feedback colors, accessible labels, optional symbols and repeated-letter outlines wait until the tile flip finishes; newly absent typed-letter cues wait until their own tile reveals. The original game uses the device/physical keyboard and has no on-screen letter keyboard.

## Preserved original-light contrast limitations

Restoring the actual original palette intentionally restores its contrast limitations. These were measured and retained at the user's explicit request, rather than silently changing the original colors:

| Original foreground/background | Ratio | Applicable target |
| --- | ---: | ---: |
| White correct letter / `#6aaa64` | 2.7827:1 | 3:1 large bold text |
| White present letter / `#c9b458` | 2.0684:1 | 3:1 large bold text |
| White absent letter / `#787c7e` | 4.2144:1 | Passes 3:1 large bold text |
| New Game white / `#d9534f` | 3.9619:1 | 4.5:1 small text |
| Guess white / `#4caf50` | 2.7796:1 | 4.5:1 regular text |
| Input boundary `#d3d6da` / white | 1.4583:1 | 3:1 meaningful boundary |
| Input boundary `#d3d6da` / `#f4f4f4` page | 1.3258:1 | 3:1 meaningful boundary |

Original filled-tile and gold-outline boundary limitations are also recorded in the comparison/contrast reports. Dark and opt-in palettes are checked at 4.5:1 text and 3:1 meaningful boundaries. The gold duplicate outline remains exact in Standard; opt-in outlines may change color for contrast while retaining the original solid 2px shape.

The original nine-letter row plus Guess button can overflow a narrow viewport. That layout is intentionally preserved in both Standard themes; it is documented, not fixed by shrinking tiles or wrapping the original input controls. The original status line can also overflow at 200% text scaling. The new toolbar avoids the enlarged heading, and the accessibility dialog fits and scrolls.

## Local verification

Serve this directory, for example `python3 -m http.server 4175 --bind 127.0.0.1`. Tests use an existing Playwright/Chromium installation without production dependencies; override `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, or `BASE_URL` as needed. Dictionary/thesaurus requests are mocked.

- `node tests/appearance.cjs`: all eight theme/palette combinations, computed contrast with explicit original-light exceptions, gameplay, system fallback, storage denial, persistence, dialog keyboard controls, text scaling and original nine-letter overflow.
- `node tests/feedback-privacy.cjs`: delayed absence cues, prior revealed knowledge, reduced motion, saved data and reload.
- `node tests/reset-contrast.cjs`: immediate/frame/settled reset-button contrast with the explicit original-light exception; color switches are atomic.
- `node tests/original-appearance.cjs`: serve an archive of actual baseline `a358aaa` separately at `http://127.0.0.1:4185` (or `BASELINE_URL`). It compares identical seeded games at 1280px, 390px and 320px, asserting exact original geometry/colors and Standard glyphs, focused as well as blurred inputs, matching dark geometry, original gold outline, non-overlapping 44px new controls, enlarged-text toolbar fallback and inherited nine-letter overflow.

Actual comparison screenshots, geometry and original-light contrast measurements are under `review/comparison/`; current eight-combination contrast evidence and representative screenshots are under `review/`.

No build or lint configuration exists in this static repository. JavaScript syntax and `git diff --check` are checked separately. Physical devices, screen-reader speech and other browser engines remain untested. This is focused regression coverage, not a blanket accessibility conformance claim.
