import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { aiService } from '../../services/aiService';
import {
  Bot,
  Send,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Check,
  User,
  ArrowRight,
  TrendingUp,
  Package,
  Clock
} from 'lucide-react';

export const AIAssistantView = ({ onQuickPrice, onQuickStock, onViewOrders }) => {
  const { lang, t } = useLanguage();
  const { user } = useAuth();

  const [messages, setMessages] = useState(() => [
    {
      id: 1,
      role: 'assistant',
      content: lang === 'ta'
        ? 'வணக்கம்! நான் உங்கள் பண்ணை உதவியாளர். உங்கள் விளைபொருட்களின் இருப்பு, நியாயமான சந்தை விலை மற்றும் வாடிக்கையாளர் ஆர்டர்கள் பற்றி என்னிடம் கேட்கலாம்.'
        : lang === 'hi'
        ? 'नमस्ते! मैं आपका फार्म सहायक हूँ। आप फसल के स्टॉक, बाज़ार भाव और हाल के ऑर्डर के बारे में सवाल पूछ सकते हैं।'
        : `Hello! I am your Farm2Home AI Assistant. I can help you check harvest stock levels, advise on fair direct market rates, and review recent customer orders.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const starterPrompts = [
    { key: 'promptLowStock', label: t('promptLowStock') },
    { key: 'promptPriceHelp', label: t('promptPriceHelp') },
    { key: 'promptBestSeller', label: t('promptBestSeller') },
    { key: 'promptOrders', label: t('promptOrders') }
  ];

  const handleSend = async (textToSend = input) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isTyping) return;

    setError('');
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Build history payload
      const historyPayload = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await aiService.sendFarmerMessage(trimmed, lang, historyPayload);

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.reply,
        action: response.suggested_action,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('AI Assistant error:', err);
      setError(t('aiError'));
    } finally {
      setIsTyping(false);
    }
  };

  const handlePromptChipClick = (promptText) => {
    handleSend(promptText);
  };

  const handleActionClick = (action) => {
    if (!action) return;
    if (action.type === 'quick_price' && onQuickPrice) {
      onQuickPrice({ id: action.product_id, name: action.product_name, price_per_unit: action.suggested_price || action.current_price, unit: action.unit });
    } else if (action.type === 'quick_stock' && onQuickStock) {
      onQuickStock({ id: action.product_id, name: action.product_name, stock_quantity: action.suggested_stock || action.current_stock, unit: action.unit });
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: lang === 'ta'
          ? 'வணக்கம்! நான் உங்கள் பண்ணை உதவியாளர். என்ன உதவி வேண்டும்?'
          : lang === 'hi'
          ? 'नमस्ते! मैं आपका फार्म सहायक हूँ। मैं आपकी क्या मदद कर सकता हूँ?'
          : 'Hello! I am your Farm2Home AI Assistant. What can I help you check today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setError('');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 120px)',
      maxHeight: '750px',
      backgroundColor: 'var(--color-bg-surface)',
      border: 'var(--border-hairline)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden'
    }}>
      {/* Assistant Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: 'var(--border-hairline)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--color-bg-surface)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-light)',
            border: '1px solid var(--color-primary-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bot size={22} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{t('aiAssistantTitle')}</span>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                Online & Context Active
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {t('aiAssistantSubtitle')}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleResetChat}
          title="Reset conversation"
        >
          <RefreshCw size={13} />
          <span>Reset</span>
        </button>
      </div>

      {/* Error banner if any */}
      {error && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: '#fef2f2',
          borderBottom: '1px solid #fecaca',
          color: '#b91c1c',
          fontSize: '0.8125rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        backgroundColor: '#fafbfc'
      }}>
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                gap: '10px',
                alignItems: 'flex-start'
              }}
            >
              {!isUser && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary-light)',
                  border: '1px solid var(--color-primary-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Bot size={18} color="var(--color-primary)" />
                </div>
              )}

              <div style={{
                maxWidth: '78%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start'
              }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    backgroundColor: isUser ? 'var(--color-primary)' : 'var(--color-bg-surface)',
                    color: isUser ? '#ffffff' : 'var(--color-text-main)',
                    border: isUser ? 'none' : 'var(--border-hairline)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    fontSize: '0.9375rem',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {msg.content}

                  {/* Actionable Confirmation Button */}
                  {msg.action && (
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '10px',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                        {msg.action.type === 'quick_price' ? `Suggested rate: ₹${msg.action.suggested_price}/${msg.action.unit}` : `Suggested stock: ${msg.action.suggested_stock} ${msg.action.unit}`}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleActionClick(msg.action)}
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      >
                        <Sparkles size={12} />
                        <span>{t('applyAiAction')}</span>
                      </button>
                    </div>
                  )}
                </div>

                <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--color-text-muted)',
                  marginTop: '4px',
                  padding: '0 4px'
                }}>
                  {msg.timestamp}
                </span>
              </div>

              {isUser && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-bg-subtle)',
                  border: 'var(--border-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <User size={16} color="var(--color-text-muted)" />
                </div>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={18} color="var(--color-primary)" />
            </div>
            <div style={{
              padding: '10px 16px',
              backgroundColor: 'var(--color-bg-surface)',
              border: 'var(--border-hairline)',
              borderRadius: '14px 14px 14px 2px',
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Sparkles size={14} className="animate-spin" color="var(--color-primary)" />
              <span>{t('assistantTyping')}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Starter Prompt Chips */}
      <div style={{
        padding: '10px 16px',
        backgroundColor: 'var(--color-bg-surface)',
        borderTop: 'var(--border-hairline)',
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        {starterPrompts.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handlePromptChipClick(chip.label)}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--color-bg-subtle)',
              border: 'var(--border-hairline)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-main)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all var(--transition-fast)',
              flexShrink: 0
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
              e.currentTarget.style.borderColor = 'var(--color-primary-border)';
              e.currentTarget.style.color = 'var(--color-primary)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-subtle)';
              e.currentTarget.style.borderColor = 'var(--border-hairline)';
              e.currentTarget.style.color = 'var(--color-text-main)';
            }}
          >
            <Sparkles size={12} color="var(--color-primary)" />
            <span>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Pinned Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{
          padding: '14px 16px',
          borderTop: 'var(--border-hairline)',
          backgroundColor: 'var(--color-bg-surface)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}
      >
        <input
          type="text"
          className="form-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('typeMessagePlaceholder')}
          style={{ flex: 1, padding: '12px 16px', fontSize: '0.9375rem' }}
          disabled={isTyping}
        />

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!input.trim() || isTyping}
          style={{ padding: '12px 20px', borderRadius: 'var(--radius-sm)' }}
        >
          <Send size={16} />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
