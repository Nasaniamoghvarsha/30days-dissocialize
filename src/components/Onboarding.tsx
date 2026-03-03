import React, { useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { getInstalledApps, NativeApp } from '../utils/NativeBridge';
import { getAppIcon } from '../utils/AppIcons';
import { useDiscipline } from '../context/DisciplineContext';
import { RefreshCw } from 'lucide-react';

// Known social media package names — shown first, pre-labeled
const SOCIAL_MEDIA_PACKAGES: Record<string, string> = {
    'com.instagram.android': 'Instagram',
    'com.google.android.youtube': 'YouTube',
    'com.whatsapp': 'WhatsApp',
    'com.snapchat.android': 'Snapchat',
    'org.telegram.messenger': 'Telegram',
    'com.twitter.android': 'X (Twitter)',
    'com.zhiliaoapp.musically': 'TikTok',
    'com.facebook.katana': 'Facebook',
    'com.reddit.frontpage': 'Reddit',
    'com.discord': 'Discord',
    'com.linkedin.android': 'LinkedIn',
    'com.pinterest': 'Pinterest',
};

interface OnboardingProps {
    onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const { completeOnboarding } = useDiscipline();

    const [step, setStep] = useState<'budget' | 'apps'>('budget');
    const [hours, setHours] = useState<string>('');
    const [minutes, setMinutes] = useState<string>('');
    const [installedApps, setInstalledApps] = useState<NativeApp[]>([]);
    const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchApps = async () => {
        setLoading(true);
        setError(null);
        try {
            const apps = await getInstalledApps();
            console.log('[Onboarding] Bridge returned apps:', apps?.length ?? 0);
            const safeApps = Array.isArray(apps) ? apps : [];
            setInstalledApps(safeApps);
            if (safeApps.length === 0) {
                setError('No apps found. The native bridge may not be connected.');
            }
        } catch (err: any) {
            console.error('[Onboarding] Failed to fetch apps:', err?.message);
            setInstalledApps([]);
            setError('Could not load apps. Check the native bridge connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (step === 'apps') fetchApps();
    }, [step]);

    const toggleApp = (packageName: string) => {
        setSelectedPackages(prev => {
            const next = new Set(prev);
            next.has(packageName) ? next.delete(packageName) : next.add(packageName);
            return next;
        });
    };

    const h = Number.parseInt(hours, 10) || 0;
    const m = Number.parseInt(minutes, 10) || 0;
    const totalBudgetMinutes = h * 60 + m;
    const canProceed = totalBudgetMinutes >= 5;

    const phase1 = totalBudgetMinutes;
    const phase2 = totalBudgetMinutes > 0 ? Math.max(10, Math.floor(totalBudgetMinutes * 0.5)) : 0;
    const phase3 = totalBudgetMinutes > 0 ? Math.max(5, Math.floor(totalBudgetMinutes * 0.25)) : 0;

    const handleFinish = async () => {
        const budgetStr = totalBudgetMinutes.toString();
        const appsArray = Array.from(selectedPackages);

        console.log('[Onboarding] Saving budget:', budgetStr, 'apps:', appsArray);

        await Preferences.set({ key: 'daily_budget', value: budgetStr });
        await Preferences.set({ key: 'monitored_apps', value: JSON.stringify(appsArray) });
        await Preferences.set({ key: 'onboarding_complete', value: 'true' });
        await Preferences.set({ key: 'urges_resisted', value: '0' });
        await Preferences.set({ key: 'time_used_seconds', value: '0' });
        // Reset milestone and bypass for fresh start
        await Preferences.set({ key: 'intercept_milestone', value: 'none' });
        await Preferences.set({ key: 'emergency_bypass_today', value: 'false' });

        completeOnboarding(totalBudgetMinutes, appsArray);
        onComplete();
    };

    const presets = [
        { label: '30m', h: 0, m: 30 },
        { label: '1h', h: 1, m: 0 },
        { label: '2h', h: 2, m: 0 },
        { label: '3h', h: 3, m: 0 },
        { label: '4h', h: 4, m: 0 },
    ];

    // ── Split apps into social media (installed) + other apps ──
    const socialMediaApps = installedApps.filter(app => app.packageName in SOCIAL_MEDIA_PACKAGES);
    const otherApps = installedApps.filter(app => !(app.packageName in SOCIAL_MEDIA_PACKAGES));

    // ── Step 1: Budget ───────────────────────────────────────────
    if (step === 'budget') {
        return (
            <div style={{
                minHeight: '100vh', background: 'var(--black)',
                display: 'flex', flexDirection: 'column',
                padding: '60px 24px 40px',
            }}>
                <div style={{ marginBottom: 40 }}>
                    <div style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 10,
                        letterSpacing: '0.2em', textTransform: 'uppercase',
                        color: 'var(--gray-400)', marginBottom: 12,
                    }}>Step 1 of 2</div>
                    <h1 style={{
                        fontFamily: 'Syne', fontSize: 28, fontWeight: 800,
                        color: 'var(--white)', lineHeight: 1.2, marginBottom: 12,
                    }}>
                        How much time do you<br />spend on social media?
                    </h1>
                    <p style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 13,
                        color: 'var(--gray-400)', lineHeight: 1.6,
                    }}>
                        Enter your daily average. We'll create a 30-day plan to reduce it.
                    </p>
                </div>

                {/* Hours + Minutes input */}
                <div style={{
                    background: 'var(--gray-800)', borderRadius: 'var(--radius)',
                    border: '1px solid var(--gray-700)', padding: '24px', marginBottom: 16,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <input type="number" inputMode="numeric" min="0" max="24"
                                value={hours} onChange={e => setHours(e.target.value)} placeholder="0"
                                style={{
                                    background: 'var(--gray-900)', border: '1px solid var(--gray-700)',
                                    borderRadius: 12, fontFamily: 'Syne', fontSize: 36, fontWeight: 800,
                                    color: 'var(--gold)', width: '80px', textAlign: 'center',
                                    padding: '12px 8px', outline: 'none',
                                }} />
                            <div style={{
                                fontFamily: "'DM Mono', monospace", fontSize: 10,
                                color: 'var(--gray-400)', marginTop: 6,
                                letterSpacing: '0.1em', textTransform: 'uppercase',
                            }}>Hours</div>
                        </div>
                        <span style={{
                            fontFamily: 'Syne', fontSize: 28, fontWeight: 800,
                            color: 'var(--gray-600)', paddingBottom: 20,
                        }}>:</span>
                        <div style={{ textAlign: 'center' }}>
                            <input type="number" inputMode="numeric" min="0" max="59"
                                value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="0"
                                style={{
                                    background: 'var(--gray-900)', border: '1px solid var(--gray-700)',
                                    borderRadius: 12, fontFamily: 'Syne', fontSize: 36, fontWeight: 800,
                                    color: 'var(--gold)', width: '80px', textAlign: 'center',
                                    padding: '12px 8px', outline: 'none',
                                }} />
                            <div style={{
                                fontFamily: "'DM Mono', monospace", fontSize: 10,
                                color: 'var(--gray-400)', marginTop: 6,
                                letterSpacing: '0.1em', textTransform: 'uppercase',
                            }}>Minutes</div>
                        </div>
                    </div>
                    {totalBudgetMinutes > 0 && (
                        <div style={{
                            textAlign: 'center', marginTop: 12,
                            fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--gold)',
                        }}>
                            = {totalBudgetMinutes} minutes daily budget
                        </div>
                    )}
                </div>

                {/* Quick presets */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {presets.map(p => (
                        <button key={p.label}
                            onClick={() => { setHours(p.h.toString()); setMinutes(p.m.toString()); }}
                            style={{
                                padding: '8px 16px',
                                background: (h === p.h && m === p.m) ? 'var(--gold-dim)' : 'var(--gray-900)',
                                border: `1px solid ${(h === p.h && m === p.m) ? 'var(--gold-muted)' : 'var(--gray-700)'}`,
                                borderRadius: 20, fontFamily: "'DM Mono', monospace", fontSize: 11,
                                color: (h === p.h && m === p.m) ? 'var(--gold)' : 'var(--gray-400)',
                                cursor: 'pointer',
                            }}>
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Phase preview */}
                {canProceed && (
                    <div style={{
                        background: 'var(--gray-900)', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--gray-800)', padding: '16px', marginBottom: 24,
                    }}>
                        <div style={{
                            fontFamily: "'DM Mono', monospace", fontSize: 10,
                            color: 'var(--gray-400)', letterSpacing: '0.15em',
                            textTransform: 'uppercase', marginBottom: 12,
                        }}>Your 30-Day Plan</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[
                                { phase: 'Phase 1', label: 'Days 1-10', mins: phase1 },
                                { phase: 'Phase 2', label: 'Days 11-20', mins: phase2 },
                                { phase: 'Phase 3', label: 'Days 21-30', mins: phase3 },
                            ].map(p => (
                                <div key={p.phase} style={{
                                    flex: 1, background: 'var(--gray-800)', borderRadius: 8,
                                    padding: '12px 8px', textAlign: 'center',
                                }}>
                                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 4 }}>{p.phase}</div>
                                    <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: 'var(--white)' }}>{p.mins}m</div>
                                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--gray-500)', marginTop: 2 }}>{p.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ flex: 1 }} />

                <button onClick={() => setStep('apps')} disabled={!canProceed}
                    style={{
                        marginTop: 32, width: '100%', padding: '18px',
                        background: canProceed ? 'var(--white)' : 'var(--gray-800)',
                        color: canProceed ? 'var(--black)' : 'var(--gray-600)',
                        border: 'none', borderRadius: 'var(--radius-sm)',
                        fontFamily: 'Syne', fontSize: 15, fontWeight: 800,
                        cursor: canProceed ? 'pointer' : 'default',
                        letterSpacing: '0.05em', opacity: canProceed ? 1 : 0.5,
                    }}>
                    {canProceed ? `Set ${totalBudgetMinutes}m daily budget →` : 'Enter your daily usage'}
                </button>
            </div>
        );
    }

    // ── Step 2: App selection ──────────────────────────────────────────────
    const renderAppRow = (app: NativeApp, badge?: string) => {
        const isSelected = selectedPackages.has(app.packageName);
        return (
            <button
                key={app.packageName}
                onClick={() => toggleApp(app.packageName)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '14px 16px',
                    background: isSelected ? 'var(--gold-dim)' : 'var(--gray-800)',
                    border: `1px solid ${isSelected ? 'var(--gold-muted)' : 'var(--gray-700)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s ease',
                }}
            >
                <div style={{
                    width: 40, height: 40,
                    background: isSelected ? 'var(--gold-dim)' : 'var(--gray-700)',
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, color: isSelected ? 'var(--gold)' : 'var(--gray-400)',
                }}>
                    {getAppIcon(app.packageName)}
                </div>
                <div style={{ flex: 1 }}>
                    <span style={{
                        fontFamily: 'Syne', fontSize: 15, fontWeight: 600,
                        color: isSelected ? 'var(--white)' : 'var(--gray-200)',
                    }}>
                        {String(app.name || 'Unknown App')}
                    </span>
                    {badge && (
                        <div style={{
                            fontFamily: "'DM Mono', monospace", fontSize: 9,
                            color: 'var(--gold)', marginTop: 2,
                            letterSpacing: '0.1em', textTransform: 'uppercase',
                        }}>{badge}</div>
                    )}
                </div>
                <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    border: `2px solid ${isSelected ? 'var(--gold)' : 'var(--gray-600)'}`,
                    background: isSelected ? 'var(--gold)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    {isSelected && <span style={{ color: 'var(--black)', fontSize: 14, fontWeight: 700 }}>✓</span>}
                </div>
            </button>
        );
    };

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--black)',
            display: 'flex', flexDirection: 'column',
            padding: '60px 24px 40px',
        }}>
            <div style={{ marginBottom: 28 }}>
                <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 10,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: 'var(--gray-400)', marginBottom: 12,
                }}>Step 2 of 2</div>
                <h1 style={{
                    fontFamily: 'Syne', fontSize: 28, fontWeight: 800,
                    color: 'var(--white)', lineHeight: 1.2, marginBottom: 12,
                }}>
                    Choose apps<br />to monitor
                </h1>
                <p style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 13,
                    color: 'var(--gray-400)', lineHeight: 1.6,
                }}>
                    Social media apps are shown first. You can also add any other app below.
                    {selectedPackages.size > 0 && (
                        <span style={{ color: 'var(--gold)' }}> {selectedPackages.size} selected</span>
                    )}
                </p>
            </div>

            {loading ? (
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--gray-600)',
                }}>Loading your apps...</div>
            ) : error ? (
                <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 16,
                }}>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--gray-500)', textAlign: 'center' }}>{error}</p>
                    <button onClick={fetchApps} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '12px 20px', background: 'var(--gray-800)',
                        border: '1px solid var(--gray-700)', borderRadius: 'var(--radius-sm)',
                        color: 'var(--gold)', fontFamily: "'DM Mono', monospace", fontSize: 12, cursor: 'pointer',
                    }}>
                        <RefreshCw size={14} /> Tap to retry
                    </button>
                </div>
            ) : (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Social Media section */}
                    {socialMediaApps.length > 0 && (
                        <>
                            <div style={{
                                fontFamily: "'DM Mono', monospace", fontSize: 10,
                                letterSpacing: '0.15em', textTransform: 'uppercase',
                                color: 'var(--gold)', marginTop: 8, marginBottom: 4,
                            }}>
                                📱 Social Media ({socialMediaApps.length} found)
                            </div>
                            {socialMediaApps.map(app => renderAppRow(app, 'social media'))}
                        </>
                    )}

                    {/* Other apps section */}
                    {otherApps.length > 0 && (
                        <>
                            <div style={{
                                fontFamily: "'DM Mono', monospace", fontSize: 10,
                                letterSpacing: '0.15em', textTransform: 'uppercase',
                                color: 'var(--gray-500)', marginTop: 20, marginBottom: 4,
                            }}>
                                📦 Other Apps ({otherApps.length})
                            </div>
                            {otherApps.map(app => renderAppRow(app))}
                        </>
                    )}
                </div>
            )}

            <button onClick={handleFinish} disabled={selectedPackages.size === 0}
                style={{
                    marginTop: 24, width: '100%', padding: '18px',
                    background: selectedPackages.size > 0 ? 'var(--white)' : 'var(--gray-800)',
                    color: selectedPackages.size > 0 ? 'var(--black)' : 'var(--gray-600)',
                    border: 'none', borderRadius: 'var(--radius-sm)',
                    fontFamily: 'Syne', fontSize: 15, fontWeight: 800,
                    cursor: selectedPackages.size > 0 ? 'pointer' : 'default',
                    letterSpacing: '0.05em', opacity: selectedPackages.size > 0 ? 1 : 0.5,
                }}>
                {selectedPackages.size > 0
                    ? `Start My Journey (${selectedPackages.size} apps) →`
                    : 'Select at least one app'}
            </button>
        </div>
    );
};
