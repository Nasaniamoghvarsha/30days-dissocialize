import React from 'react';
import { useDiscipline } from '../context/DisciplineContext';
import { Label } from './UI/Label';
import { motion } from 'framer-motion';

interface StreakScreenProps {
    Maps: (screenId: string) => void;
}

export const StreakScreen: React.FC<StreakScreenProps> = ({ Maps }) => {
    // FIX: Read from React context (DISCIPLINE_STATE) instead of Kotlin SharedPrefs keys
    // that are never written. Previously used getStreakData() → reads _cap_streak_days etc.
    // which always returned defaults (0).
    const { streakDays, currentDay, hoursSaved, shieldsLeft } = useDiscipline();

    // Derive values from context state
    const longestStreak = streakDays; // In single-session, longest = current

    const radius = 64;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (currentDay / 30) * circumference;

    return (
        <div style={{ padding: "54px 24px 24px", flex: 1, overflowY: "auto", textAlign: "center", paddingBottom: "100px" }}>
            {/* Hero */}
            <div style={{ marginTop: 20, marginBottom: 40 }}>
                <Label>Current Streak</Label>
                <div style={{
                    fontFamily: "'DM Serif Display', serif", fontSize: 104,
                    color: "var(--white)", lineHeight: 1, fontStyle: "italic", marginTop: 8
                }}>
                    {streakDays}
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.3em", marginTop: 8 }}>
                    days strong
                </div>
            </div>

            {/* Progress circle */}
            <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 40px" }}>
                <svg width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--gray-800)" strokeWidth="10" />
                    <motion.circle
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        cx="80" cy="80" r={radius} fill="none" stroke="var(--gold)" strokeWidth="10"
                        strokeDasharray={circumference} strokeLinecap="round" />
                </svg>
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, color: "var(--gold)" }}>{Math.round((currentDay / 30) * 100)}%</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--gray-500)" }}>of 30 days</div>
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
                <div style={{ flex: 1, background: "var(--gray-800)", padding: 14, borderRadius: 12, border: "1px solid var(--gray-700)", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--white)", marginBottom: 4 }}>{longestStreak}d</div>
                    <Label>Longest Streak</Label>
                </div>
                <div style={{ flex: 1, background: "var(--gray-800)", padding: 14, borderRadius: 12, border: "1px solid var(--gray-700)", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--white)", marginBottom: 4 }}>{shieldsLeft}</div>
                    <Label>Shields Left</Label>
                </div>
                <div style={{ flex: 1, background: "var(--gray-800)", padding: 14, borderRadius: 12, border: "1px solid var(--gray-700)", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--white)", marginBottom: 4 }}>{hoursSaved}h</div>
                    <Label>Time Freed</Label>
                </div>
            </div>

            {/* Milestones */}
            <div style={{ textAlign: "left" }}>
                <Label style={{ marginBottom: 16, display: "block" }}>Milestones</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                        { day: 7, label: "Ascended", current: streakDays >= 7 },
                        { day: 14, label: "Unstoppable", current: streakDays >= 14 },
                        { day: 21, label: "Godlike", current: streakDays >= 21 },
                        { day: 30, label: "Transcendence", current: streakDays >= 30 },
                    ].map((m) => (
                        <div key={m.day} style={{
                            background: m.current ? "var(--gold-dim)" : "var(--gray-800)",
                            padding: "16px 20px", borderRadius: "var(--radius)",
                            border: `1px solid ${m.current ? "var(--gold-muted)" : "var(--gray-700)"}`,
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            opacity: m.current ? 1 : 0.4
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: 40, border: "2px solid var(--gold)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--gold)"
                                }}>{m.current ? "✓" : m.day}</div>
                                <span style={{ fontWeight: 600, fontSize: 16, color: m.current ? "var(--white)" : "var(--gray-400)" }}>{m.label}</span>
                            </div>
                            {m.current && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--gold)" }}>DAY {m.day}</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
