"use client";

import { motion } from "framer-motion";

export default function StaggerContainer({ children, className, stagger = 0.08, delay = 0.25 }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
