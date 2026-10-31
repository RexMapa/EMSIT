# EMSIT brand implementation

Source: EMSIT Brand Guidelines, Navy Identity v1.4 (22 October 2026), and EMSIT One Page Brand Guide.

## Applied system

- Pearl `#F8FAFC`: primary page background.
- Navy `#183153`: wordmark, headings, primary actions; white reverse text on the ownership section.
- Mist `#E8EEF5`: secondary surfaces and highlighted panels.
- Slate `#334155`: body text and input boundaries.
- Sky `#A8C7E8`: decorative separators; not body text on light surfaces.
- Coral `#F28772`: small decorative rules and splash progress line.
- Coral Deep `#A55C4E`: meaningful borders, focus outlines and occasional accent text.
- Coral Mist `#F7E5E3`: retained as a token, not used for highlight panels, following the one-page guide's clarification.
- White `#FFFFFF`: cards, inputs and reverse lettering.

Colors and typography live in `public/brand.css`. Light surfaces, generous margins, quiet rectangular shapes and clear Navy primary actions are used throughout the homepage, contact tabs and admin inbox.

## Wordmark provenance

The separate Business Mark Reusable Pack was not attached. The exact outlined vector path was extracted from page 3 of the supplied Brand Guidelines PDF rather than recreated using a font. PDF drawing commands were translated to equivalent SVG commands without changing control points. The SVG flips the PDF coordinate axis to preserve the original appearance and includes generous clear space.

`public/assets/emsit-navy.svg` uses Navy. `emsit-white.svg` uses the approved white reverse color. Visible lettering spans 1805 units inside a 2125-unit canvas; the minimum 190px display width gives approximately 161px of visible lettering. Clear space is at least half the visible mark height. The old lowercase typed logo, registration symbol, e-monogram, gradient lettering, orbital badges and individual-letter animation are removed.

The splash reveals the complete undistorted wordmark on Pearl, with Navy panels opening away from it. The artwork is not stretched, outlined, rotated, blurred or given a glow. Reduced-motion preference bypasses the splash.

## Typography

Headings use Segoe UI Semilight / Segoe UI Variable Display / Segoe UI / Arial / sans-serif, light weight. Body uses Segoe UI Variable Text / Segoe UI / Arial / sans-serif. Labels use Segoe UI Semibold where installed.

No Microsoft font binaries are redistributed. Devices without Segoe use Arial or the system sans-serif fallback as the guide permits. Google font imports are removed.

## Imagery

`workplace-conversation.webp` is the photograph embedded on pages 14 and 16 of the supplied guidelines, converted to WebP. The visible caption identifies it as illustrative and not verified EMSIT employees. Replace it with approved staff photography when available.

## Requested premium treatment

The user's subsequent neumorphism request adds softly raised and recessed surfaces, rounder corners, a floating photo panel, staggered entrances, bounded pointer tilt, gentle photo parallax, scroll progress, and animated role-panel transitions. These changes intentionally expand the guide's quiet rectangular layout treatment, while retaining the exact Navy/Pearl palette, Segoe typography, readable field boundaries and undistorted fixed logo. No shadows, gradients or effects are applied to the logo artwork itself. Motion effects respect reduced-motion preferences and pointer tilt is disabled on touch layouts.

## Verification limits for the branded application

The guides were rendered and inspected. Source checks verify logo usage, palette values, font stacks, page asset references and removal of prior styling. Application integration tests verify persistence and authentication independently of styling. Fresh browser visual review of this branded application could not be completed because automatic browser approval review was unavailable after a usage limit. Review desktop/mobile layout after deploying to Vercel. Real Neon persistence and Vercel deployment require your account configuration.
