# CampusShare Bug Log & Quality Assurance Tracker

This document tracks all identified UI/UX defects, mobile responsiveness checks, accessibility audits, and edge-case behaviors across the platform.

---

## Quality Metrics & Acceptance Standards
- **Viewport target**: Minimum 360px width without horizontal scrolling or clipped text.
- **Touch target size**: All interactive elements must satisfy $\ge 44 \times 44\text{px}$.
- **Status color rule**: Never display color alone; always pair with explicit icon + text label.
- **Accessibility**: Keyboard navigable (Escape, Tab focus rings), high-contrast text.

---

## Bug Log Table

| ID | Page / Component | Steps to Reproduce | Severity | Owner | Status | Resolution Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | Global / Navbar | Open hamburger menu on iPhone SE (375px) then rotate device. | Low | Full Stack C | **Fixed** | Added `overflow-hidden` on body during active drawer state and synced Tailwind breakpoint triggers. |
| **BUG-002** | `/` Catalog Filter | Horizontal filter buttons overflowed edge on 360px viewport. | Medium | Full Stack C | **Fixed** | Wrapped filter container in `overflow-x-auto scrollbar-none` with smooth touch momentum scrolling. |
| **BUG-003** | `/rules` Worked Ex | Long formula code tags wrapped awkwardly on narrow screens. | Low | Full Stack C | **Fixed** | Added `break-words` and custom typography classes on code tags inside rule cards. |
| **BUG-004** | `CreditPill` | Tooltip would clip on right-hand edge on small screens. | Medium | Full Stack C | **Fixed** | Anchored popover to `right-0` with `max-w-xs` responsive clamp. |
| **BUG-005** | `DecisionPanel` | Accordion chevron lacked dedicated `aria-label` for screen readers. | Low | Full Stack C | **Fixed** | Added explicit `aria-label="Expand/Collapse panel"` and keyboard toggle support. |
| **BUG-006** | `Modal` | Background content scrolled while modal overlay was open. | Medium | Full Stack C | **Fixed** | Implemented `document.body.style.overflow = "hidden"` on modal mount and cleanup on unmount. |
| **BUG-007** | `/login` Demo Form | Clicking demo personas did not provide persistent feedback. | Low | Full Stack C | **Fixed** | Integrated `useToast()` toast system showing instant visual feedback when switching demo personas. |
| **BUG-008** | `StatusChip` | Status chip for `blocked` used plain text without icon. | High | Full Stack C | **Fixed** | Updated `StatusChip.tsx` to strictly bind Lucide icons (`Slash`, `Wrench`, `Clock`, `CheckCircle`) to all 8 statuses. |
| **BUG-009** | Touch Targets | Mobile close buttons in modals measured 32px height. | Medium | Full Stack C | **Fixed** | Enforced `min-h-[44px] min-w-[44px]` touch targets on all modal triggers and close icons. |
| **BUG-010** | `Skeleton` | Skeletons had no accessible ARIA attributes. | Low | Full Stack C | **Fixed** | Added `aria-hidden="true"` to prevent screen reader noise during simulated loading phases. |

---

## Severity Definitions
- **High**: Violates core design system or functional fairness logic (e.g. status without icon, broken modal trap).
- **Medium**: Affects usability on specific screen widths (e.g. horizontal scroll on 360px).
- **Low**: Polish, cosmetic alignment, or redundant DOM attributes.
