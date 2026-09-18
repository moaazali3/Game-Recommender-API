import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Compass, GitMerge, Database, MessageSquareQuote, Info, Globe, Menu, X, Sparkles } from 'lucide-react';

export const Navbar = ({ onOpenAbout }) => {
  const { lang, toggleLanguage, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <header className={`navbar-root ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Left: Umbrella Gateway Link & Brand Logo */}
        <div className="navbar-left-cluster">
          <a
            href="https://ludova.runasp.net/"
            className="umbrella-gateway-link"
            title="Ludova Umbrella Platform"
          >
            {t('nav_ludova_hub')}
          </a>

          <Link to="/" className="navbar-brand" onClick={closeMobile}>
            <div className="navbar-brand-icon">
              <img src="/ludova-logo.svg" alt="Ludova Logo" className="brand-logo-img" />
            </div>
            <div className="navbar-brand-text">
              <span className="brand-title">{t('brand_name')}</span>
              <span className="brand-subtitle">{t('brand_subtitle')}</span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="navbar-links-desktop">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`} end>
            <Compass size={17} />
            <span>{t('nav_discover')}</span>
          </NavLink>
          <NavLink to="/series" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
            <GitMerge size={17} />
            <span>{t('nav_series')}</span>
          </NavLink>
          <NavLink to="/library" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
            <Database size={17} />
            <span>{t('nav_library')}</span>
          </NavLink>
          <NavLink to="/feedback" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
            <MessageSquareQuote size={17} />
            <span>{t('nav_feedback')}</span>
          </NavLink>
        </nav>

        {/* Right Controls: About & Language Toggle */}
        <div className="navbar-actions">
          <button type="button" className="nav-action-btn" onClick={onOpenAbout} title={t('nav_about')}>
            <Info size={17} />
            <span className="nav-action-label">{t('nav_about')}</span>
          </button>

          <button type="button" className="nav-action-btn lang-toggle-btn" onClick={toggleLanguage}>
            <Globe size={16} />
            <span className="lang-code-tag">{t('lang_btn_text')}</span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-drawer">
          <NavLink to="/" className={({ isActive }) => `mobile-nav-link ${isActive ? 'mobile-nav-link--active' : ''}`} onClick={closeMobile} end>
            <Compass size={18} />
            <span>{t('nav_discover')}</span>
          </NavLink>
          <NavLink to="/series" className={({ isActive }) => `mobile-nav-link ${isActive ? 'mobile-nav-link--active' : ''}`} onClick={closeMobile}>
            <GitMerge size={18} />
            <span>{t('nav_series')}</span>
          </NavLink>
          <NavLink to="/library" className={({ isActive }) => `mobile-nav-link ${isActive ? 'mobile-nav-link--active' : ''}`} onClick={closeMobile}>
            <Database size={18} />
            <span>{t('nav_library')}</span>
          </NavLink>
          <NavLink to="/feedback" className={({ isActive }) => `mobile-nav-link ${isActive ? 'mobile-nav-link--active' : ''}`} onClick={closeMobile}>
            <MessageSquareQuote size={18} />
            <span>{t('nav_feedback')}</span>
          </NavLink>
          <a
            href="https://ludova.runasp.net/"
            className="mobile-nav-link mobile-umbrella-link"
            onClick={closeMobile}
            title="Ludova Umbrella Platform"
          >
            <Sparkles size={18} color="var(--accent-amber)" />
            <span>{t('nav_ludova_hub')}</span>
          </a>
          <button type="button" className="mobile-nav-link" onClick={() => { closeMobile(); onOpenAbout(); }}>
            <Info size={18} />
            <span>{t('nav_about')}</span>
          </button>
        </div>
      )}

      <style>{`
        .navbar-root {
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          background: rgba(9, 12, 18, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border-subtle);
          transition: all var(--transition-normal);
        }

        .navbar--scrolled {
          background: rgba(9, 12, 18, 0.92);
          border-bottom-color: var(--border-medium);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }

        .navbar-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0.85rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
        }

        .navbar-left-cluster {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .umbrella-gateway-link {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--accent-amber);
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.3);
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-full);
          transition: all var(--transition-fast);
          white-space: nowrap;
        }

        .umbrella-gateway-link:hover {
          background: rgba(244, 63, 94, 0.2);
          border-color: var(--accent-amber);
          transform: translateY(-1px);
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          user-select: none;
        }

        .navbar-brand-icon {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .brand-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 0 8px var(--accent-amber-glow));
        }

        .navbar-brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 1.25rem;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          line-height: 1;
        }

        .brand-subtitle {
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-top: 0.15rem;
        }

        .navbar-links-desktop {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(255, 255, 255, 0.03);
          padding: 0.3rem 0.4rem;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }

        .nav-link:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .nav-link--active {
          color: #ffffff !important;
          background: var(--accent-amber) !important;
          font-weight: 700;
          box-shadow: 0 2px 10px var(--accent-amber-glow);
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .nav-action-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.85rem;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          transition: all var(--transition-fast);
        }

        .nav-action-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-medium);
          background: var(--bg-surface-hover);
        }

        .lang-toggle-btn {
          font-family: var(--font-mono);
          letter-spacing: 0.02em;
          border-color: rgba(244, 63, 94, 0.35);
          color: #fca5a5;
          background: rgba(244, 63, 94, 0.08);
        }

        .lang-toggle-btn:hover {
          border-color: var(--accent-amber);
          color: #ffffff;
          background: rgba(244, 63, 94, 0.2);
          box-shadow: 0 0 12px var(--accent-amber-glow);
        }

        .mobile-menu-btn {
          display: none;
          color: var(--text-primary);
          padding: 0.4rem;
        }

        .navbar-mobile-drawer {
          display: none;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem 1.5rem 1.5rem;
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-medium);
        }

        .mobile-nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.02);
        }

        .mobile-nav-link--active {
          color: #ffffff;
          background: var(--accent-amber);
        }

        @media (max-width: 880px) {
          .navbar-links-desktop {
            display: none;
          }
          .nav-action-label {
            display: none;
          }
          .mobile-menu-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 40px;
            min-height: 40px;
          }
          .navbar-mobile-drawer {
            display: flex;
          }
        }

        @media (max-width: 600px) {
          .umbrella-gateway-link {
            display: none;
          }
          .navbar-container {
            padding: 0.65rem 1rem;
            gap: 0.75rem;
          }
          .brand-title {
            font-size: 1.15rem;
          }
          .brand-subtitle {
            font-size: 0.62rem;
          }
        }
      `}</style>
    </header>
  );
};
