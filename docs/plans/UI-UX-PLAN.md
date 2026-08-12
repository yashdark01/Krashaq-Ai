# Krashaq UI/UX Master Plan

> Version 1.0 · March 2026  
> Scope: Full application — farmer app, auth, admin, chat, and design system  
> Stack: Next.js 16 · Tailwind · shadcn/ui · Framer Motion (recommended)

---

## 1. Design north star

**Krashaq should feel like a trusted field advisor, not a generic SaaS dashboard.**

Farmers open the app to answer three questions in under 10 seconds:

1. **Kya mausam hai?** (What's the weather?)
2. **Paani kab doon?** (When should I irrigate?)
3. **Meri fasal ke liye kya karna hai?** (What should I do for my crop?)

Every screen, component, and micro-interaction should move the user toward a **clear action**, not raw data ([Agentic UI — Gapsy 2026](https://gapsystudio.com/blog/agriculture-app-design/), [GSMA AgriTech Guidebook](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/gsma_resources/agritech-ux-design-guidebook/)).

### Primary personas

| Persona                        | Context                                                          | UX priority                             |
| ------------------------------ | ---------------------------------------------------------------- | --------------------------------------- |
| **Ram — smallholder farmer**   | Android phone, low digital literacy, outdoor use, Hindi/Hinglish | Large touch, voice, simple decisions    |
| **Priya — progressive farmer** | Smartphone, reads English, checks app daily                      | Weather + AI chat + history             |
| **Admin — ops manager**        | Desktop/laptop, data-heavy                                       | Dense dashboards, filters, audit trails |

---

## 2. Design principles (research-backed)

| #   | Principle                     | Implementation                                                    |
| --- | ----------------------------- | ----------------------------------------------------------------- |
| 1   | **Decision over data**        | Show "Irrigate tomorrow 6 AM" not "Humidity: 62%" alone           |
| 2   | **Progressive disclosure**    | One primary task per screen; details one tap deeper               |
| 3   | **Field-readable**            | 7:1 contrast option, 48px min touch targets, no color-only status |
| 4   | **Reduce typing**             | Dropdowns, chips, voice, quick actions — especially on mobile     |
| 5   | **Trust & transparency**      | Show AI provider, last sync time, offline state calmly            |
| 6   | **Mobile-first farmer flows** | Dedicated mobile layout, not shrunk desktop                       |
| 7   | **Accessibility-first**       | WCAG 2.2 AA baseline; keyboard + screen reader on all flows       |
| 8   | **Calm technology**           | Earthy palette, minimal animation, no alarmist error UI           |

Sources: [AgriTech UX Guidebook (GSMA)](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/gsma_resources/agritech-ux-design-guidebook/), [Field-tested principles (Medium 2026)](https://medium.com/@sneh_sagar/agriculture-app-ui-design-7-field-tested-principles-that-drive-real-farmer-adoption-3fbbbbb24cea), [SaaS Dashboard 2026](https://www.sanjaydey.com/saas-dashboard-design-users-love/)

---

## 3. Visual identity & design tokens

### 3.1 Brand personality

- **Trustworthy** — agricultural, grounded, not "neon startup"
- **Clear** — short sentences, icons + text always paired
- **Helpful** — AI as assistant (🌾 Krashaq), never robotic jargon

### 3.2 Color system

Replace pure green-on-white office contrast with **earthy, low-glare tokens**:

| Token             | Light mode | Use                              |
| ----------------- | ---------- | -------------------------------- |
| `--brand-soil`    | `#2D5016`  | Primary actions, logo            |
| `--brand-wheat`   | `#C4A35A`  | Accents, highlights              |
| `--brand-sky`     | `#4A90A4`  | Weather, water, info             |
| `--brand-clay`    | `#8B6914`  | Warnings (irrigation caution)    |
| `--brand-harvest` | `#3D7A2F`  | Success, healthy crop            |
| `--surface-field` | `#F7F5F0`  | Page background (warm off-white) |
| `--surface-card`  | `#FFFFFF`  | Cards with subtle border         |
| `--text-primary`  | `#1A1A1A`  | Body (not pure black)            |
| `--text-muted`    | `#5C5C5C`  | Secondary                        |

**Dark mode:** Deep slate `#0F1410` background, desaturated greens — avoid pure `#000`.

**Field mode (optional toggle):** Forces max contrast, disables gradients, increases font size +12%.

### 3.3 Typography

| Role              | Font                                 | Size (mobile / desktop)                |
| ----------------- | ------------------------------------ | -------------------------------------- |
| Display           | **DM Sans** or **Plus Jakarta Sans** | 28px / 36px                            |
| Body              | **Inter** or **Noto Sans**           | 16px / 16px (never below 16 on mobile) |
| Hindi/Devanagari  | **Noto Sans Devanagari**             | Same scale, line-height 1.6            |
| Numbers (weather) | **Tabular nums**                     | 32px / 40px bold                       |

Minimum line-height: **1.5** body, **1.2** headings.

### 3.4 Spacing & layout

- **8px grid** — all padding/margins multiples of 8
- **Border radius:** 12px cards, 8px inputs, 999px pills/chips
- **Max content width:** 720px (chat), 1280px (admin)
- **Bento grid** on farmer home (2026 trend): asymmetric cards, hero weather tile

### 3.5 Elevation & motion

- Shadows: subtle only (`shadow-sm` cards, `shadow-md` modals)
- Motion: 200ms ease; respect `prefers-reduced-motion`
- Loading: **skeleton screens**, not spinners alone
- Success: brief toast + optional haptic on mobile

---

## 4. Component library plan

Extend shadcn/ui with Krashaq-specific primitives.

### 4.1 Atoms (foundation)

| Component    | File                         | Spec                                                                                                              |
| ------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Button**   | `components/ui/button.tsx`   | Variants: primary, secondary, ghost, destructive, **field** (48px min height). Loading state with spinner inline. |
| **Input**    | `components/ui/input.tsx`    | 44px height mobile, clear error state below field, optional leading icon                                          |
| **Label**    | `components/ui/label.tsx`    | Required asterisk + `(optional)` muted suffix                                                                     |
| **Badge**    | `components/ui/badge.tsx`    | Semantic: weather, crop, AI, status — always icon + text                                                          |
| **Avatar**   | `components/ui/avatar.tsx`   | Farmer initials; fallback crop icon                                                                               |
| **Card**     | `components/ui/card.tsx`     | Variants: default, **insight** (left accent border), **alert**                                                    |
| **Skeleton** | `components/ui/skeleton.tsx` | **NEW** — weather/chat loading                                                                                    |
| **Toast**    | via ToastContext             | Success/error/info; 4s auto-dismiss; stack max 3                                                                  |
| **Tooltip**  | shadcn tooltip               | Never sole info carrier — always redundant label                                                                  |
| **Switch**   | shadcn switch                | Field mode, dark mode, notifications                                                                              |
| **Select**   | shadcn select                | Replace native `<select>` on signup for consistent styling                                                        |
| **Dialog**   | shadcn dialog                | Confirm destructive actions (delete farmer, ban user)                                                             |
| **Sheet**    | shadcn sheet                 | **NEW** — mobile nav, filters drawer                                                                              |

### 4.2 Molecules (composed)

| Component            | Purpose                        | Key UX                                                  |
| -------------------- | ------------------------------ | ------------------------------------------------------- |
| **FormField**        | Label + input + error + hint   | Inline validation on blur                               |
| **LocationPicker**   | State→district→tehsil→locality | Step wizard on mobile (4 steps), single page on desktop |
| **MetricCard**       | KPI with trend arrow           | One number hero + "vs yesterday"                        |
| **StatusPill**       | Online/offline/sync            | Calm copy: "Last updated 2 min ago"                     |
| **QuickActionChip**  | "Weather", "Irrigate", "Help"  | 48px tap, scrollable row                                |
| **EmptyState**       | No data illustrations          | Icon + one-line copy + CTA button                       |
| **ErrorState**       | API failure                    | Retry button + support link                             |
| **LanguageToggle**   | HI / EN / Hinglish             | Persist in localStorage; affects AI reply lang          |
| **ConnectionBanner** | Offline/sync pending           | Thin top bar, non-blocking                              |
| **ModelSelector**    | LLM provider picker            | Collapsed on mobile ("AI: Groq ▾")                      |

### 4.3 Organisms (feature blocks)

| Component           | Current file                         | Redesign focus                                                          |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------- |
| **WeatherCard**     | `modules/common/.../WeatherCard.tsx` | Hero temp, condition icon, rain forecast strip, "Ask about weather" CTA |
| **IrrigationPanel** | `IrrigationPanel.tsx`                | Traffic-light decision: Do / Wait / Skip + one-sentence why             |
| **ChatInterface**   | `conversation/ChatInterface.tsx`     | Bubble chat, suggested prompts, voice button, provider badge            |
| **ChatBox**         | `ChatBox.tsx`                        | Unify with ChatInterface OR farmer vs power-user modes                  |
| **FarmerForm**      | `farmers/FarmerForm.tsx`             | Phone mask +91, location optional shortcut                              |
| **Header**          | `layout/Header.tsx`                  | Sticky, location pill, notification bell placeholder                    |
| **Sidebar**         | `layout/Sidebar.tsx`                 | Collapsible; icons + labels; admin section separated                    |
| **MainLayout**      | `layout/MainLayout.tsx`              | Mobile bottom nav + desktop sidebar                                     |
| **ProtectedRoute**  | `auth/ProtectedRoute.tsx`            | Branded loading skeleton, not bare spinner                              |
| **AdminDashboard**  | `admin/AdminDashboard.tsx`           | 5 KPI max above fold, bento layout                                      |
| **UserList**        | `admin/UserList.tsx`                 | Table → card list on mobile; bulk actions in sticky bar                 |
| **SystemHealth**    | `admin/SystemHealth.tsx`             | Green/amber/red with icons + labels, not color alone                    |

---

## 5. Page-by-page UX specification

### 5.1 Auth flows

#### `/auth/login`

- **Layout:** Split on desktop (left: hero image of field + tagline; right: form). Full-width form on mobile.
- **Remove:** Emoji-only branding → logo + wordmark
- **Google + Email tabs:** Keep segmented control; add "Continue with phone" (future)
- **Errors:** Inline below field, plain language ("Email or password incorrect")
- **Footer:** Links to signup, privacy, language selector

#### `/auth/signup`

- **Problem today:** Long 2-column form overwhelms mobile
- **Fix:** **3-step wizard**
  1. Account (email, name, password)
  2. Location (cascading picker — use new LocationPicker molecule)
  3. Confirm (summary card + Create account)
- **Progress indicator** at top (Step 1 of 3)
- **Skip phone** clearly optional

#### `/auth/register` (Google OAuth completion)

- Minimal fields; pre-fill from Google; same location step

#### `/auth/callback`

- Branded loading: "Signing you in…" + skeleton

---

### 5.2 Farmer dashboard `/`

**Information hierarchy (mobile — top to bottom):**

```
┌─────────────────────────────┐
│ Header: Location ▾  Profile │
├─────────────────────────────┤
│ WEATHER HERO CARD (bento 2x) │
│ 24°C · Partly cloudy        │
│ Bhopal · Updated 2m ago     │
├──────────────┬──────────────┤
│ IRRIGATION   │ QUICK ASKS   │
│ 💧 Do today  │ Weather      │
│ 6–8 AM       │ Irrigate     │
├──────────────┴──────────────┤
│ CHAT (sticky input bottom)  │
└─────────────────────────────┘
│ Bottom nav: Home | Chat | … │
└─────────────────────────────┘
```

**Desktop:** 3-column — weather+irrigation left, chat center, tips/history right.

**Empty state (new user):** Welcome card with 3 suggested questions in Hindi + English.

---

### 5.3 Chat experience

**Patterns (2026 AI chat best practice):**

- **Suggested prompts** as chips above input (rotate by season/crop)
- **Message bubbles:** User right (brand green), AI left (neutral surface)
- **AI metadata:** Small badge `Groq · Llama 3.3` + tools used (`weather`)
- **Voice input button** (mic) — future Phase 2, reserve space now
- **Typing indicator:** Three dots + "Krashaq is thinking…"
- **Long responses:** Collapse with "Read more"
- **Copy / thumbs** on AI messages for feedback loop

**ModelSelector mobile:** Collapse to bottom sheet; don't expose 8 providers upfront — show "Recommended" + "Advanced".

---

### 5.4 Profile `/profile` & Settings `/profile/settings`

- **Profile:** Avatar, name, location hierarchy as readable breadcrumb (not raw JSON fields)
- **Settings sections:** Account · Language · Notifications · AI preferences · Security · Delete account
- **Visual confirmation** after save (toast + checkmark animation)

---

### 5.5 Farmers `/farmers`

- List view: cards with name, phone, location, status dot
- FAB on mobile: "+ Add farmer"
- Form in sheet/dialog, not full page on mobile

---

### 5.6 Admin section

**Design language shift:** Denser, neutral gray palette subsection — visually distinct from farmer app ("pro mode").

| Page               | Above-the-fold                                                 | Components                        |
| ------------------ | -------------------------------------------------------------- | --------------------------------- |
| `/admin`           | 5 KPIs: users, active today, chat sessions, API health, errors | Bento + sparklines                |
| `/admin/users`     | Search + filters sticky                                        | Data table desktop / cards mobile |
| `/admin/analytics` | Date range picker                                              | Line charts, max 2 per row        |
| `/admin/audit`     | Timeline feed                                                  | Expandable log rows               |
| `/admin/health`    | System status cards                                            | LLM latency, MongoDB, Redis       |
| `/admin/config`    | Grouped settings forms                                         | LLM provider, weather API         |
| `/admin/scheduler` | Job list + trigger buttons                                     | Confirm dialogs                   |

**Admin nav:** Collapsible sidebar with section labels (Overview · Users · System · Config).

---

## 6. Responsive & navigation strategy

### Mobile (< 768px)

- **Bottom navigation:** Home · Chat · Farmers · Profile (farmer role)
- **No sidebar** — use sheet menu for admin links
- **Sticky chat input** above bottom nav
- **Thumb zone:** Primary actions in bottom 40% of screen

### Tablet (768–1024px)

- Collapsed sidebar (icons only)
- 2-column bento dashboard

### Desktop (> 1024px)

- Full sidebar + header
- Admin gets persistent nav

---

## 7. Accessibility checklist (WCAG 2.2 AA+)

- [ ] All interactive elements ≥ 44×44px (48px for field mode)
- [ ] Focus rings visible (2px solid `--ring`)
- [ ] Color contrast ≥ 4.5:1 text; ≥ 7:1 for field mode
- [ ] Charts: patterns + labels, not color alone
- [ ] `aria-live` for chat new messages and toasts
- [ ] Form errors linked via `aria-describedby`
- [ ] Skip to main content link
- [ ] Hindi: `lang="hi"` on localized strings
- [ ] Reduced motion: disable parallax/animations

---

## 8. Micro-interactions catalog

| Trigger         | Feedback                              |
| --------------- | ------------------------------------- |
| Button tap      | Scale 0.98 + 100ms                    |
| Form submit     | Button loading → toast success        |
| Chat send       | Message slides in + scroll            |
| Weather refresh | Pull-to-refresh on mobile             |
| Offline         | Banner slides down, soft amber        |
| Error           | Shake input + red border (subtle)     |
| Page transition | Fade 150ms (Next.js View Transitions) |

---

## 9. Implementation phases

### Phase 1 — Foundation (Week 1–2)

- [x] Design tokens in `globals.css` + Tailwind config
- [x] Typography (Plus Jakarta Sans + Noto Sans Devanagari)
- [x] Button, Input, Card, Badge, Skeleton upgrades
- [x] MainLayout: mobile bottom nav + desktop sidebar
- [x] Empty/Error/Loading states

### Phase 2 — Farmer core (Week 3–4)

- [ ] Dashboard bento redesign (WeatherCard + IrrigationPanel)
- [ ] ChatInterface polish + suggested prompts
- [ ] Auth wizard (signup 3-step)
- [ ] LocationPicker molecule
- [ ] Language toggle (UI only)

### Phase 3 — Profile & farmers (Week 5)

- [ ] Profile/settings redesign
- [ ] Farmers list + form sheet
- [ ] Connection/offline banner

### Phase 4 — Admin (Week 6–7)

- [ ] Admin design sub-system (neutral pro theme)
- [ ] Dashboard KPI bento
- [ ] UserList responsive table/cards
- [ ] Health + analytics charts

### Phase 5 — Polish & PWA (Week 8)

- [ ] Field mode toggle
- [ ] Framer Motion page transitions
- [ ] Lighthouse a11y audit ≥ 95
- [ ] PWA manifest + install prompt
- [ ] Optional: voice input on chat

---

## 10. Figma file structure (deliverable)

```
Krashaq Design System/
├── 00 Cover & Changelog
├── 01 Tokens (color, type, spacing, shadows)
├── 02 Atoms (buttons, inputs, badges…)
├── 03 Molecules (FormField, MetricCard…)
├── 04 Organisms (WeatherCard, Chat…)
├── 05 Pages — Farmer (mobile + desktop)
├── 06 Pages — Auth
├── 07 Pages — Admin
├── 08 Prototypes (signup flow, chat, dashboard)
└── 09 Accessibility & Field mode specs
```

---

## 11. Success metrics

| Metric                               | Target                                  |
| ------------------------------------ | --------------------------------------- |
| Signup completion rate               | > 70%                                   |
| Time to first chat message           | < 60s after signup                      |
| Mobile Lighthouse Performance        | > 85                                    |
| Accessibility score                  | > 95                                    |
| Farmer task success (usability test) | 5/5 can get weather + irrigation advice |

---

## 12. References

- [Gapsy — Agriculture App Design 2026](https://gapsystudio.com/blog/agriculture-app-design/)
- [GSMA AgriTech UX Design Guidebook](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/gsma_resources/agritech-ux-design-guidebook/)
- [Field-tested farmer adoption principles](https://medium.com/@sneh_sagar/agriculture-app-ui-design-7-field-tested-principles-that-drive-real-farmer-adoption-3fbbbbb24cea)
- [SaaS Dashboard UX 2026](https://www.sanjaydey.com/saas-dashboard-design-users-love/)
- [Accessible Agri-Tech UX](https://www.uxstalwarts.com/blog/cultivating-accessibility-bridging-the-digital-divide-in-agri-tech/)

---

_Next step: Approve Phase 1 tokens + layout, then implement in `feat/ui-redesign` branch._
