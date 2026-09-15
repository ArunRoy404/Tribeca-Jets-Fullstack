"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

export default function AuthCard({ backHref, showLogo = false, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative flex w-full max-w-[500px] flex-col items-center gap-6 rounded-lg bg-card p-8 shadow-card sm:p-10"
    >
      {backHref && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="self-start"
        >
          <Link href={backHref} className="flex items-center gap-2 text-warm-gray hover:opacity-80">
            <span className="flex size-8 items-center justify-center rounded-full border border-warm-gray">
              <Image src="/auth/icons/chevron-back.svg" alt="" width={16} height={16} className="size-4 rotate-90" />
            </span>
            <span className="font-montserrat font-bold text-[16px]">Go Back</span>
          </Link>
        </motion.div>
      )}

      {showLogo && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
        >
          <Image src="/auth/img/logo-dark.svg" alt="Tribeca Jets" width={168} height={100} className="h-[100px] w-[168px]" />
        </motion.div>
      )}

      {children}
    </motion.div>
  );
}
