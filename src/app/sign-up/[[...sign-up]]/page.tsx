import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-[#F7F5EF] p-4 sm:p-6 lg:p-8">
      {/* Return Home Button */}
      <div className="w-full max-w-5xl mb-6 flex justify-start">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#19372D] hover:text-[#244B3C] px-3.5 py-1.5 rounded-full bg-white border border-[#E7E3D9] transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to LendLoop</span>
        </Link>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-[#E7E3D9] bg-white shadow-xl">
        {/* Brand Left Editorial Column */}
        <div className="lg:col-span-5 bg-[#19372D] text-[#F7F5EF] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#244B3C] border border-[#9CAF91]/40 text-[#DCE7D9] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#F2D98D]" />
              <span>Join the Loop</span>
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl text-white font-normal leading-tight">
              Start sharing with <br />
              <span className="text-[#9CAF91] italic">your neighbours.</span>
            </h1>
            <p className="text-sm text-[#DCE7D9]/80 font-sans leading-relaxed">
              Create an account in seconds. Share tools sitting idle in your
              shed, borrow gear for weekend DIY, and help build a more
              sustainable community.
            </p>
          </div>

          <div className="pt-8 border-t border-[#244B3C] relative z-10 text-xs text-[#DCE7D9]/60">
            Neighbour-first • Verified requests • Zero rental fees
          </div>
        </div>

        {/* Auth Component Right Column */}
        <div className="lg:col-span-7 bg-[#F7F5EF] p-6 sm:p-10 flex items-center justify-center">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/dashboard"
          />
        </div>
      </div>
    </main>
  );
}

