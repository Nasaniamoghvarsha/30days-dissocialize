import React from 'react';
import { useDiscipline } from '../context/DisciplineContext';
import { Label } from './UI/Label';
import { motion } from 'framer-motion';

interface ProgressScreenProps {
    Maps: (screenId: string) => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ Maps }) => {
    const { currentDay, phase } = useDiscipline();

    // Dynamic Background Logic
    const getBackground = () => {
        if (phase === 1) return 'linear-gradient(180deg, #0A0A0A 0%, #111111 60%, #1A1A14 100%)';
        if (phase === 2) return 'linear-gradient(180deg, #0A0A0A 0%, #0D0D0A 50%, #1A180A 100%)';
        return 'linear-gradient(180deg, #0A0A08 0%, #14120A 50%, #1C190A 100%)';
    };

    const getHeader = () => {
        if (phase === 1) return "Finding your\nfooting";
        if (phase === 2) return "Climbing the\nmountain";
        return "The summit\nawaits";
    };

    const climberPos = (currentDay / 30);

    return (
        <div style={{ padding: "54px 24px 24px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: "100px" }}>
            <Label>30-Day Journey</Label>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 4, lineHeight: 1.1, color: "var(--white)", fontFamily: "Syne", marginBottom: 32 }}>
                {phase === 1 ? "Finding your footing" : phase === 2 ? "Climbing the mountain" : "The summit awaits"}
            </h1>

            {/* Mountain SVG */}
            <div style={{ position: "relative", width: "100%", height: 160, marginBottom: 40 }}>
                <svg width="100%" height="160" viewBox="0 0 300 160">
                    <defs>
                        <linearGradient id="mountGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#333" />
                            <stop offset="100%" stopColor="#1a1a1a" />
                        </linearGradient>
                    </defs>
                    <path d="M0,160 L150,20 L300,160 Z" fill="#1a1a1a" opacity="0.5" />
                    <path d="M30,160 L150,40 L270,160 Z" fill="url(#mountGrad)" />
                    {/* Progress path */}
                    <path d="M30,160 L150,40 L270,160 Z" fill="var(--gold)" opacity="0.1" />
                    {/* Climber dot */}
                    <motion.circle
                        initial={{ cx: 30, cy: 160 }}
                        animate={{ cx: 30 + (climberPos * 240), cy: 160 - (climberPos * 120) }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        r="5" fill="var(--gold)" style={{ filter: "drop-shadow(0 0 8px var(--gold))" }} />
                </svg>
            </div>

            {/* Day grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 6, marginBottom: 40 }}>
                {Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} style={{
                        aspectRatio: "1", borderRadius: 4,
                        background: (i + 1) === currentDay ? "var(--white)" : (i + 1) < currentDay ? "var(--gold)" : "var(--gray-800)",
                        opacity: (i + 1) <= currentDay ? 1 : 0.3,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontFamily: "'DM Mono', monospace",
                        color: (i + 1) <= currentDay ? "var(--black)" : "var(--gray-500)",
                        fontWeight: (i + 1) === currentDay ? 700 : 400,
                    }}>{i + 1}</div>
                ))}
            </div>

            {/* Phase info */}
            <div style={{ display: "flex", gap: 8 }}>
                {[
                    { p: 1, label: "Awareness" },
                    { p: 2, label: "Reduction" },
                    { p: 3, label: "Liberation" },
                ].map((ph) => (
                    <div key={ph.p} style={{
                        flex: 1, padding: "12px 8px", borderRadius: "var(--radius-sm)",
                        background: phase === ph.p ? "var(--gold-dim)" : "var(--gray-800)",
                        border: `1px solid ${phase === ph.p ? "var(--gold-muted)" : "var(--gray-700)"}`,
                        textAlign: "center"
                    }}>
                        <div style={{ fontSize: 8, color: phase === ph.p ? "var(--gold)" : "var(--gray-500)", fontFamily: "'DM Mono', monospace", marginBottom: 2 }}>PHASE 0{ph.p}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: phase === ph.p ? "var(--white)" : "var(--gray-400)", fontFamily: "Syne" }}>{ph.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
