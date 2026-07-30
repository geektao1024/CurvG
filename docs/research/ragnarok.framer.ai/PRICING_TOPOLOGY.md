# Ragnarok pricing topology

```text
Pricing section (page background #f3f3f9)
├─ patterned left rail (40px desktop / 20px mobile)
├─ main frame (1360px desktop / viewport-40px mobile)
│  ├─ hero panel
│  │  ├─ eyebrow
│  │  ├─ centered two-line heading
│  │  └─ centered description
│  ├─ plans grid
│  │  ├─ plan column × 3 (stacked on mobile)
│  │  │  ├─ header (40px desktop / 20px mobile padding)
│  │  │  │  ├─ plan title + optional recommended badge
│  │  │  │  ├─ description
│  │  │  │  ├─ price row
│  │  │  │  └─ white action panel
│  │  │  │     ├─ shared billing switch + label + annual saving badge
│  │  │  │     └─ always-visible CTA
│  │  │  └─ feature rows × N
│  └─ comparison section
│     ├─ heading panel
│     └─ comparison matrix
└─ patterned right rail
```

Desktop widths at 1440px: rails 40px each; plan columns about 453.33px; header horizontal padding 40px; action-panel inner CTA widths about 349.33px. Mobile widths at 390px: rails 20px; plan width 350px; plan header padding 20px; action panel/CTA uses the remaining 310px content width.
