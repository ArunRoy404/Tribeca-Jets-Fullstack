"use client";

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Reveal({ children, delay = 0, duration = 0.6, trigger = "scroll", className }) {
  const triggerProps =
    trigger === "mount"
      ? { initial: "hidden", animate: "visible" }
      : { initial: "hidden", whileInView: "visible", viewport: { once: true, amount: 0.2 } };

  return (
    <motion.div variants={variants} transition={{ duration, delay, ease: EASE }} className={className} {...triggerProps}>
      {children}
    </motion.div>
  );
}
