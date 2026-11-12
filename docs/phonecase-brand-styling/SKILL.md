---
name: phonecase-brand-styling
description: Brand styling rules (colors, gradients, typography, components, effects, layout) for the D2C phone case ecommerce website built with Angular, Tailwind and SCSS. Use this skill whenever creating or editing ANY UI for this project, including landing page sections, buttons, cards, forms, headers, footers, product pages, the design studio, cart or checkout screens, and whenever the user mentions styling, theme, colors, gradients, design tokens, brand, look and feel, or visual effects, even if they do not say "brand". Apply it before writing any HTML template, Tailwind classes, or SCSS.
---

# Phone Case Store: Brand Styling

This skill tells you how the site should look and feel, so that every component you write is visually consistent without the team re-explaining the brand each time.

## 1. Brand personality

**Clean first, Gen-Z second.**

- "Clean" means generous whitespace, a calm layout, strong hierarchy and one focal point per section.
- "Gen-Z" means the energy comes from vibrant gradients, glow, tilted product imagery and smooth motion.
- The balance is **80% calm, 20% vibrant**. The vibrant parts are concentrated in a few hero moments instead of being spread everywhere. If everything is loud, nothing stands out, and the site stops feeling clean.

When unsure whether to add an effect, leave it out. Restraint is what makes the few effects we do use feel premium.

## 2. Palette

The palette is strictly: deep purple, light purple, off-white and jet black. Do not introduce other colors without explicit approval from the team (tints and shades of the purples listed below are fine).

| Role | Value | Notes |
|---|---|---|
| Primary | `#433075` | Buttons, links, key UI, text on light backgrounds |
| Accent | `#A58CF4` | Decoration, highlights, glows, large display text |
| Page background | `#FAFAFA` | White cards sit on top of it |
| Text | `#0A0A0A` (Jet black) | Body and headings. Never pure `#000` |

### Design tokens

These tokens live in `src/styles/tokens.css` (plain CSS, not SCSS). Always reference tokens (for example `bg-brand-800`, `text-ink`, `var(--grad-primary)`) instead of raw hex values, so the brand can be adjusted in one place.

```css
@theme {
  /* Brand core */
  --color-brand-900: #2a1d4d;   /* deepest, dark sections */
  --color-brand-800: #433075;   /* PRIMARY */
  --color-brand-600: #6a53b0;
  --color-brand-400: #A58CF4;   /* ACCENT */
  --color-brand-200: #d4c8fa;
  --color-brand-100: #ece6fd;
  --color-brand-50:  #f6f3fe;

  /* Neutrals */
  --color-surface:     #FAFAFA; /* page background */
  --color-surface-alt: #FFFFFF; /* cards */
  --color-ink:         #0A0A0A; /* main text */
  --color-ink-soft:    #52525b; /* secondary text */
  --color-line:        #e8e6ef; /* borders, dividers */

  /* Typography */
  --font-display: "Plus Jakarta Sans", "Sora", system-ui, sans-serif;
  --font-body:    "Inter", system-ui, sans-serif;

  /* Shape */
  --radius-card: 1.25rem;
  --radius-pill: 999px;

  /* Purple-tinted shadows (never grey or black) */
  --shadow-soft: 0 8px 30px rgb(67 48 117 / 0.08);
  --shadow-lift: 0 16px 48px rgb(67 48 117 / 0.16);
  --shadow-glow: 0 0 40px rgb(165 140 244 / 0.45);
}

:root {
  /* Signature gradients */
  --grad-primary: linear-gradient(135deg, #433075 0%, #A58CF4 100%);
  --grad-soft:    linear-gradient(180deg, #FAFAFA 0%, #ece6fd 100%);
  --grad-glow:    radial-gradient(60% 60% at 50% 40%, rgb(165 140 244 / 0.35), transparent 70%);
  --grad-dark:    linear-gradient(160deg, #0A0A0A 0%, #2a1d4d 100%);
}
```

Tailwind v4 changed its configuration syntax (`@theme` in CSS rather than `tailwind.config.js`). Check the installed Tailwind version in `package.json` first. If it is v3, translate these tokens into `theme.extend` in the Tailwind config and keep the same names and values.

### Tailwind and SCSS setup

Tailwind v4 is designed for plain CSS, and Sass can interfere with `@import "tailwindcss"` and `@theme`. Keep the Tailwind entry and `@theme` tokens in `.css` files, and use `.scss` only for custom effects, mixins and component-level animation. List both in the `styles` array in `angular.json`.

## 3. Color usage and accessibility

Contrast matters because the site is used on phones outdoors and by people with varied vision, and failing contrast also looks less clean.

- **`#A58CF4` on white or `#FAFAFA` has only about 2.7:1 contrast.** Never use it for body text or small text on light backgrounds. Use it for decoration, large display text, borders, glows and shapes, or put Jet black text on top of it (about 7:1).
- `#433075` on `#FAFAFA` is high contrast, so it is safe for text, links and buttons.
- White text is fine on `#433075`, on `brand-900`, and on the darker half of `--grad-primary`. Never place white text on the light end of the gradient. Position text over the dark side, or use a solid dark background behind it.
- Shadows are always purple-tinted (the shadow tokens above), never grey or black.
- Never rely on color alone to convey state (errors, success, selected). Pair it with an icon or text.

Where gradients and vibrant color are allowed:

- Hero sections and CTA banners (`--grad-primary` or `--grad-dark`)
- Small accents: one per section (a badge, an underline, a decorative blob)
- Backgrounds of promotional panels

Everywhere else (product grids, forms, cart, checkout, account pages, support) stays calm: `#FAFAFA` background, white cards, Jet black text and `brand-800` for actions.

## 4. Typography

- **Display (headings):** Plus Jakarta Sans, weight 700 to 800, letter-spacing `-0.02em`, tight line-height (1.1 to 1.2).
- **Hero headline:** large and confident, `font-size: clamp(2.5rem, 6vw, 5rem)`.
- **Body:** Inter, weight 400 or 500, minimum 16px, line-height 1.6.
- **Secondary text:** `ink-soft`, still at least 14px.
- **Gradient text:** at most one key word per heading, using `--grad-primary` with `background-clip: text`. Only on large sizes, so contrast stays readable.
- Load fonts with `font-display: swap`, and self-host them under `public/fonts/` where possible for performance.

## 5. Components

Build these as reusable standalone components under `src/app/shared/ui/`, then reuse them instead of re-styling the same element in every feature.

**Primary button**
Pill shape (`--radius-pill`), `brand-800` background, white text, generous horizontal padding (at least 24px). On hover: lift 2px and add `--shadow-glow`. The hero CTA may use `--grad-primary` instead of the solid fill.

**Secondary button**
Pill shape, 1.5px `brand-800` border, transparent background, `brand-800` text. On hover: `brand-50` fill.

**Card**
White (`surface-alt`), `--radius-card`, `--shadow-soft`, 1px `--color-line` border. On hover (only if the card is interactive): `translateY(-4px)` and `--shadow-lift`.

**Input**
1px `--color-line` border, generous padding (12px to 16px), rounded. Focus: 2px `brand-400` ring. Error: show an icon and message, not just a red border.

**Badge** ("New", "Bestseller", "Limited")
`brand-100` background with `brand-800` text, pill shape. A gradient fill is allowed for a hero item only.

**Header**
Sticky, glass effect (see below), logo left, navigation centered or right, cart and account icons on the right. Keep it light so it does not compete with the hero.

**Product imagery**
Phone case mockups on a clean or softly tinted background, with a slight tilt (3 to 8 degrees) and a soft purple shadow for hero and showcase moments. Plain product grids use straight, untilted, consistently sized images.

## 6. Vibrant effects (use sparingly)

Put reusable effect styles in `src/styles/_effects.scss`.

1. **Gradient mesh and blobs.** Blurred `brand-400` shapes behind the hero at low opacity (0.2 to 0.4), drifting slowly. Always behind content, never over text, and `pointer-events: none`.
2. **Glassmorphism.** `background: rgb(255 255 255 / 0.6); backdrop-filter: blur(16px);` with a subtle `--color-line` border. Only for the sticky header and floating panels such as the design studio toolbar.
3. **Glow.** `--shadow-glow` on the single most important element in a section.
4. **Motion.** 200 to 300ms `ease-out` for micro-interactions. Scroll-reveal is a fade-up (translateY 16 to 24px) with a small stagger (60 to 100ms) between siblings. Animate only `transform` and `opacity` for smooth performance.
5. **Reduced motion.** Always wrap non-essential animation in `@media (prefers-reduced-motion: no-preference)`, or disable it under `prefers-reduced-motion: reduce`. This is required, not optional.

**Budget rule:** never stack more than one gradient or glow effect in the same viewport area. If a section already has a gradient background, skip the glow on its button.

## 7. Layout and spacing

- Mobile-first. Design the phone layout first, since most of the audience browses on phones, then enhance for tablet and desktop.
- Max content width of 1280px, centered, with 16px side padding on mobile and 24px or more on desktop.
- Spacing on an 8px grid (Tailwind's default scale works).
- Section vertical padding: at least 96px on desktop and 64px on mobile.
- One focal point per section: one headline, one primary action, one hero visual.
- Touch targets at least 44 by 44px.

## 8. Implementation rules (Angular and Tailwind)

- Use Tailwind utilities for layout, spacing, typography and color. Write SCSS only for effects that utilities cannot express cleanly (gradients, glass, blobs, keyframe animations).
- Use tokens, not raw hex values. If a needed color is missing from the tokens, ask instead of inventing one.
- Put static images, icons, fonts and mockups in `public/` (served as-is, for example `public/images/logo.svg` is served at `/images/logo.svg`). Do not use the old `src/assets/` folder.
- Global styles live in `src/styles/` (`tokens.css`, `_mixins.scss`, `_effects.scss`), and each component's own `.scss` only styles that component.
- Components are standalone with `ChangeDetectionStrategy.OnPush`. Use a separate `.html` template by default, and inline templates only for tiny components (under about 15 lines of markup).
- Use semantic HTML (`header`, `nav`, `main`, `section`, `button`, `a`), meaningful `alt` text on images, and visible keyboard focus styles. Never remove the focus ring without replacing it.
- Use `NgOptimizedImage` for images, with explicit width and height to avoid layout shift. The landing page needs to load fast.

## 9. Do and don't

**Do**
- Reference tokens instead of raw hex values.
- Keep gradients to hero sections, CTA banners and one accent per section.
- Leave generous whitespace, and let the product imagery breathe.
- Reuse the shared UI components.
- Respect `prefers-reduced-motion`.

**Don't**
- Don't use pure `#000` or grey or black shadows.
- Don't use `#A58CF4` for small text or body text on light backgrounds.
- Don't stack multiple gradients or glows in the same viewport area.
- Don't put gradients or heavy effects on forms, cart, checkout or account screens.
- Don't add new colors, including "sale" red or pop colors, without approval.
- Don't animate layout properties (width, height, top, left).

## 10. Quick self-check before finishing a component

1. Is the page still mostly calm, with at most one vibrant moment in view?
2. Are all colors from tokens, and is every text color readable on its background?
3. Does the mobile layout work first, with 44px touch targets?
4. Do animations respect reduced motion?
5. Did I reuse a shared component instead of re-styling a button, card or input?
