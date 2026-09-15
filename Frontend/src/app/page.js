"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push("/sign-in"), 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Link
      href="/sign-in"
      className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-ink cursor-pointer"
    >
      <Image src="/auth/bg/hero.png" alt="" fill priority className="object-cover" sizes="100vw" />
      <div className="absolute inset-0 bg-[rgba(13,18,32,0.6)]" />
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <Image src="/auth/img/logo-splash.svg" alt="Tribeca Jets" width={400} height={238} className="h-[238px] w-[400px]" />
      </motion.div>
    </Link>
  );
}
