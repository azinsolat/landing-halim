# Halim Saraye Tabriz

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
