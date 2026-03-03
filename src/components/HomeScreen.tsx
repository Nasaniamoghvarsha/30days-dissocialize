import React, { useState, useEffect } from 'react';
import { useDiscipline } from '../context/DisciplineContext';
import { Label } from './UI/Label';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { getInstalledApps, launchApp, NativeApp } from '../utils/NativeBridge';
import { Search } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';
import { getAppIcon } from '../utils/AppIcons';

interface HomeScreenProps {
    Maps: (screenId: string) => void;
}

// Format minutes as hours + minutes (e.g., 480 → "8h", 95 → "1h 35m", 5 → "5m")
const formatTime = (mins: number): string => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ Maps }) => {
    const {
        currentDay,
        usedMinutes,
        phase,
        dailyBudget,
        setInterceptedApp,
        streakDays,
        hoursSaved,
        clockTrustLevel,
        hasPermissions,
        evaluateSocialTap
    } = useDiscipline();

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [allApps, setAllApps] = useState<NativeApp[]>([]);
    const [monitoredPackages, setMonitoredPackages] = useState<Set<string>>(new Set());
    const [currentTime, setCurrentTime] = useState('');

    // ── Streak count-up animation ──────────────────────────────────────
    const streakMotion = useMotionValue(0);
    const streakDisplay = useTransform(streakMotion, (v) => Math.round(v));

    useEffect(() => {
        if (streakDays > 0) {
            animate(streakMotion, streakDays, { duration: 0.8, ease: "easeOut" });
        }
    }, [streakDays, streakMotion]);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        };
        updateTime();
        const timer = setInterval(updateTime, 10000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const loadApps = async () => {
            try {
                const apps = await getInstalledApps();
                setAllApps(Array.isArray(apps) ? apps : []);
            } catch (error) {
                console.error("Home failed to load apps:", error);
                setAllApps([]);
            }
        };

        const loadPreferences = async () => {
            try {
                const { value } = await Preferences.get({ key: 'monitored_apps' });
                if (value) {
                    const parsed: string[] = JSON.parse(value);
                    setMonitoredPackages(new Set(parsed));
                }
            } catch (e) {
                console.error("Failed to parse monitored apps", e);
            }
        };

        loadApps();
        loadPreferences();
    }, []);

    useEffect(() => {
        if (isDrawerOpen) {
            getInstalledApps().then(apps => setAllApps(Array.isArray(apps) ? apps : []));
        }
    }, [isDrawerOpen]);

    const handleAppClick = (app: NativeApp | { name: string; packageName: string; icon?: string }) => {
        const isMonitored = monitoredPackages.has(app.packageName);

        if (isMonitored) {
            const isLimitReached = usedMinutes >= dailyBudget;
            if (isLimitReached) {
                setInterceptedApp({
                    name: app.name,
                    icon: 'icon' in app ? (app.icon || '') : '',
                    packageName: app.packageName
                });
                Maps('interruption');
            } else {
                const action = evaluateSocialTap();
                if (action === 'meme' || action === 'interruption') {
                    setInterceptedApp({
                        name: app.name,
                        icon: 'icon' in app ? (app.icon || '') : '',
                        packageName: app.packageName
                    });
                    Maps('interruption');
                } else {
                    launchApp(app.packageName);
                }
            }
        } else {
            launchApp(app.packageName);
        }
    };

    const percentageRemaining = Math.max(0, ((dailyBudget - usedMinutes) / dailyBudget) * 100);
    const isLowBudget = percentageRemaining < 20;

    // Budget bar color
    const getBarColor = () => {
        if (percentageRemaining > 50) return "var(--gold)";
        if (percentageRemaining > 25) return "#a0a0a0";
        return "#555";
    };

    // Remaining text color with transition
    const getRemainingColor = () => {
        if (percentageRemaining > 50) return "var(--gold)";
        if (percentageRemaining > 25) return "var(--gray-200)";
        return "var(--gray-400)";
    };

    const filteredApps = allApps.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const monitoredApps = (allApps || []).filter(app => monitoredPackages.has(app.packageName) && app.packageName !== 'com.thirtydays.discipline');
    const utilityApps = (allApps || []).filter(app => !monitoredPackages.has(app.packageName) && app.packageName !== 'com.thirtydays.discipline');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%', background: 'var(--black)', color: 'var(--white)', overflow: 'hidden' }}>
            {/* Anti-Cheat Banners */}
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50 }}>
                {clockTrustLevel === 'FROZEN' && (
                    <div style={{ background: '#dc2626', color: 'white', padding: '8px 24px', fontFamily: "'DM Mono', monospace", fontSize: 10, textAlign: 'center', fontWeight: 700, letterSpacing: '0.15em' }}>
                        CLOCK MISMATCH DETECTED. STREAK PAUSED.
                    </div>
                )}
                {!hasPermissions && (
                    <div style={{ background: 'var(--gray-900)', color: 'var(--gold)', borderBottom: '1px solid var(--gold-muted)', padding: '8px 24px', fontFamily: "'DM Mono', monospace", fontSize: 10, textAlign: 'center', fontWeight: 700, letterSpacing: '0.15em' }}>
                        ACCESSIBILITY DISABLED. TRACKING PAUSED.
                    </div>
                )}
            </div>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'all 0.5s', filter: isDrawerOpen ? 'blur(8px)' : 'none', opacity: isDrawerOpen ? 0.5 : 1, transform: isDrawerOpen ? 'scale(0.95)' : 'none' }}>
                {/* Status bar placeholder */}
                <div style={{ padding: "14px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--gray-400)" }}>{currentTime}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--gray-400)" }}>▋▋▋▋</span>
                </div>

                {/* Top streak + saved — IMPROVEMENT 4: animated streak counter */}
                <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <Label>Discipline Streak</Label>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}
                        >
                            <motion.span style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: "var(--white)" }}>
                                {streakDays > 0 ? <motion.span>{streakDisplay}</motion.span> : "0"}
                            </motion.span>
                            <span style={{ fontSize: 14, color: "var(--gray-400)", fontFamily: "'DM Mono', monospace" }}>days</span>
                        </motion.div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <Label>Time Saved</Label>
                        <div style={{ marginTop: 4 }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--gold)" }}>
                                {hoursSaved}h
                            </div>
                            <Label style={{ color: "var(--gray-600)" }}>this month</Label>
                        </div>
                    </div>
                </div>

                {/* Budget card — IMPROVEMENT 3: animated bar + warning pulse + color transition */}
                <div
                    className={isLowBudget ? 'budget-warning' : ''}
                    style={{
                        margin: "20px 24px", background: "var(--gray-800)",
                        borderRadius: "var(--radius-lg)", padding: 20,
                        border: "1px solid var(--gray-700)",
                        transition: "border-color 0.5s ease",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <Label>Today's Social Budget</Label>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--gray-400)" }}>Day {currentDay}/30</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
                        <span style={{ fontSize: 36, fontWeight: 800, color: "var(--white)" }}>{formatTime(Math.max(0, dailyBudget - usedMinutes))}</span>
                        <span style={{ fontSize: 14, color: "var(--gray-400)", fontFamily: "'DM Mono', monospace" }}>remaining of {formatTime(dailyBudget)}</span>
                    </div>
                    {/* Animated progress bar */}
                    <div style={{ height: 6, background: "var(--gray-700)", borderRadius: 3, overflow: "hidden" }}>
                        <motion.div
                            initial={{ width: '0%' }}
                            animate={{ width: `${percentageRemaining}%` }}
                            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                            style={{
                                height: "100%",
                                background: getBarColor(),
                                borderRadius: 3,
                            }}
                        />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                        <Label style={{ color: "var(--gray-600)" }}>Used: {formatTime(usedMinutes)}</Label>
                        <Label style={{
                            color: getRemainingColor(),
                            transition: "color 0.5s ease",
                        }}>{Math.round(percentageRemaining)}% left</Label>
                    </div>
                </div>

                {/* Phase badge — IMPROVEMENT 8: glow on Phase 3 + animate on change */}
                <div style={{ padding: "0 24px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 1, background: "var(--gray-700)" }} />
                    <motion.div
                        key={phase}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        <Label style={{
                            color: phase === 3 ? "var(--gold)" : "var(--gray-500)",
                            background: "var(--gray-800)", padding: "4px 10px", borderRadius: 20,
                            border: `1px solid ${phase === 3 ? "var(--gold-muted)" : "var(--gray-700)"}`,
                            boxShadow: phase === 3 ? '0 0 12px rgba(201, 168, 76, 0.2)' : 'none',
                        }}>
                            {phase === 1 ? "Phase 1 — Awareness" : phase === 2 ? "Phase 2 — Reduction" : "Phase 3 — Liberation"}
                        </Label>
                    </motion.div>
                    <div style={{ flex: 1, height: 1, background: "var(--gray-700)" }} />
                </div>

                {/* App grid — scrollable area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px', paddingBottom: '120px', WebkitOverflowScrolling: 'touch' }}>
                    {/* ── Monitored / Social section — IMPROVEMENT 10: label fade-in ─── */}
                    {monitoredApps.length > 0 && (
                        <div style={{ marginBottom: 28 }}>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                                style={{
                                    fontFamily: "'DM Mono', monospace", fontSize: 10,
                                    letterSpacing: '0.2em', textTransform: 'uppercase',
                                    color: 'var(--gray-600)', marginBottom: 12, paddingLeft: 4,
                                }}
                            >
                                Monitored
                            </motion.div>

                            {/* Icon grid — always 3 columns */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                                {monitoredApps.map((app, index) => (
                                    <motion.div
                                        key={app.packageName}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: phase === 1 ? 0.9 : 0.4, y: 0 }}
                                        transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.8), ease: "easeOut" }}
                                        whileTap={{ scale: 0.88, boxShadow: '0 0 0 2px rgba(201, 168, 76, 0.4)' }}
                                        onClick={() => handleAppClick(app)}
                                        style={{
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', gap: 6, cursor: 'pointer',
                                            filter: phase === 2 ? 'grayscale(100%)' : 'none',
                                            borderRadius: 14,
                                        }}
                                    >
                                        <div style={{
                                            width: 52, height: 52,
                                            background: 'var(--gray-800)',
                                            borderRadius: 14,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: '1px solid var(--gray-700)',
                                        }}>
                                            <div style={{ fontSize: 24, color: "var(--gray-400)" }}>
                                                {getAppIcon(app.packageName)}
                                            </div>
                                        </div>
                                        <span style={{
                                            fontSize: 10, color: 'var(--gray-400)',
                                            fontFamily: "'DM Mono', monospace",
                                            textAlign: 'center', lineHeight: 1.2,
                                        }}>
                                            {app.name.split(' ')[0]}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── All other apps section ───── IMPROVEMENT 10: label fade-in ─── */}
                    <div>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                            style={{
                                fontFamily: "'DM Mono', monospace", fontSize: 10,
                                letterSpacing: '0.2em', textTransform: 'uppercase',
                                color: 'var(--gray-600)', marginBottom: 12, paddingLeft: 4,
                            }}
                        >
                            Apps
                        </motion.div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                            {utilityApps.map((app, index) => (
                                <motion.div
                                    key={app.packageName}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: Math.min((monitoredApps.length + index) * 0.04, 0.8), ease: "easeOut" }}
                                    whileTap={{ scale: 0.88, opacity: 0.7 }}
                                    onClick={() => launchApp(app.packageName)}
                                    style={{
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', gap: 6, cursor: 'pointer',
                                        borderRadius: 14,
                                    }}
                                >
                                    <div style={{
                                        width: 52, height: 52,
                                        background: 'var(--gray-800)',
                                        borderRadius: 14,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: '1px solid var(--gray-700)',
                                    }}>
                                        <div style={{ fontSize: 24, color: "var(--gray-200)" }}>
                                            {getAppIcon(app.packageName)}
                                        </div>
                                    </div>
                                    <span style={{
                                        fontSize: 10, color: 'var(--gray-300)',
                                        fontFamily: "'DM Mono', monospace",
                                        textAlign: 'center', lineHeight: 1.2,
                                    }}>
                                        {app.name.split(' ')[0]}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* App Drawer Overlay */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsDrawerOpen(false)}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100 }}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: '10%' }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{
                                position: 'fixed', bottom: 0, left: 0, width: '100%', height: '90%',
                                background: 'var(--gray-900)', borderTop: '1px solid var(--gray-800)',
                                borderRadius: '40px 40px 0 0', zIndex: 120,
                                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                            }}
                        >
                            <div style={{ width: 48, height: 4, background: 'var(--gray-700)', borderRadius: 2, margin: '16px auto 8px', opacity: 0.2 }} />

                            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h2 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700 }}>Applications</h2>
                                    <button onClick={() => setIsDrawerOpen(false)} style={{ padding: 8, color: 'var(--gray-500)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <CloseIcon size={20} />
                                    </button>
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-600)' }} size={16} />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Find anything..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{
                                            width: '100%', background: 'var(--black)',
                                            border: '1px solid var(--gray-800)', borderRadius: 16,
                                            padding: '16px 16px 16px 48px', color: 'var(--white)',
                                            fontFamily: "'DM Mono', monospace", fontSize: 14,
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 80px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                                    {filteredApps.map((app) => (
                                        <motion.button
                                            key={app.packageName}
                                            whileTap={{ scale: 0.88, opacity: 0.7 }}
                                            onClick={() => {
                                                handleAppClick(app);
                                                setIsDrawerOpen(false);
                                            }}
                                            style={{
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', gap: 12,
                                                background: 'none', border: 'none', cursor: 'pointer',
                                            }}
                                        >
                                            <div style={{
                                                width: 56, height: 56, background: 'var(--black)',
                                                border: '1px solid var(--gray-800)', borderRadius: 16,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <div style={{ color: 'var(--gray-500)' }}>{getAppIcon(app.packageName)}</div>
                                            </div>
                                            <span style={{
                                                fontSize: 10, color: 'var(--gray-500)',
                                                fontFamily: "'DM Mono', monospace",
                                                width: '100%', textAlign: 'center',
                                                textTransform: 'uppercase', letterSpacing: '-0.02em',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {app.name.split(' ')[0]}
                                            </span>
                                        </motion.button>
                                    ))}
                                    {filteredApps.length === 0 && (
                                        <div style={{
                                            gridColumn: 'span 4', padding: '80px 0', textAlign: 'center',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                                        }}>
                                            <Search size={40} style={{ color: 'var(--gray-800)' }} />
                                            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>No matching apps</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

// Close icon component
function CloseIcon({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}
