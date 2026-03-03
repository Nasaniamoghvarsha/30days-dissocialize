import React, { useState, useEffect } from 'react';
import { useDiscipline } from '../context/DisciplineContext';
import { getInstalledApps, NativeApp } from '../utils/NativeBridge';
import { getAppIcon } from '../utils/AppIcons';
import { motion, AnimatePresence } from 'framer-motion';

const Toggle: React.FC<{ active: boolean; onToggle: () => void }> = ({ active, onToggle }) => (
    <button
        onClick={onToggle}
        aria-pressed={active}
        className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${active ? 'bg-gold' : 'bg-gray-700'}`}
    >
        <motion.div
            animate={{ x: active ? 22 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="w-5 h-5 bg-black rounded-full absolute top-0.5"
        />
    </button>
);

interface ManageAppsScreenProps {
    Maps?: (screenId: string) => void;
    onContinue?: () => void;
    isComponent?: boolean;
}

export const ManageAppsScreen: React.FC<ManageAppsScreenProps> = ({ Maps, onContinue, isComponent }) => {
    const { trackedApps, toggleTrackedApp } = useDiscipline();
    const [allApps, setAllApps] = useState<NativeApp[]>([]);
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        getInstalledApps().then(setAllApps);
    }, []);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2000);
    };

    const filtered = allApps.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

    const content = (
        <div className={`flex flex-col h-full ${isComponent ? '' : 'p-6'} overflow-hidden`}>
            {!isComponent && (
                <header className="flex items-center mb-6">
                    <button
                        onClick={() => Maps && Maps('settings')}
                        className="text-white font-syne text-sm mr-4"
                    >
                        ← BACK
                    </button>
                    <h1 className="font-syne text-xl font-extrabold text-white m-0">Select Apps to Limit</h1>
                </header>
            )}

            {isComponent && (
                <div className="mb-6">
                    <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest block mb-2">STEP 1 OF 4</span>
                    <h2 className="font-serif text-3xl text-white">
                        Which apps drain your time?
                    </h2>
                </div>
            )}

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search apps..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg text-white font-syne outline-none focus:border-gold-muted transition-colors"
                />
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pb-6">
                {filtered.map(app => (
                    <div key={app.packageName} className="flex justify-between items-center p-3 px-4 bg-gray-800/50 border border-gray-800/80 rounded-xl hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="text-gray-500">
                                {getAppIcon(app.packageName)}
                            </div>
                            <span className="font-mono text-sm text-gray-200">{app.name}</span>
                        </div>
                        <Toggle
                            active={trackedApps.includes(app.packageName || app.name)}
                            onToggle={() => {
                                toggleTrackedApp(app.packageName || app.name);
                                if (trackedApps.includes(app.packageName || app.name)) {
                                    showToast("App removed.");
                                } else {
                                    showToast("App added to limit.");
                                }
                            }}
                        />
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="text-center py-12 text-gray-600 font-mono text-sm">
                        NO APPS FOUND
                    </div>
                )}
            </div>

            {isComponent && onContinue && (
                <button
                    onClick={onContinue}
                    className="w-full bg-white text-black py-4 rounded-xl font-syne font-bold text-lg mt-4 shadow-lg hover:bg-gray-100 transition-colors"
                >
                    Continue →
                </button>
            )}

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full font-mono text-xs border border-gray-700 z-50 shadow-2xl"
                    >
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    if (isComponent) return content;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full h-full bg-black relative"
        >
            {content}
        </motion.div>
    );
};

