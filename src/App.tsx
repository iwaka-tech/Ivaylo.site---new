/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useGameStore } from './store/useGameStore';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Blog } from './pages/Blog';
import { Useful } from './pages/Useful';
import { Login } from './pages/Login';
import { Admin } from './pages/Admin';
import { ArticleDetail } from './pages/ArticleDetail';

export default function App() {
  const connect = useGameStore((state) => state.connect);
  const disconnect = useGameStore((state) => state.disconnect);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <Router>
      <div className="relative w-full min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/useful" element={<Useful />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/article/:id" element={<ArticleDetail />} />
        </Routes>
      </div>
    </Router>
  );
}
