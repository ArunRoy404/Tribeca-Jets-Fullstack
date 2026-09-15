"use client";

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

export default function StaggerItem({ children, className, as: Component = motion.div, ...props }) {
  return (
    <Component
      variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.5, ease: EASE }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}
