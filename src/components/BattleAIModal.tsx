import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Swords, Heart, Shield, Award, Play, AlertCircle, Timer, Bot, User, Check, Sparkles, Loader2 } from 'lucide-react';
import pyqsData from '../data/pyqs.json';
import { cleanText } from '../lib/cleanText';
import { generateQuickExplanation } from '../lib/aiService';

interface PYQ {
  id: number;
  subject: string;
  topic: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: string;
  solution: string;
}

interface BattleAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

interface BotConfig {
  name: string;
  avatar: string;
  elo: number;
  accuracy: number;
  minTime: number; // in seconds
  maxTime: number; // in seconds
}

const BOTS: BotConfig[] = [
  { name: 'Constable Llama 🟢', avatar: '🤖', elo: 1000, accuracy: 0.60, minTime: 8, maxTime: 14 },
  { name: 'Sub-Inspector Llama 🟡', avatar: '🦁', elo: 1400, accuracy: 0.75, minTime: 5, maxTime: 9 },
  { name: 'Superintendent Gemini 🔴', avatar: '🦅', elo: 1900, accuracy: 0.92, minTime: 2, maxTime: 5 }
];

export function BattleAIModal({ isOpen, onClose, userName }: BattleAIModalProps) {
  const [gameState, setGameState] = useState<'lobby' | 'battle' | 'results'>('lobby');
  const [selectedBot, setSelectedBot] = useState<BotConfig>(BOTS[0]);
  const [battleQuestions, setBattleQuestions] = useState<PYQ[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Stats
  const [playerHP, setPlayerHP] = useState(100);
  const [botHP, setBotHP] = useState(100);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  
  // Timer & state per question
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [playerAnswered, setPlayerAnswered] = useState<number | null>(null);
  const [botAnswered, setBotAnswered] = useState<number | null>(null);
  const [botThinking, setBotThinking] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [playerTime, setPlayerTime] = useState(0);
  const [botTime, setBotTime] = useState(0);

  // AI Explanation
  const [aiExplanation, setAiExplanation] = useState('');
  const [explanationLoading, setExplanationLoading] = useState(false);

  // User's current ELO from storage
  const [userElo, setUserElo] = useState(1200);

  useEffect(() => {
    if (isOpen) {
      setGameState('lobby');
      setPlayerHP(100);
      setBotHP(100);
      setPlayerScore(0);
      setBotScore(0);
      setCurrentIdx(0);
      setPlayerAnswered(null);
      setBotAnswered(null);
      setAiExplanation('');
      
      // Load current ELO
      try {
        const u = JSON.parse(localStorage.getItem('rrb_user') || '{}');
        const email: string = u?.email || 'guest';
        const prefix = email.toLowerCase().replace(/[@.]/g, '_').replace(/[^a-z0-9_]/g, '');
        const roadmapKey = `${prefix}__ksp_roadmap_v4`;
        const profile = JSON.parse(localStorage.getItem(roadmapKey) || '{}');
        setUserElo(profile.xp ? Math.round(profile.xp / 10) + 1000 : 1200);
      } catch {
        setUserElo(1200);
      }
    }
  }, [isOpen]);

  // Main game timer
  useEffect(() => {
    let t: any;
    if (gameState === 'battle' && playerAnswered === null && secondsLeft > 0) {
      t = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && playerAnswered === null && gameState === 'battle') {
      // Time out!
      handlePlayerChoice(-1); // -1 signifies timeout
    }
    return () => clearInterval(t);
  }, [secondsLeft, gameState, playerAnswered]);

  // Simulate bot thinking/typing speed
  useEffect(() => {
    let botTimer: any;
    if (gameState === 'battle' && playerAnswered !== null && botAnswered === null && !botThinking) {
      setBotThinking(true);
      const thinkTime = Math.random() * (selectedBot.maxTime - selectedBot.minTime) + selectedBot.minTime;
      
      botTimer = setTimeout(() => {
        // Calculate bot choice
        const q = battleQuestions[currentIdx];
        const correct = Math.random() < selectedBot.accuracy;
        let choice = q.correctAnswer;
        
        if (!correct) {
          // pick a random wrong option
          const wrongs = [0, 1, 2, 3].filter(x => x !== q.correctAnswer);
          choice = wrongs[Math.floor(Math.random() * wrongs.length)];
        }
        
        setBotAnswered(choice);
        setBotTime(thinkTime);
        setBotThinking(false);
        
        // Process results for this question
        processQuestionResults(playerAnswered, choice, thinkTime);
      }, thinkTime * 1000);
    }
    return () => clearTimeout(botTimer);
  }, [gameState, playerAnswered, botAnswered, botThinking]);

  const startDuel = () => {
    // Pick 5 random questions
    const allQs = pyqsData as PYQ[];
    const shuffled = [...allQs].sort(() => 0.5 - Math.random());
    setBattleQuestions(shuffled.slice(0, 5));
    
    setPlayerHP(100);
    setBotHP(100);
    setPlayerScore(0);
    setBotScore(0);
    setCurrentIdx(0);
    setPlayerAnswered(null);
    setBotAnswered(null);
    setSecondsLeft(20);
    setQuestionStartTime(Date.now());
    setAiExplanation('');
    setGameState('battle');
  };

  const handlePlayerChoice = (idx: number) => {
    if (playerAnswered !== null) return;
    setPlayerAnswered(idx);
    const duration = (Date.now() - questionStartTime) / 1000;
    setPlayerTime(duration);
  };

  const processQuestionResults = async (pChoice: number, bChoice: number, bDuration: number) => {
    const q = battleQuestions[currentIdx];
    const pCorrect = pChoice === q.correctAnswer;
    const bCorrect = bChoice === q.correctAnswer;

    let pDamage = 0;
    let bDamage = 0;
    let pPts = 0;
    let bPts = 0;

    if (pCorrect) {
      pPts = 20;
    } else {
      pDamage = 20; // lose HP
    }

    if (bCorrect) {
      bPts = 20;
    } else {
      bDamage = 20; // bot loses HP
    }

    // Apply speed bonus
    if (pCorrect && bCorrect) {
      if (playerTime < bDuration) {
        pPts += 5; // speed bonus
      } else {
        bPts += 5;
      }
    }

    setPlayerHP(prev => Math.max(0, prev - pDamage));
    setBotHP(prev => Math.max(0, prev - bDamage));
    setPlayerScore(prev => prev + pPts);
    setBotScore(prev => prev + bPts);

    // Call AI to generate explanation dynamically
    setExplanationLoading(true);
    try {
      const explanation = await generateQuickExplanation(
        q.question,
        q.options,
        q.correctAnswer,
        q.subject,
        q.topic
      );
      setAiExplanation(explanation);
    } catch {
      setAiExplanation("AI tutor explanation failed to load.");
    } finally {
      setExplanationLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIdx < 4 && playerHP > 0 && botHP > 0) {
      setCurrentIdx(prev => prev + 1);
      setPlayerAnswered(null);
      setBotAnswered(null);
      setSecondsLeft(20);
      setQuestionStartTime(Date.now());
      setAiExplanation('');
    } else {
      // Game Over! Update ELO
      setGameState('results');
      const playerWon = playerHP > botHP || (playerHP === botHP && playerScore > botScore);
      const eloDiff = playerWon ? 25 : -15;

      try {
        const u = JSON.parse(localStorage.getItem('rrb_user') || '{}');
        const email: string = u?.email || 'guest';
        const prefix = email.toLowerCase().replace(/[@.]/g, '_').replace(/[^a-z0-9_]/g, '');
        const roadmapKey = `${prefix}__ksp_roadmap_v4`;
        const profile = JSON.parse(localStorage.getItem(roadmapKey) || '{"xp":2000}');
        profile.xp = Math.max(0, (profile.xp || 0) + (eloDiff * 10)); // translate ELO to XP points
        localStorage.setItem(roadmapKey, JSON.stringify(profile));
        setUserElo(Math.round(profile.xp / 10) + 1000);
      } catch {}
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
      <div className="bg-surface-container border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl spring-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Swords className="text-secondary animate-pulse" size={20} />
            <h3 className="text-on-surface font-black text-base">ಬ್ಯಾಟಲ್ ಅಖಾಡ (AI Duel Arena)</h3>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {gameState === 'lobby' && (
            <div className="space-y-6 max-w-md mx-auto py-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-500">
                  <Swords size={32} />
                </div>
                <h4 className="text-base font-black text-white">Select AI Duel Opponent</h4>
                <p className="text-xs text-on-surface-variant">Answer real KSP PYQs faster than your opponent to win.</p>
              </div>

              {/* Bot Selector */}
              <div className="space-y-3">
                {BOTS.map(bot => (
                  <button
                    key={bot.name}
                    onClick={() => setSelectedBot(bot)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                      selectedBot.name === bot.name
                        ? 'border-secondary bg-secondary/15 shadow-[0_0_15px_rgba(255,119,34,0.15)]'
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{bot.avatar}</span>
                      <div>
                        <p className="text-xs font-black text-white">{bot.name}</p>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">Accuracy: {Math.round(bot.accuracy * 100)}%</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-secondary">{bot.elo} ELO</span>
                  </button>
                ))}
              </div>

              <button
                onClick={startDuel}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-2xl font-black text-xs hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 border border-red-500/20"
              >
                <Play size={14} /> Start Duel Matchmaking
              </button>
            </div>
          )}

          {gameState === 'battle' && battleQuestions[currentIdx] && (
            <div className="space-y-6">
              {/* Scoreboard panel */}
              <div className="grid grid-cols-2 gap-4 border border-white/5 bg-white/5 p-4 rounded-2xl relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-surface-container border border-white/10 flex items-center justify-center text-[10px] font-black text-secondary uppercase tracking-widest shrink-0">
                  VS
                </div>

                {/* Player stats */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-black text-white">
                    <span className="truncate">{userName.split(' ')[0]} 👮</span>
                    <span className="tabular-nums">{playerScore} pts</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5 flex">
                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${playerHP}%` }} />
                  </div>
                  <p className="text-[9px] text-on-surface-variant font-bold">HP: {playerHP}/100</p>
                </div>

                {/* Bot stats */}
                <div className="space-y-1 text-right">
                  <div className="flex justify-between items-center text-xs font-black text-white flex-row-reverse">
                    <span className="truncate">{selectedBot.name}</span>
                    <span className="tabular-nums">{botScore} pts</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5 flex flex-row-reverse">
                    <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${botHP}%` }} />
                  </div>
                  <p className="text-[9px] text-on-surface-variant font-bold">HP: {botHP}/100</p>
                </div>
              </div>

              {/* Question metadata & Timer */}
              <div className="flex items-center justify-between text-xs font-black text-on-surface-variant uppercase tracking-wider bg-white/5 px-4 py-3 rounded-xl border border-white/5">
                <span className="flex items-center gap-1.5"><Timer size={14} className="text-secondary" /> {secondsLeft}s left</span>
                <span>Question {currentIdx + 1} of 5</span>
              </div>

              {/* Question Card */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-inner">
                <p className="text-sm font-bold text-on-surface leading-relaxed whitespace-pre-wrap">
                  {cleanText(battleQuestions[currentIdx].question)}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {battleQuestions[currentIdx].options.map((opt, idx) => {
                  const isPlayerChoice = playerAnswered === idx;
                  const isBotChoice = botAnswered === idx;
                  const isCorrect = idx === battleQuestions[currentIdx].correctAnswer;
                  const isResolved = botAnswered !== null;

                  return (
                    <button
                      key={idx}
                      onClick={() => handlePlayerChoice(idx)}
                      disabled={playerAnswered !== null}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left text-xs font-semibold transition-all relative overflow-hidden ${
                        playerAnswered === null
                          ? 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10 active:scale-[0.98]'
                          : isCorrect
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-extrabold'
                          : isPlayerChoice
                          ? 'border-red-500 bg-red-500/10 text-red-400 font-extrabold'
                          : 'border-white/5 bg-white/5 opacity-40'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border ${
                        playerAnswered === null ? 'bg-[#171F3A] border-white/10 text-on-surface-variant' :
                        isCorrect ? 'bg-emerald-500 border-emerald-400 text-white' :
                        'bg-red-500 border-red-400 text-white'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">{cleanText(opt)}</span>
                      
                      {/* Player indicator */}
                      {isPlayerChoice && (
                        <span className="text-[9px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-full uppercase shrink-0">You</span>
                      )}
                      
                      {/* Bot indicator */}
                      {isBotChoice && (
                        <span className="text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full uppercase shrink-0">AI</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bot thinking status */}
              {playerAnswered !== null && botAnswered === null && (
                <div className="flex items-center gap-2 text-xs text-on-surface-variant font-bold justify-center bg-white/5 py-3 rounded-2xl border border-white/5">
                  <Loader2 size={14} className="animate-spin text-secondary" />
                  <span>{selectedBot.name} is solving...</span>
                </div>
              )}

              {/* AI Explanation details */}
              {botAnswered !== null && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={16} className="text-secondary" />
                      <h5 className="text-xs font-black text-white uppercase tracking-wider">AI Duel Coach Explains</h5>
                    </div>
                    {explanationLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 size={16} className="animate-spin text-secondary" />
                        <span className="text-xs text-on-surface-variant">Generating bilingual explanation...</span>
                      </div>
                    ) : (
                      <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">{aiExplanation}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {gameState === 'results' && (
            <div className="text-center py-8 space-y-6 max-w-md mx-auto">
              {/* Result Crown icon */}
              {playerHP > botHP || (playerHP === botHP && playerScore > botScore) ? (
                <div className="space-y-2">
                  <div className="w-20 h-20 bg-secondary/15 rounded-full flex items-center justify-center mx-auto border border-secondary/30">
                    <Award size={40} className="text-secondary animate-bounce" />
                  </div>
                  <h4 className="text-xl font-black text-white">Victory! You Won the Duel! 🏆</h4>
                  <p className="text-xs text-emerald-400 font-extrabold">+25 ELO Earned!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-20 h-20 bg-error/15 rounded-full flex items-center justify-center mx-auto border border-error/30">
                    <AlertCircle size={40} className="text-error" />
                  </div>
                  <h4 className="text-xl font-black text-white">Defeat! AI Outsmarted You! ⚔️</h4>
                  <p className="text-xs text-error font-extrabold">-15 ELO Lost!</p>
                </div>
              )}

              {/* End Stats */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Final ELO Rating</p>
                  <p className="text-xl font-black text-white mt-1.5 tabular-nums">{userElo} ELO</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Duels Score</p>
                  <p className="text-xl font-black text-white mt-1.5 tabular-nums">{playerScore} pts</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/5 shrink-0 flex gap-3">
          {gameState === 'battle' && botAnswered !== null && (
            <button
              onClick={handleNext}
              className="w-full py-3 bg-secondary text-white rounded-2xl font-black text-xs hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              {currentIdx < 4 && playerHP > 0 && botHP > 0 ? 'Next Duel Round' : 'View Duel Summary'}
            </button>
          )}

          {gameState === 'lobby' && (
            <button
              onClick={onClose}
              className="w-full py-3 bg-white/5 text-on-surface border border-white/5 rounded-2xl font-bold text-xs hover:bg-white/10 active:scale-[0.98] transition-all"
            >
              Close Duel Panel
            </button>
          )}

          {gameState === 'results' && (
            <div className="w-full flex gap-3">
              <button
                onClick={() => setGameState('lobby')}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-2xl font-black text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                Rematch Opponent
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-white/5 text-on-surface border border-white/5 rounded-2xl font-bold text-xs hover:bg-white/10 active:scale-[0.98] transition-all"
              >
                Exit Duel
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
