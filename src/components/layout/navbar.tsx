"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Plus, Menu, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onOpenAddTool?: () => void;
}

export function Navbar({ onOpenAddTool }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Retrieve database-backed user profile to check role independently
  const currentUser = useQuery(api.users.viewer);
  const isAdmin = currentUser?.role === "admin";

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
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#292D2A]">
          <Link
            href="/"
            className={cn(
              "hover:text-[#244B3C] transition-colors",
              pathname === "/" && "text-[#244B3C] font-semibold"
            )}
          >
            Discover
          </Link>

          <SignedIn>
            <Link
              href="/dashboard"
              className={cn(
                "hover:text-[#244B3C] transition-colors",
                pathname === "/dashboard" && "text-[#244B3C] font-semibold"
              )}
            >
              Dashboard
            </Link>
            <Link
              href="/listings"
              className={cn(
                "hover:text-[#244B3C] transition-colors",
                pathname === "/listings" && "text-[#244B3C] font-semibold"
              )}
            >
              My Tools
            </Link>
            <Link
              href="/my-requests"
              className={cn(
                "hover:text-[#244B3C] transition-colors",
                pathname === "/my-requests" && "text-[#244B3C] font-semibold"
              )}
            >
              My Requests
            </Link>
            <Link
              href="/incoming-requests"
              className={cn(
                "hover:text-[#244B3C] transition-colors",
                pathname === "/incoming-requests" && "text-[#244B3C] font-semibold"
              )}
            >
              Incoming Requests
            </Link>

            {/* Admin only badge and link */}
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#19372D] text-[#F7F5EF] hover:bg-[#244B3C] transition-colors",
                  pathname === "/admin" && "ring-2 ring-[#F0785B]"
                )}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-[#F0785B]" />
                Admin
              </Link>
            )}
          </SignedIn>

          <SignedOut>
            <Link
              href="/#how-it-works"
              className="hover:text-[#244B3C] transition-colors"
            >
              How it works
            </Link>
            <Link
              href="/#community"
              className="hover:text-[#244B3C] transition-colors"
            >
              Community
            </Link>
          </SignedOut>
        </nav>

        {/* Right Action buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <SignedOut>
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button variant="primary" size="sm">
                Get started
              </Button>
            </Link>
          </SignedOut>

          <SignedIn>
            {onOpenAddTool && (
              <Button
                variant="coral"
                size="sm"
                onClick={onOpenAddTool}
                className="shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Lend a tool
              </Button>
            )}
            <div className="ml-1 pl-2 border-l border-[#E7E3D9]">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-9 h-9 border border-[#9CAF91]",
                  },
                }}
              />
            </div>
          </SignedIn>
        </div>

        {/* Mobile menu toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <SignedIn>
            <UserButton />
          </SignedIn>
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
          <nav className="flex flex-col space-y-2 text-base font-medium text-[#292D2A]">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-[#DCE7D9]/50 transition-colors"
            >
              Discover
            </Link>

            <SignedIn>
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-[#DCE7D9]/50 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/listings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-[#DCE7D9]/50 transition-colors"
              >
                My Tools
              </Link>
              <Link
                href="/my-requests"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-[#DCE7D9]/50 transition-colors"
              >
                My Requests
              </Link>
              <Link
                href="/incoming-requests"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-[#DCE7D9]/50 transition-colors"
              >
                Incoming Requests
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-[#F0785B] font-semibold hover:bg-[#DCE7D9]/50 transition-colors"
                >
                  Admin Control Panel
                </Link>
              )}
            </SignedIn>

            <SignedOut>
              <Link
                href="/#how-it-works"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-[#DCE7D9]/50 transition-colors"
              >
                How it works
              </Link>
              <Link
                href="/#community"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-[#DCE7D9]/50 transition-colors"
              >
                Community
              </Link>
              <div className="pt-3 border-t border-[#E7E3D9] flex flex-col gap-2">
                <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" size="md" className="w-full justify-center">
                    Sign in
                  </Button>
                </Link>
                <Link href="/sign-up" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full justify-center">
                    Get started
                  </Button>
                </Link>
              </div>
            </SignedOut>
          </nav>
        </div>
      )}
    </header>
  );
}
