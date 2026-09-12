---
name: Vitalis Neural Health
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dce6'
  primary: '#e0fdff'
  on-primary: '#00373a'
  primary-container: '#00f2fe'
  on-primary-container: '#006a70'
  inverse-primary: '#00696f'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#e1ffec'
  on-tertiary: '#003824'
  tertiary-container: '#67f4b7'
  on-tertiary-container: '#006e4b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ff6ff'
  primary-fixed-dim: '#00dce6'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f53'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  telemetry-mono:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4rem
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 3rem
---

## Brand & Style

This design system embodies "calm clinical luxury"—a fusion of high-precision diagnostic telemetry, cinematic depth, and the restrained elegance of next-generation consumer technology. Designed for an audience of forward-thinking clinicians, longevity researchers, and proactive patients, the interface replaces archaic medical sterility with profound ambient clarity.

The visual style blends dark glassmorphism with architectural minimalism:
- **Atmosphere:** Deep midnight voids punctuated by luminous optical bleeds, creating an immersive, serene environment suited for critical biometric monitoring without cognitive fatigue.
- **Tone:** Authoritative, predictive, tranquil, and hyper-precise. Interactions feel frictionless and instantaneous, evoking the sensory feedback of high-end computational instruments.
- **Biometric Presence:** Vital metrics do not merely sit on a canvas; they emit faint, intelligent radiance, communicating state, urgency, and neural feedback with surgical grace.

## Colors

The chromatic architecture is rooted in deep spatial voids overlaid with spectral accents of data light:

- **Primary (`#00F2FE` - Intelligent Cyan):** The primary focus driver. Used for active bio-telemetry pathways, real-time AI states, system confirmations, and focal callouts. Often expressed alongside a paired gradient terminator (`#4FACFE`) to replicate soft laser refraction.
- **Secondary (`#8B5CF6` - Neural Violet):** The cognitive layer. Dedicated to predictive analytics, algorithmic confidence scores, genomic data paths, and machine intelligence reasoning states.
- **Tertiary (`#10B981` - Luminous Mint):** The restorative marker. Represents biological equilibrium, optimal biomarker baselines, stabilized vitals, and verified clinical states.
- **Neutral Canvas (`#090D16` & `#0D1527` - Midnight Navy):** Replaces pure black with ultra-dense oceanic navy to preserve depth perception, ambient contrast, and reduce retinal strain during prolonged telemetry analysis.
- **Neutral Surface & Ice Accents (`#F8FAFC` / `#94A3B8`):** High-clarity typography scales down to soft slate-white, ensuring surgical legibility across dark optical planes without blinding glare.

## Typography

Typography functions as visual instrumentation. Headlines set in Plus Jakarta Sans provide sculpted geometry with soft, modern curves that balance technological authority with human approachability. Body and label systems rely on Inter to leverage its microscopic hinting and tabular numeric fidelity for uninterrupted data scanning.

- **Tabular Figures:** All numeric metrics, vitals, timestamps, and confidence percentages must enforce open-type tabular figures (`tnum`) to eliminate spatial shifting during dynamic live streams.
- **Telemetry Micro-Labels:** Small diagnostic badges and track titles leverage uppercase styling with extended letter-spacing (`0.08em`) to yield immediate legibility at compact sizes.

## Layout & Spacing

The layout is built on a 12-column adaptive fluid grid structured around 8px baseline rhythm units. Spatial boundaries are generous, allowing high-density analytical widgets to breathe without visual collisions.

- **Desktop (≥ 1280px):** 12-column dynamic framework with 24px (`space-lg`) gutters and minimum 48px (`space-3xl`) side margins. Critical telemetry dashboards sit within structured 3- or 4-column module clusters.
- **Tablet (768px - 1279px):** 8-column layout with 16px (`space-md`) gutters, converting multi-tier analytics panels into stacked, scrollable biometric decks.
- **Mobile (< 768px):** 4-column layout with 16px gutters and 16px outer padding. Primary vitals prioritize vertical sequence cards with lateral swipe capabilities for secondary telemetry readouts.

## Elevation & Depth

Visual hierarchy is constructed through luminous translucency and directional light dispersion rather than standard drop shadows:

- **Level 0 (Base Bedrock):** Solid `#090D16` deep navy background, occasionally layered with faint radial gradients of cyan/violet at 3–6% opacity to simulate sub-surface ambient luminescence.
- **Level 1 (Card Matrix):** Tinted semi-transparent fill (`rgba(13, 21, 39, 0.65)`) with a 16px to 24px backdrop blur (`backdrop-filter: blur(20px)`). Cards are outlined by an ultrafine boundary: `1px solid rgba(255, 255, 255, 0.08)`.
- **Level 2 (Hover & Active Focal Nodes):** Fill increases to `rgba(20, 30, 55, 0.8)`. The border shifts to an intelligent cyan glow: `1px solid rgba(0, 242, 254, 0.35)`, cast with an ambient bloom of `0 0 24px rgba(0, 242, 254, 0.12)`.
- **Level 3 (Diagnostic Overlays & Modals):** Opaque dark glass (`rgba(13, 21, 39, 0.9)`) backed by a 32px blur and framed with a dual-light border (highlight at top-left edge, deep shadow at bottom-right edge).

## Shapes

The design system maintains a tactile, continuous geometry. Core cards, analytical modules, and floating panels leverage a bespoke corner curvature between 20px and 24px (`rounded-xl` equivalent in this configuration), evoking the refined physical design of high-end modern diagnostics hardware.

- **Cards & Data Modules:** 20px–24px radius, creating soft, protective containers for complex biometric stats.
- **Inputs & Interactive Controls:** 12px–14px radius, offering a subtle ergonomic distinction from the larger containers they populate.
- **Chips, Pills & Status Indicators:** Full organic curvature (9999px pill shapes), ensuring instantaneous visual recognition as interactive micro-elements.

## Components

### Buttons
- **Primary Cyber:** Solid gradient fill from `#00F2FE` to `#4FACFE` with charcoal-black typography (`#090D16`, weight 600). Encased in a subtle, matching outer glow (`0 0 16px rgba(0, 242, 254, 0.35)`). Hover increases glow diffusion to 24px and raises surface luminance.
- **Secondary Glass:** Translucent backdrop (`rgba(255, 255, 255, 0.04)`) with an ultrafine slate border (`rgba(255, 255, 255, 0.12)`) and crisp white text. Active states introduce a gentle neural violet border highlight.
- **Ghost Utility:** Borderless with slate text (`#94A3B8`), transitioning to solid `#F8FAFC` on hover with a micro-glow accent indicator.

### Telemetry Metric Chips
- Pill-shaped (`border-radius: 9999px`) status badges utilizing dark glass backgrounds (`rgba(13, 21, 39, 0.7)`).
- Contains an active 6px radial status indicator light pulsing softly according to live heart-rate or synchronization events.
- Mint (`#10B981`) indicates balanced equilibrium; Cyan (`#00F2FE`) signifies ongoing AI computation; Violet (`#8B5CF6`) denotes genomic/neural synthesis.

### Diagnostic Cards
- Encapsulated with a 20px–24px border radius, featuring an inner perimeter highlight (`box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1)`).
- Section titles are anchored by micro-typography labels (`telemetry-mono`) paired with real-time numeric stream tickers.

### Inputs & Precision Fields
- Dark inset backgrounds (`rgba(9, 13, 22, 0.6)`) framed with a 1px border (`rgba(255, 255, 255, 0.08)`).
- Focus states trigger a seamless shift to intelligent cyan glow (`box-shadow: 0 0 0 1px #00F2FE, 0 0 12px rgba(0, 242, 254, 0.2)`), eliminating traditional browser rings for a calibrated, precision instrument appearance.

### Checkboxes & Segmented Switches
- Segmented switches utilize a continuous glass track with a sliding, illuminated dark-glass pill button that carries an inner top-border rim of light.
- Checkboxes are 18px rounded squares with a glowing mint or cyan fill and crisp white vectorized geometric marks when checked.

### High-Trust Biometric Indicators
- Multi-layered ring graphs and wave-form sparklines featuring high-contrast gradients and ambient drop-shadow reflections.
- Tooltips display floating micro-cards with deep blur backgrounds, delivering instant confidence intervals and AI diagnostic context.