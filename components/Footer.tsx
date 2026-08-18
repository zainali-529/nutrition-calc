'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface FooterProps {
  language: 'en' | 'ur';
}

export function Footer({ language }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const t = {
    poweredBy: language === 'en' ? 'Powered by' : 'پیشکش',
    channelName: language === 'en' ? 'Sabtain Animal Talk' : 'سبطین اینیمل ٹاک',
    rights: language === 'en' ? 'All rights reserved.' : 'جملہ حقوق محفوظ ہیں۔',
  };

  const socialLinks = [
    {
      name: 'YouTube',
      url: 'https://youtube.com/@sabtainanimaltalk',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ),
      color: 'hover:text-[#FF0000] hover:bg-red-50 hover:border-red-200',
    },
    {
      name: 'TikTok',
      url: 'https://tiktok.com/@sabtainanimaltalk',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      ),
      color: 'hover:text-black hover:bg-slate-100 hover:border-slate-300',
    },
    {
      name: 'Facebook',
      url: 'https://facebook.com/sabtainanimaltalk',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      color: 'hover:text-[#1877F2] hover:bg-blue-50 hover:border-blue-200',
    },
  ];

  return (
    <footer className="mt-12 border-t border-slate-200/80 bg-white/70 backdrop-blur-sm print:hidden">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          {/* Brand Info + Copyright */}
          <div className="flex flex-col items-center sm:items-start gap-1">
            <Link href="/" className="flex items-center gap-2 group">
              <img
                src="/rumicalc-logo.png"
                alt="RumiCalc Logo"
                className="w-9 h-9 object-contain rounded-xl shadow-xs group-hover:scale-105 transition-transform"
              />
              <span className="font-extrabold text-lg tracking-tight">
                <span className="text-[#0e3b5e]">Rumi</span>
                <span className="text-[#558b2f]">Calc</span>
              </span>
            </Link>
            <p className="text-[11px] text-slate-400 font-medium">
              © {currentYear} RumiCalc. {t.rights}
            </p>
          </div>

          {/* Powered by + Social Media */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0e3b5e]/5 border border-[#0e3b5e]/15 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-600">{t.poweredBy}</span>
              <span className="text-xs font-extrabold text-[#0e3b5e] tracking-wide flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#558b2f] animate-pulse" />
                {t.channelName}
              </span>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center gap-1.5">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -1, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={social.name}
                  title={`${social.name} - Sabtain Animal Talk`}
                  className={`w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center transition-all shadow-xs ${social.color}`}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
