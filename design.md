# Design System — Booking Admin / Backoffice

> This document was produced by studying popular admin dashboard templates (including
> TailAdmin) to extract the "patterns everyone uses" as a foundation, then defining a
> completely new identity — colors, typography, layout, and component details — of our own.
>
> **Key principle:** We are not copying any code or assets from TailAdmin. We only follow
> the universal conventions of admin dashboards (left sidebar, top header, stat cards,
> tables, charts) — functional patterns that no one owns — and apply our own original
> design on top.

---

## 1. Legal Notes (read first)

TailAdmin is an open-source project under the **MIT license**.
- You *may* use their code **if** you include their copyright notice and license text
  in your project.
- But if you want to stay clearly **at arm's length** (as requested), follow these rules:
  - **Never** drop their component files in and just recolor them (even if the license
    allows it, it will still look like theirs).
  - **Never** use the Outfit font (their signature typeface) — switch fonts immediately
    if anything looks similar.
  - **Never** use their brand color #465FFF or their indigo palette.
  - **Never** copy their images, icons, sample assets, or menu copy.
  - **Never** replicate a screen 1:1 (same number of cards, same chart positions, same
    wording).
- Copyright law basics: copyright protects "specific expression" (code, artwork, text),
  but **does not** protect ideas, generic layouts, or standard functional arrangements.
  → We write all code from scratch + change colors/fonts/proportions = safe distance.

---

## 2. What We Borrow (universal patterns, safe for any project)

What TailAdmin (and every other template) does the same way — industry standard:

| Pattern | Why we keep it |
|---|---|
| Left sidebar + top header | Admin users already know it; zero learning curve |
| Row of 4 stat cards at the top | See key KPIs before scrolling |
| Bar/line chart + recent-items table | Overview + detail on one page |
| Dark/light mode | Less eye strain when working at night |
| Search bar in the header | Find things fast |
| Softly rounded cards with subtle shadow | Modern, lightweight feel |
| Responsive (sidebar collapses to icons) | Usable on tablets |

> This is the "skeleton" every template shares — like every car having a steering wheel
> and four wheels. Safe to use. But every detail below is **ours, redesigned**.

---

## 3. New Design Direction (how we differ from TailAdmin)

**Our brief:** a booking/reservation management system → it should feel
"relaxed, trustworthy, clean" — not "screaming startup tech".

| Topic | TailAdmin | We do |
|---|---|---|
| Font | Outfit (rounded Latin) | **Sarabun / IBM Plex Sans Thai** (crisp Thai + Latin) + tabular numerals |
| Brand color | indigo #465FFF | **teal #0F766E** + amber accent #F59E0B |
| Background | cold white/gray (gray-50) | **warm cream #FAF9F6** (light) / deep navy #0B1220 (dark) |
| Sidebar | white, 290px, "Upgrade to Pro" card | **always-dark surface**, 240px, no ads |
| Header | clear bottom border + 430px search | **floating glassmorphism header**, no border |
| Cards | thin border + faint shadow | **no border, pronounced floating shadow**, 16px radius |
| Buttons | rounded-lg (8px) | **fully rounded (pill)** |
| Badges | uppercase micro-text | **sentence case + colored status dot** |
| Charts | ApexCharts, flat style | **Recharts**, soft gradients, curved lines, card-style tooltip |
| Icons | their thin-stroke set | **Lucide / Phosphor**, 2px stroke |
| Dashboard | KPI x4 + chart + table | KPI x4 + chart + table + mini calendar |

**Overall feel:** "5-star resort" = generous whitespace, rounded shapes, friendly
legible type, sea-teal + sand tones, no clutter, no in-UI ads.

---

## 4. Design Tokens

### 4.1 Color

```css
/* ===== Light ===== */
--bg-base:        #FAF9F6;   /* warm cream (replaces cold gray) */
--bg-surface:     #FFFFFF;   /* card surface */
--bg-subtle:      #F1EFE9;   /* pressable zones / hover */

/* ===== Dark ===== */
--bg-base:        #0B1220;   /* deep navy — not their gray #1D2939 */
--bg-surface:     #111A2C;   /* dark-mode cards */
--bg-subtle:      #1A2538;   /* dark-mode hover */

/* ===== Brand ===== */
--brand-50:   #E6F7F5;
--brand-100:  #C9EFEB;
--brand-200:  #96DFD8;
--brand-300:  #5ECAC1;
--brand-400:  #2FAFA6;
--brand-500:  #0F766E;   /* primary (teal) — not TailAdmin's indigo */
--brand-600:  #0B5F59;
--brand-700:  #094C47;
--brand-800:  #073A36;
--brand-900:  #052A28;

/* ===== Accent ===== */
--accent-amber:  #F59E0B;  /* "pending" status, highlights */
--accent-coral:  #F87171;  /* error / cancelled */
--accent-mint:   #34D399;  /* success */

/* ===== Text ===== */
--text-strong:  #1C2B33;   /* primary text (light) */
--text-body:    #52616B;   /* secondary text */
--text-muted:   #8A98A3;   /* faint text */
--text-invert:  #E8EEF2;   /* text on dark surfaces */
```

**Color rules:** brand color only for (1) primary buttons, (2) active menu state,
(3) links. Never paint large backgrounds with it — that's what makes templates
look generic.

### 4.2 Typography

```css
--font-sans: "IBM Plex Sans Thai", "Sarabun", "Noto Sans Thai", sans-serif;
--font-num:  "IBM Plex Sans Thai", ui-monospace, monospace; /* numbers in tables/stats */
```

| Level | Size / Line-height | Weight | Used for |
|---|---|---|---|
| Display | 30px / 38px | 700 | Big KPI numbers |
| Title | 20px / 28px | 600 | Card headings |
| Body | 14px / 22px | 400 | General content |
| Caption | 12px / 18px | 400 | Labels, footnotes |
| Label | 13px / 18px | 500 | Form labels, menu items |

All numeric stats use `font-variant-numeric: tabular-nums` so digits align
instead of jumping.

### 4.3 Radius, Shadow, Spacing

```css
--radius-sm:   8px;    /* inputs, badges */
--radius-md:   12px;   /* buttons, dropdown items */
--radius-lg:   16px;   /* all cards */
--radius-xl:   24px;   /* modals, sidebar right edge */

/* Shadows: "float" instead of "border" */
--shadow-card:   0 1px 2px rgba(16, 34, 44, .04), 0 8px 24px rgba(16, 34, 44, .06);
--shadow-pop:    0 4px 12px rgba(16, 34, 44, .10), 0 16px 40px rgba(16, 34, 44, .12);
--shadow-float:  0 12px 32px rgba(16, 34, 44, .14);  /* floating header, dropdowns */

/* Spacing */
--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
--space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px;
```

---

## 5. Layout System

```
┌─────────────┬──────────────────────────────────────────┐
│             │  Header (floating, 64px, translucent)     │
│  Sidebar    ├──────────────────────────────────────────┤
│  240px      │                                          │
│  (dark bg)  │  Content: max-width 1280px, padding 24px │
│  collapses  │  - KPI row: 4 cards                      │
│  to 72px    │  - Main chart (2/3) + donut gauge (1/3)  │
│  (drawer on │  - Recent-bookings table (full width)    │
│  small      │  - Bottom row: mini calendar + source     │
│  screens)   │    of bookings stats                     │
└─────────────┴──────────────────────────────────────────┘
```

### 5.1 Sidebar (clearly different from TailAdmin)
- Width **240px** (they use 290px), collapses to 72px
- **Always dark in both light & dark mode** (`#0B1220` → `#0A101E`) → reads as ours,
  not a white template
- Top: our own logo mark + system name with accent color
- Menu grouped by category, small muted group labels
- Menu item: 20px icon + 13px label; active state = `brand-500/15` fill + 3px accent
  bar on the left edge
- **No** "Upgrade to Pro" card, ever
- Bottom: compact user card (avatar + name + sign-out)

### 5.2 Header (floating)
- 64px tall, sticky top, background `--bg-base` at ~80% opacity + 12px blur
- **No** bottom border (they have a hard divider line)
- Left: hamburger (toggles sidebar) + breadcrumb "Home / Overview"
- Center: search bar 320px wide (not 430px like theirs), pill-shaped, `/` shortcut hint
- Right: dark-mode toggle, notification bell (red dot with count), avatar + dropdown

### 5.3 Dashboard (home) page — section order (different proportions from TailAdmin)
1. Heading row: "Good morning, Alex 👋" + "+ New booking" button (pill)
2. 4 KPI cards: Today's revenue / Pending bookings / Occupancy rate / New guests
   - **Horizontal**: tinted icon circle on the left + number + small %-change chip
     vs. yesterday
3. Bar chart "Revenue — last 30 days" (2/3 width) + "Monthly target" ring gauge (1/3)
4. "Recent bookings" table, full width (with search + status filter above it)
5. Bottom row: mini calendar (this month, dots on days with bookings) + "Booking
   sources" stat card

---

## 6. Component Spec

### 6.1 Button
- Pill shape (`rounded-full`), 40px tall (default) / 44px (primary)
- Primary: `--brand-500` fill, white text, darkens 5% on hover
- Secondary: `--bg-subtle` fill, dark text, no border
- Danger: `--accent-coral` fill, white text
- Every button has a `focus-visible` ring (brand at 25% opacity) — accessibility

### 6.2 Card
- `--bg-surface` fill, `--radius-lg`, **no border**, `--shadow-card`
- Card header: 20px/600 title + action button on the right
- Card padding: 24px

### 6.3 Table
- Header row: `--bg-subtle` fill, 12px/500, sentence case (not uppercase like TailAdmin)
- Row hover: `--bg-subtle` at 50%
- Numbers: tabular-nums, right-aligned
- Pagination: 32px circular buttons, active page = brand fill
- No vertical cell dividers — only faint horizontal row lines

### 6.4 Badge / Status
- Format: 6px color dot + label (e.g. ● Confirmed / ● Pending / ● Cancelled)
- Soft tinted background of the status color, `--radius-sm`, 12px text
- **No** all-caps labels (differs from TailAdmin's uppercase badges)

### 6.5 Form
- Input: 42px tall, `--radius-sm`, `--bg-surface` fill, warm border `#D8D5CC`
  (not cold gray)
- Focus: brand border + 20% brand ring
- Label: 13px/500 above the field (no trendy floating labels)
- Error: coral border + 12px helper text below

### 6.6 Chart
- Library: **Recharts** (they use ApexCharts → completely different codebase)
- Colors: brand-500 + brand-300 gradient fill, 2.5px curved line (natural curve)
- Tooltip: white card, `--shadow-pop`, 12px radius, tabular numbers
- No vertical gridlines; horizontal gridlines very faint

### 6.7 Modal / Drawer
- Modal: `--radius-xl`, `--shadow-float`, backdrop `rgba(11,18,32,.55)` + 4px blur
- Animation: scale 0.96 → 1.0, 150ms ease-out
- Closes with ESC + backdrop click (accessibility)

### 6.8 Calendar
- No FullCalendar (that's theirs) — build a mini calendar with React + date-fns
- Days with bookings: small brand dot under the number
- Today: filled brand circle, white text

---

## 7. "Never Do" Checklist (lawsuit-proofing)

- [ ] Never import component code from the TailAdmin repo (even with MIT + license
      attribution)
- [ ] Never use the Outfit font
- [ ] Never use #465FFF or any indigo palette
- [ ] Never use their icon set / images / demo assets
- [ ] Never copy their menu copy, sample text, or category names
- [ ] Never replicate their exact pixel dimensions (290px sidebar, 430px search, etc.)
- [ ] Never use the same chart/calendar/map libraries they do (ApexCharts, FullCalendar,
      jVectorMap)
- [ ] Build every component from scratch, referencing only the tokens in this document
- [ ] If using other open-source libraries, check licenses and include credits

---

## 8. Summary — What's Similar / What's Different (vs. TailAdmin)

| | TailAdmin | Ours |
|---|---|---|
| Overall structure | sidebar + header + cards | Same (universal convention) |
| Font | Outfit | IBM Plex Sans Thai |
| Brand color | indigo #465FFF | teal #0F766E |
| Background | cold gray | warm cream / deep navy |
| Sidebar | white 290px + ad card | dark 240px, no ads |
| Header | bottom border | floating + blur |
| Cards | thin border + faint shadow | no border + floating shadow |
| Buttons | 8px radius | fully rounded |
| Badges | uppercase | sentence case + status dot |
| Charts | ApexCharts | Recharts |
| Calendar | FullCalendar | custom, date-fns |
| Home page | KPI x4 + chart + table | KPI x4 + chart + table + mini calendar |

> What's "the same" is the generic skeleton every template shares (safe to use).
> What's "different" is everything the eye can see and touch — colors, fonts, component
> proportions. That alone makes it look nothing like TailAdmin, and not a single line
> of code is copied.

---

*This document is the spec for developers — implement primarily from the tokens in
Section 4. If you'd like a Tailwind config or a standalone CSS variables file, just ask.*
