# Ragnarok pricing interaction audit

Source: `https://ragnarok.framer.ai/pricing`, measured 2026-07-29 with Chromium at 1440px and 390px.

## Billing switch

- The switch is repeated inside every plan card; there is no detached tab or pill above the cards.
- All repeated switches represent one shared billing state. Activating any switch updates every card.
- Default state is monthly pricing with the switch off. The adjacent label remains `Billed Yearly`, describing the option the switch enables.
- Enabled state uses the annual effective monthly price and reveals a small `2 months free` badge at the right side of the switch row.
- Switch geometry is 55x28px with a 24px square knob, 5px track radius, and roughly 2px inset from the track edge.
- Track transitions from `#e3e3e3` to `#262ef2`; knob travels 27px. The observed color and transform settle in about 250-300ms with eased motion.
- Price text changes in the same interaction without shifting the surrounding card. Respect `prefers-reduced-motion` and update immediately in reduced-motion mode.
- The value animation is a delayed character-resolution effect, not a fade. Measured click-to-final duration is about 490ms: the new value appears first, then unresolved characters briefly become random grey (`#a1a1a1`) glyphs before resolving back to the exact digits. Currency and interval remain stable.

## Subscription CTA

- Every plan CTA is present in the default/rest state. It never depends on hover to become visible.
- CTA is 53px high, 5px radius, with 14px 16px padding. It occupies the full inner width of a white action panel.
- Standard plans use a white CTA with dark text and a subtle grey border/shadow. The recommended plan uses a dark `#201f32` CTA with white text.
- Hover runs a short, non-looping effect: a low-contrast hard-edged pixel sweep, brief text scrambling, and two-arrow track moving one 16px unit from left to right. Total perceived duration is about 600-750ms.
- The control returns to a clean stable button while the pointer remains over it. It must remain legible and clickable during the effect.
- Disabled payment configuration must not visually erase the CTA. Availability errors are surfaced after activation; only an in-flight checkout uses a truly disabled appearance.

## Responsive behavior

- Desktop: three equal columns inside a 1360px frame at a 1440px viewport. Cards share 1px vertical separators and do not float as rounded islands.
- Mobile (390px): 20px patterned rails, a 350px content frame, and one stacked plan column. Each plan retains its own action panel and feature rows.
- Feature items become full-width 1px separated rows. The recommended badge stays aligned with the plan title.
- No large card lift, scale, or shadow is used on hover.
