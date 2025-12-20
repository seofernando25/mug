# MUG Design Guidelines

This document outlines the design principles, color palette, typography, and UI patterns used in the MUG project. Adhering to these guidelines ensures a consistent and polished user experience across the application.

## Core Principles

*   **Dark & Immersive:** The interface is predominantly dark (`gray-900`) to reduce eye strain and make colorful elements pop, suitable for a game environment.
*   **High Contrast & Vibrancy:** Key actions and distinct modes use vibrant neon colors (Purple, Cyan, Pink, Yellow) against the dark background.
*   **Motion & Feedback:** Interactive elements should provide immediate visual feedback (scaling, brightness, hover gradients). Transitions should be smooth (`fly`, `fade`).
*   **Typography-Driven:** Heavy reliance on bold, uppercase, and tracking adjustments to convey hierarchy and style, rather than heavy iconography.

## Color System

The project uses **Tailwind CSS v4** default colors with specific semantic assignments.

### Backgrounds
*   **Main Background:** `bg-gray-900` (Deep dark blue/gray)
*   **Panels/Cards:** `bg-gray-800` or `bg-gray-900/80` with `backdrop-blur-sm`.
*   **Overlays:** `bg-black/50` or `bg-gray-900/80`.

### Accents & Semantic Colors
*   **Primary Brand:** Gradient `from-purple-400 to-cyan-400`.
*   **Primary Action (Join, Play):** `bg-purple-400` or Gradient `from-pink-600 to-purple-600`.
*   **Secondary Action (Multiplayer, Register):** `text-cyan-400`.
*   **Editor/Creation:** `text-yellow-400`.
*   **Links/Info:** `text-teal-400`.
*   **Destructive/Back/Logout:** `text-red-400` or `text-red-500`.
*   **Muted Text:** `text-gray-400` or `text-gray-500`.

### Gradients
*   **Logo Text:** `bg-clip-text text-transparent bg-gradient-to-br from-purple-400 to-cyan-400`.
*   **Play Button:** `bg-gradient-to-r from-pink-600 to-purple-600`.
*   **Fade Overlays:** `bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent`.

## Typography

*   **Font Family:** Default Sans (`font-sans`).
*   **Brand Headings (Logo, Menu Items):** `font-black italic tracking-tighter`.
*   **Section Headings:** `text-3xl font-bold` or `text-xl font-bold` (often uppercase).
*   **Labels/Subtitles:** `text-sm` or `text-xs`, `uppercase`, `tracking-widest`, `font-bold`.
*   **Body Text:** `text-gray-300` or `text-white`.

## Layout & Components

### App Shell & Navigation
*   **Bottom Bar:** A fixed `BottomBar` component is used for global navigation and status.
*   **Content Area:** Main content usually fills the viewport minus the bottom bar (`pb-24` or similar).

### Buttons
*   **Primary Button:** Solid vibrant color (Purple/Pink gradient), rounded corners (`rounded`, `rounded-lg`, or `rounded-xl` for big buttons), shadow effects.
    *   *Hover:* `hover:scale-105`, brightness increase.
*   **Secondary/Ghost Button:** Transparent background, colored text (`text-gray-400`, `text-red-400`), hover background tint (`hover:bg-gray-800`).
*   **Link Button:** Underlined or colored text without background.

### Cards & Panels
*   **Song Selection:** Split view.
    *   **Left (40%):** Song Details (`SongDetailPanel`).
    *   **Right (60%):** Song Wheel (`SongWheel`).
*   **Borders:** Subtle borders `border-gray-700` or `border-white/10` are used to define edges in dark mode.

## Implementation Examples

### Standard Page Container
```svelte
<div class="fixed inset-0 flex overflow-hidden bg-gray-900 text-white font-sans select-none">
  <!-- Background Elements -->
  
  <!-- Content -->
  <div class="relative z-10 w-full h-full pb-24">
    <!-- Page Content -->
  </div>

  <!-- Bottom Bar -->
  <BottomBar>...</BottomBar>
</div>
```

### Main Header Text
```html
<h1 class="text-9xl font-black italic tracking-tighter text-white drop-shadow-2xl">
  MUG<span class="text-transparent bg-clip-text bg-linear-to-br from-purple-400 to-cyan-400">.</span>
</h1>
```

### Action Button
```html
<button class="px-6 py-3 rounded-lg font-bold bg-purple-400 text-white hover:bg-purple-500 transition">
  ACTION
</button>
```
