import React from "react";
import { Sparkles, Leaf, Users, Wrench } from "lucide-react";

export function CommunitySection() {
  const highlights = [
    {
      icon: <Leaf className="w-5 h-5 text-[#9CAF91]" />,
      title: "Sustainable living",
      description: "Less manufacturing demand, fewer single-use tool purchases.",
    },
    {
      icon: <Users className="w-5 h-5 text-[#F2D98D]" />,
      title: "Stronger neighborhoods",
      description: "Meaningful connections created over everyday projects and garden care.",
    },
    {
      icon: <Wrench className="w-5 h-5 text-[#F0785B]" />,
      title: "Better tools for all",
      description: "Access high-end equipment without spending hundreds on a single project.",
    },
  ];

  return (
    <section id="community" className="py-20 bg-[#19372D] text-[#F7F5EF] relative overflow-hidden scroll-mt-20">
      {/* Decorative subtle ambient circles */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#244B3C] rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#9CAF91]/20 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#244B3C] border border-[#9CAF91]/40 text-[#DCE7D9] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#F2D98D]" />
              <span>Neighbourhood Ethos</span>
            </div>

            <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl font-normal leading-tight text-white">
              Less buying. <br />
              <span className="text-[#9CAF91] italic">More sharing.</span>
            </h2>

            <p className="text-sm sm:text-base text-[#DCE7D9]/80 font-sans leading-relaxed max-w-lg">
              The average power drill is used for less than 15 minutes in its
              entire lifetime. By pooling tools with nearby neighbours, we save
              money, reduce consumer waste, and keep valuable tools doing what
              they were made to do: working.
            </p>
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            {highlights.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-[#244B3C]/70 border border-[#9CAF91]/20 backdrop-blur-xs space-y-3"
              >
                <div className="p-3 rounded-2xl bg-[#19372D] w-fit">
                  {item.icon}
                </div>
                <h4 className="text-base font-semibold text-white">
                  {item.title}
                </h4>
                <p className="text-xs text-[#DCE7D9]/70 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}

            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#244B3C] to-[#1e4134] border border-[#F2D98D]/30 flex flex-col justify-center text-left">
              <p className="font-editorial text-2xl text-[#F2D98D] italic mb-1">
                Zero fees.
              </p>
              <p className="text-xs text-[#DCE7D9]">
                LendLoop is driven by neighbourly reciprocity and shared community goodwill.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
