"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onOpenAddTool: () => void;
}

export function Navbar({ onOpenAddTool }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-200",
        isScrolled
          ? "bg-[#F7F5EF]/90 backdrop-blur-md border-b border-[#E7E3D9] shadow-xs py-3.5"
          : "bg-transparent py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#244B3C] rounded-lg"
        >
          {/* Custom circular loop symbol */}
          <div className="w-9 h-9 rounded-xl bg-[#244B3C] flex items-center justify-center text-[#F7F5EF] shadow-sm group-hover:bg-[#19372D] transition-colors">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 11V7a5 5 0 0 1 10 0v1" />
              <path d="M17 13v4a5 5 0 0 1-10 0v-1" />
              <polyline points="15 6 17 8 19 6" />
              <polyline points="9 18 7 16 5 18" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-editorial text-2xl font-normal tracking-tight text-[#19372D]">
              LendLoop
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#292D2A]">
          <a
            href="#discover"
            className="hover:text-[#244B3C] transition-colors"
          >
            Discover
          </a>
          <a
            href="#how-it-works"
            className="hover:text-[#244B3C] transition-colors"
          >
            How it works
          </a>
          <a
            href="#community"
            className="hover:text-[#244B3C] transition-colors"
          >
            Community
          </a>
        </nav>

        {/* Action button */}
        <div className="hidden sm:flex items-center gap-3">
          <Button
            variant="coral"
            size="sm"
            onClick={onOpenAddTool}
            className="shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Lend a tool
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="coral"
            size="sm"
            onClick={onOpenAddTool}
            className="sm:hidden text-xs px-3 py-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-xl text-[#19372D] hover:bg-[#DCE7D9]/50 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-[#E7E3D9] bg-[#F7F5EF] px-4 pt-3 pb-6 space-y-4 shadow-lg animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col space-y-3 text-base font-medium text-[#292D2A]">
            <a
              href="#discover"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-[#DCE7D9]/50 transition-colors"
            >
              Discover Tools
            </a>
            <a
              href="#how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-[#DCE7D9]/50 transition-colors"
            >
              How it works
            </a>
            <a
              href="#community"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-[#DCE7D9]/50 transition-colors"
            >
              Community Philosophy
            </a>
          </nav>
          <div className="pt-2">
            <Button
              variant="coral"
              size="md"
              className="w-full justify-center"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenAddTool();
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Lend a tool
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
