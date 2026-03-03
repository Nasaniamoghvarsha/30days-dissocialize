import React, { useState } from 'react';
import { useDiscipline } from '../context/DisciplineContext';
import { motion } from 'framer-motion';
import {
    ChevronLeft,
    Bell,
    Shield,
    ExternalLink,
    Download,
    Trash2,
    LogOut,
    Smartphone,
    Layers,
    Github,
    History
} from 'lucide-react';

interface SettingRowProps {
    title: string;
    subtext: string;
    children?: React.ReactNode;
    icon?: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({ title, subtext, children, icon }) => (
    <div className="flex items-center justify-between py-5 border-b border-gray-900 last:border-0">
        <div className="flex gap-4 items-center flex-1 pr-4">
            {icon && <div className="text-gray-600 flex-shrink-0">{icon}</div>}
            <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-white tracking-tight">{title}</span>
                <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">{subtext}</span>
            </div>
        </div>
        {children}
    </div>
);

const Toggle: React.FC<{ active: boolean; onToggle: () => void }> = ({ active, onToggle }) => (
    <button
        onClick={onToggle}
        className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${active ? 'bg-gold' : 'bg-gray-800'}`}
    >
        <motion.div
            animate={{ x: active ? 22 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`w-4 h-4 rounded-full shadow-md ${active ? 'bg-black' : 'bg-gray-400'}`}
        />
    </button>
);

interface SettingsScreenProps {
    Maps: (screenId: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ Maps }) => {
    const { trackedApps } = useDiscipline();
    const [autoShield, setAutoShield] = useState(true);
    const [frictionNotif, setFrictionNotif] = useState(true);
    const [showResetInput, setShowResetInput] = useState(false);
    const [resetText, setResetText] = useState('');

    const handleResetData = () => {
        if (!showResetInput) {
            setShowResetInput(true);
            return;
        }
        if (resetText === 'DISCIPLINE') {
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black overflow-y-auto font-syne"
        >
            <main className="max-w-md mx-auto px-8 py-12 pb-32">
                <header className="flex items-center mb-16">
                    <button
                        onClick={() => Maps('home')}
                        className="p-2 -ml-2 text-gray-500 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="flex-1 text-center font-extrabold text-2xl tracking-tighter pr-8">
                        Settings
                    </h1>
                </header>

                <section className="mb-12">
                    <span className="font-mono text-[9px] text-gray-600 uppercase tracking-[0.3em] block mb-6 px-1">Control Center</span>
                    <div className="bg-gray-900/40 border border-gray-800/60 rounded-3xl px-6">
                        <SettingRow
                            title="Auto-Shields"
                            subtext="Automated grace zone protection"
                            icon={<Shield size={18} strokeWidth={1.5} />}
                        >
                            <Toggle active={autoShield} onToggle={() => setAutoShield(!autoShield)} />
                        </SettingRow>
                        <SettingRow
                            title="Friction Alerts"
                            subtext="Tactical limit notifications"
                            icon={<Bell size={18} strokeWidth={1.5} />}
                        >
                            <Toggle active={frictionNotif} onToggle={() => setFrictionNotif(!frictionNotif)} />
                        </SettingRow>
                    </div>
                </section>

                <section className="mb-12">
                    <span className="font-mono text-[9px] text-gray-600 uppercase tracking-[0.3em] block mb-6 px-1">Infrastructure</span>
                    <div className="bg-gray-900/40 border border-gray-800/60 rounded-3xl px-6">
                        <SettingRow
                            title="Managed Apps"
                            subtext={`${trackedApps.length} packages under monitoring`}
                            icon={<Layers size={18} strokeWidth={1.5} />}
                        >
                            <button
                                onClick={() => Maps('manage-apps')}
                                className="bg-gray-800 text-white text-[10px] font-mono px-4 py-2 rounded-full uppercase tracking-widest hover:bg-gray-700 transition-colors"
                            >
                                Edit
                            </button>
                        </SettingRow>
                        <SettingRow
                            title="Export Profile"
                            subtext="Download JSON configuration"
                            icon={<History size={18} strokeWidth={1.5} />}
                        >
                            <Download size={18} className="text-gray-600" strokeWidth={1.5} />
                        </SettingRow>
                    </div>
                </section>

                <section className="mb-16">
                    <span className="font-mono text-[9px] text-gray-600 uppercase tracking-[0.3em] block mb-6 px-1">Project</span>
                    <div className="bg-gray-900/40 border border-gray-800/60 rounded-3xl px-6">
                        <SettingRow
                            title="Source Code"
                            subtext="View GitHub Repository"
                            icon={<Github size={18} strokeWidth={1.5} />}
                        >
                            <ExternalLink size={18} className="text-gray-600" strokeWidth={1.5} />
                        </SettingRow>
                        <SettingRow
                            title="Core Version"
                            subtext="v1.0.0-beta.2"
                            icon={<Smartphone size={18} strokeWidth={1.5} />}
                        >
                            <span className="font-mono text-[10px] text-gray-700 tracking-widest uppercase italic">Stable</span>
                        </SettingRow>
                    </div>
                </section>

                <section className="mb-12 border-t border-red-900/20 pt-12">
                    <span className="font-mono text-[9px] text-red-600/60 uppercase tracking-[0.3em] block mb-8 text-center">System Termination</span>

                    <div className="flex flex-col gap-4">
                        <button className="w-full bg-gray-900/80 border border-gray-800 text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition-all active:scale-[0.98] group flex items-center justify-center gap-3">
                            <span className="group-hover:text-red-500 transition-colors">Abort Streak</span>
                        </button>

                        {!showResetInput ? (
                            <button
                                onClick={handleResetData}
                                className="w-full bg-transparent border border-red-900/30 text-red-500/80 font-bold py-4 rounded-2xl hover:bg-red-950/20 active:scale-[0.98] transition-all"
                            >
                                Partial Data Reset
                            </button>
                        ) : (
                            <div className="flex flex-col gap-4 bg-red-950/10 border border-red-900/30 p-6 rounded-3xl animate-in fade-in slide-in-from-bottom-2">
                                <span className="font-mono text-[10px] text-red-500 uppercase tracking-widest text-center">Type "DISCIPLINE" to confirm</span>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={resetText}
                                        onChange={(e) => setResetText(e.target.value.toUpperCase())}
                                        placeholder="CONFIRM"
                                        className="flex-1 bg-black border border-red-900/30 text-white font-mono text-sm px-4 py-3 rounded-xl outline-none focus:border-red-600 transition-all"
                                    />
                                    <button
                                        onClick={handleResetData}
                                        disabled={resetText !== 'DISCIPLINE'}
                                        className={`px-6 rounded-xl font-bold transition-all ${resetText === 'DISCIPLINE' ? 'bg-red-600 text-white' : 'bg-gray-900 text-gray-700 cursor-not-allowed'}`}
                                    >
                                        WIPE
                                    </button>
                                </div>
                            </div>
                        )}

                        <button className="text-gray-600 font-mono text-[10px] uppercase tracking-[0.4em] py-8 hover:text-gray-400 transition-colors">
                            Uninstall System
                        </button>
                    </div>
                </section>
            </main>
        </motion.div>
    );
};
