import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Zap,
  Globe,
  Lock,
  ArrowRight,
  Star,
  Quote,
  Eye,
  Settings,
  Heart
} from "lucide-react";
import WaitlistForm from "./components/WaitlistForm";
import AdminPortal from "./components/AdminPortal";

export default function App() {
  const [activeTab, setActiveTab] = useState<"landing" | "admin">("landing");
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Smooth scroll to waitlist form handler
  const scrollToForm = () => {
    const element = document.getElementById("waitlist-form-card");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        const nameInput = document.getElementById("form-name");
        if (nameInput) nameInput.focus();
      }, 800);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080a10] text-[#ebeeff] relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-white" id="wallovo-app-root">
      
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[65%] h-[60%] rounded-full bg-indigo-950/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[350px] h-[350px] rounded-full bg-teal-900/5 blur-[100px] pointer-events-none" />

      {/* Header and Brand Navigation bar */}
      <header className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-slate-900 z-30" id="navbar-header">
        <div 
          onClick={() => setActiveTab("landing")}
          className="flex items-center gap-2.5 cursor-pointer group"
          id="brand-logo"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition">
            <div className="w-full h-full bg-[#080a10] rounded-[10px] flex items-center justify-center relative overflow-hidden">
              <MessageSquare className="w-4.5 h-4.5 text-indigo-400 group-hover:rotate-6 transition" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-400 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
            </div>
          </div>
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent font-sans">
            Wallovo
          </span>
        </div>

        {/* Dynamic view toggler */}
        <div className="flex items-center gap-3">
          <div className="p-1 bg-[#0d121f] border border-slate-800/80 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setActiveTab("landing")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
                activeTab === "landing"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="toggle-landing-btn"
            >
              <Zap className="w-3.5 h-3.5" />
              Landing View
            </button>
            <button
              onClick={() => setActiveTab("admin")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
                activeTab === "admin"
                  ? "bg-slate-800 text-slate-100 border border-slate-700/50"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="toggle-admin-btn"
            >
              <Settings className="w-3.5 h-3.5" />
              Admin Center
            </button>
          </div>
        </div>
      </header>

      {/* Main Container and Render */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 md:py-16 md:px-8 z-20">
        <AnimatePresence mode="wait">
          {activeTab === "landing" ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-20 sm:space-y-28"
              id="landing-container"
            >
              {/* Hero Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center" id="hero-section">
                
                {/* Left side text items */}
                <div className="lg:col-span-7 space-y-6 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    Now open for early-access applications
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-sans leading-[1.1] tracking-tight text-white mb-2">
                    Turn Customer Love <br className="hidden sm:inline" />
                    <span className="bg-gradient-to-r from-indigo-400 via-indigo-200 to-indigo-500 bg-clip-text text-transparent">
                      Into Social Proof
                    </span>
                  </h1>

                  <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-xl">
                    Collect, approve, and display testimonials on your website in minutes.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <button
                      onClick={scrollToForm}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition shadow-lg shadow-indigo-600/20 cursor-pointer"
                      id="hero-cta-btn"
                    >
                      Join Early Access
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mt-1 sm:mt-0 font-sans">
                      <div className="flex -space-x-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="w-6 h-6 rounded-full border border-[#080a10] bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                            {String.fromCharCode(64 + i * 4)}
                          </div>
                        ))}
                      </div>
                      <span>Backed by 50+ early founders</span>
                    </div>
                  </div>

                  {/* Feature checklist */}
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-900 pt-6 mt-8 max-w-lg">
                    {[
                      { icon: MessageSquare, title: "1-Click Collection Form" },
                      { icon: ShieldCheck, title: "Spreadsheet Syncing" },
                      { icon: Globe, title: "Embed Widget Walls" },
                      { icon: Zap, title: "Real-time Alerts" }
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs text-slate-300">
                        <div className="p-1.5 bg-slate-900 rounded-lg text-indigo-400">
                          <feature.icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold">{feature.title}</span>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Right side interactive Form block container */}
                <div className="lg:col-span-5 relative" id="hero-form-container">
                  <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl blur-xl" />
                  <WaitlistForm onSuccess={() => setFormSubmitted(true)} />
                </div>

              </div>

              {/* Showcase preview of Wall of Love testimonials */}
              <div className="space-y-8 border-t border-slate-900 pt-16" id="wall-of-love-showcase">
                <div className="text-center max-w-xl mx-auto space-y-2">
                  <span className="text-indigo-400 text-xs font-extrabold tracking-widest uppercase">Widget Preview</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white">How Wallovo looks on your site</h2>
                  <p className="text-xs sm:text-sm text-slate-400">Custom styled dashboard walls that import directly to Sheets.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {/* Testimonial Card 1 */}
                  <div className="p-6 bg-slate-900/20 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-indigo-500/20 transition relative">
                    <Quote className="absolute right-5 top-5 w-10 h-10 text-indigo-500/5 pointer-events-none" />
                    <div className="space-y-4">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-slate-300 text-sm italic leading-relaxed">
                        "Wallovo is some pure voodoo. We collected 42 testimonials in 48 hours and saw a immediate lift of 14% on our landing page conversion."
                      </p>
                    </div>
                    <div className="flex items-center gap-3 border-t border-slate-850 pt-4 mt-6">
                      <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center font-bold text-xs text-indigo-300">
                        SJ
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">Sarah Jenkins</h4>
                        <p className="text-[10px] text-slate-500">Head of Growth, Linear</p>
                      </div>
                    </div>
                  </div>

                  {/* Testimonial Card 2 */}
                  <div className="p-6 bg-slate-900/20 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-[#10b981]/20 transition relative">
                    <Quote className="absolute right-5 top-5 w-10 h-10 text-emerald-500/5 pointer-events-none" />
                    <div className="space-y-4">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-slate-300 text-sm italic leading-relaxed">
                        "Before Wallovo, we used screenshot folders and manually updated files. Now we have an automated wall of love that syncs directly into our Google sheets."
                      </p>
                    </div>
                    <div className="flex items-center gap-3 border-t border-slate-850 pt-4 mt-6">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-xs text-emerald-300">
                        MF
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">Marc Fletcher</h4>
                        <p className="text-[10px] text-slate-500">Tech Lead, Stripe</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
              id="admin-container"
            >
              <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-100 font-sans">
                    Admin Portal
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    View active waitlist submissions database and connect Google Sheets.
                  </p>
                </div>
              </div>

              {/* Admin Portal Module */}
              <AdminPortal />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer copyright */}
      <footer className="w-full border-t border-slate-900 bg-[#06080d]/80 py-8 px-6 text-center text-xs text-slate-500 z-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
          <div>
            &copy; {new Date().getFullYear()} Wallovo Inc. All rights reserved. Built with precision.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-indigo-400 fill-indigo-400/20" />
              SaaS Waitlist
            </span>
            <span>&bull;</span>
            <button 
              onClick={() => setActiveTab(activeTab === "landing" ? "admin" : "landing")}
              className="text-indigo-400 hover:underline hover:text-indigo-300 cursor-pointer transition flex items-center gap-1"
            >
              {activeTab === "landing" ? "Configure Google Sheets Sync" : "Return to Landing Page"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
