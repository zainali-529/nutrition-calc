'use client';

import { motion } from 'framer-motion';

interface HeaderProps {
  title: string;
  subtitle: string;
  icon?: string;
}

export function Header({ title, subtitle, icon = '🌾' }: HeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-8 px-4"
    >
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-5xl mb-4 inline-block"
      >
        {icon}
      </motion.div>
      <h1 className="text-4xl font-bold text-gradient mb-2">{title}</h1>
      <p className="text-gray-600 text-lg max-w-2xl mx-auto">{subtitle}</p>
    </motion.div>
  );
}
