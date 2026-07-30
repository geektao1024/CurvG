# Component spec: CurvG pricing in Ragnarok visual language

## Scope

Rebuild `src/components/pricing-table.tsx` while preserving its public checkout behavior and all CurvG plan data. Use the reference's structural language, not its copy or prices.

## Exact visual contract

- Root background: existing CurvG background token, with a centered frame capped at 1360px and 1px `border-border` divisions.
- Plan grid: `md:grid-cols-3`, zero gap, 1px separators. Outer radius is 0; do not render individual floating rounded cards.
- Plan header: 40px desktop and 20px mobile padding; content gap 24px.
- Title: sans, 24px desktop / 20px mobile, normal-to-medium weight. Description: 16px, 1.4 line height, muted text, max width around 300px.
- Price: sans, 42px desktop / 40px mobile, tight tracking. Currency symbol 16px; interval 16px muted.
- Action panel: white/light card token, 12px padding, 16px vertical gap, 6px radius. In dark mode use the existing card token rather than hardcoded white.
- Billing row: minimum 28px. Toggle 55x28px; 5px radius; 24px knob; off `#e3e3e3`; on CurvG primary; 250-300ms ease. Label 16px. Saving badge 12px, primary at 10% opacity, 4px radius.
- CTA: always rendered, width 100%, height 53px, radius 5px, 16-18px type. Featured plan uses foreground fill/background text; other plans use card fill/foreground text and a 1px border.
- Feature rows: 1px top border, 64px desktop target height, 20px 40px padding desktop and 16px 20px mobile. Use a 16px circular check icon. Featured plan checks use primary.
- Featured badge: small rectangular primary/10 badge with 4px radius; align on the same row as the title.
- Comparison section follows the same border-grid language: no large rounded container, category rows use muted fill, plan CTA is visible in the header on desktop, and horizontal overflow remains available on narrow screens.

## Interaction contract

- Replace the top monthly/yearly pill control with a billing switch inside every plan action panel.
- All per-card switches set one shared `activeGroup`. Off maps to the first/monthly group and on maps to the second/yearly group.
- Switching price must not cause card reflow. Do not use an opacity/translate-only transition.
- **Measured price-value loading sequence:** the target value is mounted about 40-50ms after the switch click and remains readable first. Roughly 260-330ms after the click, characters enter a short text-scramble/pixel-loading phase. Resolved characters keep `#201f32`; unresolved characters are replaced by random ASCII glyphs in `#a1a1a1`. Characters progressively resolve from the edges/punctuation toward the remaining digits and settle to the exact target at about 480-500ms after the click.
- Preserve the numeric value's line box (40px reference type, 44px line-height) and do not animate the currency or billing interval. Small glyph-width jitter during scrambling is allowed and matches the reference.
- Run this sequence only when billing is actively switched, not on the initial page render. Plans whose price is unchanged between groups (CurvG Free) must not scramble.
- Under `prefers-reduced-motion`, update the value directly with no scramble.
- Annual state shows the group's saving note in every action row. Monthly state reserves enough row structure to avoid vertical card shift.
- CTA hover starts a one-shot ~650ms pixel/text/arrow sequence. Implement locally with CSS/React; no dependency is required. Arrow track travels 16px. Do not lift the plan card.
- Only active checkout mutation disables CTAs. Provider loading/unavailability may change the click result/copy but must not hide or grey every paid CTA at initial render.
- Maintain keyboard focus visibility and `role=switch`, `aria-checked`, and a usable 44px+ hit target.

## Data/checkout constraints

- Keep groups/plans, `onCheckout`, loading state, comparison data, and free-plan routing intact.
- For annual products, visual price may be expressed as the effective monthly amount while checkout continues to use the annual product id and annual charge.
- Preserve current-plan/manage-plan behaviors and the payment provider modal.
