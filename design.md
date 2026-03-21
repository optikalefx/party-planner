# Design System Document: The Nocturnal Dossier

## 1. Overview & Creative North Star

**Creative North Star: The Nocturnal Dossier**

This design system is built to evoke the tension of a high-stakes investigation and the elegance of a secret society invitation. We are moving away from the "SaaS template" look. Instead, we are leaning into a **High-End Editorial** aesthetic that blends "Noir" mystery with "Modern" sophistication.

The layout should feel like a curated collection of evidence and invitations. We achieve this through:

- **Intentional Asymmetry:** Breaking the grid to allow elements to overlap, mimicking physical documents spread across a detective's desk.
- **Tonal Depth:** Replacing harsh lines with shifts in light and shadow.
- **High-Contrast Typography:** Pitting weathered, traditional serifs against hyper-clean, modern functional type.

---

## 2. Colors & Surface Philosophy

The palette is a chilling transition from the shadows of a crime scene to the stark reality of evidence.

### Color Roles

- **Primary (#98203E / #ffb2bb):** Our "Blood Red." Use this for critical actions and moments of high tension.
- **Secondary (#42B9C8 / #65d6e6):** The "Cyan Flashlight." Use this for interactive highlights and modern UI elements that require clarity.
- **Tertiary (#FFF9E6 / #ccc6b5):** "Aged Parchment." Used for content surfaces to provide a tactile, historical feel.

### The "No-Line" Rule

**Explicit Instruction:** Do not use 1px solid borders to define sections.
Structure must be achieved through **Background Color Shifts**. For example, a main content area using `surface` should be distinguished from a sidebar using `surface_container_low` or `surface_container_high`. If you feel the urge to draw a line, use a spacing gap or a tonal shift instead.

### Surface Hierarchy & Nesting

Treat the UI as a series of physical layers.

- **Base:** `surface_dim` (#190f21).
- **Level 1 (Sections):** `surface_container_low`.
- **Level 2 (Cards/Containers):** `surface_container`.
- **Level 3 (Floating/Interactive):** `surface_container_highest`.

### The Glass & Gradient Rule

To achieve "Soul," use `backdrop-blur` (12px–20px) on floating elements (Modals, Navigation Bars) combined with a semi-transparent `surface_variant`.
**Signature CTA Style:** Apply a subtle linear gradient from `primary` to `primary_container` (Blood Red to Deep Maroon) to give buttons a weighted, velvet-like depth.

---

## 3. Typography: The Narrative Voice

Typography is our primary tool for storytelling. We use a "Double-Agent" approach.

- **Display & Headlines (Newsreader):** The "Narrator." These should be set with generous tracking and high scale. Use `display-lg` (3.5rem) for hero moments to create an authoritative, literary feel.
- **Body & UI (Inter):** The "Evidence." Clean, legible, and objective. Use `body-md` (0.875rem) for general descriptions.
- **Label & Utility (Inter):** All-caps with increased letter-spacing (0.05rem) for metadata (e.g., "VICTIM PROFILE," "TIME REMAINING") to evoke a sense of a formal dossier.

---

## 4. Elevation & Depth: Tonal Layering

We do not use structural lines. We use physics.

- **Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` section. The subtle contrast creates a "natural lift" that feels premium and integrated.
- **Ambient Shadows:** For elements that truly "float" (like a dossier being pulled from a stack), use `on_surface` color for the shadow at 4%–8% opacity. Use a massive blur (40px–60px) and a Y-offset of 20px. It should look like a soft glow of darkness, not a drop shadow.
- **The "Ghost Border" Fallback:** If accessibility requires a container boundary, use `outline_variant` at **15% opacity**. This creates a "whisper" of a line that disappears into the atmosphere.

---

## 5. Components

### Buttons: The Formal Invitation

- **Primary:** Gradient of `primary` to `primary_container`. Border-radius: `sm` (0.125rem) for a sharp, dangerous edge. No shadows, just depth through color.
- **Secondary:** `surface_container_highest` background with a `secondary` (Cyan) label.
- **Tertiary:** Ghost style. No background, `on_surface` text, underline only on hover.

### Cards: The Evidence Folders

- **Style:** No borders. Background: `surface_container`.
- **Spacing:** Use `spacing-6` (1.5rem) for internal padding to give the content room to "breathe" within the suspense.
- **Interaction:** On hover, shift the background to `surface_container_high`. Do not use a shadow.

### Inputs: The Statement Form

- **Text Fields:** Use a "Bottom-Line Only" approach or a very subtle `surface_container_lowest` fill.
- **Focus State:** The bottom line transitions to `secondary` (Cyan) with a soft glow effect.

### Lists: The Suspect Log

- **Constraint:** Forbid divider lines.
- **Solution:** Use `spacing-4` gaps between list items. Use a `surface_container_low` background on every other item (zebra striping) at very low contrast (2% difference) to maintain order without visual clutter.

### Custom Component: "The Red Thread"

- Use a `primary` (Blood Red) 2px vertical accent line to the left of specific "Clue" or "Host" blocks to draw the eye to critical information.

---

## 6. Do's and Don'ts

### Do

- **Do** use asymmetrical margins. If a header is center-aligned, try left-aligning the body text below it with a massive `spacing-24` left margin.
- **Do** use `Newsreader` for any text that feels like "Lore" or "Story."
- **Do** use `inter` for anything that feels like "System Interface" or "Settings."
- **Do** lean into the "Aged Parchment" (`tertiary`) for tooltips to make them feel like handwritten notes.

### Don't

- **Don't** use `DEFAULT` or `xl` roundedness. This app should feel sharp and serious. Stick to `none`, `sm`, or `md`.
- **Don't** use pure white (#FFFFFF). Use `on_surface` (#edddf7) for a softer, more atmospheric glow.
- **Don't** use standard "Success Green." If a task is complete, use the `secondary` Cyan or a muted version of `tertiary`.
- **Don't** ever use a 100% opaque, high-contrast border. If it looks like a box, you've failed the noir aesthetic.
