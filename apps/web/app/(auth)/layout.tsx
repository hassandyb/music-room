import {
  MusicIcon,
  Sparkles,
  Users,
  Headphones,
  Calendar,
  Disc3,
} from "lucide-react";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark relative flex h-screen w-screen overflow-hidden bg-[#080808]">
      {/* ── GRID BACKGROUND ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── ORANGE GLOW BLOBS ── */}
      <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-[#ff4d00]/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 left-1/2 h-[400px] w-[400px] rounded-full bg-[#ff4d00]/5 blur-[100px] pointer-events-none" />
      <div className="absolute right-0 top-1/3 h-[300px] w-[300px] rounded-full bg-[#ff4d00]/5 blur-[80px] pointer-events-none" />

      {/* ── LEFT SIDE ── */}
      <div className="hidden xl:flex h-screen w-full relative z-10 flex-col border-r border-white/5">
        {/* Logo - fixed height */}
        <div className="h-[100px] flex-shrink-0 relative z-10 p-8 lg:p-10">
          <a
            href="#"
            className="group flex items-center gap-2.5 font-medium text-white/90 transition-opacity hover:opacity-80"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff4d00] to-[#e64400] shadow-lg shadow-[#ff4d00]/25 transition-transform group-hover:scale-105">
              <MusicIcon className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Music <span className="text-[#ff4d00]">Room</span>
            </span>
          </a>
        </div>

        {/* Center Content - this will take all available space */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 lg:px-16 gap-8 lg:gap-10 min-h-0">
          {/* Decorative element */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-[#ff4d00]/5 blur-2xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <Disc3 className="h-10 w-10 text-[#ff4d00] animate-spin-slow" />
            </div>
          </div>

          {/* Headline */}
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-4xl font-bold tracking-tight text-white/95 leading-tight">
              Music is better
              <br />
              <span className="text-[#ff4d00]">together.</span>
            </h1>
            <p className="text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
              Create events, vote on tracks, and build playlists with friends -
              all in real time.
            </p>
          </div>

          {/* Live Event Pill */}
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-3 backdrop-blur-sm transition-all hover:border-[#ff4d00]/30">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff4d00] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#ff4d00]" />
            </span>
            <span className="text-xs font-medium text-white/60">
              3 events <span className="text-white/40">·</span>{" "}
              <span className="text-white/40">48 listeners live</span>
            </span>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6">
            {[
              { icon: Calendar, label: "12", sub: "Events" },
              { icon: Headphones, label: "156", sub: "Listeners" },
              { icon: Sparkles, label: "312", sub: "Votes" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-xl font-bold text-white/90">
                  {stat.label}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-white/20">
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Feature Row - fixed height */}
        <div className="h-[100px] flex-shrink-0 relative z-10 border-t border-white/5 bg-white/5 p-6 lg:p-8">
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: "Track Vote",
                desc: "Let the crowd decide",
                icon: Disc3,
              },
              {
                label: "Playlist Editor",
                desc: "Build together, live",
                icon: MusicIcon,
              },
              {
                label: "Live Events",
                desc: "Public or private rooms",
                icon: Users,
              },
            ].map((feature) => (
              <div key={feature.label} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-white/5 p-1.5">
                  <feature.icon className="h-3.5 w-3.5 text-white/30" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-medium text-white/60">
                    {feature.label}
                  </div>
                  <div className="text-[10px] text-white/25">
                    {feature.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE ── */}
      <div className="relative z-20 flex w-full xl:max-w-[620px] flex-col items-center justify-center bg-white/5 p-8 backdrop-blur-sm lg:p-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
