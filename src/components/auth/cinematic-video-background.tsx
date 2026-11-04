"use client";

import React, { useState } from "react";
import Image from "next/image";

interface CinematicVideoBackgroundProps {
  posterSrc?: string;
}

export function CinematicVideoBackground({
  posterSrc = "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1600&q=80",
}: CinematicVideoBackgroundProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#19372D]">
      {/* Fallback & Poster image (active while video loads or if reduced-motion is requested) */}
      <div
        className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
          videoLoaded ? "opacity-0" : "opacity-100"
        }`}
      >
        <Image
          src={posterSrc}
          alt="Neighborhood tool sharing backdrop"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
        />
      </div>

      {/* Video element - respects reduced-motion via Tailwind media queries */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={posterSrc}
        onLoadedData={() => setVideoLoaded(true)}
        className="absolute inset-0 w-full h-full object-cover hidden md:motion-safe:block transition-opacity duration-1000"
      >
        <source src="/videos/lendloop-background.mp4" type="video/mp4" />
      </video>

      {/* Cinematic Deep Forest gradient overlay ensuring readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#19372D] via-[#19372D]/60 to-[#19372D]/75 mix-blend-multiply" />
      <div className="absolute inset-0 bg-[#244B3C]/30" />
    </div>
  );
}
