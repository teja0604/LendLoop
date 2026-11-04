import React from "react";

export function Footer() {
  return (
    <footer className="border-t border-[#E7E3D9] bg-[#F7F5EF] py-14 text-sm text-[#777D76]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 border-b border-[#E7E3D9]">
          <div className="space-y-2 max-w-sm">
            <div className="flex items-center gap-2">
              <span className="font-editorial text-2xl text-[#19372D] font-normal tracking-tight">
                LendLoop
              </span>
            </div>
            <p className="text-xs text-[#777D76] leading-relaxed">
              A neighbourhood tool-lending community where people share useful
              gear, save money, and build local trust instead of letting tools
              sit idle.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 sm:gap-10 text-xs font-medium text-[#292D2A]">
            <a href="#discover" className="hover:text-[#244B3C] transition-colors">
              Discover Tools
            </a>
            <a href="#how-it-works" className="hover:text-[#244B3C] transition-colors">
              How It Works
            </a>
            <a href="#community" className="hover:text-[#244B3C] transition-colors">
              Community
            </a>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#777D76]">
          <p>© 2026 LendLoop Community. Built for neighborhood sharing.</p>
          <p className="italic text-[#9CAF91]">
            “Borrow what you need. Lend what you don&apos;t.”
          </p>
        </div>
      </div>
    </footer>
  );
}
