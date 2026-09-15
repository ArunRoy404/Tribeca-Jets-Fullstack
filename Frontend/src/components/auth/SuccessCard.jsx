"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import StaggerContainer from "@/components/common/StaggerContainer";
import StaggerItem from "@/components/common/StaggerItem";

const EASE = [0.22, 1, 0.36, 1];

export default function SuccessCard({ title, description, ctaLabel, ctaHref }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="flex w-full max-w-[500px] flex-col items-center gap-6 rounded-lg bg-card px-8 py-12 shadow-card sm:px-10"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative flex size-[72px] items-center justify-center"
      >
        <Image src="/auth/icons/success.svg" alt="" fill className="absolute inset-0" />
        <span className="relative font-montserrat font-bold text-[32px] text-success-icon">✓</span>
      </motion.div>

      <StaggerContainer delay={0.35} className="contents">
        <StaggerItem className="flex flex-col items-center gap-3 text-center">
          <p className="font-montserrat font-bold text-[36px] text-ink">{title}</p>
          <p className="font-montserrat font-medium text-[16px] text-slate">{description}</p>
        </StaggerItem>

        <StaggerItem className="w-full">
          <Button render={<Link href={ctaHref} />} nativeButton={false} size="cta" className="w-full">
            {ctaLabel}
          </Button>
        </StaggerItem>
      </StaggerContainer>
    </motion.div>
  );
}
