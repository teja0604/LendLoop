import React from "react";
import { Search, CalendarDays, CheckCircle2 } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: <Search className="w-6 h-6 text-[#244B3C]" />,
      title: "Find a tool",
      description:
        "Browse useful tools shared by people in your neighbourhood. Filter by category, project type, or immediate availability.",
    },
    {
      number: "02",
      icon: <CalendarDays className="w-6 h-6 text-[#244B3C]" />,
      title: "Request to borrow",
      description:
        "Choose the dates you need and send a friendly borrowing request. Tool owners review and approve available dates.",
    },
    {
      number: "03",
      icon: <CheckCircle2 className="w-6 h-6 text-[#244B3C]" />,
      title: "Share and return",
      description:
        "Pick up the tool, finish your project, and return it clean and ready for the next neighbour. Simple, circular, and free.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-[#F7F5EF] border-t border-[#E7E3D9] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#244B3C]">
            Simple Process
          </p>
          <h2 className="font-editorial text-3xl sm:text-4xl text-[#19372D] font-normal tracking-tight">
            Sharing made simple.
          </h2>
          <p className="text-sm sm:text-base text-[#777D76] font-sans">
            How LendLoop connects nearby tool owners with people tackling weekend
            DIY projects.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative rounded-3xl bg-white border border-[#E7E3D9] p-8 shadow-xs hover:border-[#9CAF91] transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#DCE7D9] flex items-center justify-center">
                    {step.icon}
                  </div>
                  <span className="font-editorial text-2xl text-[#9CAF91] font-normal">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-editorial text-xl text-[#19372D] font-normal mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-[#777D76] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
