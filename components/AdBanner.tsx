
import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
    className?: string;
    format?: 'auto' | 'fluid' | 'rectangle';
    clientId?: string;
    slotId?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ 
    className = '', 
    format = 'auto',
    clientId = "ca-pub-2826263278655860", // Default provided by user
    slotId = "6505435536"                // Default provided by user
}) => {
    const adRef = useRef<HTMLModElement>(null);
    const loadedRef = useRef(false); // Track if ad push was attempted

    useEffect(() => {
        if (!clientId) return;

        try {
            // @ts-ignore
            const adsbygoogle = window.adsbygoogle || [];
            
            // Check if ad element exists and hasn't been populated yet
            // We use a ref tracker and DOM check to prevent StrictMode double-invocations
            if (adRef.current && !loadedRef.current && adRef.current.innerHTML === "") {
                loadedRef.current = true;
                // @ts-ignore
                adsbygoogle.push({});
            }
        } catch (e) {
            console.error("AdSense Error:", e);
        }
    }, [clientId, slotId]);

    // Fallback UI if no ID provided
    if (!clientId) {
        return (
            <div className={`w-full bg-gray-900/50 border border-dashed border-gray-700 rounded-xl p-4 text-center flex flex-col items-center justify-center min-h-[100px] ${className}`}>
                <span className="text-gray-500 text-xs font-mono font-bold mb-1">GOOGLE ADSENSE AREA</span>
                <span className="text-gray-600 text-[10px]">
                    AdBanner.tsx 파일에 ID를 설정해주세요.
                </span>
            </div>
        );
    }

    return (
        <div className={`w-full flex flex-col items-center my-6 ${className}`}>
            <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mb-2 opacity-50">
                Sponsored
            </div>
            {/* 
                Fluid Container:
                - w-full: Always take full width of parent
                - min-h: Prevents layout shift (CLS) before ad loads
                - overflow-hidden: Keeps rounded corners clean
            */}
            <div className="w-full bg-white/5 min-h-[100px] flex justify-center items-center overflow-hidden rounded-lg">
                 {/* @ts-ignore */}
                <ins className="adsbygoogle"
                    ref={adRef}
                    style={{ display: 'block', width: '100%' }} // Removed fixed minWidth for full responsiveness
                    data-ad-client={clientId}
                    data-ad-slot={slotId}
                    data-ad-format={format}
                    data-full-width-responsive="true"
                ></ins>
            </div>
        </div>
    );
};
