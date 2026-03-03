import React, { useState, useEffect } from 'react';
import { useDiscipline } from '../context/DisciplineContext';
import { Label } from './UI/Label';
import { launchApp, clearOverlayTrigger } from '../utils/NativeBridge';
import { Preferences } from '@capacitor/preferences';

const TEXT_MEMES = [
    "Maaru ra, maaru ra!",
    "Inka enni rojulu ra idhe jeevitham?",
    "Is this really worth losing your streak?",
    "Bro, go build your portfolio instead.",
    "Put the phone down. Focus.",
    "Cheap dopamine isn't going to fix anything.",
    "You're better than this. Walk away.",
    "Your future self is watching. Make them proud.",
    "This app won't remember you. Your goals will.",
    "One scroll leads to one hour. You know this.",
    "Discipline is choosing what you want MOST over what you want NOW.",
    "Ra, inko sarki phone pattav ante streak poindhi.",
    "Close this. Open a book instead.",
    "Every minute here is a minute stolen from your dream.",
    "The algorithm doesn't care about you. Your streak does.",
    "Scrolling won't fix your problems. Building will.",
];

interface InterruptionScreenProps {
    Maps: (screenId: string) => void;
}

export const InterruptionScreen: React.FC<InterruptionScreenProps> = ({ Maps }) => {
    const { interceptedApp, setInterceptedApp, usedMinutes, dailyBudget, phase, setStateOverride } = useDiscipline();
    const [seconds, setSeconds] = useState(10);
    const [canContinue, setCanContinue] = useState(false);
    const [randomQuote, setRandomQuote] = useState<string>('');

    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * TEXT_MEMES.length);
        setRandomQuote(TEXT_MEMES[randomIndex]);
    }, []);

    useEffect(() => {
        if (seconds > 0) {
            const timer = setInterval(() => setSeconds(s => s - 1), 1000);
            return () => clearInterval(timer);
        } else {
            setCanContinue(true);
        }
    }, [seconds]);

    const handleGoBack = async () => {
        try {
            const { value } = await Preferences.get({ key: 'urges_resisted' });
            const currentCount = value ? Number.parseInt(value, 10) : 0;
            await Preferences.set({ key: 'urges_resisted', value: (currentCount + 1).toString() });
            await clearOverlayTrigger();
            setInterceptedApp(null);
            Maps('home');
        } catch (error) {
            console.error("Failed to save urge", error);
        }
    };

    const handleEmergencyBypass = async () => {
        // User chose to continue despite exhausted budget — streak is GONE
        console.log('[Interruption] Emergency bypass activated — streak reset');

        // Set emergency bypass flag in SharedPrefs so Kotlin stops intercepting
        await Preferences.set({ key: 'emergency_bypass_today', value: 'true' });

        // Reset streak in React state
        setStateOverride((prev: any) => ({
            ...prev,
            streak: 0,
        }));

        // Launch the app and dismiss
        if (interceptedApp?.packageName) {
            launchApp(interceptedApp.packageName);
        }
        await clearOverlayTrigger();
        setInterceptedApp(null);
        Maps('home');
    };

    if (!interceptedApp) return null;

    const remaining = Math.max(0, dailyBudget - usedMinutes);
    const budgetExceeded = remaining <= 0;

    const getMessage = () => {
        if (budgetExceeded) {
            return {
                headline: "Budget\nexhausted.",
                sub: "Your social budget is done for today. Continuing will reset your streak to zero."
            };
        }
        if (remaining <= 5) {
            return { headline: "Last\nminutes.", sub: `Only ${remaining}m left today. Is this really worth it?` };
        }
        if (phase === 3) {
            return { headline: "You've come\nso far.", sub: `${remaining}m remaining. Phase 3 — every minute matters now.` };
        }
        if (phase === 2) {
            return { headline: "Think before\nyou scroll.", sub: `${remaining}m of ${dailyBudget}m remaining today.` };
        }
        return { headline: "Pause. Is this\nworth it?", sub: `${remaining}m of ${dailyBudget}m remaining today.` };
    };

    const msg = getMessage();

    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(10,10,10,0.95)",
            zIndex: 1000, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center",
            backdropFilter: "blur(10px)"
        }}>
            {/* Savage text meme */}
            <div style={{
                display: 'flex', justifyContent: 'center',
                marginBottom: '32px', padding: '0 20px', textAlign: 'center'
            }}>
                <h2 style={{
                    fontFamily: "'DM Mono', monospace", fontSize: '20px',
                    color: 'var(--gold)', lineHeight: '1.4', fontStyle: 'italic'
                }}>
                    "{randomQuote}"
                </h2>
            </div>

            <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'var(--gray-600)', marginBottom: 12
            }}>
                INTENTIONALITY CHECK
            </div>

            <h1 style={{
                fontSize: 32, fontWeight: 800, color: "var(--white)",
                marginTop: 8, fontFamily: "Syne", whiteSpace: "pre-line", lineHeight: 1.1
            }}>
                {msg.headline}
            </h1>
            <p style={{
                fontFamily: "'DM Mono', monospace", fontSize: 13,
                color: budgetExceeded ? "#ff6b6b" : "var(--gray-400)",
                marginTop: 16, maxWidth: 260
            }}>
                {msg.sub}
            </p>

            {/* Budget bar */}
            {!budgetExceeded && (
                <div style={{ width: "80%", marginTop: 32, marginBottom: 32 }}>
                    <div style={{ height: 4, background: "var(--gray-700)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                            height: "100%",
                            width: `${(remaining / dailyBudget) * 100}%`,
                            background: remaining > dailyBudget * 0.5 ? "var(--gold)" : remaining > dailyBudget * 0.25 ? "#a0a0a0" : "#555",
                            borderRadius: 2, transition: "width 0.5s ease",
                        }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--gray-500)" }}>{usedMinutes}m used</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--gold)" }}>{remaining}m left</span>
                    </div>
                </div>
            )}

            {/* Countdown */}
            <div style={{ fontSize: 64, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "var(--gold)", marginTop: budgetExceeded ? 32 : 0 }}>
                00:{seconds.toString().padStart(2, '0')}
            </div>
            <Label style={{ color: "var(--gray-600)", marginBottom: 32 }}>seconds to reflect</Label>

            {/* Buttons */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
                {budgetExceeded ? (
                    <>
                        {/* Emergency bypass — lose streak, but access the app */}
                        <button
                            disabled={!canContinue}
                            onClick={handleEmergencyBypass}
                            style={{
                                padding: "18px", borderRadius: "var(--radius)",
                                background: canContinue ? "#331111" : "var(--gray-800)",
                                color: canContinue ? "#ff6b6b" : "var(--gray-600)",
                                fontWeight: 700, fontSize: 14, border: canContinue ? "1px solid #662222" : "none",
                                transition: "var(--transition)", opacity: canContinue ? 1 : 0.5
                            }}>
                            ⚠️ Continue anyway — LOSE MY STREAK
                        </button>
                    </>
                ) : (
                    <button
                        disabled={!canContinue}
                        onClick={async () => {
                            if (interceptedApp.packageName) launchApp(interceptedApp.packageName);
                            await clearOverlayTrigger();
                            setInterceptedApp(null);
                            Maps('home');
                        }}
                        style={{
                            padding: "18px", borderRadius: "var(--radius)",
                            background: canContinue ? "var(--white)" : "var(--gray-800)",
                            color: canContinue ? "var(--black)" : "var(--gray-600)",
                            fontWeight: 700, fontSize: 16, border: "none",
                            transition: "var(--transition)", opacity: canContinue ? 1 : 0.5
                        }}>Yes, I actually need this</button>
                )}

                <button
                    onClick={handleGoBack}
                    style={{
                        padding: "18px", borderRadius: "var(--radius)",
                        background: "none", color: "var(--white)",
                        fontWeight: 600, fontSize: 16, border: "1px solid var(--gray-700)"
                    }}>No, I'll do something else</button>
            </div>
        </div>
    );
};
