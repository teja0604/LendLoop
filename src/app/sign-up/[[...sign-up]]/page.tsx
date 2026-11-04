import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";
import { CinematicVideoBackground } from "@/components/auth/cinematic-video-background";

export default function SignUpPage() {
  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F7F5EF] text-[#292D2A] relative">
      {/* LEFT SECTION: 60% Width Cinematic Video on Desktop */}
      <section className="relative w-full lg:w-[60%] min-h-[420px] lg:min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-16 z-0 overflow-hidden">
        {/* Cinematic Video Background Layer */}
        <CinematicVideoBackground />

        {/* Top Header / Brand Mark */}
        <div className="relative z-10 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DCE7D9] rounded-lg"
          >
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-[#F7F5EF] shadow-sm group-hover:bg-white/25 transition-colors">
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
            <span className="font-editorial text-2xl font-normal tracking-tight text-white">
              LendLoop
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 transition-all shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to home</span>
          </Link>
        </div>

        {/* Middle Editorial Story */}
        <div className="relative z-10 my-auto py-12 max-w-xl text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#DCE7D9] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#F2D98D]" />
            <span>Join Your Community Pool</span>
          </div>

          <h1 className="font-editorial text-3xl sm:text-5xl lg:text-6xl text-white font-normal leading-[1.08] tracking-tight">
            Make sharing part of <br />
            <span className="text-[#9CAF91] italic">your neighbourhood.</span>
          </h1>

          <p className="text-sm sm:text-base text-[#DCE7D9]/90 font-sans leading-relaxed max-w-md">
            Join your community. Discover useful tools. Share more, waste less,
            and create real local reciprocity right where you live.
          </p>
        </div>

        {/* Bottom Trust Note */}
        <div className="relative z-10 pt-6 border-t border-white/15 flex items-center gap-2 text-xs text-[#DCE7D9]/75">
          <ShieldCheck className="w-4 h-4 text-[#9CAF91] shrink-0" />
          <span>Quick signup • Verified local members • Free tool access.</span>
        </div>
      </section>

      {/* RIGHT SECTION: 40% Width Clerk Authentication Form */}
      <section className="w-full lg:w-[40%] min-h-[500px] lg:min-h-screen flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 z-10 bg-[#F7F5EF] relative shadow-2xl lg:shadow-none">
        <div className="w-full max-w-md mx-auto flex flex-col items-center">
          <div className="mb-6 text-center space-y-1.5">
            <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-[#19372D]">
              Create an account
            </h2>
            <p className="text-xs sm:text-sm text-[#777D76]">
              Start sharing and borrowing tools in seconds.
            </p>
          </div>

          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/dashboard"
          />
        </div>
      </section>
    </main>
  );
}
