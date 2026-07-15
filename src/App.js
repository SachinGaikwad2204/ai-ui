import React, { useEffect, useState, useRef } from 'react';
import { 
  FiZap, FiPlus, FiSearch, FiUser, FiCpu, FiSend, 
  FiTrash2, FiEdit2, FiMenu, FiX, FiSun, FiMoon,
  FiPaperclip, FiImage, FiFile, FiFileText, FiCommand,
  FiTrendingUp, FiBarChart2, FiMessageSquare, FiSettings,
  FiLogOut, FiHelpCircle, FiBell, FiClock, FiMic, FiMicOff,
  FiVolume2, FiVolumeX, FiSliders, FiSave, FiXCircle,
  FiUserCheck, FiStopCircle, FiSparkles, FiChevronRight
} from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';
import { IoSparkles, IoSend } from 'react-icons/io5';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

const API_URL = process.env.REACT_APP_API_URL || '/api/ai';

const getVoiceCommands = (agentName) => {
  const lowerName = agentName.toLowerCase();
  const wakePatterns = [`hey ${lowerName}`, `hi ${lowerName}`, `hello ${lowerName}`, lowerName, `${lowerName}.`];
  const defaultWake = ['hey jarvis', 'hi jarvis', 'hello jarvis', 'jarvis', 'jarvis.'];
  
  return {
    WAKE: [...wakePatterns, ...defaultWake],
    GREETING: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    HELP: ['help', 'what can you do', 'commands', 'assist', 'capabilities'],
    NEW_CHAT: ['new chat', 'start new', 'new conversation', 'create chat'],
    CLEAR: ['clear', 'clear chat', 'delete messages', 'reset'],
    STOP: ['stop', 'stop listening', 'be quiet', 'shut up', 'mute', 'stop talking', 'stop speaking'],
    THEME: ['dark mode', 'light mode', 'change theme', 'toggle theme'],
    SETTINGS: ['settings', 'open settings', 'settings menu'],
    EXIT: ['exit', 'quit', 'goodbye', 'bye', 'see you'],
    TIME: ['what time is it', 'time', 'current time', "what's the time"],
    DATE: ['what is the date', 'date', "today's date", "what's today"],
  };
};

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isDark, setIsDark] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [error, setError] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const [isListening, setIsListening] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [interimVoiceText, setInterimVoiceText] = useState('');
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [voiceAssistantReady, setVoiceAssistantReady] = useState(false);
  const [agentName, setAgentName] = useState('JARVIS');
  
  const [settings, setSettings] = useState({
    temperature: 0.7,
    maxTokens: 4096,
    model: 'llama-3.3-70b-versatile',
    voiceEnabled: true,
    speechRate: 1,
    autoSendVoice: false,
    darkMode: true,
    agentName: 'JARVIS',
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const isProcessingRef = useRef(false);
  const wakeWordRef = useRef(false);
  const commandsRef = useRef(getVoiceCommands('JARVIS'));
  const agentNameRef = useRef('JARVIS');

  // FIX: live refs so callbacks registered once (in the mount-time useEffect)
  // never read stale state values for isListening / isSpeaking.
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);

  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  const replaceAgentName = (text) => {
    if (!text) return text;
    const currentName = agentNameRef.current || 'JARVIS';
    let result = text;
    result = result.replace(/JARVIS/gi, currentName);
    result = result.replace(/Jarvis/g, currentName);
    result = result.replace(/jarvis/g, currentName.toLowerCase());
    return result;
  };

  const getAgentName = () => {
    return agentNameRef.current || 'JARVIS';
  };

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [currentSessionId]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const newName = settings.agentName;
    setAgentName(newName);
    agentNameRef.current = newName;
    commandsRef.current = getVoiceCommands(newName);
  }, [settings.agentName]);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Voice recognition not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.maxAlternatives = 3;

    recognitionRef.current.onresult = (event) => {
      // GUARD: ignore anything picked up while the assistant is speaking,
      // otherwise its own TTS output gets misheard as a new voice command.
      if (isSpeakingRef.current) return;

      let finalText = '';
      let interimText = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      if (finalText) {
        setInterimVoiceText('');
        processVoiceCommand(finalText);
      } else if (interimText) {
        setInterimVoiceText(interimText);
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Please allow microphone access.');
      } else if (event.error === 'no-speech') {
        // Silently ignore no-speech errors
      } else {
        setError(`Voice error: ${event.error}`);
      }
      setIsProcessingVoice(false);
      isProcessingRef.current = false;
    };

    recognitionRef.current.onend = () => {
      setIsProcessingVoice(false);
      isProcessingRef.current = false;
      // FIX: use live refs instead of the stale `isListening` closure value,
      // and never restart while the assistant is mid-speech — that mismatch
      // was what caused commands to misfire / voice to break silently.
      if (isListeningRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (e) {}
        }, 300);
      }
    };

    setVoiceAssistantReady(true);

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
    };
  }, []);

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const processVoiceCommand = async (text) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessingVoice(true);
    
    const commands = commandsRef.current;
    const currentAgentName = getAgentName();
    
    if (commands.STOP.some(cmd => text.includes(cmd))) {
      stopSpeaking();
      wakeWordRef.current = false;
      setWakeWordDetected(false);
      setIsListening(false);
      try { recognitionRef.current?.stop(); } catch (e) {}
      const response = `Stopping. Say ${currentAgentName} to wake me up.`;
      speakText(response);
      setMessages(prev => [...prev, { role: 'assistant', content: replaceAgentName(response) }]);
      isProcessingRef.current = false;
      setIsProcessingVoice(false);
      return;
    }

    if (commands.EXIT.some(cmd => text.includes(cmd))) {
      stopSpeaking();
      wakeWordRef.current = false;
      setWakeWordDetected(false);
      setIsListening(false);
      try { recognitionRef.current?.stop(); } catch (e) {}
      const response = `Goodbye! Say ${currentAgentName} when you need me.`;
      speakText(response);
      setMessages(prev => [...prev, { role: 'assistant', content: replaceAgentName(response) }]);
      isProcessingRef.current = false;
      setIsProcessingVoice(false);
      return;
    }

    const wakeWordMatch = commands.WAKE.find(word => text.includes(word));
    if (wakeWordMatch && !wakeWordRef.current) {
      wakeWordRef.current = true;
      setWakeWordDetected(true);
      setInterimVoiceText('');
      const greeting = `Yes ${currentAgentName} here, how can I help you?`;
      speakText(greeting);
      const processedGreeting = replaceAgentName(greeting);
      setMessages(prev => [...prev, { role: 'assistant', content: processedGreeting }]);
      isProcessingRef.current = false;
      setIsProcessingVoice(false);
      return;
    }

    if (!wakeWordRef.current) {
      isProcessingRef.current = false;
      setIsProcessingVoice(false);
      return;
    }

    if (commands.GREETING.some(cmd => text.includes(cmd))) {
      const response = `Hello! I'm ${currentAgentName}. How can I assist you today?`;
      speakText(response);
      setMessages(prev => [...prev, { role: 'assistant', content: replaceAgentName(response) }]);
      isProcessingRef.current = false;
      setIsProcessingVoice(false);
      return;
    }

    if (commands.HELP.some(cmd => text.includes(cmd))) {
      const response = getHelpMessage(currentAgentName);
      speakText(response);
      setMessages(prev => [...prev, { role: 'assistant', content: replaceAgentName(response) }]);
      isProcessingRef.current = false;
      setIsProcessingVoice(false);
      return;
    }

    if (commands.NEW_CHAT.some(cmd => text.includes(cmd))) {
      await createSession();
      const response = 'Creating a new chat for you.';
      speakText(response);
      setMessages(prev => [...prev, { role: 'assistant', content: replaceAgentName(response) }]);
      isProcessingRef.current = false;
      setIsProcessingVoice(false);
      return;
    }

    if (commands.THEME.some(cmd => text.includes(cmd))) {
      setIsDark(prev => !prev);
      const response = `Switching to ${!isDark ? 'dark' : 'light'} mode.`;
      speakText(response);
      setMessages(prev => [...prev, { role: 'assistant', content: replaceAgentName(response) }]);
      isProcessingRef.current = false;
      setIsProcessingVoice(false);
      return;
    }

    if (commands.SETTINGS.some(cmd => text.includes(cmd))) {
      setSettingsOpen(true);
      const response = 'Opening settings.';
      speakText(response);
      setMessages(prev => [...prev, { role: 'assistant', content: replaceAgentName(response) }]);
      isProcessingRef.current = false;
      setIsProcessingVoice(false);
      return;
    }

    if (commands.TIME.some(cmd => text.includes(cmd))) {
      const now = new Date();
      const response = `The current time is ${now.toLocaleTimeString()}`;
      speakText(response);
      setMessages(prev => [...prev, { role: 'assistant', content: replaceAgentName(response) }]);
      isProcessingRef.current = false;
      setIsProcessingVoice(false);
      return;
    }

    if (commands.DATE.some(cmd => text.includes(cmd))) {
      const now = new Date();
      const response = `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
      speakText(response);
      setMessages(prev => [...prev, { role: 'assistant', content: replaceAgentName(response) }]);
      isProcessingRef.current = false;
      setIsProcessingVoice(false);
      return;
    }

    if (commands.CLEAR.some(cmd => text.includes(cmd))) {
      setMessages([]);
      const response = 'Chat cleared.';
      speakText(response);
      setMessages(prev => [...prev, { role: 'assistant', content: replaceAgentName(response) }]);
      isProcessingRef.current = false;
      setIsProcessingVoice(false);
      return;
    }

    if (text.trim()) {
      if (currentSessionId) {
        await sendMessageWithText(text);
      } else {
        const newSession = await createSession();
        if (newSession) {
          setTimeout(async () => {
            await sendMessageWithText(text);
          }, 300);
        }
      }
    }
    isProcessingRef.current = false;
    setIsProcessingVoice(false);
  };

  const getHelpMessage = (currentAgentName) => {
    const name = currentAgentName || agentName;
    return `I'm ${name}, your AI assistant. Here's what I can do:
    • Say "${name}" to wake me up
    • Ask me anything for general chat
    • Say "new chat" to start a new conversation
    • Say "toggle theme" to switch dark/light mode
    • Say "settings" to open settings
    • Say "what time is it" for the current time
    • Say "stop" or "exit" to stop listening
    Say "${name}" to wake me up anytime!`;
  };

  const toggleListening = async () => {
    if (isListening) {
      wakeWordRef.current = false;
      setWakeWordDetected(false);
      setIsListening(false);
      stopSpeaking();
      try { recognitionRef.current?.stop(); } catch (e) {}
      return;
    }

    if (!voiceAssistantReady) {
      setError('Voice assistant is initializing. Please try again.');
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      recognitionRef.current?.start();
      setIsListening(true);
      setError(null);
      const response = `I'm listening. Say "${agentName}" to wake me up.`;
      speakText(response);
      setMessages(prev => [...prev, { role: 'assistant', content: replaceAgentName(response) }]);
    } catch (err) {
      if (err.message && err.message.includes('not-allowed')) {
        setError('Please allow microphone access in your browser settings.');
      } else {
        setError('Could not start voice recognition: ' + err.message);
      }
    }
  };

  const speakText = (text) => {
    if (!settings.voiceEnabled || !text || !window.speechSynthesis) return;
    
    try {
      stopSpeaking();

      // FIX: stop the mic before talking so it physically cannot hear
      // its own voice output and misfire it as a new command.
      try { recognitionRef.current?.stop(); } catch (e) {}

      const processedText = replaceAgentName(text);
      const utterance = new SpeechSynthesisUtterance(processedText);
      utterance.rate = settings.speechRate || 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || 
                            voices.find(v => v.lang.startsWith('en')) || 
                            voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;
      
      setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        // FIX: only resume listening after speech has fully finished,
        // with a short cooldown to avoid catching trailing audio/echo.
        if (isListeningRef.current) {
          setTimeout(() => {
            try { recognitionRef.current?.start(); } catch (e) {}
          }, 300);
        }
      };
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech synthesis error:', e);
    }
  };

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/sessions`);
      if (!res.ok) throw new Error('Failed to load sessions');
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      setError('Failed to load sessions');
    }
  };

  const loadMessages = async (sessionId) => {
    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      setMessages(data);
      setCurrentSessionId(sessionId);
      setSidebarOpen(false);
    } catch (err) {
      setError('Failed to load messages');
    }
  };

  const createSession = async () => {
    try {
      const res = await fetch(`${API_URL}/sessions`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create session');
      const newSession = await res.json();
      
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
      setSidebarOpen(false);
      return newSession;
    } catch (err) {
      setError('Failed to create session');
      return null;
    }
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await fetch(`${API_URL}/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions(sessions.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      setError('Failed to delete session');
    }
  };

  const renameSession = async (sessionId, newTitle) => {
    try {
      await fetch(`${API_URL}/sessions/${sessionId}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: newTitle,
      });
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, title: newTitle } : s
      ));
      setEditingId(null);
    } catch (err) {
      console.error('Failed to rename session:', err);
      setError('Failed to rename session');
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random() + Math.random(),
      name: file.name,
      type: file.type,
      size: file.size,
      file: file,
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    const fileNames = newAttachments.map(f => `📎 ${f.name}`).join(' ');
    setInput(prev => prev + (prev ? ' ' : '') + fileNames);
  };

  const removeAttachment = (id) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const sendMessageWithText = async (text) => {
    if (!text.trim() && attachments.length === 0) return;
    
    let sessionId = currentSessionId;
    if (!sessionId) {
      const newSession = await createSession();
      if (!newSession) return;
      sessionId = newSession.id;
    }

    const userText = text.trim() || '📎 Sent file(s)';
    setInput('');
    setIsTyping(false);
    
    const userMessage = { 
      role: 'user', 
      content: userText,
      attachments: attachments.map(a => ({ name: a.name, type: a.type }))
    };
    setMessages(prev => [...prev, userMessage]);
    setAttachments([]);

    if (messages.length === 0) {
      try {
        const title = userText.slice(0, 30);
        await fetch(`${API_URL}/sessions/${sessionId}/rename`, {
          method: 'PUT',
          headers: { 'Content-Type': 'text/plain' },
          body: title,
        });
        setSessions(prev => prev.map(s =>
          s.id === sessionId ? { ...s, title: title } : s
        ));
      } catch (err) {
        console.error('Failed to rename session', err);
      }
    }

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    setIsTyping(true);

    try {
      const eventSource = new EventSource(
        `${API_URL}/chat/stream/${sessionId}?prompt=${encodeURIComponent(userText)}`
      );

      let aiResponse = '';
      let isComplete = false;

      eventSource.onmessage = (event) => {
        aiResponse += event.data;
        const processedResponse = replaceAgentName(aiResponse);
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
            updated[updated.length - 1] = { role: 'assistant', content: processedResponse };
          }
          return updated;
        });
      };

      eventSource.onerror = () => {
        if (!isComplete) {
          setIsTyping(false);
          eventSource.close();
          if (!aiResponse) {
            setMessages(prev => {
              const updated = [...prev];
              if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
                updated[updated.length - 1] = { 
                  role: 'assistant', 
                  content: '⚠️ Error. Please try again.' 
                };
              }
              return updated;
            });
          } else {
            setIsTyping(false);
            if (settings.voiceEnabled && aiResponse) {
              speakText(aiResponse);
            }
          }
        }
      };

      const checkComplete = setInterval(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          clearInterval(checkComplete);
          isComplete = true;
          setIsTyping(false);
          if (settings.voiceEnabled && aiResponse) {
            speakText(aiResponse);
          }
        }
      }, 500);

      setTimeout(() => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close();
          isComplete = true;
          setIsTyping(false);
          if (settings.voiceEnabled && aiResponse) {
            speakText(aiResponse);
          }
        }
      }, 60000);
    } catch (err) {
      setIsTyping(false);
      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
          updated[updated.length - 1] = { 
            role: 'assistant', 
            content: '⚠️ Connection error. Please try again.' 
          };
        }
        return updated;
      });
    }
  };

  const sendMessage = async () => {
    await sendMessageWithText(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startEditing = (sessionId, currentTitle, e) => {
    e.stopPropagation();
    setEditingId(sessionId);
    setEditTitle(currentTitle);
  };

  const saveEdit = (sessionId) => {
    if (editTitle.trim()) {
      renameSession(sessionId, editTitle.trim());
    } else {
      setEditingId(null);
    }
  };

  const handleEditKeyDown = (e, sessionId) => {
    if (e.key === 'Enter') {
      saveEdit(sessionId);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 172800000) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <FiImage size={14} />;
    if (type === 'application/pdf') return <FiFileText size={14} />;
    return <FiFile size={14} />;
  };

  const getColorScheme = () => {
    const name = agentName.toLowerCase();
    const colors = {
      jarvis: { primary: '#6366f1', secondary: '#8b5cf6', accent: '#a855f7', glow: 'rgba(99,102,241,0.35)' },
      abhi: { primary: '#06b6d4', secondary: '#3b82f6', accent: '#8b5cf6', glow: 'rgba(6,182,212,0.35)' },
      sachin: { primary: '#f59e0b', secondary: '#f97316', accent: '#ef4444', glow: 'rgba(245,158,11,0.35)' },
      ishq: { primary: '#ec4899', secondary: '#f43f5e', accent: '#8b5cf6', glow: 'rgba(236,72,153,0.35)' },
      vijay: { primary: '#10b981', secondary: '#34d399', accent: '#6ee7b7', glow: 'rgba(16,185,129,0.35)' },
      modi: { primary: '#f97316', secondary: '#fb923c', accent: '#fbbf24', glow: 'rgba(249,115,22,0.35)' },
      nova: { primary: '#ec4899', secondary: '#f43f5e', accent: '#8b5cf6', glow: 'rgba(236,72,153,0.35)' },
      default: { primary: '#6366f1', secondary: '#8b5cf6', accent: '#a855f7', glow: 'rgba(99,102,241,0.35)' }
    };
    return colors[name] || colors.default;
  };

  const colorScheme = getColorScheme();

  return (
    <div className={`app-container ${isDark ? 'dark' : 'light'}`} style={{ '--primary': colorScheme.primary, '--secondary': colorScheme.secondary, '--accent': colorScheme.accent, '--glow': colorScheme.glow }}>
      <div className="bg-animation">
        <div className="bg-gradient"></div>
        <div className="bg-noise"></div>
        <div className="bg-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>

      <div className={`voice-status ${isListening ? 'active' : ''} ${wakeWordDetected ? 'wake' : ''}`}>
        <div className="voice-status-content">
          {isListening ? (
            <>
              <span className="pulse-dot"></span>
              <span className="voice-status-text">
                {wakeWordDetected ? `Listening · ${agentName} active` : `Say "${agentName}" to wake me up`}
              </span>
              {isSpeaking && <span className="speaking-indicator">Speaking</span>}
              {interimVoiceText && <span className="interim-text">"{interimVoiceText}"</span>}
            </>
          ) : (
            <>
              <span className="idle-dot"></span>
              <span className="voice-status-text">Voice idle</span>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="error-toast" onClick={() => setError(null)}>
          <FiXCircle size={14} /> {error}
        </div>
      )}

      {settingsOpen && (
        <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h2><FiSliders size={18} /> Settings</h2>
              <button onClick={() => setSettingsOpen(false)}>
                <FiX size={18} />
              </button>
            </div>
            
            <div className="settings-body">
              <div className="settings-section">
                <h3>Agent</h3>
                <div className="setting-item">
                  <label>Agent name</label>
                  <input
                    type="text"
                    value={settings.agentName}
                    onChange={(e) => setSettings({...settings, agentName: e.target.value.toUpperCase()})}
                    className="setting-input"
                    placeholder="Enter agent name..."
                  />
                </div>
                <p className="setting-hint">Say this name aloud to wake the assistant</p>
              </div>

              <div className="settings-section">
                <h3>Voice</h3>
                <div className="setting-item">
                  <label>Enable voice</label>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.voiceEnabled}
                      onChange={(e) => setSettings({...settings, voiceEnabled: e.target.checked})}
                    />
                    <span className="toggle-slider"></span>
                  </div>
                </div>
                <div className="setting-item">
                  <label>Speech rate</label>
                  <span className="setting-value">{settings.speechRate}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.speechRate}
                  onChange={(e) => setSettings({...settings, speechRate: parseFloat(e.target.value)})}
                  className="range-slider"
                />
              </div>

              <div className="settings-section">
                <h3>Model</h3>
                <div className="setting-item">
                  <label>Model</label>
                  <select
                    value={settings.model}
                    onChange={(e) => setSettings({...settings, model: e.target.value})}
                    className="setting-select"
                  >
                    <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                    <option value="gemma2-9b-it">Gemma 2 9B</option>
                  </select>
                </div>
                <div className="setting-item">
                  <label>Temperature</label>
                  <span className="setting-value">{settings.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.temperature}
                  onChange={(e) => setSettings({...settings, temperature: parseFloat(e.target.value)})}
                  className="range-slider"
                />
                <div className="setting-item" style={{ marginTop: 14 }}>
                  <label>Max tokens</label>
                  <span className="setting-value">{settings.maxTokens}</span>
                </div>
                <input
                  type="range"
                  min="256"
                  max="8192"
                  step="128"
                  value={settings.maxTokens}
                  onChange={(e) => setSettings({...settings, maxTokens: parseInt(e.target.value)})}
                  className="range-slider"
                />
              </div>

              <div className="settings-section">
                <h3>Appearance</h3>
                <div className="setting-item">
                  <label>Dark mode</label>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={isDark}
                      onChange={(e) => {
                        setIsDark(e.target.checked);
                        setSettings({...settings, darkMode: e.target.checked});
                      }}
                    />
                    <span className="toggle-slider"></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-footer">
              <button className="settings-save-btn" onClick={() => setSettingsOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`sidebar ${isDark ? 'dark' : 'light'} ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo-icon"><IoSparkles size={18} /></div>
            <span className="logo-text">{agentName}</span>
          </div>
          <button className="new-chat-btn" onClick={createSession}>
            <FiPlus size={16} />
            <span>New chat</span>
          </button>
        </div>

        <div className="sidebar-search">
          <FiSearch size={14} />
          <input type="text" placeholder="Search conversations..." />
        </div>

        <div className="sessions-list">
          <div className="sections-label">Recent</div>
          {sessions.length === 0 ? (
            <div className="empty-sessions">
              <FiMessageSquare size={32} />
              <p>No conversations yet</p>
              <span>Start a new chat to begin</span>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
                onClick={() => loadMessages(session.id)}
              >
                <div className="session-avatar">
                  {session.title?.[0]?.toUpperCase() || 'C'}
                </div>
                {editingId === session.id ? (
                  <input
                    className="session-edit-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, session.id)}
                    onBlur={() => saveEdit(session.id)}
                    autoFocus
                  />
                ) : (
                  <div className="session-info">
                    <div className="session-title">{session.title || 'Chat'}</div>
                    <div className="session-date">{formatDate(session.createdAt)}</div>
                  </div>
                )}
                <div className="session-actions">
                  <button
                    className="session-btn"
                    onClick={(e) => startEditing(session.id, session.title, e)}
                  >
                    <FiEdit2 size={12} />
                  </button>
                  <button
                    className="session-btn delete-btn"
                    onClick={(e) => deleteSession(session.id, e)}
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <div className="status-indicator">
            <div className="status-dot"></div>
            <span>Groq · Online</span>
          </div>
          <div className="sidebar-actions">
            <button className="sidebar-action-btn" onClick={toggleListening} title="Toggle voice">
              {isListening ? <FiMicOff size={15} className="text-red" /> : <FiMic size={15} />}
            </button>
            {isSpeaking && (
              <button className="sidebar-action-btn" onClick={stopSpeaking} title="Stop speaking">
                <FiStopCircle size={15} className="text-red" />
              </button>
            )}
            <button className="sidebar-action-btn" onClick={() => setSettingsOpen(true)}>
              <FiSettings size={15} />
            </button>
            <button className="sidebar-action-btn" onClick={() => setIsDark(!isDark)}>
              {isDark ? <FiSun size={15} /> : <FiMoon size={15} />}
            </button>
          </div>
        </div>
      </div>

      <div className={`main-chat ${isDark ? 'dark' : 'light'}`}>
        <header className={`chat-header ${isDark ? 'dark' : 'light'}`}>
          <div className="header-left">
            <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
              <FiMenu size={20} />
            </button>
            <div className="header-info">
              <h2>
                {currentSessionId 
                  ? sessions.find(s => s.id === currentSessionId)?.title || 'Chat'
                  : `Welcome to ${agentName}`
                }
              </h2>
              {currentSessionId && (
                <span className="header-status">
                  <span className="status-dot-small"></span>
                  Online
                </span>
              )}
            </div>
          </div>
          <div className="header-right">
            <button className="header-action-btn" onClick={toggleListening} title="Toggle voice">
              {isListening ? <FiMicOff size={17} className="text-red" /> : <FiMic size={17} />}
            </button>
            {isSpeaking && (
              <button className="header-action-btn" onClick={stopSpeaking} title="Stop speaking">
                <FiStopCircle size={17} className="text-red" />
              </button>
            )}
            <button className="header-action-btn" onClick={() => setSettingsOpen(true)}>
              <FiSettings size={17} />
            </button>
            <button className="header-action-btn primary" onClick={createSession}>
              <FiPlus size={17} />
            </button>
          </div>
        </header>

        <div className={`messages-container ${isDark ? 'dark' : 'light'}`}>
          {!currentSessionId ? (
            <div className="welcome-screen">
              <div className="welcome-icon"><IoSparkles size={40} /></div>
              <h1 className="gradient-text">{getGreeting()}</h1>
              <p>I'm <strong>{agentName}</strong>, your AI voice assistant</p>
              <div className="welcome-actions">
                <button className="welcome-btn primary" onClick={createSession}>
                  <FiPlus size={16} /> New chat
                </button>
                <button className="welcome-btn secondary" onClick={toggleListening}>
                  <FiMic size={16} /> {isListening ? 'Stop voice' : 'Start voice'}
                </button>
                <button className="welcome-btn secondary" onClick={() => setSettingsOpen(true)}>
                  <FiSettings size={16} /> Settings
                </button>
              </div>
              <div className="welcome-tips">
                <div className="tip">Say <span className="tip-key">"{agentName}"</span> to activate</div>
                <div className="tip"><span className="tip-key">⌘N</span> New chat</div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-chat-icon"><FiMessageSquare size={32} /></div>
              <h3>Start the conversation</h3>
              <p>Say "{agentName}" or type a message to begin</p>
              <div className="empty-chat-suggestions">
                <button className="suggestion-chip" onClick={toggleListening}>
                  <FiMic size={13} /> Voice chat
                </button>
                <button className="suggestion-chip" onClick={() => {
                  setInput("What can you do?");
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}>
                  What can you do?
                </button>
                <button className="suggestion-chip" onClick={() => {
                  setInput("Tell me a joke");
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}>
                  Tell me a joke
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`message-wrapper ${msg.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className="message">
                  <div className="message-avatar">
                    {msg.role === 'user' ? <FiUser size={14} /> : <FaRobot size={14} />}
                  </div>
                  <div className="message-content">
                    <div className="message-bubble">
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="attachment-preview">
                          {msg.attachments.map((att, i) => (
                            <span key={i} className="attachment-tag">
                              {getFileIcon(att.type)} {att.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {msg.role === 'assistant' ? (
                        <div className={`prose prose-sm max-w-none ${isDark ? 'prose-invert' : ''}`}>
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]} 
                            rehypePlugins={[rehypeHighlight]}
                          >
                            {msg.content || '▋'}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                    <div className="message-time">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {isTyping && messages[messages.length - 1]?.role === 'assistant' && (
            <div className="typing-indicator-wrapper">
              <div className="typing-indicator">
                <div className="typing-avatar">
                  <FaRobot size={14} />
                </div>
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={`input-area ${isDark ? 'dark' : 'light'}`}>
          <div className="input-wrapper">
            {attachments.length > 0 && (
              <div className="attachment-preview-bar">
                {attachments.map((att) => (
                  <div key={att.id} className="attachment-chip">
                    {getFileIcon(att.type)}
                    <span>{att.name}</span>
                    <button onClick={() => removeAttachment(att.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="input-container">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${agentName}...`}
                rows={1}
                disabled={!currentSessionId}
                className="chat-input"
              />
              <div className="input-actions">
                <button 
                  className={`input-action-btn ${isListening ? 'active-mic' : ''}`}
                  onClick={toggleListening}
                  disabled={!currentSessionId}
                  title={isListening ? "Stop voice input" : "Start voice input"}
                >
                  {isListening ? <FiMicOff size={17} className="text-red" /> : <FiMic size={17} />}
                </button>
                {isSpeaking && (
                  <button 
                    className="input-action-btn"
                    onClick={stopSpeaking}
                    title="Stop speaking"
                  >
                    <FiStopCircle size={17} className="text-red" />
                  </button>
                )}
                <button 
                  className="input-action-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!currentSessionId}
                  title="Attach file"
                >
                  <FiPaperclip size={17} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.txt,.md"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  className={`send-btn ${(input.trim() || attachments.length > 0) && currentSessionId ? 'active' : ''}`}
                  onClick={sendMessage}
                  disabled={(!input.trim() && attachments.length === 0) || !currentSessionId}
                >
                  <IoSend size={16} />
                </button>
              </div>
            </div>
            <div className="input-footer">
              <span className="input-hint">
                {currentSessionId ? 'Enter to send' : 'Create a chat to start'}
              </span>
              <span className="input-char-count">
                {input.length}/2000
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        :root {
          --primary: ${colorScheme.primary};
          --secondary: ${colorScheme.secondary};
          --accent: ${colorScheme.accent};
          --glow: ${colorScheme.glow};
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 18px;
          --radius-xl: 24px;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; -webkit-font-smoothing: antialiased; }

        .app-container { display: flex; height: 100vh; position: relative; overflow: hidden; background: #050810; }
        .app-container.light { background: #f8fafc; }

        .bg-animation { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
        .bg-gradient { position: absolute; inset: 0; background: radial-gradient(circle at 20% 10%, rgba(99,102,241,0.10), transparent 45%), radial-gradient(circle at 85% 80%, rgba(236,72,153,0.06), transparent 50%); }
        .app-container.light .bg-gradient { background: radial-gradient(circle at 20% 10%, rgba(99,102,241,0.05), transparent 45%), radial-gradient(circle at 85% 80%, rgba(236,72,153,0.03), transparent 50%); }
        .bg-noise { position: absolute; inset: 0; opacity: 0.015; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
        .shape { position: absolute; border-radius: 50%; filter: blur(60px); animation: float-shape 22s ease-in-out infinite; }
        .shape-1 { width: 460px; height: 460px; top: -180px; right: -120px; background: radial-gradient(circle, var(--glow), transparent 70%); }
        .shape-2 { width: 380px; height: 380px; bottom: -140px; left: -80px; background: radial-gradient(circle, var(--glow), transparent 70%); animation-delay: -8s; }
        .shape-3 { width: 260px; height: 260px; top: 45%; left: 55%; background: radial-gradient(circle, rgba(236,72,153,0.2), transparent 70%); animation-delay: -14s; }
        @keyframes float-shape { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-30px) scale(1.08); } }

        .voice-status { position: fixed; top: 18px; left: 50%; transform: translateX(-50%) translateY(-16px) scale(0.96); z-index: 60; padding: 8px 18px; border-radius: 999px; background: rgba(10,14,28,0.82); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255,255,255,0.08); transition: all 0.35s cubic-bezier(0.16,1,0.3,1); opacity: 0; pointer-events: none; box-shadow: 0 10px 40px rgba(0,0,0,0.35); }
        .voice-status.active { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); pointer-events: auto; }
        .voice-status.wake { border-color: rgba(34,197,94,0.4); }
        .voice-status-content { display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 12.5px; font-weight: 500; flex-wrap: wrap; }
        .pulse-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; animation: pulse-dot 1.5s infinite; box-shadow: 0 0 8px #22c55e; }
        .idle-dot { width: 7px; height: 7px; border-radius: 50%; background: #475569; }
        .speaking-indicator { color: #22c55e; font-weight: 600; }
        .interim-text { color: #94a3b8; font-style: italic; font-size: 11.5px; padding: 2px 10px; background: rgba(255,255,255,0.05); border-radius: 999px; }
        @keyframes pulse-dot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.75); } }

        .error-toast { position: fixed; top: 70px; left: 50%; transform: translateX(-50%); background: rgba(239,68,68,0.94); backdrop-filter: blur(20px); color: white; padding: 10px 18px; border-radius: 12px; z-index: 9999; cursor: pointer; box-shadow: 0 12px 40px rgba(239,68,68,0.25); font-weight: 500; font-size: 13px; display: flex; align-items: center; gap: 8px; animation: slideDown 0.35s cubic-bezier(0.16,1,0.3,1); }
        @keyframes slideDown { from { transform: translateX(-50%) translateY(-24px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }

        .sidebar { position: fixed; top: 0; left: 0; width: 272px; height: 100vh; z-index: 50; display: flex; flex-direction: column; transition: transform 0.3s cubic-bezier(0.16,1,0.3,1); transform: translateX(-100%); border-right: 1px solid rgba(255,255,255,0.06); }
        .sidebar.dark { background: rgba(8,11,22,0.94); backdrop-filter: blur(28px) saturate(160%); }
        .sidebar.light { background: rgba(255,255,255,0.92); backdrop-filter: blur(28px); border-right-color: rgba(15,23,42,0.06); }
        @media (min-width: 768px) { .sidebar { transform: translateX(0); position: relative; } }
        .sidebar.open { transform: translateX(0); }

        .sidebar-header { padding: 18px 16px 14px; }
        .logo-section { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 0 4px; }
        .logo-icon { width: 30px; height: 30px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 9px; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 16px var(--glow); }
        .logo-text { font-size: 15px; font-weight: 700; letter-spacing: -0.2px; color: #f1f5f9; }
        .sidebar.light .logo-text { color: #0f172a; }
        .new-chat-btn { display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%; padding: 9px 14px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border: none; border-radius: var(--radius-md); color: white; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 2px 12px var(--glow); }
        .new-chat-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px var(--glow); }
        .new-chat-btn:active { transform: translateY(0); }

        .sidebar-search { margin: 0 16px 12px; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-md); }
        .sidebar.dark .sidebar-search { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); }
        .sidebar.light .sidebar-search { background: #f1f5f9; border: 1px solid #e2e8f0; }
        .sidebar-search input { flex: 1; border: none; outline: none; background: transparent; font-size: 12.5px; color: #e2e8f0; }
        .sidebar.light .sidebar-search input { color: #0f172a; }
        .sidebar-search input::placeholder { color: #64748b; }
        .sidebar-search svg { color: #64748b; flex-shrink: 0; }

        .sessions-list { flex: 1; overflow-y: auto; padding: 0 10px 10px; }
        .sessions-list::-webkit-scrollbar { width: 3px; }
        .sessions-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .sections-label { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; padding: 8px 10px 6px; color: #64748b; }
        .empty-sessions { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 44px 20px; text-align: center; color: #475569; }
        .empty-sessions p { font-size: 13px; font-weight: 500; color: #64748b; }
        .empty-sessions span { font-size: 11.5px; }

        .session-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: var(--radius-md); cursor: pointer; transition: all 0.18s ease; margin-bottom: 1px; }
        .sidebar.dark .session-item:hover { background: rgba(255,255,255,0.05); }
        .sidebar.light .session-item:hover { background: #f1f5f9; }
        .sidebar.dark .session-item.active { background: linear-gradient(135deg, rgba(99,102,241,0.14), rgba(139,92,246,0.08)); }
        .sidebar.light .session-item.active { background: rgba(99,102,241,0.08); }
        .session-item.active .session-title { color: #c7d2fe; font-weight: 600; }
        .sidebar.light .session-item.active .session-title { color: #4f46e5; }

        .session-avatar { width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
        .sidebar.dark .session-avatar { background: rgba(99,102,241,0.12); color: #a5b4fc; }
        .sidebar.light .session-avatar { background: rgba(99,102,241,0.08); color: #6366f1; }

        .session-info { flex: 1; min-width: 0; }
        .session-title { font-size: 12.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #cbd5e1; }
        .sidebar.light .session-title { color: #334155; }
        .session-date { font-size: 10px; opacity: 0.55; color: #94a3b8; margin-top: 1px; }

        .session-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.18s ease; }
        .session-item:hover .session-actions, .session-item.active .session-actions { opacity: 1; }
        .session-btn { background: transparent; border: none; cursor: pointer; padding: 4px 5px; border-radius: 6px; color: #64748b; transition: all 0.15s ease; }
        .session-btn:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }
        .session-btn.delete-btn:hover { background: rgba(239,68,68,0.15); color: #f87171; }
        .session-edit-input { flex: 1; border-radius: 6px; padding: 4px 8px; font-size: 12.5px; outline: none; background: rgba(255,255,255,0.06); border: 1px solid var(--primary); color: #e2e8f0; }

        .sidebar-footer { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; }
        .sidebar.light .sidebar-footer { border-top-color: rgba(15,23,42,0.06); }
        .status-indicator { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 500; color: #64748b; }
        .status-dot { width: 6px; height: 6px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 8px rgba(34,197,94,0.4); }
        .sidebar-actions { display: flex; gap: 2px; }
        .sidebar-action-btn { background: transparent; border: none; cursor: pointer; padding: 6px; border-radius: 7px; color: #64748b; transition: all 0.15s ease; }
        .sidebar-action-btn:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
        .text-red { color: #f87171; }

        .main-chat { flex: 1; display: flex; flex-direction: column; height: 100vh; position: relative; z-index: 1; }

        .chat-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(16px); }
        .chat-header.dark { background: rgba(8,11,22,0.5); }
        .chat-header.light { background: rgba(255,255,255,0.6); border-bottom-color: rgba(15,23,42,0.05); }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .menu-btn { display: none; background: transparent; border: none; cursor: pointer; color: #94a3b8; }
        @media (max-width: 767px) { .menu-btn { display: flex; } }
        .header-info h2 { font-size: 14.5px; font-weight: 600; letter-spacing: -0.2px; color: #f1f5f9; }
        .chat-header.light .header-info h2 { color: #0f172a; }
        .header-status { display: flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 500; color: #64748b; margin-top: 1px; }
        .status-dot-small { width: 5px; height: 5px; background: #22c55e; border-radius: 50%; }
        .header-right { display: flex; align-items: center; gap: 4px; }
        .header-action-btn { background: transparent; border: none; cursor: pointer; padding: 8px; border-radius: 9px; color: #94a3b8; transition: all 0.15s ease; }
        .header-action-btn:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
        .header-action-btn.primary { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; }
        .header-action-btn.primary:hover { transform: scale(1.06); box-shadow: 0 4px 16px var(--glow); }

        .messages-container { flex: 1; overflow-y: auto; padding: 24px; }
        .messages-container::-webkit-scrollbar { width: 4px; }
        .messages-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 4px; }

        .welcome-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; gap: 8px; max-width: 480px; margin: 0 auto; animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .welcome-icon { width: 68px; height: 68px; border-radius: 20px; display: flex; align-items: center; justify-content: center; color: white; background: linear-gradient(135deg, var(--primary), var(--secondary)); box-shadow: 0 12px 40px var(--glow); margin-bottom: 8px; }
        .gradient-text { font-size: 26px; font-weight: 700; letter-spacing: -0.6px; background: linear-gradient(135deg, #f1f5f9, #cbd5e1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .app-container.light .gradient-text { background: linear-gradient(135deg, #0f172a, #334155); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .welcome-screen p { font-size: 14px; color: #94a3b8; }
        .welcome-actions { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; justify-content: center; }
        .welcome-btn { display: flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: var(--radius-md); font-weight: 600; font-size: 12.5px; cursor: pointer; border: none; transition: all 0.2s cubic-bezier(0.16,1,0.3,1); }
        .welcome-btn.primary { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; box-shadow: 0 2px 12px var(--glow); }
        .welcome-btn.primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px var(--glow); }
        .welcome-btn.secondary { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: #cbd5e1; }
        .welcome-btn.secondary:hover { background: rgba(255,255,255,0.09); }
        .welcome-tips { display: flex; gap: 8px; margin-top: 20px; flex-wrap: wrap; justify-content: center; }
        .tip { font-size: 11px; padding: 5px 12px; border-radius: 999px; color: #64748b; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
        .tip-key { color: #94a3b8; font-weight: 600; }

        .empty-chat { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; gap: 6px; }
        .empty-chat-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #64748b; background: rgba(255,255,255,0.04); margin-bottom: 6px; }
        .empty-chat h3 { font-size: 16px; font-weight: 600; color: #e2e8f0; }
        .empty-chat p { font-size: 12.5px; color: #94a3b8; }
        .empty-chat-suggestions { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; justify-content: center; }
        .suggestion-chip { padding: 7px 14px; border-radius: 999px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s cubic-bezier(0.16,1,0.3,1); border: 1px solid rgba(255,255,255,0.06); display: inline-flex; align-items: center; gap: 6px; color: #94a3b8; background: rgba(255,255,255,0.03); }
        .suggestion-chip:hover { background: rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.3); color: #c7d2fe; transform: translateY(-1px); }

        .message-wrapper { display: flex; margin-bottom: 18px; animation: fadeUp 0.3s cubic-bezier(0.16,1,0.3,1); }
        .message-wrapper.user { justify-content: flex-end; }
        .message { display: flex; gap: 9px; max-width: 76%; }
        .message-wrapper.user .message { flex-direction: row-reverse; }
        .message-avatar { width: 28px; height: 28px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .message-wrapper.user .message-avatar { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; }
        .message-wrapper.assistant .message-avatar { background: rgba(255,255,255,0.05); color: #94a3b8; border: 1px solid rgba(255,255,255,0.06); }
        .message-content { display: flex; flex-direction: column; gap: 4px; }
        .message-bubble { padding: 11px 15px; border-radius: var(--radius-lg); font-size: 13.5px; line-height: 1.65; word-wrap: break-word; }
        .message-wrapper.user .message-bubble { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; border-bottom-right-radius: 5px; }
        .message-wrapper.assistant .message-bubble { border-bottom-left-radius: 5px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.025); color: #e2e8f0; }
        .message-time { font-size: 10px; padding: 0 5px; opacity: 0.4; color: #94a3b8; }
        .message-wrapper.user .message-time { text-align: right; }

        .typing-indicator-wrapper { display: flex; justify-content: flex-start; margin-bottom: 18px; }
        .typing-indicator { display: flex; align-items: center; gap: 9px; }
        .typing-avatar { width: 28px; height: 28px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); color: #94a3b8; border: 1px solid rgba(255,255,255,0.06); }
        .typing-dots { display: flex; gap: 4px; padding: 11px 15px; border-radius: var(--radius-lg); border-bottom-left-radius: 5px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.025); }
        .typing-dots span { width: 5px; height: 5px; border-radius: 50%; animation: typingBounce 1.4s infinite; background: #64748b; }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingBounce { 0%,60%,100% { transform: translateY(0); opacity: 0.3; } 30% { transform: translateY(-5px); opacity: 1; } }

        .input-area { padding: 12px 24px 20px; }
        .input-area.dark { background: linear-gradient(to top, rgba(8,11,22,0.7), transparent); }
        .input-area.light { background: linear-gradient(to top, rgba(248,250,252,0.8), transparent); }
        .input-wrapper { max-width: 820px; margin: 0 auto; width: 100%; }
        .attachment-preview-bar { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 2px 8px; }
        .attachment-chip { display: flex; align-items: center; gap: 5px; padding: 4px 8px 4px 8px; border-radius: 999px; font-size: 11px; border: 1px solid rgba(99,102,241,0.2); background: rgba(99,102,241,0.08); color: #c7d2fe; }
        .attachment-chip button { background: transparent; border: none; cursor: pointer; padding: 0 2px; font-size: 12px; opacity: 0.5; color: inherit; }
        .attachment-chip button:hover { opacity: 1; color: #f87171; }

        .input-container { display: flex; align-items: flex-end; gap: 6px; border-radius: var(--radius-xl); padding: 6px 6px 6px 16px; transition: all 0.2s ease; }
        .app-container.dark .input-container { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); }
        .app-container.light .input-container { background: white; border: 1px solid #e2e8f0; box-shadow: 0 2px 16px rgba(15,23,42,0.04); }
        .input-container:focus-within { border-color: var(--primary); box-shadow: 0 0 0 4px var(--glow); }
        .chat-input { flex: 1; background: transparent; border: none; outline: none; font-size: 13.5px; padding: 11px 0; resize: none; max-height: 120px; font-family: inherit; line-height: 1.5; min-height: 24px; color: #e2e8f0; }
        .app-container.light .chat-input { color: #0f172a; }
        .chat-input::placeholder { color: #64748b; }
        .chat-input:disabled { opacity: 0.35; cursor: not-allowed; }
        .input-actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
        .input-action-btn { background: transparent; border: none; cursor: pointer; padding: 8px; border-radius: 10px; color: #64748b; transition: all 0.15s ease; }
        .input-action-btn:hover { background: rgba(255,255,255,0.06); color: #c7d2fe; }
        .input-action-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .input-action-btn.active-mic { color: #f87171; background: rgba(248,113,113,0.1); }
        .send-btn { width: 38px; height: 38px; border-radius: 12px; border: none; display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.16,1,0.3,1); cursor: pointer; background: rgba(255,255,255,0.04); color: #64748b; flex-shrink: 0; }
        .send-btn.active { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; box-shadow: 0 4px 16px var(--glow); }
        .send-btn.active:hover { transform: scale(1.06); }
        .send-btn:disabled { cursor: not-allowed; }
        .input-footer { display: flex; justify-content: space-between; padding: 8px 6px 0; font-size: 10.5px; color: #64748b; }

        .settings-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(10px); z-index: 100; display: flex; align-items: center; justify-content: center; animation: fadeUp 0.25s ease; padding: 20px; }
        .settings-panel { background: rgba(12,16,30,0.97); backdrop-filter: blur(28px); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-xl); width: 440px; max-height: 82vh; overflow-y: auto; box-shadow: 0 24px 70px rgba(0,0,0,0.5); animation: scaleIn 0.28s cubic-bezier(0.16,1,0.3,1); }
        @keyframes scaleIn { from { transform: scale(0.94) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        .settings-panel::-webkit-scrollbar { width: 3px; }
        .settings-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .app-container.light .settings-panel { background: rgba(255,255,255,0.98); border-color: rgba(15,23,42,0.08); }
        .settings-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 22px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .settings-header h2 { display: flex; align-items: center; gap: 9px; font-size: 15.5px; font-weight: 700; color: #f1f5f9; }
        .app-container.light .settings-header h2 { color: #0f172a; }
        .settings-header button { background: rgba(255,255,255,0.05); border: none; color: #94a3b8; cursor: pointer; padding: 6px; border-radius: 8px; transition: all 0.15s ease; }
        .settings-header button:hover { color: #e2e8f0; background: rgba(255,255,255,0.09); }
        .settings-body { padding: 8px 22px 4px; }
        .settings-section { padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .settings-section:last-child { border-bottom: none; }
        .settings-section h3 { font-size: 10.5px; font-weight: 700; color: #64748b; margin-bottom: 12px; letter-spacing: 0.6px; text-transform: uppercase; }
        .setting-item { display: flex; align-items: center; justify-content: space-between; padding: 5px 0; }
        .setting-item label { font-size: 13px; font-weight: 500; color: #e2e8f0; }
        .app-container.light .setting-item label { color: #1e293b; }
        .setting-value { font-size: 12px; font-weight: 600; color: #a5b4fc; font-variant-numeric: tabular-nums; }
        .setting-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 9px; padding: 7px 12px; color: #e2e8f0; font-size: 12.5px; outline: none; width: 150px; transition: border 0.15s ease; }
        .setting-input:focus { border-color: var(--primary); }
        .app-container.light .setting-input { background: #f1f5f9; border-color: #e2e8f0; color: #0f172a; }
        .setting-hint { font-size: 11px; color: #64748b; margin-top: 6px; }
        .setting-select { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 9px; padding: 7px 12px; color: #e2e8f0; font-size: 12.5px; outline: none; cursor: pointer; width: 150px; }
        .app-container.light .setting-select { background: #f1f5f9; border-color: #e2e8f0; color: #0f172a; }
        .range-slider { width: 100%; accent-color: var(--primary); cursor: pointer; margin-top: 4px; }
        .toggle-switch { position: relative; width: 38px; height: 21px; flex-shrink: 0; cursor: pointer; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { position: absolute; inset: 0; background: #334155; border-radius: 999px; transition: 0.25s ease; }
        .toggle-slider::before { content: ''; position: absolute; height: 15px; width: 15px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.25s cubic-bezier(0.16,1,0.3,1); }
        .toggle-switch input:checked + .toggle-slider { background: linear-gradient(135deg, var(--primary), var(--secondary)); }
        .toggle-switch input:checked + .toggle-slider::before { transform: translateX(17px); }
        .settings-footer { padding: 16px 22px; text-align: right; }
        .settings-save-btn { background: linear-gradient(135deg, var(--primary), var(--secondary)); border: none; border-radius: 10px; padding: 9px 22px; color: white; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 12px var(--glow); }
        .settings-save-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px var(--glow); }

        .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 40; animation: fadeUp 0.25s ease; }

        .prose { max-width: none; }
        .prose p { margin: 0 0 8px 0; }
        .prose p:last-child { margin-bottom: 0; }
        .prose ul, .prose ol { padding-left: 1.2rem; margin: 8px 0; }
        .prose code { background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 5px; font-size: 12px; color: #c7d2fe; }
        .prose pre { padding: 12px; border-radius: 10px; overflow-x: auto; margin: 8px 0; background: rgba(0,0,0,0.35); }
        .prose pre code { background: transparent; padding: 0; }
        .prose blockquote { border-left: 3px solid var(--primary); padding-left: 14px; font-style: italic; margin: 8px 0; color: #94a3b8; }
        .prose a { color: #a5b4fc; text-decoration: underline; }
        .prose h1, .prose h2, .prose h3, .prose h4 { font-weight: 700; margin: 12px 0 6px; }

        /* --- LIGHT MODE FIXES --- */
        .app-container.light .message-wrapper.assistant .message-bubble {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #0f172a;
        }
        .app-container.light .message-time { color: #64748b; opacity: 0.7; }
        .app-container.light .prose code { background: #f1f5f9; color: #4f46e5; }
        .app-container.light .prose pre { background: #0f172a; }
        .app-container.light .prose blockquote { color: #475569; }
        .app-container.light .prose a { color: #4f46e5; }
        .app-container.light .empty-chat h3 { color: #0f172a; }
        .app-container.light .empty-chat p { color: #475569; }
        .app-container.light .welcome-screen p { color: #475569; }
        .app-container.light .header-status { color: #475569; }
        .app-container.light .typing-dots { background: #f8fafc; border-color: #e2e8f0; }
        .app-container.light .typing-avatar { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
        .app-container.light .message-wrapper.assistant .message-avatar { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
        .app-container.light .input-hint,
        .app-container.light .input-char-count { color: #64748b; }
        .app-container.light .voice-status { background: rgba(255,255,255,0.92); border-color: #e2e8f0; }
        .app-container.light .voice-status-content { color: #1e293b; }
        .app-container.light .interim-text { background: #f1f5f9; color: #475569; }

        @media (max-width: 768px) {
          .chat-header { padding: 12px 16px; }
          .messages-container { padding: 16px; }
          .input-area { padding: 10px 16px 16px; }
          .message { max-width: 90%; }
          .settings-panel { width: 100%; max-width: 400px; }
        }
        @media (max-width: 480px) {
          .message { max-width: 95%; }
          .message-bubble { font-size: 12.5px; padding: 9px 13px; }
          .header-info h2 { font-size: 13.5px; }
        }
      `}</style>
    </div>
  );
}

export default App;