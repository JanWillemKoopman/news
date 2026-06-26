# Wedding Planner App - CLAUDE.md

## Project Overview

**Wedding Planner** is a modern, user-friendly application built with **Next.js**, **React**, **Tailwind CSS**, and **Supabase**. The app helps couples and wedding planners organize their special day through intuitive features like task management, gift registries, RSVP tracking, and wedding websites.

### Core Features
- **Takenlijst** (Task Management): Collaborative task planning with AI suggestions
- **Cadeaulijst** (Gift Registry): Beautiful registry management system
- **RSVP Tracking**: Guest management and confirmation
- **Wedding Website**: Customizable public wedding sites
- **Real-time Collaboration**: Live updates using Supabase Realtime

---

## Design Philosophy

Our design is inspired by **Riley & Grey** (rileygrey.com) — a premium yet accessible design system that prioritizes elegance without complexity. Our guiding principles are:

### Three Core Values
1. **Rustig (Calm)** — Minimal visual noise, generous whitespace, breathing room
2. **Eenvoud (Simplicity)** — Clear hierarchy, intuitive flows, no unnecessary elements
3. **Gebruiksvriendelijkheid (User-Friendliness)** — Accessible to all, forgiving interactions, helpful guidance

### Design Characteristics
- **Minimalist aesthetic** with purposeful use of whitespace
- **Premium but unpretentious** — elegant without feeling luxurious or exclusive
- **Functional elegance** — every design decision serves a purpose
- **Warm & inviting** — the interface feels like a helpful assistant, not a command center
- **Responsive & inclusive** — beautiful on all devices, accessible to all users

---

## Visual Identity

### Color Palette

#### Primary Colors: Inspired by Riley & Grey

**Rhino Navy** (Dark Blue)
- Used for headers, primary interactive states, and premium moments
- Hex: `#2f5475` (700) to `#1a2937` (950)
- When to use: Headers, primary buttons, important navigation, bold statements

```
rhino-50:  #f4f7fb   (lightest, backgrounds)
rhino-100: #e8eef6
rhino-200: #cdddea
rhino-300: #a0c0d9
rhino-400: #6fa0c4
rhino-500: #4b83ac
rhino-600: #396990
rhino-700: #2f5475   (primary brand blue)
rhino-800: #2a4862
rhino-900: #263c50
rhino-950: #1a2937   (darkest, headers)
```

**Rose** (Dusty Rose / Mauve)
- Accent color for calls-to-action, highlights, hover states
- Hex: `#c46f8a` (500) to `#913f5f` (700)
- When to use: Primary action buttons, links, success states, friendly highlights

```
rose-50:  #fbf5f6   (lightest backgrounds)
rose-100: #f5e3e7
rose-200: #f1dae0
rose-300: #e6bbc7
rose-400: #d795a9
rose-500: #c46f8a   (primary accent)
rose-600: #ad5173
rose-700: #913f5f   (darker accent for hover)
rose-800: #7a3754
rose-900: #69324b
```

#### Neutral Colors (from Tailwind defaults)
- **White/Background**: Clean, airy feeling
- **Gray**: Subtle text, disabled states, secondary info
- **Muted**: Helper text, borders, secondary UI

#### Semantic Colors
- **Destructive**: Red for deletion/danger actions (used sparingly)
- **Success**: Green for confirmations and completions
- **Warning**: Amber for alerts and notifications
- **Info**: Blue for informational messages

### Typography

**Font Family**
- **Headings & Body**: `Inter` (system-ui fallback)
  - Modern, clean, highly legible
  - Sans-serif for digital readability
  
- **Serif (Decorative)**: `Cormorant Garamond` (for special occasions, wedding websites)
  - Elegant serif for romantic touches
  - Use sparingly for hero sections or wedding-specific pages

### Type Scale & Usage

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| H1 | 2rem | Bold (700) | Page titles, major sections |
| H2 | 1.5rem | Semibold (600) | Section headers |
| H3 | 1.25rem | Semibold (600) | Subsection headers |
| H4 | 1rem | Semibold (600) | Card titles, labels |
| Body | 1rem | Regular (400) | Main text content |
| Small | 0.875rem | Regular (400) | Secondary text, descriptions |
| Tiny | 0.75rem | Regular (400) | Captions, metadata, badges |

---

## Layout & Spacing

### Whitespace (The Calm Factor)
- **Generous margins** between sections create visual breathing room
- **Consistent padding** within containers (typically `p-6` = 1.5rem)
- **Grid spacing**: Use a 4px baseline grid for precise alignment

### Container Widths
- **Mobile**: Full width with safe margins (`px-4`)
- **Tablet**: ~600px (target width)
- **Desktop**: ~1200px max, centered content
- **Ultra-wide**: Consider reading line length (content should be max ~70 characters)

### Spacing Scale
```
xs:  0.25rem (4px)   — Tight spacing
sm:  0.5rem  (8px)   — Compact spacing
md:  1rem    (16px)  — Standard spacing
lg:  1.5rem  (24px)  — Generous spacing
xl:  2rem    (32px)  — Spacious spacing
2xl: 3rem    (48px)  — Very spacious (between sections)
```

---

## Component Patterns

### Cards
**Purpose**: Group related content into digestible units

**Guidelines**
- Use for task cards, gift items, event details
- Subtle shadow (`shadow-sm` to `shadow-md`) for depth
- Rounded corners (`rounded-lg`)
- Generous internal padding (`p-6`)
- Light border (`border border-border`)
- Background: `bg-card`

**Example Usage**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Task Name</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Main content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

### Buttons

**Variants & When to Use**

| Variant | Purpose | Example |
|---------|---------|---------|
| `default` | Primary action, highest priority | "Save", "Create Task", "Confirm" |
| `secondary` | Secondary action, less prominent | "Edit", "Preview" |
| `outline` | Tertiary action or cancel | "Cancel", "Delete" |
| `ghost` | Minimal action, least prominent | Toolbar buttons, breadcrumbs |
| `link` | Text link (rare in this app) | Hyperlinks in content |
| `destructive` | Dangerous actions | "Delete Account", "Remove Item" |

**Size Guidelines**
- `lg` (h-11): Main CTAs, critical actions
- `default` (h-10): Standard buttons in most contexts
- `sm` (h-9): Compact buttons in dense UIs (tables, lists)
- `icon` (h-10 w-10): Toolbar buttons

**Hierarchy Example**
```tsx
{/* Primary action first (left) */}
<Button>Save Changes</Button>
{/* Secondary action */}
<Button variant="outline">Cancel</Button>
```

### Forms & Inputs
- **Label**: Always include visible labels (accessibility)
- **Placeholder**: Use as hint, not replacement for label
- **Border focus**: Ring effect on focus (Tailwind default)
- **Error states**: Use `text-destructive` for validation messages
- **Disabled states**: Reduce opacity to 50%

### Badges & Status Indicators
- Use for tags, status states, categories
- Keep text short and scannable
- Colors should be semantic (success=green, warning=amber, etc.)

### Modals & Dialogs
**Principles**
- Overlay on background to focus attention (not harsh)
- Animation: smooth scale-in + fade (cubic-bezier for premium feel)
- Content: centered, max-width ~500px for readability
- Close button: always accessible (top-right or ESC key)
- Padding: adequate breathing room inside dialog

**Animation Timing**
- Fade-in: 200ms
- Dialog enter: 200ms with cubic-bezier(0.16, 1, 0.3, 1) for "premium" feel
- Overlay enter: 200ms fade

---

## Interactions & Animations

### Principles
- **Purpose-driven**: Every animation communicates or aids understanding
- **Snappy**: Feel responsive, not slow (200-300ms for most)
- **Consistent**: Use consistent timing functions across the app

### Timing Functions
```css
/* Default: ease-out */
transition: all 200ms ease-out;

/* Premium (cubic-bezier): Slightly overshoot for premium feel */
timing-function: cubic-bezier(0.16, 1, 0.3, 1);

/* Fast feedback: immediate but not jarring */
transition: all 100ms ease-in-out;
```

### Key Animations
| Animation | Duration | Use Case |
|-----------|----------|----------|
| `fade-in` | 200ms | Element appearance |
| `slide-up` | 250ms | Card/modal entrance |
| `pulse-slow` | 2000ms | Loading states (gentle) |
| `sheet-in` | 280ms | Bottom sheet animation |
| `drawer-in` | 280ms | Side drawer animation |
| `shimmer` | 1600ms | Skeleton/loading effect |

---

## Accessibility & Inclusive Design

### Core Principles
- **Color is not the only indicator**: Use text, icons, or patterns alongside color
- **Contrast**: Ensure WCAG AA compliance (4.5:1 minimum for text)
- **Focus states**: Always visible and intuitive (using `ring` utility)
- **Keyboard navigation**: All interactive elements must be keyboard-accessible
- **Semantic HTML**: Use proper headings, labels, buttons, etc.
- **ARIA labels**: Use for screen reader users when necessary

### Checklist
- [ ] Headings are hierarchical (h1 → h2 → h3, no skipping)
- [ ] Form labels are associated with inputs (not just placeholders)
- [ ] Buttons have clear text or aria-labels (not just icons)
- [ ] Color contrast passes WCAG AA (test with WebAIM)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus states are visible

---

## Responsive Design

### Breakpoints (Tailwind)
```
sm: 640px    — Large phones, small tablets
md: 768px    — Tablets
lg: 1024px   — Small laptops
xl: 1280px   — Laptops
2xl: 1536px  — Large screens
```

### Mobile-First Approach
- **Design for mobile first**, then enhance for larger screens
- **Touch targets**: Minimum 44x44px (tappable area)
- **Text size**: At least 16px on mobile to avoid zoom on iOS
- **Padding**: Generous padding on mobile for touch comfort

### Example Responsive Pattern
```tsx
{/* Default (mobile): full width, stacked */}
<div className="flex flex-col gap-4">
  {/* md: switch to horizontal layout */}
  <div className="md:flex md:gap-8">
    <div className="flex-1">Content</div>
    <div className="flex-1">Sidebar</div>
  </div>
</div>
```

---

## UI Patterns by Feature

### Task Management
- **Task Card**: Show task title, assignee, date, priority
- **Quick Add**: Minimal inline form to add new tasks
- **AI Suggestions**: Highlighted with subtle background, contextual
- **Status Indicators**: Clear, colorful badges (not ready, in progress, done)
- **Drag & Drop**: Smooth animations, clear drop zones

### Gift Registry
- **Item Card**: Image, name, price, status, giver info
- **Item Editor**: Modal or side panel with form fields
- **Settings**: Clean table/form layout for configuration
- **Public View**: Elegant display for guests

### RSVP & Guest Management
- **Guest Card**: Name, RSVP status, dietary info, notes
- **RSVP Form**: Simple, mobile-friendly, clear CTA
- **Status Summary**: Visual dashboard (attending, maybe, declined)

### Wedding Website
- **Home Editor**: Drag-and-drop sections, rich text
- **Photo Upload**: Clear drag zone, preview grid
- **Live Preview**: Side-by-side editing view

---

## Writing & Microcopy

### Tone
- **Friendly but professional**: Not overly casual, not stuffy
- **Helpful**: Explain what's happening (errors, loading states)
- **Active voice**: "Save your task" not "Task will be saved"
- **Action-oriented**: CTA buttons start with verbs ("Create", "Save", "Share")

### Common Patterns

| Context | Example |
|---------|---------|
| Success | "✓ Task saved successfully" |
| Error | "Couldn't save task. Check your internet connection." |
| Empty state | "No tasks yet. Create your first one to get started!" |
| Loading | "Loading your tasks..." |
| Confirmation | "Are you sure you want to delete this task?" |

---

## UI/UX & Design System Rules (CRITICAL)

⚠️ **Deze regels zijn niet onderhandelbaar.** Ze zorgen ervoor dat de app consistent, werkzaam en toegankelijk blijft.

### Design Tokens & Theme System
- **DWING het gebruik af van centrale theme-variabelen** (Tailwind CSS custom properties en color tokens)
- **NOOIT ad-hoc hex-codes**: Geen willekeurige `#abc123` kleuren inline in komponenten
- **NOOIT pixel-hacks**: Geen `top-[13px]`, `left-[7px]`, of andere magic numbers voor positioning
- **Reden**: Dit zorgt ervoor dat design-updates centraal gebeuren en dat visuele inconsistenties voorkomen worden

**Voorbeeld FOUT ❌**
```tsx
<div style={{ top: '13px', color: '#f4a0c4' }}>
  Wrong approach
</div>
```

**Voorbeeld CORRECT ✓**
```tsx
<div className="mt-3 text-rose-400">
  Right approach - uses design tokens
</div>
```

### Spacing & Layout
- **Gebruik UITSLUITEND de vaste spacing-schaal** (xs/sm/md/lg/xl/2xl) voor padding, margin, gaps
- **GEEN willekeurige getallen**: Geen `px-[27px]`, `gap-3.5`, of andere ad-hoc waardes
- **Consistent rhythm**: Alles moet zich uitlijnen met het 4px-grid
- **Reden**: Visuele rust en harmonie — wanneer alles aligned is, voelt de interface rustig

**Spacing Scale (ENIGE opties)**
```
xs:  0.25rem (4px)
sm:  0.5rem  (8px)
md:  1rem    (16px)
lg:  1.5rem  (24px)
xl:  2rem    (32px)
2xl: 3rem    (48px)
```

### Component States (VERPLICHT)
Elk interactief element MOET altijd expliciete states hebben:

- **Hover state**: `hover:bg-*`, `hover:text-*`
- **Focus state**: `focus-visible:ring-*` voor keyboard-accessibility
- **Active state**: Voor currently selected/pressed elements
- **Disabled state**: `disabled:opacity-50`, `disabled:cursor-not-allowed`
- **Loading state**: Skeleton/spinner/shimmer effect

**Voorbeeld VOLLEDIG ✓**
```tsx
<button
  className={cn(
    "px-4 py-2 bg-rose-500 text-white rounded-lg",
    "hover:bg-rose-700 transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300",
    "active:scale-95",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  )}
>
  Save
</button>
```

### UX Delighters (VERWACHT IN ELKE FEATURE)
Wanneer je features bouwt, MOETEN deze altijd voorzien zijn van:

1. **Empty States**
   - Wat ziet de gebruiker als er nul data is?
   - Duidelijke boodschap: "Nog geen taken. Maak er een aan!"
   - Eventueel een illustratie of icon
   - CTA-button naar volgende stap

2. **Error States**
   - Duidelijk error message (niet "error 500")
   - Wat ging mis? Hoe fix ik het?
   - Visuele indicatie (rood icon, error text)
   - Verwende destructive color spaarend

3. **Loading States**
   - Skeleton screens (voorkeur) OF spinner
   - Subtiele shimmer-animatie (niet jarring)
   - Text: "Loading your tasks..." OF "Saving..."
   - NOOIT gebruiker in onzekerheid laten

4. **Success Feedback**
   - Toast/notification met checkmark
   - "✓ Task saved successfully"
   - Auto-dismiss na 3-4 seconden
   - Geen jarring kleur-flits

**Voorbeeld: Empty State**
```tsx
{tasks.length === 0 ? (
  <div className="text-center py-12">
    <Icon className="mx-auto mb-4 text-muted-foreground" />
    <p className="text-muted-foreground mb-4">
      Nog geen taken. Maak er een aan!
    </p>
    <Button onClick={() => setShowAdd(true)}>
      Eerste taak toevoegen
    </Button>
  </div>
) : (
  <div>{/* task list */}</div>
)}
```

### Aesthetic Rules (MINIMALISTISCH & CLEAN)
- **Witruimte is je vriend**: Geen cramped layouts
- **Vermijd onnodige visuele ruis**:
  - GEEN zware borders overal (subtiele `border-border` alleen waar nodig)
  - GEEN excessive gradients (flat design voorkeur)
  - GEEN drop-shadows behalve `shadow-sm` tot `shadow-md`
  - GEEN neon kleuren of flash-animations
- **Gebruik functionele ruimte** (padding, margin) in plaats van decoratie
- **Iedere pixel dient een doel**: Geen bling, alleen functie
- **Consistent font-sizing**: Respecteer de type-schaal hierboven

**SLECHTE voorbeelden ❌**
```tsx
{/* Waarom al die gradients en borders? */}
<div className="bg-gradient-to-r from-rose-400 to-pink-600 border-4 border-dashed border-rhino-950 shadow-xl">
  Too much decoration
</div>

{/* Magic numbers overal */}
<div className="px-[17px] py-[23px] gap-[11px]">
  Inconsistent spacing
</div>
```

**GOEDE voorbeelden ✓**
```tsx
{/* Schoon, minimalistisch */}
<Card className="bg-card border border-border shadow-sm">
  <CardContent className="p-6">
    {/* Content uses design tokens only */}
  </CardContent>
</Card>

{/* Consistent spacing */}
<div className="flex gap-4 p-6">
  Items with consistent spacing
</div>
```

---

## Technical Guidelines

### Tailwind CSS Usage
- **Prefer utility classes** over custom CSS
- **Avoid custom colors** — use the color palette defined above
- **Use semantic tokens** (`bg-card`, `text-muted-foreground`) for consistency
- **Breakpoint prefixes** for responsive design (`md:flex`, `lg:p-8`)
- **Don't over-engineer**: Simple utilities beat complex abstractions

### Component Architecture
- **Radix UI base**: Use for accessibility (dialogs, labels, etc.)
- **Custom styling** via Tailwind (no styled-components)
- **Compound components**: Card, CardHeader, CardContent, etc.
- **Props over variants** (when it makes sense)

### Code Patterns
```tsx
// ✓ GOOD: Clear, semantic, accessible
<button
  onClick={handleClick}
  className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-700 transition-colors"
  aria-label="Create new task"
>
  Create Task
</button>

// ✗ AVOID: Too many variants, unclear intent
<CustomButton
  intent="primary"
  size="medium"
  animated={true}
  rounded={true}
>
  Create Task
</CustomButton>
```

---

## Future Design Decisions

### Decision Framework
When adding new features or design elements, ask:

1. **Does it align with our values?** (Calm, Simple, User-friendly)
2. **Will it add visual noise?** (Minimize if so)
3. **Is it consistent with existing patterns?** (Reuse when possible)
4. **Have we tested it on mobile?** (Mobile-first principle)
5. **Is it accessible?** (WCAG AA minimum)

### Design Review Checklist
- [ ] Design is calm and minimal (no unnecessary decoration)
- [ ] Follows the color palette (rhino + rose + neutrals)
- [ ] Typography is consistent and hierarchical
- [ ] Whitespace is generous (not cramped)
- [ ] Animation serves a purpose (not distracting)
- [ ] Works on mobile (tested on 375px and up)
- [ ] Accessible (labels, contrast, keyboard nav)
- [ ] Consistent with existing patterns
- [ ] User-friendly and intuitive (no learning curve)

---

## Resources

### Color References
- **Tailwind CSS**: https://tailwindcss.com/docs/customizing-colors
- **Accessible Color Contrast**: https://webaim.org/resources/contrastchecker/

### Inspiration & Reference
- **Riley & Grey**: https://rileygrey.com — Our primary design inspiration
- **Design Systems**: Radix UI, Shadcn/ui (component patterns)

### Tools
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Headless component library for accessibility
- **Lucide React**: Icon library (consistent, modern)

---

## Version History

| Date | Changes | Owner |
|------|---------|-------|
| 2026-06-26 | Initial CLAUDE.md creation with design philosophy, color palette, component patterns, and guidelines | Claude |

---

**Last Updated**: June 26, 2026

This document is the living style guide for the Wedding Planner app. Update it as we evolve the design system and add new patterns.
