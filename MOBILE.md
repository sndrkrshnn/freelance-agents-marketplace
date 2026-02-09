# Mobile Optimization Guide

This guide covers all the mobile-specific optimizations implemented in the Freelance AI Agents Marketplace.

## Table of Contents

- [Overview](#overview)
- [Responsive Design](#responsive-design)
- [Touch Interactions](#touch-interactions)
- [Performance Optimization](#performance-optimization)
- [PWA Mobile Features](#pwa-mobile-features)
- [Testing](#testing)
- [Best Practices](#best-practices)

## Overview

The application is optimized for mobile devices with:

- ✅ Responsive layouts for all screen sizes
- ✅ Touch-friendly interactive elements
- ✅ Fast load times on 3G networks
- ✅ Optimized images and assets
- ✅ Safe area support for notched devices
- ✅ Gesture support (swipe, pull-to-refresh)
- ✅ Smooth animations (60fps)

## Responsive Design

### Breakpoints

```css
/* Extra small phones */
@media (min-width: 320px) { ... }  /* xs */

/* Phones */
@media (min-width: 640px) { ... }  /* sm */

/* Tablets */
@media (min-width: 768px) { ... }  /* md */

/* Desktops */
@media (min-width: 1024px) { ... } /* lg */

/* Large desktops */
@media (min-width: 1280px) { ... } /* xl */
```

### Tailwind Classes

```html
<!-- Responsive layouts -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
</div>

<!-- Responsive text -->
<h1 class="text-2xl md:text-3xl lg:text-4xl">
  Heading
</h1>

<!-- Responsive spacing -->
<div class="p-4 md:p-6 lg:p-8">
  Content
</div>
```

### Utility Classes

```html
<!-- Responsive text helpers -->
<p class="text-responsive-xs">Small text</p>
<p class="text-responsive-sm">Medium text</p>
<p class="text-responsive-lg">Large text</p>

<!-- Full viewport height (with dvh for mobile) -->
<div class="h-screen-full">
  Full height content
</div>
```

## Touch Interactions

### Minimum Touch Targets

All interactive elements should have minimum 48x48px touch targets:

```html
<!-- Recommended -->
<button class="touch-target">
  Click me
</button>

<!-- Tailwind equivalent -->
<button class="min-h-[48px] min-w-[48px]">
  Click me
</button>
```

### Touch Feedback

Visual feedback on touch:

```css
.button-press {
  @apply active:scale-95 active:bg-opacity-80 transition-transform duration-100;
}
```

### Prevent Zoom on Input

Disable zoom on input focus:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

### Touch Action Properties

```css
/* Faster tap response */
button, a, input {
  touch-action: manipulation;
  -webkit-tap-highlight-color: rgba(99, 102, 241, 0.1);
}
```

### Swipe Gestures

Example swipe implementation:

```tsx
import { useState, useRef, useEffect } from 'react'

function Swipeable({ onSwipeLeft, onSwipeRight, children }) {
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft()
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight()
    }
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {children}
    </div>
  )
}
```

## Performance Optimization

### Image Optimization

#### WebP Format

Use WebP for better compression:

```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description" loading="lazy">
</picture>
```

#### Lazy Loading

```html
<img src="image.jpg" loading="lazy" alt="Description" />
```

#### Responsive Images

```html
<img
  srcset="image-320w.jpg 320w,
          image-480w.jpg 480w,
          image-768w.jpg 768w"
  sizes="(max-width: 320px) 280px,
         (max-width: 480px) 440px,
         768px"
  src="image-768w.jpg"
  alt="Description"
/>
```

### Code Splitting

Route-based code splitting:

```tsx
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Suspense>
  )
}
```

### Optimized Animations

Use CSS transforms for smooth animations:

```css
/* Good - uses GPU acceleration */
.animated {
  transform: translateX(100px);
  animation: slideIn 0.3s ease-out;
}

/* Avoid - causes reflows */
.bad-animated {
  left: 100px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Reduce Layout Shift

```css
/* Skeleton loading */
.skeleton {
  animation: skeleton-loading 1.5s infinite ease-in-out;
  background: linear-gradient(
    90deg,
    #f0f0f0 0%,
    #e0e0e0 50%,
    #f0f0f0 100%
  );
}

@keyframes skeleton-loading {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### Font Optimization

Use system fonts as fallback:

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
               'Roboto', 'Helvetica Neue', Arial, sans-serif;
}
```

Or preload critical fonts:

```html
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
```

## PWA Mobile Features

### App Installation

#### Android (Chrome)

Users can install by:
- Tapping the "Add to Home screen" prompt
- Browser menu → "Add to Home screen"

#### iOS (Safari)

Users can install by:
- Tapping the "Share" button → "Add to Home Screen"

### Safe Area Insets

Support for notched devices (iPhone X+):

```css
/* Utilities in index.css */
.safe-area-top { padding-top: max(env(safe-area-inset-top), 1rem); }
.safe-area-bottom { padding-bottom: max(env(safe-area-inset-bottom), 1rem); }
.safe-area-left { padding-left: max(env(safe-area-inset-left), 1rem); }
.safe-area-right { padding-right: max(env(safe-area-inset-right), 1rem); }
```

Usage:

```tsx
<header className="safe-area-top bg-white">
  Header content
</header>

<footer className="safe-area-bottom bg-white">
  Footer content
</footer>
```

### Full Screen Mode

PWA runs in standalone mode:

```css
/* Adjust UI for standalone mode */
@media (display-mode: standalone) {
  body {
    /* Adjust for no browser chrome */
  }
}
```

### Dynamic Viewport Height

Use `dvh` for correct height on mobile browsers:

```css
.hero-section {
  height: 100dvh; /* Dynamic viewport height */
}
```

## Testing

### Emulator Testing

#### Chrome DevTools

1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select device from dropdown
4. Test responsiveness and touch

#### BrowserStack

Test on real devices:
```bash
npm run test:e2e:mobile
```

### Performance Testing

#### Lighthouse

Run mobile performance audit:

```bash
npm run lighthouse
```

Target scores:
- Performance: 90+
- Best Practices: 90+
- PWA: 100
- Accessibility: 90+

#### Network Throttling

Test on slow connections:

1. Chrome DevTools → Network tab
2. Select "Fast 3G" or "Slow 3G"
3. Verify app loads within 3 seconds

### Touch Testing

Test touch interactions on mobile:

1. Test all buttons and links
2. Verify touch targets are ≥48x48px
3. Test swipe gestures
4. Test pull-to-refresh
5. Test scroll performance

## Best Practices

### 1. Mobile-First CSS

```css
/* Start with mobile styles, then add breakpoints */
.button {
  /* Mobile default */
  padding: 12px 16px;
  font-size: 16px;
}

@media (min-width: 768px) {
  .button {
    /* Tablet and up */
    padding: 8px 12px;
    font-size: 14px;
  }
}
```

### 2. Input Fields

```html
<!-- Use appropriate input types -->
<input type="tel" placeholder="Phone number" />   <!-- Numeric keypad -->
<input type="email" placeholder="Email" />         <!-- Email keyboard -->
<input type="number" placeholder="Amount" />        <!-- Number keypad -->
<input type="url" placeholder="Website" />          <!-- URL keyboard -->
```

### 3. Hide Scrollbar

Keep UI clean on mobile:

```html
<div class="overflow-x-auto scrollbar-hide">
  <!-- Scrollable content -->
</div>
```

### 4. Pull-to-Refresh

Native pull-to-refresh can interfere with custom gestures. Disable if needed:

```css
/* Disable pull-to-refresh */
html, body {
  overscroll-behavior-y: contain;
}
```

### 5. Viewport Meta Tag

```html
<meta name="viewport" 
  content="width=device-width, 
          initial-scale=1.0, 
          maximum-scale=1.0, 
          user-scalable=no">
```

### 6. Click vs Tap

Touch events have delay. Use `touch-action: manipulation` for faster response:

```css
.fast-tap {
  touch-action: manipulation;
}
```

### 7. Fixed Positioning

Be careful with fixed positioning on mobile (virtual keyboard issues):

```css
/* Better to use sticky over fixed */
.header {
  position: sticky;
  top: 0;
}
```

### 8. Loading States

Show loading states immediately:

```tsx
function ButtonWithLoading({ loading, children, ...props }) {
  return (
    <button {...props} disabled={loading || props.disabled}>
      {loading ? <Spinner /> : children}
    </button>
  )
}
```

## Mobile Components Library

### Bottom Navigation

```tsx
function BottomNavigation({ items }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white safe-area-bottom border-t">
      <div className="flex justify-around py-2">
        {items.map(item => (
          <a key={item.href} href={item.href} className="touch-target flex flex-col items-center">
            <item.icon className="w-6 h-6" />
            <span className="text-xs">{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  )
}
```

### Slide-Over Menu

```tsx
function SlideOverMenu({ isOpen, onClose, children }) {
  return (
    <>
      {isOpen && (
        <div className="backdrop visible" onClick={onClose} />
      )}
      <div className={`mobile-drawer ${isOpen ? 'open' : 'closed'}`}>
        {children}
      </div>
    </>
  )
}
```

### Pull-to-Refresh

```tsx
function PullToRefresh({ onRefresh }) {
  const [pulling, setPulling] = useState(false)
  const startY = useRef(0)
  const currentY = useRef(0)

  const onTouchStart = (e) => {
    startY.current = e.touches[0].clientY
  }

  const onTouchMove = (e) => {
    currentY.current = e.touches[0].clientY
    const distance = currentY.current - startY.current
    
    if (distance > 50 && window.scrollY === 0) {
      setPulling(true)
    }
  }

  const onTouchEnd = () => {
    if (pulling) {
      onRefresh()
      setPulling(false)
    }
  }

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {pulling && <div className="pull-indicator">Release to refresh</div>}
      {/* Content */}
    </div>
  )
}
```

## Accessibility on Mobile

### Minimum Tap Size

```css
/* WCAG 2.1 AA compliant */
button, a, input {
  min-height: 44px;
  min-width: 44px;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast Mode

```css
@media (prefers-contrast: high) {
  body {
    background: white;
    color: black;
  }
}
```

## Browser Support Matrix

| Feature | iOS Safari | Chrome Android | Safari Desktop | Chrome Desktop |
|---------|------------|----------------|----------------|----------------|
| Service Worker | ✅ iOS 11.3+ | ✅ | ✅ | ✅ |
| Push API | ❌ | ✅ | ❌* | ✅ |
| Web App Manifest | ✅ iOS 11.3+ | ✅ | ✅ | ✅ |
| Safe Area Insets | ✅ iOS 11+ | ✅ | ❌ | ❌ |
| dvh Unit | ✅ iOS 16+ | ✅ Chrome 108+ | ✅ Safari 16+ | ✅ Chrome 108+ |
| Pull-to-Refresh | ⚠️ Native | ✅ | ⚠️ Native | ⚠️ Native |

*Safari supports push notifications on macOS, not iOS.

## Resources

- [Mobile Best Practices](https://web.dev/mobile/)
- [Web.dev Mobile](https://web.dev/mobile/)
- [PWA Best Practices](https://web.dev/pwa/)
- [Responsive Design Patterns](https://web.dev/responsive-web-design-basics/)
- [Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
