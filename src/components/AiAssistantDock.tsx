import React, { useState, useRef, useEffect } from 'react';
import { Language, Role } from '../types';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  RefreshCw,
  HelpCircle,
  HelpCircle as QuestionIcon,
  BookOpen
} from 'lucide-react';
import { MULTILINGUAL_DICTIONARY } from '../data/mockData';
import { apiFetch } from '../services/apiClient';

interface AiAssistantDockProps {
  currentLang: Language;
  currentRole: Role;
}

export const AiAssistantDock: React.FC<AiAssistantDockProps> = ({
  currentLang,
  currentRole
}) => {
  const dict = MULTILINGUAL_DICTIONARY[currentLang] || MULTILINGUAL_DICTIONARY.en;

  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; simulated?: boolean }[]>([
    {
      role: 'assistant',
      content: `Peace be with you! I am your **Choir360 Liturgical AI Assistant**.\n\nI can retrieve lyrics, explain Roman Catholic liturgical seasons (Lent, Advent, Easter, Ordinary Time), recommend song plans, or help you audit your choir roster vocal balance.\n\nHow can I help you today?`
    }
  ]);

  const [inputMsg, setInputMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Pre-populated Quick prompt suggestions
  const prompts = [
    { label: 'Suggest Tamil Green Hymns', text: 'Recommend Roman Catholic Tamil songs for green Ordinary Season.' },
    { label: 'How does Choir weights work?', text: 'Explain how the choir share weights work. Singer Weight vs Instrumentalist Weight.' },
    { label: 'What is Saint Thomas Feast?', text: 'Explain Saint Thomas the Apostle of India feast date and details.' },
    { label: 'Find PDF songs', text: 'Search the imported PDF songbook for suitable Communion song pages.' }
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userText = textToSend;
    setInputMsg('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setIsLoading(true);

    try {
      // Structure previous history formatted for Express
      const chatHistory = messages.slice(1).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await apiFetch("/api/gemini/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          chatHistory,
          activeRole: currentRole,
          language: currentLang
        })
      });

      if (!response.ok) {
        throw new Error("HTTP connection error");
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.text,
        simulated: data.simulated
      }]);

    } catch (err) {
      console.error("AI chat error:", err);
      // Fallback
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I am having temporary issues connecting to my primary high-harmonic server. Peace be with you! Let me translate your prompt locally:\n\n" + getSimulatedChatReply(userText, currentRole, currentLang)
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSimulatedChatReply = (text: string, role: string, lang: string): string => {
    const q = text.toLowerCase();
    if (q.includes("weight") || q.includes("calc")) {
      return "According to our Catholic choir policy:\n- **Singer Weight = 1**\n- **Instrumentalist Weight = 2**.\n\nThis rewards specialized instrumentalists (guitarists, keyboard organists, flutists) with double share disbursements. You can plan logistics inside the *Mass Payments & Distribution* center.";
    }
    if (q.includes("green") || q.includes("ordinary")) {
      return "For green **Ordinary Liturgical Season**, select Entrance, Offertory, Communion, and Recessional hymns from the imported PDF Music Library so the plan uses the current approved song source.";
    }
    if (q.includes("thomas")) {
      return "St. Thomas the Apostle is highly revered as the patron saint of India. His Feast Day is on **July 3rd**, which is a gazetted Catholic Holiday in South Indian dioceses. He preached along the coast of Malabar and was martyred in Chennai.";
    }
    return "I recommend reviewing our *Song Library* or *Liturgy Calendar* tabs. All features are fully functional and ready to manage Roman Catholic choral sessions!";
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[580px]" id="ai-assistant-dock-panel">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-150 p-1.5 rounded-lg text-emerald-800">
            <Sparkles className="w-5 h-5 animate-pulse text-emerald-600" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-slate-800 text-sm">{dict.aiAssistant}</h3>
            <p className="text-[10px] text-slate-400">Powered by server-side Gemini 3.5 Flash</p>
          </div>
        </div>
        <button
          onClick={() => setMessages([{ role: 'assistant', content: `Session reset. Under Role Context ${currentRole}, how can I support you now?` }])}
          className="p-1 px-2.5 text-[9px] font-bold text-slate-500 bg-slate-100 rounded hover:bg-slate-200 transition cursor-pointer"
        >
          Reset Chat
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs" id="chat-messages-scroll">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
              m.role === 'user' ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`p-3.5 rounded-2xl relative ${
              m.role === 'user'
                ? 'bg-slate-100 text-slate-800 rounded-tr-none'
                : 'bg-emerald-50 text-emerald-950 rounded-tl-none border border-emerald-100/60'
            }`}>
              {m.simulated && (
                <span className="absolute right-2 top-2 text-[8px] font-bold tracking-wider font-mono bg-sky-200 text-sky-900 px-1 py-0.2 rounded">
                  SIMULATED
                </span>
              )}
              <div className="whitespace-pre-wrap leading-relaxed font-sans">{m.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-center text-slate-400 animate-pulse pl-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span className="text-[10px] font-medium font-sans">Gemini is writing liturgical recommendations...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompt Chips */}
      {messages.length === 1 && (
        <div className="py-2.5 space-y-1" id="quick-prompt-chips">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Suggested Liturgical Questions:</p>
          <div className="flex flex-wrap gap-1.5">
            {prompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p.text)}
                className="px-2.5 py-1 text-[10px] text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer rounded-lg border border-slate-200/50 transition font-medium"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <form
        onSubmit={e => { e.preventDefault(); handleSend(inputMsg); }}
        className="mt-3 flex gap-2 pt-3 border-t border-slate-100"
        id="assistant-chat-form"
      >
        <input
          type="text"
          value={inputMsg}
          onChange={e => setInputMsg(e.target.value)}
          placeholder={dict.assistantPlace || "Ask me about choral structures..."}
          className="flex-1 p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
        />
        <button
          type="submit"
          className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow cursor-pointer transition flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
