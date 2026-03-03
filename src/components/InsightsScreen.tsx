import React, { useState, useEffect, useCallback } from 'react';
import { useDiscipline } from '../context/DisciplineContext';
import { getUsageData, UsageData } from '../utils/NativeBridge';
import { Label } from './UI/Label';
import { motion } from 'framer-motion';

interface InsightsScreenProps {
    Maps: (screenId: string) => void;
}

const formatTime = (mins: number): string => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

export const InsightsScreen: React.FC<InsightsScreenProps> = ({ Maps }) => {
    const { hoursSaved, currentDay, dailyBudget, usedMinutes } = useDiscipline();
    const [usageData, setUsageData] = useState<UsageData>({
        timeUsedMinutes: 0,
        dailyBudget: 60,
        urgesResisted: 0,
    });

    // Memoize the fetch function so we can call it from multiple places
    const fetchData = useCallback(async () => {
        try {
            const data = await getUsageData();
            setUsageData(data);
            console.log('[InsightsScreen] Fetched usage data:', data);
        } catch (e) {
            console.error('[InsightsScreen] Failed to load usage data:', e);
        }
    }, []);

    // Fetch on mount
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // FIX #2: Re-fetch when app comes back to foreground (user swipes back from Chrome)
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                console.log('[InsightsScreen] App resumed — re-fetching data');
                fetchData();
            }
        };

        // Also re-fetch on window focus (backup for visibility API)
        const handleFocus = () => {
            console.log('[InsightsScreen] Window focused — re-fetching data');
            fetchData();
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('focus', handleFocus);
        };
    }, [fetchData]);

    // Also auto-refresh every 10 seconds while the screen is active
    useEffect(() => {
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Use React context values (proven correct) — Kotlin only provides timeUsedMinutes
    const todayMinutes = usedMinutes;
    const budgetRemaining = Math.max(0, dailyBudget - todayMinutes);

    // Show today's bar in the day-of-week chart
    const dayIndex = new Date().getDay(); // 0=Sun, 1=Mon...
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const bars = dayLabels.map((day, i) => ({
        day,
        mins: i === dayIndex ? todayMinutes : 0,
    }));
    const maxMins = Math.max(todayMinutes, 1);

    return (
        <div style={{ padding: "54px 24px 24px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0, paddingBottom: "120px" }}>
            <div style={{ marginBottom: 28 }}>
                <Label>Today's Report</Label>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 4, lineHeight: 1.1, color: "var(--white)", fontFamily: "Syne" }}>
                    USED: {formatTime(todayMinutes)}
                </h1>
            </div>

            {/* Bar chart */}
            <div style={{
                background: "var(--gray-800)", borderRadius: "var(--radius-lg)",
                padding: "20px 16px 16px",
                border: "1px solid var(--gray-700)", marginBottom: 16,
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <Label>Daily Usage (mins)</Label>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--gray-400)", background: "var(--gray-900)", padding: "3px 8px", borderRadius: 20 }}>
                        Day {currentDay}/30
                    </span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
                    {bars.map((b, i) => (
                        <div key={dayLabels[i]} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${(b.mins / maxMins) * 72}px` }}
                                style={{
                                    width: "100%",
                                    background: i === dayIndex ? "var(--gold)" : "var(--gray-700)",
                                    borderRadius: "4px 4px 0 0",
                                    minHeight: b.mins > 0 ? 4 : 0,
                                }} />
                            <Label style={{ fontSize: 9, color: i === dayIndex ? "var(--gold)" : undefined }}>{b.day}</Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats grid */}
            <div style={{
                background: "var(--gray-800)", borderRadius: "var(--radius)",
                padding: "16px", border: "1px solid var(--gray-700)", marginBottom: 16,
            }}>
                <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "var(--white)" }}>{usageData.urgesResisted}</div>
                        <Label style={{ marginTop: 2 }}>Urges Resisted</Label>
                    </div>
                    <div style={{ width: 1, height: 40, background: "var(--gray-700)" }} />
                    <div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "var(--white)" }}>{hoursSaved}h</div>
                        <Label style={{ marginTop: 2 }}>Time Saved</Label>
                    </div>
                </div>
                <div style={{ height: 1, background: "var(--gray-700)", margin: "16px 0" }} />
                <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ flex: 1, background: "var(--gray-900)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-800)" }}>
                        <Label style={{ marginBottom: 4 }}>Budget Remaining</Label>
                        <div style={{ fontSize: 16, fontWeight: 700, color: budgetRemaining > 0 ? "var(--gold)" : "var(--gray-500)" }}>{formatTime(budgetRemaining)}</div>
                    </div>
                    <div style={{ flex: 1, background: "var(--gray-900)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-800)" }}>
                        <Label style={{ marginBottom: 4 }}>Daily Budget</Label>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--white)" }}>{formatTime(dailyBudget)}</div>
                    </div>
                </div>
            </div>

            {/* Progress indicator */}
            <div style={{
                background: "var(--gray-800)", borderRadius: "var(--radius)",
                padding: "16px", border: "1px solid var(--gray-700)", flex: 1,
            }}>
                <Label style={{ display: "block", marginBottom: 12 }}>Today's Progress</Label>
                <div style={{ height: 6, background: "var(--gray-700)", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
                    <div style={{
                        height: "100%",
                        width: `${Math.min(100, (todayMinutes / dailyBudget) * 100)}%`,
                        background: todayMinutes <= dailyBudget * 0.5 ? "var(--gold)"
                            : todayMinutes <= dailyBudget ? "#a0a0a0" : "#ff4444",
                        borderRadius: 3,
                        transition: "width 0.5s ease",
                    }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Label style={{ fontSize: 9 }}>0m</Label>
                    <Label style={{ fontSize: 9, color: todayMinutes <= dailyBudget ? "var(--gold)" : "var(--gray-500)" }}>
                        {todayMinutes <= dailyBudget
                            ? `${formatTime(budgetRemaining)} remaining`
                            : `${formatTime(todayMinutes - dailyBudget)} over budget`}
                    </Label>
                    <Label style={{ fontSize: 9 }}>{formatTime(dailyBudget)}</Label>
                </div>
            </div>
        </div>
    );
};
