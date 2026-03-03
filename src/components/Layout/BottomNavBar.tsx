import React from 'react';
import { motion } from 'framer-motion';

interface BottomNavBarProps {
    activeTab: string;
    onTabChange: (id: string) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'home', icon: '⌂', label: 'Home' },
        { id: 'insights', icon: '◫', label: 'Insights' },
        { id: 'streak', icon: '⬡', label: 'Streak' },
        { id: 'journey', icon: '▲', label: 'Journey' },
    ];

    return (
        <div style={{
            height: 90, background: "rgba(10,10,10,0.8)",
            backdropFilter: "blur(20px)", borderTop: "1px solid var(--gray-800)",
            display: "flex", justifyContent: "space-around", alignItems: "center",
            paddingBottom: 20, paddingLeft: 20, paddingRight: 20
        }}>
            {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                    <motion.div
                        key={tab.id}
                        whileTap={{ scale: 0.85 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        onClick={() => onTabChange(tab.id)}
                        style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            gap: 4, cursor: "pointer", transition: "opacity 0.3s ease",
                            opacity: active ? 1 : 0.4,
                            position: "relative",
                        }}>
                        <span style={{
                            fontSize: 24, color: active ? "var(--gold)" : "var(--white)",
                            filter: active ? "drop-shadow(0 0 8px var(--gold-muted))" : "none",
                            transition: "color 0.3s ease, filter 0.3s ease",
                        }}>{tab.icon}</span>
                        <span style={{
                            fontSize: 9, fontFamily: "'DM Mono', monospace",
                            fontWeight: 600, color: active ? "var(--gold)" : "var(--gray-400)",
                            textTransform: "uppercase", letterSpacing: "0.05em",
                            transition: "color 0.3s ease",
                        }}>{tab.label}</span>
                        {/* Sliding gold dot indicator */}
                        {active && (
                            <motion.div
                                layoutId="activeTabIndicator"
                                style={{
                                    width: 4, height: 4,
                                    borderRadius: '50%',
                                    background: 'var(--gold)',
                                    margin: '2px auto 0',
                                    boxShadow: '0 0 6px var(--gold-muted)',
                                }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
};
