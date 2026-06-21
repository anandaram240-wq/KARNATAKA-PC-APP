import React, { useState, useEffect } from 'react';
import { X, Key, Shield, Sparkles, AlertCircle, RefreshCw, Check, Info } from 'lucide-react';
import { getGeminiKey, getGroqKey, getActiveModel } from '../lib/aiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [activeModel, setActiveModel] = useState<'gemini' | 'groq'>('gemini');
  const [elo, setElo] = useState(1200);
  const [streak, setStreak] = useState(0);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'api' | 'stats'>('api');

  useEffect(() => {
    if (isOpen) {
      setGeminiKey(localStorage.getItem('ksp_custom_gemini_key') || '');
      setGroqKey(localStorage.getItem('ksp_custom_groq_key') || '');
      setActiveModel((localStorage.getItem('ksp_active_ai_model') as 'gemini' | 'groq') || 'gemini');
      
      // Load user ELO
      try {
        const u = JSON.parse(localStorage.getItem('rrb_user') || '{}');
        const email: string = u?.email || 'guest';
        const prefix = email.toLowerCase().replace(/[@.]/g, '_').replace(/[^a-z0-9_]/g, '');
        const roadmapKey = `${prefix}__ksp_roadmap_v4`;
        const profile = JSON.parse(localStorage.getItem(roadmapKey) || '{}');
        setElo(profile.xp ? Math.round(profile.xp / 10) + 1000 : 1200);
      } catch {
        setElo(1200);
      }

      // Load streak
      try {
        const streaks = JSON.parse(localStorage.getItem('rrb_streak') || '{}');
        setStreak(Object.keys(streaks).length);
      } catch {
        setStreak(0);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('ksp_custom_gemini_key', geminiKey.trim());
    localStorage.setItem('ksp_custom_groq_key', groqKey.trim());
    localStorage.setItem('ksp_active_ai_model', activeModel);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  const handleResetStats = () => {
    if (confirm('🚨 Are you sure you want to reset your ELO, streaks, and learning history? This action is permanent.')) {
      localStorage.removeItem('rrb_goals');
      localStorage.removeItem('rrb_streak');
      localStorage.removeItem('rrb_confusion_flags');
      // Find and reset roadmap storage
      try {
        const u = JSON.parse(localStorage.getItem('rrb_user') || '{}');
        const email: string = u?.email || 'guest';
        const prefix = email.toLowerCase().replace(/[@.]/g, '_').replace(/[^a-z0-9_]/g, '');
        localStorage.removeItem(`${prefix}__ksp_roadmap_v4`);
      } catch {}
      alert('Stats reset successfully. The page will now reload.');
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
      <div className="bg-surface-container border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl spring-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-2">
            <Shield className="text-secondary" size={20} />
            <h3 className="text-on-surface font-black text-base">Control Center & Settings</h3>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          <button
            onClick={() => setActiveTab('api')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all ${
              activeTab === 'api' ? 'border-secondary text-secondary bg-white/5' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            🔌 API Integrations
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all ${
              activeTab === 'stats' ? 'border-secondary text-secondary bg-white/5' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            👮 Profile & ELO
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3">
                <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-200/80 leading-relaxed">
                  Your keys are saved <strong>locally</strong> in your browser storage. All queries run serverless and directly from your device. If empty, KSP Master uses shared keys.
                </p>
              </div>

              {/* Gemini Key */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-black text-on-surface-variant uppercase tracking-wider mb-2">
                  <Sparkles size={14} className="text-indigo-400" /> Custom Gemini API Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    placeholder="AI Studio / Gemini API Key..."
                    className="w-full bg-white/5 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary/40 text-on-surface"
                  />
                </div>
              </div>

              {/* Groq Key */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-black text-on-surface-variant uppercase tracking-wider mb-2">
                  ⚡ Custom Groq API Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
                  <input
                    type="password"
                    value={groqKey}
                    onChange={e => setGroqKey(e.target.value)}
                    placeholder="Groq API Key (gsk_...)"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary/40 text-on-surface"
                  />
                </div>
              </div>

              {/* Active model */}
              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-wider mb-2">
                  🤖 Default AI Model for Speed Tricks
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'gemini', label: 'Gemini 3.5 Flash', desc: 'Detailed doubt solving' },
                    { id: 'groq', label: 'Groq Llama 3.3', desc: 'Blazing fast explanations' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setActiveModel(m.id as 'gemini' | 'groq')}
                      className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                        activeModel === m.id
                          ? 'border-secondary bg-secondary/15'
                          : 'border-white/5 bg-white/5 hover:border-white/10'
                      }`}
                    >
                      <span className="text-xs font-black text-white">{m.label}</span>
                      <span className="text-[10px] text-on-surface-variant mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-4">
              {/* ELO Card */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Aspirant ELO Rating</h4>
                  <p className="text-2xl font-black mt-1 text-white tabular-nums">{elo} ELO</p>
                </div>
                <div className="bg-secondary/15 border border-secondary/30 px-4 py-2 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-secondary uppercase tracking-widest leading-none">KSP Rank</p>
                  <p className="text-xs font-black text-white mt-1.5 leading-none">
                    {elo >= 1600 ? 'Inspector 🏆' :
                     elo >= 1200 ? 'Sub-Inspector 🏅' :
                     elo >= 1000 ? 'Head Constable 👮' : 'Constable 👮'}
                  </p>
                </div>
              </div>

              {/* Streak info */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Active Study Streak</h4>
                  <p className="text-2xl font-black mt-1 text-accent tabular-nums">{streak} Days</p>
                </div>
                <div className="text-3xl">🔥</div>
              </div>

              {/* Danger zone */}
              <div className="pt-4 border-t border-white/5">
                <h4 className="text-xs font-bold text-error uppercase tracking-wider mb-2">Danger Zone</h4>
                <button
                  onClick={handleResetStats}
                  className="flex items-center gap-2 px-4 py-2.5 bg-error/15 border border-error/30 text-error rounded-xl font-bold text-xs hover:bg-error/25 transition-all"
                >
                  <RefreshCw size={14} />
                  Reset Study History & ELO
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/5 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white/5 text-on-surface rounded-xl font-bold text-xs hover:bg-white/10 active:scale-95 transition-all border border-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 active:scale-95 transition-all shadow-lg ${
              saved ? 'bg-green-600 text-white shadow-green-600/20' : 'bg-secondary text-white shadow-secondary/20 hover:opacity-90'
            }`}
          >
            {saved ? <><Check size={14} /> Saved!</> : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
