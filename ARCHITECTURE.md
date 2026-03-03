# Architecture

## System Overview

30 Days Discipline is a hybrid mobile app that combines a React TypeScript frontend with native Android Kotlin services, bridged by Capacitor 8.

```mermaid
graph TB
    subgraph "React Layer"
        A[App.tsx<br/>Router + Overlay]
        B[DisciplineContext<br/>Global State]
        C[HomeScreen<br/>Launcher Grid]
        D[InsightsScreen<br/>Usage Analytics]
        E[StreakScreen<br/>Streak Tracker]
        F[InterruptionScreen<br/>App Blocker]
        G[Onboarding<br/>Setup Wizard]
    end

    subgraph "Bridge Layer"
        H[Capacitor Preferences<br/>SharedPreferences API]
        I[NativeBridge.ts<br/>Plugin Interface]
    end

    subgraph "Kotlin Native Layer"
        J[NativeAppsPlugin.kt<br/>App Scanner + Usage API]
        K[AppInterceptorService.kt<br/>Accessibility Service]
        L[MainActivity.kt<br/>Capacitor Activity]
    end

    subgraph "Android OS"
        M[SharedPreferences<br/>Persistent Storage]
        N[Accessibility API<br/>Foreground Detection]
        O[PackageManager<br/>Installed Apps]
    end

    A --> B
    A --> C & D & E & F & G
    B <--> H
    C --> I
    F --> I
    G --> H
    I <--> J
    H <--> M
    J --> O
    J <--> M
    K --> N
    K <--> M
```

---

## Data Architecture

### State Management

```mermaid
graph LR
    subgraph "React State"
        A[DisciplineContext<br/>In-Memory State]
    end

    subgraph "Persistent Storage"
        B[Capacitor Preferences<br/>= SharedPreferences]
    end

    subgraph "Kotlin Services"
        C[AppInterceptorService<br/>Background Timer]
    end

    A -- "Preferences.set()" --> B
    B -- "Preferences.get()" --> A
    C -- "prefs.edit().putLong()" --> B
    B -- "prefs.getString()" --> C
```

### SharedPreferences Schema (ER Diagram)

```mermaid
erDiagram
    DISCIPLINE_STATE {
        int day "Current day (1-30)"
        int streak "Consecutive clean days"
        int currentLevel "Completed 30-day cycles"
        int usedMinutesToday "Minutes used today (React)"
        int customBudget "User's initial budget (minutes)"
        int shieldsLeft "Grace shields remaining"
        float timeSaved "Total hours saved"
        int violationCount "Rapid-open violations"
        timestamp lastActiveDate "Last active timestamp"
    }

    NATIVE_PREFERENCES {
        string monitored_apps "JSON array of package names"
        int daily_budget "Daily budget in minutes"
        long time_used_seconds "Seconds tracked by Kotlin"
        boolean overlay_triggered "Popup trigger flag"
        string overlay_package "Triggering app package"
        string intercept_milestone "none|first_open|half_budget|full_budget"
        boolean emergency_bypass_today "Bypass active today"
        long accessibility_heartbeat "Last heartbeat timestamp"
        boolean onboarding_complete "Onboarding finished"
    }

    DISCIPLINE_STATE ||--o{ NATIVE_PREFERENCES : "synced via Capacitor Preferences"
```

---

## Interception Flow

```mermaid
sequenceDiagram
    participant User
    participant AndroidOS as Android OS
    participant AIS as AppInterceptorService
    participant SP as SharedPreferences
    participant React as React App
    participant IS as InterruptionScreen

    User->>AndroidOS: Opens Instagram
    AndroidOS->>AIS: onAccessibilityEvent(TYPE_WINDOW_STATE_CHANGED)
    AIS->>SP: Read monitored_apps
    AIS->>AIS: Is "com.instagram.android" monitored?

    alt App IS monitored
        AIS->>SP: Read intercept_milestone, emergency_bypass_today
        
        alt Emergency bypass active
            AIS->>AIS: Skip — no popup today
        else Milestone threshold reached
            AIS->>SP: Write overlay_triggered=true, overlay_package
            AIS->>SP: Update intercept_milestone
        end

        AIS->>SP: Start/continue timing (time_used_seconds)
    end

    React->>SP: Poll overlay_triggered every 2s
    
    alt overlay_triggered = true
        React->>IS: Show InterruptionScreen
        IS->>User: Display meme + budget info

        alt User taps "Go Back"
            IS->>React: Navigate to Home
        else User taps "Emergency Bypass"
            IS->>SP: Set emergency_bypass_today=true
            IS->>React: Reset streak to 0
            IS->>AndroidOS: Launch app
        end

        React->>SP: Clear overlay_triggered
    end
```

---

## Day Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DayStart: App opened / midnight rollover

    DayStart --> Tracking: Reset daily counters
    note right of DayStart
        time_used_seconds = 0
        intercept_milestone = "none"
        emergency_bypass_today = false
    end note

    Tracking --> FirstOpenPopup: First monitored app opened
    FirstOpenPopup --> SilentTracking: User dismisses

    SilentTracking --> HalfBudgetPopup: used >= 50% of budget
    HalfBudgetPopup --> SilentTracking2: User dismisses

    SilentTracking2 --> FullBudgetPopup: used >= 100% of budget
    FullBudgetPopup --> Blocked: User goes back

    FullBudgetPopup --> EmergencyBypass: User taps bypass
    EmergencyBypass --> NoMorePopups: Streak = 0, bypass flag set

    Blocked --> DayEnd: Midnight
    NoMorePopups --> DayEnd: Midnight
    SilentTracking --> DayEnd: Midnight
    SilentTracking2 --> DayEnd: Midnight

    DayEnd --> StreakCheck
    StreakCheck --> StreakIncrement: Used <= budget
    StreakCheck --> StreakReset: Used > budget (no shield)
    StreakCheck --> ShieldUsed: Used <= 115% budget (shield available)

    StreakIncrement --> [*]
    StreakReset --> [*]
    ShieldUsed --> [*]
```

---

## Component Architecture

```mermaid
graph TD
    subgraph "App Shell"
        APP[App.tsx]
        NAV[BottomNavBar]
    end

    subgraph "Screens"
        HOME[HomeScreen]
        INS[InsightsScreen]
        STR[StreakScreen]
        PRO[ProgressScreen]
        INT[InterruptionScreen]
        CEL[CelebrationScreen]
        SET[SettingsScreen]
        MAN[ManageAppsScreen]
        ONB[Onboarding]
    end

    subgraph "Shared"
        CTX[DisciplineContext]
        NB[NativeBridge]
        AI[AppIcons]
        LBL[Label Component]
    end

    APP --> NAV
    APP --> HOME & INS & STR & PRO & INT & CEL & SET & MAN & ONB

    HOME --> CTX & NB & AI
    INS --> CTX & NB
    STR --> CTX
    PRO --> CTX
    INT --> CTX & NB
    SET --> CTX
    MAN --> NB
    ONB --> NB & CTX

    HOME & INS & STR & PRO --> LBL
```

---

## Phase Budget Calculation

```
Phase 1 (Days 1–10):  budget = customBudget × 1.0
Phase 2 (Days 11–20): budget = customBudget × 0.7
Phase 3 (Days 21–30): budget = customBudget × 0.4

Level scaling (after completing a 30-day cycle):
  Level 1: multiplier × 1.0
  Level 2: multiplier × 0.85
  Level 3+: multiplier × 0.7
```

---

## Technology Decisions

| Decision | Rationale |
|----------|-----------|
| **Capacitor over React Native** | Simpler bridge to native, familiar web stack, direct SharedPreferences access |
| **Accessibility Service** | Only Android API that can detect foreground app without root |
| **SharedPreferences as IPC** | Both Kotlin service and React/Capacitor can read/write the same data store |
| **Milestone-based interception** | Constant popups annoy users; 3 strategic interruptions balance friction and usability |
| **Framer Motion** | Production-grade animations with React integration, tiny bundle impact |
| **DM Mono + Syne fonts** | Monospace for data, geometric sans for headers — premium feel |
