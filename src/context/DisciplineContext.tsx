import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { checkAccessibilityStatus, getUsageData, resetDailyUsage } from '../utils/NativeBridge';
import { Preferences } from '@capacitor/preferences';

interface DisciplineContextType {
    // State
    currentDay: number;
    currentLevel: number;
    usedMinutes: number;
    streakDays: number;
    hoursSaved: number;
    urgesResisted: number;
    trackedApps: string[];
    isOnboardingComplete: boolean;
    hasPermissions: boolean;
    clockTrustLevel: 'TRUSTED' | 'FROZEN';
    rapidOpenCount: number;
    lastOpenTimestamp: number;
    customBudget: number | null;

    // Derived
    phase: number;
    dailyBudget: number;
    phaseName: string;

    // UI/Interruption State
    interceptedApp: { name: string; icon: string; packageName?: string } | null;
    showLimitMeme: boolean;
    violationCount: number;
    showCelebration: boolean;
    shieldsLeft: number;

    // Actions
    addUsage: (mins: number) => void;
    completeOnboarding: (budget: number, apps: string[]) => void;
    incrementUrges: () => void;
    setHasPermissions: (status: boolean) => void;
    toggleTrackedApp: (packageName: string) => void;
    setInterceptedApp: (app: { name: string; icon: string; packageName?: string } | null) => void;
    triggerLimitMeme: () => void;
    resolveLimitMeme: () => void;
    evaluateSocialTap: () => 'meme' | 'interruption';
    setStateOverride: (updater: (prev: any) => any) => void;
    simulateDayEnd: () => void;
    dismissCelebration: () => void;
    isLoaded: boolean;
}

// FIX #3 (previous): Budget ramps down across phases.
const getDailyBudget = (level: number, phaseNum: number, customBudget: number | null) => {
    if (customBudget) {
        if (phaseNum === 1) return customBudget;
        if (phaseNum === 2) return Math.max(10, Math.floor(customBudget * 0.5));
        return Math.max(5, Math.floor(customBudget * 0.25));
    }
    if (level === 1) return phaseNum === 1 ? 90 : phaseNum === 2 ? 45 : 20;
    if (level === 2) return phaseNum === 1 ? 45 : phaseNum === 2 ? 20 : 12;
    return phaseNum === 1 ? 20 : phaseNum === 2 ? 10 : 5;
};

const DisciplineContext = createContext<DisciplineContextType | undefined>(undefined);

export const DisciplineProvider = ({ children }: { children: ReactNode }) => {
    const INITIAL_STATE = {
        day: 1,
        currentLevel: 1,
        streak: 0,
        timeSaved: 0,
        urges: 0,
        trackedApps: [],
        lastActiveDate: Date.now(),
        usedMinutesToday: 0,
        onboardingComplete: false,
        violationCount: 0,
        clockTrustLevel: 'TRUSTED' as 'TRUSTED' | 'FROZEN',
        rapidOpenCount: 0,
        lastOpenTimestamp: 0,
        customBudget: null as number | null,
        shieldsLeft: 1,
    };

    const [state, setState] = useState<any>(INITIAL_STATE);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load State from Preferences
    useEffect(() => {
        const loadState = async () => {
            try {
                const { value } = await Preferences.get({ key: 'DISCIPLINE_STATE' });
                let loaded = value ? JSON.parse(value) : { ...INITIAL_STATE };

                // Ensure shieldsLeft exists for older state objects
                if (loaded.shieldsLeft === undefined) loaded.shieldsLeft = 1;

                // ALWAYS sync customBudget from the daily_budget Preference
                // This is the source of truth — DISCIPLINE_STATE cache may be stale
                const { value: budgetVal } = await Preferences.get({ key: 'daily_budget' });
                if (budgetVal) {
                    loaded.customBudget = Number.parseInt(budgetVal, 10);
                }

                setState(loaded);
            } catch (e) {
                console.error('Failed to load state from preferences', e);
            } finally {
                setIsLoaded(true);
            }
        };
        loadState();
    }, []);

    // Save State to Preferences
    useEffect(() => {
        if (!isLoaded) return;
        const saveState = async () => {
            await Preferences.set({
                key: 'DISCIPLINE_STATE',
                value: JSON.stringify(state)
            });
        };
        saveState();
    }, [state, isLoaded]);

    // FIX #1: Sync usedMinutesToday from Kotlin _cap_time_used_seconds every 5 seconds.
    // This bridges the gap between the native stopwatch and the React state.
    useEffect(() => {
        if (!isLoaded) return;

        const syncUsage = async () => {
            try {
                const data = await getUsageData();
                const kotlinMinutes = data.timeUsedMinutes;
                setState((prev: any) => {
                    if (prev.usedMinutesToday !== kotlinMinutes) {
                        return { ...prev, usedMinutesToday: kotlinMinutes };
                    }
                    return prev; // no change, avoid re-render
                });
            } catch (e) {
                // Silent — sync failure should never crash
            }
        };

        syncUsage(); // initial sync
        const interval = setInterval(syncUsage, 5000);
        return () => clearInterval(interval);
    }, [isLoaded]);

    useEffect(() => {
        const checkStatus = async () => {
            const isActive = await checkAccessibilityStatus();
            if (isActive !== state.hasPermissions) {
                setState((prev: any) => ({ ...prev, hasPermissions: isActive }));
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 2000);
        return () => clearInterval(interval);
    }, [state.hasPermissions]);

    useEffect(() => {
        const interval = setInterval(() => {
            setState((prev: any) => {
                const now = Date.now();
                const prevState = { ...prev };

                // Edge Case 1: Midnight Cheat (Clock manipulation)
                if (now < prevState.lastActiveDate - 60000) {
                    prevState.clockTrustLevel = 'FROZEN';
                    prevState.lastActiveDate = now;
                } else {
                    prevState.lastActiveDate = now;
                }

                // Day Rollover Logic
                const todayMidnight = new Date(now).setHours(0, 0, 0, 0);
                const lastActiveMidnight = new Date(prev.lastActiveDate).setHours(0, 0, 0, 0);

                if (todayMidnight > lastActiveMidnight) {
                    const prevPhase = prev.day <= 10 ? 1 : prev.day <= 20 ? 2 : 3;
                    const prevDailyBudget = getDailyBudget(prev.currentLevel, prevPhase, prev.customBudget);

                    if (!prev.hasPermissions || prev.clockTrustLevel === 'FROZEN') {
                        // Streak paused — don't count the day
                    } else if (prev.usedMinutesToday <= prevDailyBudget) {
                        // Within budget — streak continues
                        prevState.streak += 1;
                    } else {
                        // FIX #5: Shield / grace zone logic
                        // Grace zone = 15% above budget. If within grace and shields available, auto-apply.
                        const graceLimit = Math.ceil(prevDailyBudget * 1.15);
                        if (prev.usedMinutesToday <= graceLimit && prev.shieldsLeft > 0) {
                            // Shield auto-applied — streak survives
                            prevState.shieldsLeft = prev.shieldsLeft - 1;
                            prevState.streak += 1;
                            console.log(`Shield auto-applied. Remaining: ${prevState.shieldsLeft}`);
                        } else {
                            // Over budget, no shield — streak resets
                            prevState.streak = 0;
                        }
                    }

                    prevState.day += 1;

                    // Celebration trigger on Day 30 completion
                    if (prevState.day > 30) {
                        prevState.day = 1;
                        prevState.currentLevel += 1;
                        prevState.shieldsLeft = 1; // Reset shield for new level
                        if (prevState.streak >= 30) {
                            prevState.showCelebration = true;
                        }
                    }

                    // Accumulate Time Saved (compared to budget, not fake baseline)
                    const prevDailyBudgetForSavings = getDailyBudget(prev.currentLevel, prevPhase, prev.customBudget);
                    const todaySavingsMinutes = Math.max(0, prevDailyBudgetForSavings - prev.usedMinutesToday);
                    prevState.timeSaved += Math.floor(todaySavingsMinutes / 60);

                    // Reset daily metrics
                    prevState.usedMinutesToday = 0;
                    prevState.violationCount = 0;

                    // Reset Kotlin daily usage + milestone/bypass flags
                    resetDailyUsage().catch(e =>
                        console.error('Failed to reset daily usage in native:', e)
                    );
                    Preferences.set({ key: 'intercept_milestone', value: 'none' });
                    Preferences.set({ key: 'emergency_bypass_today', value: 'false' });
                    Preferences.set({ key: 'time_used_seconds', value: '0' });
                }
                return prevState;
            });
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const [interceptedApp, setInterceptedApp] = useState<{ name: string; icon: string; packageName?: string } | null>(null);
    const [showLimitMeme, setShowLimitMeme] = useState(false);

    // Derived Values
    const phase = state.day <= 10 ? 1 : state.day <= 20 ? 2 : 3;
    const dailyBudget = getDailyBudget(state.currentLevel, phase, state.customBudget);

    const getPhaseName = (p: number) => {
        if (p === 1) return "Awareness";
        if (p === 2) return "Reduction";
        return "Liberation";
    };

    // Time saved = only accumulated savings from completed days (no fake baseline)
    const totalHoursSaved = state.timeSaved || 0;

    const value: DisciplineContextType = {
        currentDay: state.day,
        currentLevel: state.currentLevel,
        usedMinutes: state.usedMinutesToday,
        streakDays: state.streak,
        hoursSaved: totalHoursSaved,
        urgesResisted: state.urges,
        trackedApps: state.trackedApps,
        isOnboardingComplete: state.onboardingComplete,
        hasPermissions: state.hasPermissions,
        clockTrustLevel: state.clockTrustLevel,
        rapidOpenCount: state.rapidOpenCount,
        lastOpenTimestamp: state.lastOpenTimestamp,
        customBudget: state.customBudget,
        phase,
        dailyBudget,
        phaseName: getPhaseName(phase),
        interceptedApp,
        showLimitMeme,
        violationCount: state.violationCount,
        showCelebration: !!state.showCelebration,
        shieldsLeft: state.shieldsLeft ?? 1,
        isLoaded,

        addUsage: (mins: number) => setState((prev: any) => ({ ...prev, usedMinutesToday: prev.usedMinutesToday + mins })),
        completeOnboarding: (budget: number, apps: string[]) => {
            // Update React state
            setState((prev: any) => ({
                ...prev,
                onboardingComplete: true,
                customBudget: budget,
                trackedApps: apps,
                usedMinutesToday: 0,
            }));
            // Also write to Preferences for Kotlin native side
            Preferences.set({ key: 'daily_budget', value: budget.toString() });
            Preferences.set({ key: 'time_used_seconds', value: '0' });
        },
        incrementUrges: () => setState((prev: any) => ({ ...prev, urges: prev.urges + 1 })),
        setHasPermissions: (status: boolean) => setState((prev: any) => ({ ...prev, hasPermissions: status })),
        toggleTrackedApp: (packageName: string) => setState((prev: any) => {
            const isTracked = prev.trackedApps.includes(packageName);
            return {
                ...prev,
                trackedApps: isTracked
                    ? prev.trackedApps.filter((a: string) => a !== packageName)
                    : [...prev.trackedApps, packageName]
            };
        }),
        setInterceptedApp,
        triggerLimitMeme: () => setShowLimitMeme(true),
        resolveLimitMeme: () => {
            setState((prev: any) => ({ ...prev, violationCount: prev.violationCount + 1 }));
            setShowLimitMeme(false);
            setInterceptedApp(null);
        },
        evaluateSocialTap: () => {
            let action: 'meme' | 'interruption' = 'interruption';
            const now = Date.now();

            setState((prev: any) => {
                const nextState = { ...prev };
                const isRapid = now - prev.lastOpenTimestamp < 5 * 60 * 1000;

                if (isRapid) {
                    nextState.rapidOpenCount += 1;
                } else {
                    nextState.rapidOpenCount = 1;
                }
                nextState.lastOpenTimestamp = now;

                if (nextState.rapidOpenCount >= 3) {
                    nextState.violationCount = Math.max(nextState.violationCount, 4);
                    setShowLimitMeme(true);
                    action = 'meme';
                }

                return nextState;
            });
            return action;
        },
        setStateOverride: (updater: (prev: any) => any) => {
            setState(updater);
        },
        dismissCelebration: () => {
            setState((prev: any) => ({ ...prev, showCelebration: false }));
        },
        simulateDayEnd: () => {
            setState((prev: any) => {
                const prevState = { ...prev };
                const prevPhase = prev.day <= 10 ? 1 : prev.day <= 20 ? 2 : 3;
                const prevDailyBudget = getDailyBudget(prev.currentLevel, prevPhase, prev.customBudget);

                if (!prev.hasPermissions || prev.clockTrustLevel === 'FROZEN') {
                    // Streak paused
                } else if (prev.usedMinutesToday <= prevDailyBudget) {
                    prevState.streak += 1;
                } else {
                    const graceLimit = Math.ceil(prevDailyBudget * 1.15);
                    if (prev.usedMinutesToday <= graceLimit && prev.shieldsLeft > 0) {
                        prevState.shieldsLeft = prev.shieldsLeft - 1;
                        prevState.streak += 1;
                    } else {
                        prevState.streak = 0;
                    }
                }

                prevState.day += 1;
                if (prevState.day > 30) {
                    prevState.day = 1;
                    prevState.currentLevel += 1;
                    prevState.shieldsLeft = 1;
                    if (prevState.streak >= 30) {
                        prevState.showCelebration = true;
                    }
                }

                const prevPhaseForSavings = prev.day <= 10 ? 1 : prev.day <= 20 ? 2 : 3;
                const budgetForSavings = getDailyBudget(prev.currentLevel, prevPhaseForSavings, prev.customBudget);
                const todaySavingsMinutes = Math.max(0, budgetForSavings - prev.usedMinutesToday);
                prevState.timeSaved += Math.floor(todaySavingsMinutes / 60);

                prevState.usedMinutesToday = 0;
                prevState.violationCount = 0;
                prevState.lastActiveDate = Date.now();

                // Reset Kotlin daily usage + milestone/bypass flags
                resetDailyUsage().catch(e =>
                    console.error('Failed to reset daily usage in native:', e)
                );
                Preferences.set({ key: 'intercept_milestone', value: 'none' });
                Preferences.set({ key: 'emergency_bypass_today', value: 'false' });
                Preferences.set({ key: 'time_used_seconds', value: '0' });

                return prevState;
            });
        }
    };

    return (
        <DisciplineContext.Provider value={value}>
            {isLoaded ? children : (
                <div style={{ background: '#000', height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ color: '#888', fontFamily: 'DM Mono', fontSize: '10px' }}>INITIALIZING_...</div>
                </div>
            )}
        </DisciplineContext.Provider>
    );
};

export const useDiscipline = () => {
    const context = useContext(DisciplineContext);
    if (context === undefined) {
        throw new Error('useDiscipline must be used within a DisciplineProvider');
    }
    return context;
};
