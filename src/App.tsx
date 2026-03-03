import React, { useState, useEffect, useRef } from 'react';
import { DisciplineProvider, useDiscipline } from './context/DisciplineContext';
import { BottomNavBar } from './components/Layout/BottomNavBar';
import { HomeScreen } from './components/HomeScreen';
import { InsightsScreen } from './components/InsightsScreen';
import { StreakScreen } from './components/StreakScreen';
import { ProgressScreen } from './components/ProgressScreen';
import { InterruptionScreen } from './components/InterruptionScreen';
import { ManageAppsScreen } from './components/ManageAppsScreen';
import { Onboarding } from './components/Onboarding';
import { SettingsScreen } from './components/SettingsScreen';
import { CelebrationScreen } from './components/CelebrationScreen';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { Preferences } from '@capacitor/preferences';
import { getOverlayTrigger, clearOverlayTrigger } from './utils/NativeBridge';

function App() {
    return (
        <DisciplineProvider>
            <AppMain />
        </DisciplineProvider>
    );
}

const AppMain: React.FC = () => {
    const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
    const [currentScreen, setCurrentScreen] = useState('home');
    const { setInterceptedApp, showCelebration, dismissCelebration } = useDiscipline();

    // ── Overlay state for background interception ────────────────────────
    const [overlayPackage, setOverlayPackage] = useState<string | null>(null);
    const overlayPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Check onboarding status ──────────────────────────────────────────
    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const { value } = await Preferences.get({ key: 'onboarding_complete' });
                setOnboardingDone(value === 'true');
            } catch (e) {
                console.error("Preferences plugin is not available or failed:", e);
                setOnboardingDone(false);
            }
        };
        checkOnboarding();
    }, []);

    // ── Poll for overlay trigger every 1000ms (F1 FIX) ──────────────────
    useEffect(() => {
        if (!onboardingDone) return; // Don't poll during onboarding

        overlayPollingRef.current = setInterval(async () => {
            try {
                const result = await getOverlayTrigger();
                if (result && result.triggered && result.packageName) {
                    setOverlayPackage(result.packageName);
                    setInterceptedApp({
                        name: result.packageName.split('.').pop() || 'App',
                        icon: '',
                        packageName: result.packageName,
                    });
                }
            } catch (e) {
                // Silent — polling should never crash the app
            }
        }, 1000);

        return () => {
            if (overlayPollingRef.current) {
                clearInterval(overlayPollingRef.current);
            }
        };
    }, [onboardingDone, setInterceptedApp]);

    // ── Overlay dismissal handler ────────────────────────────────────────
    const handleOverlayDismiss = async () => {
        setOverlayPackage(null);
        setInterceptedApp(null);
        await clearOverlayTrigger();
    };

    if (onboardingDone === null) return null; // still loading

    const activeScreen = onboardingDone ? currentScreen : 'onboarding';

    const Maps = (screenId: string) => {
        setCurrentScreen(screenId);
    };

    const renderScreen = () => {
        switch (activeScreen) {
            case 'home': return <HomeScreen Maps={Maps} />;
            case 'insights': return <InsightsScreen Maps={Maps} />;
            case 'streak': return <StreakScreen Maps={Maps} />;
            case 'progress': return <ProgressScreen Maps={Maps} />;
            case 'interruption': return <InterruptionScreen Maps={Maps} />;
            case 'celebration': return <CelebrationScreen Maps={Maps} />;
            case 'settings': return <SettingsScreen Maps={Maps} />;
            case 'manage-apps': return <ManageAppsScreen Maps={Maps} />;
            default: return <HomeScreen Maps={Maps} />;
        }
    };

    const showNavBar = ['home', 'insights', 'streak', 'progress'].includes(activeScreen);

    return (
        <React.Fragment>
            {/* Onboarding overlay */}
            {!onboardingDone && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 50, backgroundColor: 'black', overflowY: 'auto' }}>
                    <Onboarding onComplete={() => setOnboardingDone(true)} />
                </div>
            )}

            {/* Background interception overlay (F1 FIX) */}
            {overlayPackage && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
                    <InterruptionScreen Maps={(screenId) => {
                        handleOverlayDismiss();
                        if (screenId !== 'home') Maps(screenId);
                    }} />
                </div>
            )}

            {/* Celebration overlay (Fix #4) */}
            {showCelebration && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
                    <CelebrationScreen Maps={() => {
                        dismissCelebration();
                        setCurrentScreen('home');
                    }} />
                </div>
            )}

            {/* Main app layout — fullscreen for launcher */}
            <LayoutGroup>
                <div style={{
                    width: '100vw',
                    height: '100dvh',
                    background: 'var(--black)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{ flex: 1, position: 'relative', overflow: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeScreen}
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                style={{ minHeight: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
                            >
                                {renderScreen()}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {showNavBar && (
                        <BottomNavBar
                            activeTab={activeScreen === 'progress' ? 'journey' : activeScreen}
                            onTabChange={(id) => Maps(id === 'journey' ? 'progress' : id)}
                        />
                    )}
                </div>
            </LayoutGroup>
        </React.Fragment>
    );
};

export default App;
