"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/hero/hero-section";
import { ToolGrid } from "@/components/tools/tool-grid";
import { HowItWorks } from "@/components/sections/how-it-works";
import { CommunitySection } from "@/components/sections/community-section";

export default function LandingPage() {
  const [isAddToolOpen, setIsAddToolOpen] = useState(false);

  const scrollToDiscover = () => {
    const el = document.getElementById("discover");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EF] text-[#292D2A]">
      {/* Navigation */}
      <Navbar onOpenAddTool={() => setIsAddToolOpen(true)} />

      {/* Hero */}
      <HeroSection
        onExploreClick={scrollToDiscover}
        onLendClick={() => setIsAddToolOpen(true)}
      />

      {/* Discovery Section */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-left space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#244B3C]">
              Neighbourhood Catalog
            </p>
            <h2 className="font-editorial text-3xl sm:text-4xl text-[#19372D] font-normal tracking-tight">
              Find what you need.
            </h2>
            <p className="text-sm sm:text-base text-[#777D76]">
              Useful things are closer than you think. Explore tools currently
              shared by nearby residents.
            </p>
          </div>

          <ToolGrid
            isAddToolOpen={isAddToolOpen}
            onCloseAddTool={() => setIsAddToolOpen(false)}
          />
        </div>
      </section>

      {/* How it Works */}
      <HowItWorks />

      {/* Community Ethos */}
      <CommunitySection />

      {/* Footer */}
      <Footer />
    </div>
  );
}
