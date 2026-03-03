import React from 'react';
import { motion } from 'framer-motion';
import { Label } from './UI/Label';

interface CelebrationScreenProps {
    Maps: (screenId: string) => void;
}

export const CelebrationScreen: React.FC<CelebrationScreenProps> = ({ Maps }) => {
    return (
        <div style={{
            flex: 1, background: "var(--black)", display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 32, textAlign: "center", position: "relative"
        }}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ zIndex: 1 }}>
                <div style={{ fontSize: 64, marginBottom: 24 }}>🏆</div>
                <Label style={{ color: "var(--gold)" }}>Milestone Reached</Label>
                <h1 style={{
                    fontFamily: "Syne", fontSize: 32, fontWeight: 800,
                    color: "var(--white)", marginTop: 16, lineHeight: 1.1
                }}>
                    You've formed a<br /><span style={{ color: "var(--gold)" }}>New Habit</span>
                </h1>
                <p style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 14,
                    color: "var(--gray-400)", marginTop: 24, marginBottom: 48, maxWidth: 260
                }}>
                    21 days of consistent discipline. Your brain architecture has officially rewired.
                </p>

                <button
                    onClick={() => Maps('home')}
                    style={{
                        width: "100%", padding: "18px", borderRadius: "var(--radius)",
                        background: "var(--white)", color: "var(--black)",
                        fontWeight: 700, fontSize: 16, border: "none"
                    }}>Continue Journey</button>
            </motion.div>
        </div>
    );
};
