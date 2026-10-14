# Halim Tabriz

A responsive Persian static landing page with a `#892320` hero background, an interactive 3D bowl, a breakfast menu, and restaurant contact information.

The bowl is displayed using a locally bundled version of model-viewer 4.0.0. The camera sits 52 degrees from the vertical axis, showing both the inside and the exterior of the bowl. Automatic rotation stops when reduced motion is enabled or the page is hidden. The site does not use video assets.

As visitors scroll through a sticky scene, the bowl and steam move toward the lower left while the breakfast menu appears on the right. Scrolling back reverses the movement. With reduced motion enabled, the menu remains accessible without animation.

When the bowl reaches its destination, an illustrated hand pours sugar and exits the scene. Sugar is drawn on a separate layer aligned with the bowl's surface, without changing the camera or model structure. Returning to the start of the scene resets the animation.

The page includes online ordering through Snappfood, directions through Google Maps and Neshan, a click-to-call phone number, and an Instagram profile link.

## Project files

The static site is in `dist/`. Its main editable files are:

- `dist/index.html` — page content and links
- `dist/style.css` — base styles
- `dist/scroll-scene.css` — scroll scene and responsive layouts
- `dist/app.js` — menu, opening hours, and page interactions
- `dist/scroll-scene.js` — scroll-driven animation and navigation
- `dist/hero-effects.js` — steam and hero effects
- `dist/bowl-lighting.js` — bowl lighting effects
- `dist/sugar-animation.js` — hand and sugar animation

Serve `dist/` with a static web server to preview or deploy the site. No build step is required.

## Optimized bowl

The page loads `dist/assets/halim-bowl-optimized.glb` (2,540,236 bytes, down from 31,995,464 bytes). Unused data is removed, geometry is Draco-compressed at high precision without reducing triangle count, and textures retain their original resolution with WebP quality 100. Texture compression is visually high quality but not mathematically lossless. All six separately named sugar materials remain available to the animation.

Upload the updated `index.html`, `assets/halim-bowl-optimized.glb`, and the entire `draco/` directory together. Draco is served locally and requires no external CDN. The original GLBs remain as backups and are no longer requested by the page.

The hand uses `assets/sugar-hand-woman.webp` (501,634 bytes instead of 1,522,444 bytes). Lossless WebP preserves the 1024×1536 dimensions, all visible RGB pixels, and every alpha value. Deploy this asset together with the updated `sugar-animation.js` and `index.html`.

## Desktop reference layout

The supplied visual reference is preserved at `../qa/desktop-reference.png`. `desktop-reference.css` adapts that composition only above 900 CSS pixels: centered bowl, title at the right, ordering copy at the left, and the existing header and scroll cue. Bowl container dimensions depend on both viewport height and width, while the original model-viewer camera and animations remain in use. The shared scroll script and original mobile styles are unchanged.

The image's proportions are the desktop design target; different viewport aspect ratios require fitting the live rotating bowl while retaining its physical proportions. Screen diagonal alone does not specify a browser viewport. Verification captures cover 1280×720, 1366×768, 1440×900, 1536×864, 1920×1080, 2560×1440, 3840×2160, and the supplied reference's dimensions. `../qa/desktop-responsive.cjs reference` checks horizontal overflow and geometry projection at eight rotation angles in hero/menu/address states. `../qa/check-mobile-restored.cjs` checks six mobile states against the pre-responsive baseline. Browser captures use the system fallback font when Google Fonts is unavailable.

Upload the updated `index.html` with `desktop-reference.css`. The optimized-assets update package also includes the existing optimized bowl, hand, local Draco decoder, and original shared scroll script.
