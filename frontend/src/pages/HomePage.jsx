/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Fingerprint, Monitor, Award, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <div 
      className="min-h-screen flex flex-col font-sans overflow-x-hidden relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url('/images/home page background.png')` }}
    >
      {/* Dark overlay to ensure text is visible and blends well with the background */}
      <div className="absolute inset-0 bg-[#0d1425]/60 z-0"></div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-10 py-5 max-w-[1920px] mx-auto w-full bg-[#0d1425]/60 backdrop-blur-md border-b border-white/5 shadow-md">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <img 
            src="/images/Dzongjuk logo.png"
            alt="Dzongjuk Logo"
            className="h-12 w-auto object-contain rounded-lg shadow-lg shadow-[#F59E0B]/20"
          />
          <div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold text-white tracking-wide">Dzongjuk</p>
            </div>
            <p className="text-xs text-gray-400 font-medium tracking-widest uppercase mt-0.5">DSTS • DCBD</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-9">
          <Link to="/" className="text-white font-medium hover:text-brand-gold-light transition-colors text-base drop-shadow-md">Home</Link>
          <Link to="#" className="text-gray-300 font-medium hover:text-white transition-colors text-base drop-shadow-md">About DSTs</Link>
          <Link to="#" className="text-gray-300 font-medium hover:text-white transition-colors text-base drop-shadow-md">Contact Us</Link>
        </nav>

        <Link
          to="/login"
          className="h-11 px-7 border border-brand-gold-light/80 text-white text-base font-medium rounded-xl transition-all hover:bg-brand-gold-light/20 shadow-[0_0_15px_rgba(212,131,10,0.3)] backdrop-blur-sm inline-flex items-center justify-center"
        >
          Sign In
        </Link>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col px-10 max-w-[1700px] mx-auto w-full pb-6">
        
        {/* Main Hero Content (Centers vertically in available space) */}
        <div className="flex-1 flex items-center w-full py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 w-full">
            
            {/* Left Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl pr-4"
            >
              <h1 className="text-6xl sm:text-[76px] font-black text-white leading-[1.1] mb-6 tracking-tight drop-shadow-lg">
                <span className="inline-block sm:whitespace-nowrap">Dzongkha Standard</span><br />
                <span className="text-brand-gold-light">Testing System</span>
              </h1>
              <p className="text-lg sm:text-[19px] text-gray-200 mb-10 leading-relaxed max-w-2xl drop-shadow-md font-medium">
                Bhutan's premier national platform for standardized Dzongkha<br />
                language proficiency assessment, official certificate management,<br />
                and secure examination administration.
              </p>

              <div className="flex items-center gap-5 flex-wrap">
                <Link
                  to="/login"
                  className="h-14 px-8 text-[17px] bg-linear-to-r from-brand-gold to-brand-gold-light hover:from-brand-gold-dark hover:to-brand-gold text-white font-semibold rounded-xl transition-all shadow-[0_4px_20px_rgba(212,131,10,0.4)] inline-flex items-center gap-2"
                >
                  Access Portal <ArrowRight size={20} />
                </Link>
                <Link
                  to="/ndi-login"
                  className="h-14 px-8 text-[17px] bg-surface-card/60 backdrop-blur-md border border-brand-gold-light/30 hover:border-brand-gold-light/70 text-white font-medium rounded-xl transition-all flex items-center gap-3 shadow-lg"
                >
                  <Fingerprint size={20} className="text-brand-gold-light" /> Sign in with NDI
                </Link>
              </div>
            </motion.div>

            {/* Right Area - Empty so the background image graphic is fully visible */}
            <div className="hidden lg:block relative"></div>
          </div>
        </div>

        {/* Feature cards (Pushed towards the bottom) */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full mt-4"
        >
          {[
            { icon: Monitor, title: 'Online Registration', desc: 'Apply for DSTS examinations online with secure document submission' },
            { icon: Award, title: 'Digital Certificates', desc: 'Secure, QR-verified certificates with official CEFR band scores' },
            { icon: ShieldCheck, title: 'Secure & Transparent', desc: 'Role-based access, comprehensive audit trails, and NDI authentication' },
          ].map(f => (
            <div key={f.title} className="p-7 bg-[#172036]/80 backdrop-blur-md border border-surface-border hover:border-brand-gold-light/30 transition-colors rounded-2xl text-left shadow-xl shadow-black/20 group">
              <div className="w-12 h-12 rounded-xl bg-brand-gold-light/10 border border-brand-gold-light/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <f.icon size={22} className="text-brand-gold-light" />
              </div>
              <h3 className="text-[16px] font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-[13px] text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-[13px] text-white/90 font-medium flex flex-col gap-0.5 mt-6 border-t border-white/10 bg-[#0d1425]/40 backdrop-blur-sm">
        <p>© 2026 Department of Culture and Dzongkha Development, Ministry of Home Affairs, Bhutan</p>
        <p className="opacity-80">Developed by GovTech · Secured by NDI</p>
        <p className="opacity-80">Department of Culture and Dzongkha Development, Bhutan</p>
      </footer>
    </div>
  );
}


