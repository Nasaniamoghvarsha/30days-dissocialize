import React from 'react';
import {
    Youtube,
    Instagram,
    Twitter,
    MessageSquare,
    Camera,
    Map as MapIcon,
    FileText,
    Smartphone,
    LayoutGrid,
    AppWindow
} from 'lucide-react';

export const APP_ICON_MAP: Record<string, React.ReactNode> = {
    // Social Apps
    'com.google.android.youtube': <Youtube strokeWidth={1.5} size={28} />,
    'com.instagram.android': <Instagram strokeWidth={1.5} size={28} />,
    'com.twitter.android': <Twitter strokeWidth={1.5} size={28} />,
    'com.zhiliaoapp.musically': <LayoutGrid strokeWidth={1.5} size={28} />, // TikTok
    'com.tiktok.android': <LayoutGrid strokeWidth={1.5} size={28} />,

    // Core Utility Apps
    'com.google.android.apps.messaging': <MessageSquare strokeWidth={1.5} size={28} />,
    'com.google.android.GoogleCamera': <Camera strokeWidth={1.5} size={28} />,
    'com.google.android.apps.maps': <MapIcon strokeWidth={1.5} size={28} />,
    'com.google.android.keep': <FileText strokeWidth={1.5} size={28} />,
    'com.android.chrome': <Smartphone strokeWidth={1.5} size={28} />,
};

export const getAppIcon = (packageName?: string) => {
    if (!packageName) return <AppWindow strokeWidth={1.5} size={28} />;
    return APP_ICON_MAP[packageName] || <AppWindow strokeWidth={1.5} size={28} />;
};
