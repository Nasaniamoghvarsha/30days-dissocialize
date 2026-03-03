import { registerPlugin } from '@capacitor/core';

export interface NativeApp {
    name: string;
    packageName: string;
    isSocial?: boolean;
}

export interface UsageData {
    timeUsedMinutes: number;
    dailyBudget: number;
    urgesResisted: number;
}

export interface StreakData {
    streakDays: number;
    longestStreak: number;
    currentDay: number;
    shieldsLeft: number;
    hoursSaved: number;
}

// CRITICAL: This string must match @CapacitorPlugin(name = "NativeApps") exactly
export const NativeApps = registerPlugin<any>('NativeApps');

// ── App listing & launching ────────────────────────────────────────────────
export const getInstalledApps = async (): Promise<NativeApp[]> => {
    try {
        const result = await NativeApps.getInstalledApps();
        const apps = result?.apps ?? [];
        return (Array.isArray(apps) ? apps : []).sort((a: NativeApp, b: NativeApp) =>
            a.name.localeCompare(b.name)
        );
    } catch (e: any) {
        console.error('[NativeBridge] getInstalledApps failed:', e?.message, e?.stack);
        return [];
    }
};

export const launchApp = async (packageName: string): Promise<void> => {
    try {
        await NativeApps.launchApp({ packageName });
    } catch (e: any) {
        console.error('[NativeBridge] launchApp failed for', packageName, e?.message, e?.stack);
    }
};

// ── Usage data (reads from CapacitorStorage via NativeAppsPlugin) ──────────
export const getUsageData = async (): Promise<UsageData> => {
    try {
        const result = await NativeApps.getUsageData();
        return {
            timeUsedMinutes: result?.timeUsedMinutes ?? 0,
            dailyBudget: result?.dailyBudget ?? 60,
            urgesResisted: result?.urgesResisted ?? 0,
        };
    } catch (e: any) {
        console.error('[NativeBridge] getUsageData failed:', e?.message, e?.stack);
        return { timeUsedMinutes: 0, dailyBudget: 60, urgesResisted: 0 };
    }
};

export const resetDailyUsage = async (): Promise<void> => {
    try {
        await NativeApps.resetDailyUsage();
    } catch (e: any) {
        console.error('[NativeBridge] resetDailyUsage failed:', e?.message, e?.stack);
    }
};

// ── Streak data ────────────────────────────────────────────────────────────
export const getStreakData = async (): Promise<StreakData> => {
    try {
        const result = await NativeApps.getStreakData();
        return {
            streakDays: result?.streakDays ?? 0,
            longestStreak: result?.longestStreak ?? 0,
            currentDay: result?.currentDay ?? 1,
            shieldsLeft: result?.shieldsLeft ?? 1,
            hoursSaved: result?.hoursSaved ?? 0,
        };
    } catch (e: any) {
        console.error('[NativeBridge] getStreakData failed:', e?.message, e?.stack);
        return { streakDays: 0, longestStreak: 0, currentDay: 1, shieldsLeft: 1, hoursSaved: 0 };
    }
};

// ── Accessibility ──────────────────────────────────────────────────────────
export const checkAccessibilityStatus = async (): Promise<boolean> => {
    try {
        const result = await NativeApps.checkAccessibilityStatus();
        return !!result?.isActive;
    } catch (e: any) {
        console.error('[NativeBridge] checkAccessibilityStatus failed:', e?.message, e?.stack);
        return false;
    }
};

export const openAccessibilitySettings = async (): Promise<void> => {
    try {
        await NativeApps.openAccessibilitySettings();
    } catch (e: any) {
        console.error('[NativeBridge] openAccessibilitySettings failed:', e?.message, e?.stack);
    }
};

// ── Overlay polling ────────────────────────────────────────────────────────
export const getOverlayTrigger = async (): Promise<{
    triggered: boolean;
    packageName: string;
} | null> => {
    try {
        const result = await NativeApps.getOverlayTrigger();
        if (result?.triggered) return result;
        return null;
    } catch (e: any) {
        console.error('[NativeBridge] getOverlayTrigger failed:', e?.message, e?.stack);
        return null;
    }
};

export const clearOverlayTrigger = async (): Promise<void> => {
    try {
        await NativeApps.clearOverlayTrigger();
    } catch (e: any) {
        console.error('[NativeBridge] clearOverlayTrigger failed:', e?.message, e?.stack);
    }
};
