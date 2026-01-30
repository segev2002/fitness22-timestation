# Time Clock App - Manual Test Checklist

## Pre-requisites
- [ ] Run `npm run dev` to start development server
- [ ] Open in Chrome/Safari on desktop
- [ ] Open in Chrome/Safari on mobile device (or use DevTools mobile simulation)

---

## A) PWA Install Button

### Desktop (Chrome)
- [ ] Install button appears in header (desktop view)
- [ ] Clicking "Install App" triggers browser install prompt
- [ ] After installation, button hides or shows "Installed" state
- [ ] App opens in standalone window after install

### iOS Safari
- [ ] Install button shows iOS-specific instructions modal
- [ ] Modal explains: tap Share → Add to Home Screen
- [ ] Modal can be closed with X button or "Got it"

### Android Chrome
- [ ] Install button triggers native install banner
- [ ] App icon appears on home screen after install

---

## B) Site Gutters / Minimal Layout

### All Screen Sizes
- [ ] Content has consistent padding: `px-4` on mobile, `px-6` on tablet, `px-8` on desktop
- [ ] No horizontal overflow/scroll
- [ ] Content doesn't touch screen edges on any device

### Specific Pages
- [ ] Home page: proper gutters around clock-in card
- [ ] Edit Activity: calendar grid has proper margins
- [ ] Profile: form fields have consistent padding
- [ ] Shift History: table doesn't overflow container
- [ ] PDF Export: controls properly spaced

---

## C) Light/Dark Mode

### Theme Toggle
- [ ] Sun/Moon toggle button visible in header (desktop)
- [ ] Sun/Moon toggle in mobile hamburger menu
- [ ] Clicking toggle switches between light and dark mode
- [ ] Theme persists after page refresh (localStorage)

### Visual Check - Dark Mode
- [ ] Background: dark gray (#0D0D0D / #1A1A1A)
- [ ] Text: white/light gray
- [ ] Cards: slightly lighter than background
- [ ] Borders: visible but subtle
- [ ] Primary accent: neon green (#39FF14)

### Visual Check - Light Mode
- [ ] Background: white/light gray (#FFFFFF / #F5F5F5)
- [ ] Text: dark gray/black
- [ ] Cards: white with subtle shadows
- [ ] Borders: light gray
- [ ] Primary accent: neon green (#39FF14) still visible

### System Preference
- [ ] On first visit, theme matches OS preference
- [ ] Manual toggle overrides system preference

---

## D) Full Device Responsiveness

### Mobile (< 640px)
- [ ] Hamburger menu icon visible (☰)
- [ ] Nav buttons hidden in header
- [ ] Hamburger menu opens full-screen overlay
- [ ] All nav items accessible in mobile menu
- [ ] Text sizes appropriately scaled down
- [ ] Touch targets minimum 44px
- [ ] Calendar days are tappable and visible

### Tablet (640px - 1024px)
- [ ] Hybrid layout - some nav may show
- [ ] Forms stack vertically when needed
- [ ] Tables remain readable

### Desktop (> 1024px)
- [ ] Full horizontal navigation visible
- [ ] Multi-column layouts where appropriate
- [ ] All interactive elements easily clickable

### Specific Component Checks
- [ ] Header: adapts from hamburger → full nav
- [ ] Home: clock-in button always accessible
- [ ] Edit Activity: calendar readable on all sizes
- [ ] Shift History: table scrolls horizontally on mobile if needed
- [ ] Profile: form inputs stack on mobile
- [ ] Modals: centered, scrollable, not cut off

---

## E) Database Storage (Supabase)

### Without Supabase Config (Offline/Fallback)
- [ ] App works normally with localStorage
- [ ] No console errors about Supabase
- [ ] Data persists across page refreshes

### With Supabase Config (if .env.local configured)
- [ ] Create `.env.local` with Supabase credentials
- [ ] Shifts sync to Supabase on create
- [ ] Shifts sync to Supabase on update
- [ ] Shifts sync to Supabase on delete
- [ ] Check Network tab for Supabase API calls

---

## F) Mobile Header Redesign

### Hamburger Menu
- [ ] Three-line icon (☰) on left side of header
- [ ] Tapping opens slide-in menu
- [ ] Menu covers full screen with backdrop
- [ ] Logo/title centered in header
- [ ] User avatar and logout on right side

### Menu Contents
- [ ] All navigation items (Home, Edit Activity, History, Profile, PDF Export)
- [ ] Theme toggle (with current state indicator)
- [ ] Language toggle (with current language shown)
- [ ] Install App button (if not installed)
- [ ] Each item tappable with visual feedback

### Accessibility
- [ ] Menu can be closed by:
  - [ ] Tapping X button
  - [ ] Pressing Escape key
  - [ ] Tapping outside menu (backdrop)
- [ ] Focus trapped inside menu when open
- [ ] Current page highlighted in menu
- [ ] Proper ARIA attributes (aria-expanded, aria-label)

---

## General Checks

### No Breaking Changes
- [ ] Login flow still works
- [ ] Clock in/out still works
- [ ] Shift history displays correctly
- [ ] Profile edit saves properly
- [ ] PDF export generates file
- [ ] Language toggle (HE/EN) still works

### Performance
- [ ] No visible lag on interactions
- [ ] Animations smooth (60fps)
- [ ] Page loads quickly

### Console
- [ ] No JavaScript errors in console
- [ ] No failed network requests (except Supabase if not configured)

---

## Sign-off

**Tester Name:** ________________

**Date:** ________________

**Browser/Device:** ________________

**All tests passed:** [ ] Yes  [ ] No

**Notes:**
```




```
