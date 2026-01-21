"use client";

import { useState, useEffect } from "react";

const MASCOT_IMAGES = [
    "/mascot_pose_1.png",
    "/mascot_pose_2.png",
    "/mascot_pose_3.png",
    "/mascot_pose_4.png",
    "/mascot_pose_5.png"
];

export default function MascotCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % MASCOT_IMAGES.length);
        }, 10000); // Change every 10 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-64 h-64 mx-auto hover:scale-105 transition-transform duration-500">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow"></div>

            {/* Images */}
            {MASCOT_IMAGES.map((src, index) => (
                <img
                    key={src}
                    src={src}
                    alt={`EiryBot Pose ${index + 1}`}
                    className={`
                        absolute inset-0 w-full h-full object-contain drop-shadow-2xl transition-opacity duration-1000 ease-in-out
                        ${index === currentIndex ? "opacity-100 scale-100" : "opacity-0 scale-95"}
                    `}
                />
            ))}
        </div>
    );
}
