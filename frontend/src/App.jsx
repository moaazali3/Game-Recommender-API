import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { AboutModal } from './components/AboutModal';
import { ScrollToTop } from './components/ScrollToTop';
import { PageTransition } from './components/PageTransition';

import { Home } from './pages/Home';
import { Series } from './pages/Series';
import { Library } from './pages/Library';
import { Feedback } from './pages/Feedback';
import { NotFound } from './pages/NotFound';

export const App = () => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="app-layout">
      <ScrollToTop />
      
      {/* Navigation Header */}
      <Navbar onOpenAbout={() => setIsAboutOpen(true)} />

      {/* Main Content View with route key for animations */}
      <main className="main-content">
        <PageTransition key={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/series" element={<Series />} />
            <Route path="/library" element={<Library />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
      </main>

      {/* About Project & Developer Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  );
};
