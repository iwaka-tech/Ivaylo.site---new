import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CosmicCanvas } from '../components/CosmicCanvas';
import { MousePointer2, Zap, ChevronDown, Instagram, Facebook, MessageSquare } from 'lucide-react';

export const Home = () => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const contacts = [
    {
      id: 'discord',
      name: 'Discord',
      url: 'https://discord.gg/YGAWzngc',
      icon: MessageSquare,
      desc: 'Забавен и иновативен дискорд сървър с чат, игри, тракийска тематика и бота Асарий',
      expandable: true
    },
    {
      id: 'instagram',
      name: 'Instagram: Phamtobyte',
      url: 'https://www.instagram.com/phamtombyte',
      icon: Instagram,
      desc: 'Кифлея си там, качвам и връщам последване, ако пратите скрийншот на сайта или ми пишете',
      expandable: true
    },
    {
      id: 'facebook',
      name: 'Facebook',
      url: 'https://www.facebook.com/profile.php?id=61575640421413&locale=bg_BG',
      icon: Facebook,
      desc: 'За който иска да види статия, да я коментира или дори да качи',
      expandable: false
    }
  ];

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-black flex flex-col">
      <CosmicCanvas />
      
      <div className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-6 pt-28 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl w-full"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-8 md:mb-12 text-white leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              Мястото, където идеите намират дом
            </span>
          </h2>

          {/* Contacts Section */}
          <div className="pointer-events-auto flex flex-col gap-3 md:gap-4 w-full max-w-md mx-auto">
            <h3 className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">Контакти</h3>
            {contacts.map((contact) => (
              <div key={contact.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden transition-all hover:border-white/20">
                <div className="flex items-center justify-between p-4">
                  <a 
                    href={contact.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-white hover:text-cyan-400 transition-colors"
                  >
                    <contact.icon size={20} className="text-cyan-400" />
                    <span className="font-medium">{contact.name}</span>
                  </a>
                  
                  {contact.expandable ? (
                    <button 
                      onClick={() => setExpanded(expanded === contact.id ? null : contact.id)}
                      className={`p-1 text-gray-500 hover:text-white transition-all ${expanded === contact.id ? 'rotate-180' : ''}`}
                    >
                      <ChevronDown size={20} />
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-500 max-w-[150px] text-right leading-tight">
                      {contact.desc}
                    </span>
                  )}
                </div>
                
                <AnimatePresence>
                  {expanded === contact.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 overflow-hidden"
                    >
                      <p className="text-sm text-gray-400 text-left border-t border-white/5 pt-3">
                        {contact.desc}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Interaction Hints - Moved to bottom left and shrunken */}
      <div className="fixed bottom-4 md:bottom-6 left-4 md:left-6 z-20 flex flex-col gap-1.5 md:gap-2 pointer-events-none opacity-40 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-gray-500">
          <MousePointer2 size={10} className="md:w-3 md:h-3" />
          <span className="hidden sm:inline">Движете мишката за ефекти</span>
          <span className="sm:hidden">Движете за ефекти</span>
        </div>
        <div className="flex items-center gap-2 text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-gray-500">
          <Zap size={10} className="md:w-3 md:h-3" />
          <span className="hidden sm:inline">Кликнете за привличане</span>
          <span className="sm:hidden">Кликнете за привличане</span>
        </div>
      </div>
    </div>
  );
};
