import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const Chatbot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m SLS Fleet Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Only show chatbot when user is logged in
  if (!user) return null;

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        content: m.content
      }));

      const res = await axios.post(`${BACKEND_URL}/api/chatbot/chat`, {
        message: text,
        history
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      let errorMsg;
      if (status === 429) {
        errorMsg = 'I\'m a bit busy right now. Please wait a moment and try again.';
      } else if (status === 503) {
        errorMsg = 'Chatbot is not configured yet. Please contact the administrator.';
      } else {
        errorMsg = detail || 'Sorry, something went wrong. Please try again.';
      }
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
          data-testid="chatbot-toggle"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" data-testid="chatbot-window">
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">SLS Fleet Assistant</h3>
                <p className="text-xs text-slate-400">Powered by Gemini AI</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
                  }`}>
                    {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-md'
                      : 'bg-white text-slate-700 border border-slate-200 rounded-tl-md shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-white border border-slate-200 text-slate-600 mt-0.5">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                    <div className="flex space-x-1.5">
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="px-4 py-3 border-t border-slate-200 bg-white flex-shrink-0">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about fleet management..."
                className="flex-1 text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-slate-400 transition-colors"
                disabled={loading}
                data-testid="chatbot-input"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-10 h-10 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
                data-testid="chatbot-send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default Chatbot;
