import React, { useState } from "react";
import { motion } from "motion/react";
import { Send, CheckCircle2, AlertCircle, Mail, User, Briefcase, Globe, HelpCircle, Loader2 } from "lucide-react";

interface WaitlistFormProps {
  onSuccess: () => void;
}

export default function WaitlistForm({ onSuccess }: WaitlistFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    businessName: "",
    website: "",
    method: "Google Reviews",
    challenge: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const methods = [
    "Google Reviews",
    "WhatsApp Screenshots",
    "Manual Collection",
    "No System",
    "Other",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic client validation
    if (!formData.name.trim()) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/waitlist/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An unexpected error occurred. Please try again.");
      }

      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center py-10 px-6 sm:px-10 bg-slate-900/80 backdrop-blur-xl border border-emerald-500/30 rounded-2xl shadow-xl max-w-lg mx-auto"
        id="waitlist-success-card"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-100 mb-2 font-display">
          Welcome to the Inner Circle!
        </h3>
        <p className="text-slate-300 text-base leading-relaxed mb-6 font-sans">
          "You're on the list. We'll invite early users soon."
        </p>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 mb-6 text-xs text-slate-400 font-mono flex flex-col gap-1 inline-block text-left w-full">
          <div><span className="text-emerald-400">STATUS:</span> Waitlist Active</div>
          <div><span className="text-emerald-400">EMAIL:</span> {formData.email}</div>
          <div><span className="text-emerald-400">PRIORITY:</span> High Access Tier #{(Math.floor(Math.random() * 800) + 120)}</div>
        </div>
        <button
          onClick={() => {
            setSuccess(false);
            setFormData({
              name: "",
              email: "",
              businessName: "",
              website: "",
              method: "Google Reviews",
              challenge: "",
            });
          }}
          className="text-indigo-400 hover:text-indigo-300 font-semibold text-sm transition"
          id="waitlist-again-btn"
        >
          Submit another response
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-xl mx-auto bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-10"
      id="waitlist-form-card"
    >
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-100 mb-1">
          Reserve your early invite
        </h3>
        <p className="text-slate-400 text-sm">
          No credit card required. Free early-access seat.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" id="waitlist-form">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              Full Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              id="form-name"
              placeholder="Elon Musk"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm"
            />
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              Email Address <span className="text-rose-400">*</span>
            </label>
            <input
              type="email"
              required
              id="form-email"
              placeholder="elon@tesla.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Business Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
              Business Name <span className="text-slate-500 text-[10px]">(Optional)</span>
            </label>
            <input
              type="text"
              id="form-business"
              placeholder="SpaceX"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm"
            />
          </div>

          {/* Website URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              Website URL <span className="text-slate-500 text-[10px]">(Optional)</span>
            </label>
            <input
              type="url"
              id="form-url"
              placeholder="https://spacex.com"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm"
            />
          </div>
        </div>

        {/* Drodown: Current testimonial collection tools */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            What do you currently use for testimonials? <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <select
              id="form-method"
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm appearance-none cursor-pointer"
            >
              {methods.map((method) => (
                <option key={method} value={method} className="bg-slate-950 text-slate-100">
                  {method}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Text Area: Biggest challenge */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            Biggest challenge with testimonials? <span className="text-slate-500 text-[10px]">(Optional)</span>
          </label>
          <textarea
            id="form-challenge"
            rows={3}
            placeholder="E.g., It takes too much manual follow-up or clients forget..."
            value={formData.challenge}
            onChange={(e) => setFormData({ ...formData, challenge: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          id="form-submit-btn"
          className="w-full mt-2 cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing Request...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Join Waitlist
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
