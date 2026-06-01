# Init Window Design Tokens

This document defines the visual language for Init Window's renderer UI (`src/renderer/`). The current init-window theme uses deep teal framing, bright green primary actions, stark white cards, mint success/featured states, pill buttons, and 12px rounded cards.

Use this file as the source of truth when editing UI. The implemented Tailwind v4 tokens live in `src/renderer/index.css` under `@theme`.

## Design Principles

- Use **deep teal** for primary app framing, hero/header bands, and active navigation.
- Use **init-window green** only for primary CTAs, focus/selection states, success states, and key badges.
- Use **white cards** on a soft off-white app canvas.
- Prefer flat surfaces with 1px borders; use shadows sparingly.
- Buttons and status badges are always **pill-shaped**.
- Cards and list rows use **12px rounded corners**.
- Avoid generic Tailwind blue for UI states; use green/teal tokens instead.
- Avoid large saturated red/yellow surfaces; destructive/warning states should be soft and contained.

## Tailwind Token Mapping

Tokens are available as Tailwind utilities because they are declared in `src/renderer/index.css`.

### Brand

| Token | Hex / Value | Tailwind utility | Use |
|---|---:|---|---|
| `brand-green` | `#00ED64` | `bg-brand-green`, `text-brand-green`, `ring-brand-green` | Primary CTA, selected/focus state |
| `brand-green-dark` | `#00684A` | `text-brand-green-dark`, `border-brand-green-dark` | Links, active text, pressed green state |
| `brand-green-soft` | `#E3FCF7` | `bg-brand-green-soft` | Success badges, empty-state icons |
| `brand-teal-deep` | `#001E2B` | `bg-brand-teal-deep`, `text-brand-teal-deep` | Hero/header bands, active segmented nav |
| `brand-teal` | `#006C67` | `bg-brand-teal` | Secondary teal accents |
| `brand-teal-mid` | `#0C4F5C` | `bg-brand-teal-mid` | Dark-surface panels |

### Surfaces and Borders

| Token | Hex / Value | Tailwind utility | Use |
|---|---:|---|---|
| `canvas` | `#FFFFFF` | `bg-canvas` | Cards, bottom bars, inputs |
| `canvas-dark` | `#00141C` | `bg-canvas-dark` | Code/mockup dark panels if added |
| `surface` | `#F5F7F6` | `bg-surface` | Segmented controls, subdued panels |
| `surface-soft` | `#F9FBFA` | `bg-surface-soft` | App background |
| `surface-feature` | `#EEFBF3` | `bg-surface-feature` | Featured/selected card background |
| `hairline` | `#E3E8E6` | `border-hairline` | Default borders/dividers |
| `hairline-soft` | `#EDF1EF` | `border-hairline-soft` | Subtle dividers |
| `hairline-strong` | `#889397` | `border-hairline-strong` | Inputs and outlined controls |
| `hairline-dark` | `rgba(255,255,255,0.22)` | `border-hairline-dark` | Borders on dark teal surfaces |

### Text

| Token | Hex / Value | Tailwind utility | Use |
|---|---:|---|---|
| `ink` | `#001E2B` | `text-ink` | Primary text/headings |
| `charcoal` | `#1F2933` | `text-charcoal` | Body emphasis |
| `slate` | `#5C6C75` | `text-slate` | Secondary body text |
| `steel` | `#889397` | `text-steel` | Captions, placeholder-like text |
| `stone` | `#9AA5A9` | `text-stone` | Muted labels |
| `muted` | `#C1C7C6` | `text-muted` | Disabled/placeholder text |
| `on-dark` | `#FFFFFF` | `text-on-dark` | Text on dark teal |
| `on-dark-muted` | `rgba(255,255,255,0.72)` | `text-on-dark-muted` | Secondary text on dark teal |

## Typography

Primary font stack:

```css
'Euclid Circular A', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
```

`Euclid Circular A` is not bundled with the app. The fallback stack is acceptable unless font files are added later.

Recommended hierarchy for this compact desktop app:

| Role | Tailwind example | Use |
|---|---|---|
| Screen title | `text-3xl font-medium leading-tight tracking-[-0.5px]` | Main screen headers |
| Modal/subscreen title | `text-2xl font-medium tracking-[-0.5px]` | Add/edit flows |
| Card title | `text-lg font-semibold` or `text-base font-semibold` | Card/list headings |
| Body | `text-sm leading-6 text-slate` | Descriptions and helper text |
| Badge/Button | `text-xs/text-sm font-semibold` | Pills, CTAs, labels |

## Shape and Spacing

| Token | Value | Tailwind example | Use |
|---|---:|---|---|
| Small radius | `6px` | `rounded-md` | Icons, kbd chips |
| Medium radius | `8px` | `rounded-lg` | Inputs, app list rows |
| Card radius | `12px` | `rounded-xl` | Cards, empty states, collection cards |
| Pill radius | `9999px` | `rounded-full` | Buttons, badges, tabs |

Spacing should follow Tailwind's 4px scale. Common patterns:

- Screen padding: `p-4` / `px-5 py-5`
- Card padding: `p-4` to `p-6`
- Compact list gaps: `space-y-2`
- Collection card gaps: `space-y-3`

## Components

### Button

Implemented in `src/renderer/components/shared/Button.tsx`.

- Base: `inline-flex`, `rounded-full`, `font-semibold`, focus ring in `brand-green/35`.
- `primary`: `bg-brand-green text-ink`; pressed uses `brand-green-dark` with `text-on-dark`.
- `secondary`: white background, `border-hairline-strong`, `text-ink`.
- `danger`: soft red background and border. Keep destructive actions visually contained.
- `ghost`: transparent with active `surface` background.

### Segmented Navigation

Implemented in `src/renderer/App.tsx`.

- Container: `bg-canvas` with `border-t border-hairline`.
- Track: `rounded-full bg-surface p-1`.
- Active tab: `bg-brand-teal-deep text-on-dark`.
- Inactive tab: `text-slate`.

### App List Item

Implemented in `src/renderer/components/shared/AppListItem.tsx`.

- Default: `rounded-lg border border-hairline bg-canvas px-3 py-2`.
- Selected: `border-brand-green bg-surface-feature ring-2 ring-brand-green/30`.
- Checkbox accent: `accent-brand-green`.
- Icon fallback: `bg-brand-green-soft text-brand-green-dark`.

### Collection Card

Implemented in `src/renderer/components/shared/CollectionCard.tsx`.

- Surface: `rounded-xl border border-hairline bg-canvas p-4`.
- Subtle shadow: `rgba(0,30,43,0.04) 0px 1px 2px 0px`.
- Run action: green primary pill.
- Edit action: outlined pill.
- Delete action: soft red pill.
- Auto-start: mint pill when enabled; outlined subdued pill when disabled.

### Screen Headers

Use either:

- Dark hero/header: `bg-brand-teal-deep text-on-dark`, with secondary text `text-on-dark-muted` and mint badge.
- Light header: `bg-canvas border-b border-hairline`, with `text-ink`, `text-slate`, and optional mint badge.

Current usage:

- `CaptureAndBuildScreen`: dark teal hero band.
- `CollectionsListScreen`: light product header.
- `EditCollectionScreen`: light editor header; dark teal add-apps header.

### Empty States

Use a centered card:

```tsx
<div className="mx-auto mt-8 max-w-md rounded-xl border border-hairline bg-canvas p-6 text-center">
  ...
</div>
```

Add a small mint icon circle when helpful:

```tsx
<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-green-soft">
```

### Inputs

Use this input style for text fields:

```tsx
className="h-11 w-full rounded-lg border border-hairline-strong bg-canvas px-3 text-ink placeholder:text-steel focus:border-brand-green-dark focus:outline-hidden focus:ring-2 focus:ring-brand-green/30"
```

## Do / Don't

### Do

- Use `bg-brand-green` for the primary action on a screen.
- Use `bg-brand-teal-deep` for major dark headers and active filled tabs.
- Use `rounded-full` for all buttons and badges.
- Use `rounded-xl border border-hairline bg-canvas` for cards.
- Use `ring-brand-green` for selected/focused app UI.
- Keep layout compact enough for an Electron desktop window.

### Don't

- Don't introduce blue active/focus/CTA states.
- Don't use bright green for body text or large backgrounds.
- Don't make destructive buttons solid red unless absolutely necessary.
- Don't use heavy shadows on normal cards.
- Don't revert to `rounded-sm` for primary controls.
- Don't add new saturated accent colors without updating this document and `index.css`.

## Validation

After UI changes, run:

```bash
npx tsc --noEmit
npm run build:renderer
```

If tokens are changed in this document, update `src/renderer/index.css` in the same change.
