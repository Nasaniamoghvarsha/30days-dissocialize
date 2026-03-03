import React, { ReactNode } from 'react';

export const Label = ({ children, style }: { children: ReactNode, style?: React.CSSProperties }) => {
    return (
        <div style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: 'var(--gray-400)',
            ...style
        }}>
            {children}
        </div>
    );
};
