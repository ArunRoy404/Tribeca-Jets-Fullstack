"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-ink text-white flex flex-col justify-between selection:bg-purple selection:text-white">
      {/* Background Visual Layer */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <Image
          src="/auth/bg/hero.png"
          alt=""
          fill
          priority
          className="object-cover opacity-60"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/90 via-ink/80 to-ink" />
        <Image
          src="/auth/img/ellipse-glow.svg"
          alt=""
          width={1985.2}
          height={1591.2}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] sm:h-[1200px] w-[1200px] sm:w-[1600px] -translate-x-1/2 -translate-y-1/2 opacity-70"
        />
      </div>

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between p-4 sm:p-6 md:px-12 md:py-8 w-full max-w-7xl mx-auto">
        <Link href="/dashboard" className="flex items-center gap-2 group cursor-pointer">
          <Image
            src="/auth/img/logo-white.svg"
            alt="Tribeca Jets"
            width={140}
            height={48}
            className="h-8 sm:h-10 w-auto object-contain transition-opacity group-hover:opacity-90"
          />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-destructive" />
          </span>
          <span className="font-montserrat text-[10px] sm:text-[11px] font-bold tracking-wider text-white/90 uppercase">
            Radar Alert · Off Course
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col items-center justify-center p-4 sm:p-8 md:p-10 w-full max-w-2xl mx-auto my-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-4 sm:gap-6 w-full"
        >
          {/* Beacon Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-purple/15 border border-purple/30 text-purple backdrop-blur-md">
            <Compass className="size-3.5 animate-spin" style={{ animationDuration: "12s" }} />
            <span className="font-montserrat text-[11px] sm:text-[12px] font-bold tracking-widest uppercase">
              Airspace Error Code 404
            </span>
          </div>

          {/* Big Metallic Gradient 404 */}
          <div className="relative">
            <h1 className="font-montserrat font-extrabold text-[80px] sm:text-[110px] md:text-[140px] leading-none tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/20 select-none">
              404
            </h1>
            <div className="absolute inset-0 bg-gradient-to-r from-purple/30 to-info/20 blur-3xl opacity-50 pointer-events-none -z-10" />
          </div>

          {/* Headline & Subtitle */}
          <div className="flex flex-col gap-2 sm:gap-2.5 max-w-lg px-2">
            <h2 className="font-montserrat font-bold text-[20px] sm:text-[26px] md:text-[32px] text-white tracking-tight">
              Waypoint Lost in Airspace
            </h2>
            <p className="font-montserrat font-normal text-[13px] sm:text-[15px] text-white/70 leading-relaxed">
              The requested flight path, page coordinates, or charter resource could not be found. It may have been rerouted, decommissioned, or mistyped.
            </p>
          </div>

          {/* Single Action Button (Strict horizontal row with no wrapping) */}
          <div className="pt-2 sm:pt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center flex-row gap-2.5 whitespace-nowrap bg-white hover:bg-white/90 text-ink font-montserrat font-bold text-[13px] sm:text-[14px] h-11 sm:h-12 px-6 sm:px-8 rounded-lg shadow-xl hover:shadow-2xl transition-all cursor-pointer"
            >
              <ArrowLeft className="size-4 shrink-0 text-ink" />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Flight Telemetry Footer */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:px-8 md:px-12 sm:py-6 w-full max-w-7xl mx-auto border-t border-white/10 text-[11px] sm:text-[12px] font-montserrat text-white/50 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-success inline-block shrink-0" />
          <span className="tracking-wide">TRIBECA JETS CHARTER COMMAND</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-[11px] tracking-wider text-white/40 font-mono">
          <span>HDG 240°</span>
          <span>•</span>
          <span>ALT 41,000 FT</span>
          <span>•</span>
          <span>MACH 0.85</span>
        </div>
        <div>
          <span>© {new Date().getFullYear()} Tribeca Jets. All rights reserved.</span>
        </div>
      </footer>
    </main>
  );
}
