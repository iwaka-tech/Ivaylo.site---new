import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles, BookOpen, Lightbulb, User } from 'lucide-react';

export const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Инфо', icon: Sparkles },
    { path: '/blog', label: 'Блог', icon: BookOpen },
    { path: '/useful', label: 'Полезно', icon: Lightbulb },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-4 md:px-6 py-3 md:py-4 flex flex-row justify-between items-center pointer-events-none">
      <Link to="/" className="pointer-events-auto group">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-lg md:text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 group-hover:from-cyan-400 group-hover:to-indigo-400 transition-all duration-500"
        >
          ivaylo.site
        </motion.h1>
      </Link>

      <div className="flex items-center gap-1 bg-white/5 backdrop-blur-xl px-1.5 py-1 rounded-full border border-white/10 shadow-2xl pointer-events-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={`relative flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-300 ${
                isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-white/10 rounded-full border border-white/10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon size={14} className={isActive ? 'text-cyan-400' : 'md:w-4 md:h-4'} />
              <span className={isActive ? 'block' : 'hidden sm:block'}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
