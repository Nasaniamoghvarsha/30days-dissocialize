# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-03-03

### Added
- **Smart Interception System** — milestone-based popups (first open, 50% budget, 100% budget)
- **Emergency Bypass** — access apps when needed, but streak resets to zero
- **30-Day Journey** — 3 phases of progressive budget reduction
- **Streak Tracking** — daily streak with milestone badges (7d, 14d, 21d, 30d)
- **Shield System** — 1 grace shield per 30-day cycle
- **Social Media Filtering** — onboarding prioritizes known social media apps
- **Real-Time Usage Tracking** — Kotlin Accessibility Service for background time tracking
- **Insights Dashboard** — daily usage report with budget visualization
- **Premium Animations** — Framer Motion throughout (budget bar, streak counter, app grid stagger, nav dot)
- **Custom Launcher** — 3×3 app grid with monitored/utility app sections
- **Random Memes** — motivational/roast quotes on each interception screen
- **Day Rollover** — automatic daily reset of usage, milestones, and bypass flags
- **Anti-Cheat** — clock tampering detection (streak paused if detected)

### Technical
- React 18 + TypeScript frontend
- Capacitor 8 native bridge
- Kotlin Accessibility Service for foreground detection
- SharedPreferences as IPC between React and Kotlin
- Vite 5 build tooling
- Framer Motion 11 animations
- Tailwind CSS + custom design tokens
