"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1];

/**
 * Full-screen branded loading state.
 *
 * Shown while the session is being confirmed, so the dashboard never flashes a
 * blank screen — or worse, protected content — before the user is known.
 *
 * Reuses the auth hero's visual language (ink ground, ellipse glow, hairline +
 * label, purple accent) so the first thing a user sees after sign-in belongs to
 * the same product as the screen they just left.
 */
export default function FullPageLoader({
  label = "Loading…",
  className,
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "relative flex min-h-screen w-full flex-1 items-center justify-center overflow-hidden bg-ink px-6",
        className,
      )}
    >
      {/* Same glow that sits behind the auth hero panel. */}
      <Image
        src="/auth/img/ellipse-glow.svg"
        alt=""
        width={1985}
        height={1591}
        priority
        className="pointer-events-none absolute left-1/2 top-1/2 h-auto w-[1400px] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-60 sm:w-[1985px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative flex flex-col items-center gap-7 sm:gap-8"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
        >
          <Image
            src="/auth/img/logo-splash.svg"
            alt="Tribeca Jets"
            width={400}
            height={238}
            priority
            className="h-auto w-[160px] sm:w-[200px]"
          />
        </motion.div>

        {/* The hairline + label pairing used on the auth hero. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="h-px w-[38px] bg-white/60" />
          <p className="font-montserrat text-[13px] font-medium tracking-[0.18em] text-white/80 sm:text-[14px]">
            COMMAND CENTER
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col items-center gap-3.5"
        >
          {/*
            Indeterminate bar: the wait has no measurable progress, so it
            sweeps rather than filling — a bar that fills to 90% and stalls
            reads as broken.
          */}
          <div className="relative h-[3px] w-[200px] overflow-hidden rounded-full bg-white/10 sm:w-[240px]">
            <motion.div
              animate={{ x: ["-110%", "310%"] }}
              transition={{
                duration: 1.5,
                ease: [0.45, 0, 0.55, 1],
                repeat: Infinity,
                repeatDelay: 0.15,
              }}
              className="absolute inset-y-0 w-[32%] rounded-full bg-purple shadow-glow-purple"
            />
          </div>

          <p className="font-montserrat text-[13px] font-normal text-white/55">
            {label}
          </p>
        </motion.div>
      </motion.div>

      <span className="sr-only">{label}</span>
    </div>
  );
}
