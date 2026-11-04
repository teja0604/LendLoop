"use client";

import React from "react";
import Image from "next/image";
import { ArrowRight, Sparkles, HeartHandshake, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onExploreClick: () => void;
  onLendClick: () => void;
}

export function HeroSection({ onExploreClick, onLendClick }: HeroSectionProps) {
  return (
    <section className="relative pt-6 pb-16 md:pt-12 md:pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Editorial Headline & Copy */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-left">
            {/* Small Community Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DCE7D9] text-[#19372D] text-xs font-semibold tracking-wide border border-[#9CAF91]/50 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#244B3C]" />
              <span>Sharing starts right next door</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-editorial text-4xl sm:text-5xl md:text-6xl text-[#19372D] font-normal leading-[1.08] tracking-tight">
              Good tools deserve <br />
              <span className="italic font-normal text-[#244B3C]">
                to be shared.
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-[#777D76] max-w-xl font-sans leading-relaxed">
              Find the tools you need, lend the ones you own, and make your
              neighbourhood a little more connected. No expensive rentals, no
              storage clutter.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={onExploreClick}
                className="group"
              >
                <span>Explore tools</span>
                <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={onLendClick}
                className="hover:border-[#244B3C]"
              >
                Lend a tool
              </Button>
            </div>

            {/* Trust points */}
            <div className="pt-6 border-t border-[#E7E3D9] flex flex-wrap items-center gap-6 text-xs text-[#777D76]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#244B3C]" />
                <span>Verified neighbour requests</span>
              </div>
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-[#F0785B]" />
                <span>Zero rental fee ethos</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Collage with authentic photo & design details */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Decorative background shapes */}
              <div className="absolute -top-4 -right-4 w-72 h-72 bg-[#DCE7D9] rounded-3xl -z-10 transform rotate-2 transition-transform" />
              <div className="absolute -bottom-6 -left-6 w-60 h-60 bg-[#F2D98D]/40 rounded-3xl -z-10 transform -rotate-3" />

              {/* Main Photo Card */}
              <div className="relative rounded-3xl overflow-hidden border border-[#E7E3D9] bg-white shadow-xl">
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src="https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1000&q=80"
                    alt="Neighbour sharing woodworking and gardening tools"
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 500px"
                    className="object-cover"
                  />
                  {/* Subtle gradient vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  {/* Overlaid highlight card */}
                  <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E7E3D9] shadow-md flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CAF91]">
                        Neighbourhood Exchange
                      </p>
                      <h4 className="text-sm font-semibold text-[#19372D]">
                        Over 8 useful tools ready to borrow
                      </h4>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-[#244B3C] text-white flex items-center justify-center shrink-0">
                      <ArrowRight className="w-4 h-4 -rotate-45" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Mini Badge */}
              <div className="absolute -top-5 -left-4 hidden sm:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-[#E7E3D9] shadow-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-[#244B3C] animate-pulse" />
                <span className="text-xs font-semibold text-[#19372D]">
                  Active Community Pool
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
