import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Mic, 
  Send, 
  History, 
  Download, 
  RefreshCw, 
  X, 
  LogOut, 
  Menu,
  ChevronRight,
  Volume2,
  Search,
  MapPin,
  Bot,
  User as UserIcon,
  Plus,
  Cpu,
  Activity,
  Terminal,
  Layers,
  Shield,
  Zap
} from 'lucide-react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { cn } from './lib/utils';
import { generateWallpapers, chatStream, generateMusic, generateVideo, textToSpeech } from './services/gemini';
import Markdown from 'react-markdown';

// --- Components ---

const Intro = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white"
    >
      <motion.img 
        initial={{ scale: 0.9, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        src="https://lh3.googleusercontent.com/d/1oGjfDdsDCDJ8lTNWrPS_16iEcxm6GyVe"
        alt="Ai-Dev Intro"
        className="w-48 h-48 object-contain mb-8 filter drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]"
        referrerPolicy="no-referrer"
      />
      <div className="text-center space-y-2">
        <motion.h1 
          initial={{ letterSpacing: "1em", opacity: 0 }}
          animate={{ letterSpacing: "0.2em", opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="text-3xl font-bold tracking-tighter font-mono uppercase text-blue-500"
        >
          Ai-Dev
        </motion.h1>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ delay: 1, duration: 1 }}
          className="h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 2, duration: 1 }}
          className="text-[10px] uppercase tracking-[0.4em] font-mono"
        >
          Dip's Advanced Interface
        </motion.p>
      </div>
    </motion.div>
  );
};

const Auth = () => {
  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <h2 className="text-5xl font-bold tracking-tighter font-mono bg-gradient-to-r from-blue-400 to-indigo-600 bg-clip-text text-transparent">
            Ai-Dev
          </h2>
          <div className="h-0.5 w-12 bg-blue-500 mx-auto rounded-full" />
          <p className="text-neutral-400 font-mono text-sm tracking-widest uppercase">Identity Verified</p>
        </div>
        <button 
          onClick={handleLogin}
          className="w-full py-4 px-6 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-neutral-200 transition-colors"
        >
          <img src="https://www.gstatic.com/firebase/anonymous-scan.png" className="w-6 h-6 invert" alt="" />
          Continue with Google
        </button>
      </div>
    </div>
  );
};

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
          <p className="text-neutral-400 mb-6 max-w-md">{this.state.error?.message || "An unexpected error occurred."}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-white text-black font-bold rounded-xl"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App ---

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [showIntro, setShowIntro] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'wallpapers' | 'chat' | 'history'>('wallpapers');
  
  // Wallpaper State
  const [vibe, setVibe] = useState('');
  const [wallpapers, setWallpapers] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Chat State
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // History State
  const [historyWallpapers, setHistoryWallpapers] = useState<any[]>([]);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Audio State
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Sync user to Firestore
        const userPath = `users/${u.uid}`;
        setDoc(doc(db, userPath), {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          createdAt: serverTimestamp()
        }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, userPath));

        // Load chat history
        const msgPath = `users/${u.uid}/messages`;
        const qMsg = query(collection(db, msgPath), orderBy('createdAt', 'asc'));
        onSnapshot(qMsg, (snapshot) => {
          setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => handleFirestoreError(err, OperationType.GET, msgPath));

        // Load wallpaper history
        const wpPath = `users/${u.uid}/wallpapers`;
        const qWp = query(collection(db, wpPath), orderBy('createdAt', 'desc'));
        onSnapshot(qWp, (snapshot) => {
          setHistoryWallpapers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => handleFirestoreError(err, OperationType.GET, wpPath));
      }
    });

    // Setup Wake Word "007"
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('')
          .toLowerCase();

        if (transcript.includes('devil')) {
          handleWakeWord();
        } else if (event.results[event.results.length - 1].isFinal) {
          handleCommand(transcript);
          setInput(transcript);
          setIsListening(false);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Speech recognition already started");
      }
    }

    return () => {
      unsubscribe();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleWakeWord = () => {
    setIsListening(true);
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance("System active. Command please.");
    synth.speak(utter);
  };

  const handleCommand = (cmd: string) => {
    const c = cmd.toLowerCase();
    
    // Command Feedback
    const speak = (text: string) => {
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(text);
      synth.speak(utter);
    };

    if (c.includes('generate wallpaper')) {
      setActiveTab('wallpapers');
      const vibeMatch = c.match(/generate wallpaper (.+)/);
      if (vibeMatch) {
        setVibe(vibeMatch[1]);
        speak(`Initiating wallpaper generation for ${vibeMatch[1]}`);
        handleGenerateWallpapers();
      } else {
        speak("Please specify a vibe for the wallpaper.");
      }
    } else if (c.includes('show chat') || c.includes('open chat')) {
      setActiveTab('chat');
      speak("Switching to neural interface.");
    } else if (c.includes('show history') || c.includes('open history')) {
      setActiveTab('history');
      speak("Accessing archived records.");
    } else if (c.includes('show wallpapers') || c.includes('open wallpapers')) {
      setActiveTab('wallpapers');
      speak("Switching to visual output.");
    } else if (c.includes('logout') || c.includes('sign out')) {
      speak("Deauthorizing user. Goodbye.");
      signOut(auth);
    } else if (c.includes('what is on screen') || c.includes('describe screen')) {
      let description = `Currently viewing the ${activeTab} module.`;
      if (activeTab === 'wallpapers' && wallpapers.length > 0) {
        description += ` There are ${wallpapers.length} generated wallpapers visible.`;
      } else if (activeTab === 'chat' && messages.length > 0) {
        description += ` There are ${messages.length} messages in the conversation thread.`;
      }
      speak(description);
    } else if (c.includes('download')) {
      if (selectedImage) {
        handleDownload(selectedImage);
        speak("Downloading current asset.");
      } else if (wallpapers.length > 0) {
        handleDownload(wallpapers[0]);
        speak("Downloading first available asset.");
      } else {
        speak("No asset selected for download.");
      }
    } else {
      // Fallback to chat if it sounds like a question
      setInput(cmd);
      handleSendMessage();
    }
  };

  const handleGenerateWallpapers = async (remixImage?: string) => {
    if (!vibe && !remixImage) return;
    setIsGenerating(true);
    try {
      const images = await generateWallpapers(vibe, remixImage);
      setWallpapers(images);
      
      if (user) {
        const wpPath = `users/${user.uid}/wallpapers`;
        for (const url of images) {
          await addDoc(collection(db, wpPath), {
            id: Math.random().toString(36).substr(2, 9),
            userId: user.uid,
            prompt: vibe || "Remix",
            imageUrl: url,
            createdAt: new Date().toISOString(),
            isRemix: !!remixImage
          }).catch(err => handleFirestoreError(err, OperationType.WRITE, wpPath));
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input || !user) return;
    const userMsg = input;
    setInput('');
    setIsChatting(true);

    try {
      const msgPath = `users/${user.uid}/messages`;
      await addDoc(collection(db, msgPath), {
        id: Date.now().toString(),
        userId: user.uid,
        role: 'user',
        content: userMsg,
        createdAt: serverTimestamp()
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, msgPath));

      const stream = await chatStream(userMsg, messages.map(m => ({ role: m.role, content: m.content })));
      let fullResponse = '';
      
      for await (const chunk of stream) {
        fullResponse += chunk.text;
      }

      await addDoc(collection(db, msgPath), {
        id: (Date.now() + 1).toString(),
        userId: user.uid,
        role: 'model',
        content: fullResponse,
        createdAt: serverTimestamp()
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, msgPath));
    } catch (error) {
      console.error(error);
    } finally {
      setIsChatting(false);
    }
  };

  const handleGenerateMusic = async () => {
    if (!input || !user) return;
    setIsChatting(true);
    try {
      const url = await generateMusic(input);
      if (url) setAudioUrl(url);
    } catch (error) {
      console.error(error);
    } finally {
      setIsChatting(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!input || !user) return;
    setIsChatting(true);
    try {
      const url = await generateVideo(input);
      if (url) setVideoUrl(url);
    } catch (error) {
      console.error(error);
    } finally {
      setIsChatting(false);
    }
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `dai-wallpaper-${Date.now()}.png`;
    link.click();
  };

  const handleRemix = (url: string) => {
    setSelectedImage(null);
    setActiveTab('wallpapers');
    handleGenerateWallpapers(url);
  };

  if (showIntro) return <Intro onComplete={() => setShowIntro(false)} />;
  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono">Loading...</div>;
  if (!user) return <Auth />;

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <div className="scanline" />
      
      {/* Background Ambient Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neutral-900 border border-white/10 rounded-xl flex items-center justify-center relative group overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors" />
            <Bot className="w-6 h-6 text-blue-400 relative z-10" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight font-mono leading-none">Dip's Ai-Dev</h1>
            <span className="text-[10px] text-blue-500 font-mono uppercase tracking-widest mt-1">System 1.0.0 Online</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => signOut(auth)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <LogOut className="w-5 h-5 text-neutral-400" />
          </button>
          <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-white/10" alt="" referrerPolicy="no-referrer" />
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-32 relative z-10">
        {/* System Monitor Bar */}
        <div className="px-6 py-2 bg-neutral-900/30 border-b border-white/5 flex items-center gap-6 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <Activity className="w-3 h-3 text-green-500" />
            <span className="text-[10px] font-mono uppercase text-neutral-500">Signal: Stable</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Cpu className="w-3 h-3 text-blue-500" />
            <span className="text-[10px] font-mono uppercase text-neutral-500">CPU: {Math.floor(Math.random() * 20 + 5)}%</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Shield className="w-3 h-3 text-purple-500" />
            <span className="text-[10px] font-mono uppercase text-neutral-500">Security: Encrypted</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span className="text-[10px] font-mono uppercase text-neutral-500">Power: Optimized</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'wallpapers' && (
            <motion.div 
              key="wallpapers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter">Generate Wallpaper</h2>
                <div className="relative">
                  <input 
                    type="text" 
                    value={vibe}
                    onChange={(e) => setVibe(e.target.value)}
                    placeholder="e.g. rainy cyberpunk lo-fi"
                    className="w-full bg-neutral-900 border border-white/10 rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                  <button 
                    onClick={() => handleGenerateWallpapers()}
                    disabled={isGenerating || !vibe}
                    className="absolute right-2 top-2 bottom-2 px-4 bg-white text-black rounded-xl font-bold disabled:opacity-50"
                  >
                    {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {wallpapers.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {wallpapers.map((url, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => setSelectedImage(url)}
                      className="aspect-[9/16] rounded-2xl overflow-hidden border border-white/5 cursor-pointer hover:border-blue-500/50 transition-all"
                    >
                      <img src={url} className="w-full h-full object-cover" alt="" />
                    </motion.div>
                  ))}
                </div>
              )}

              {wallpapers.length === 0 && !isGenerating && (
                <div className="aspect-[9/16] w-full rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-neutral-500 gap-4">
                  <ImageIcon className="w-12 h-12 opacity-20" />
                  <p className="font-mono text-sm">Your creations will appear here</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-[calc(100vh-160px)]"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4">
                    <Bot className="w-12 h-12 opacity-20" />
                    <p className="font-mono text-sm">Start a conversation with D-Ai</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "")}>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      msg.role === 'user' ? "bg-blue-500" : "bg-neutral-800"
                    )}>
                      {msg.role === 'user' ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div className={cn(
                      "max-w-[80%] p-4 rounded-2xl text-sm",
                      msg.role === 'user' ? "bg-blue-500 text-white" : "bg-neutral-900 text-neutral-200"
                    )}>
                      <div className="prose prose-invert prose-sm max-w-none">
                        <Markdown>
                          {msg.content}
                        </Markdown>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Media Previews */}
              {(audioUrl || videoUrl) && (
                <div className="px-6 py-4 bg-neutral-900/50 border-t border-white/5 space-y-4">
                  {audioUrl && (
                    <div className="flex items-center justify-between bg-neutral-800 p-3 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Music className="w-5 h-5 text-blue-400" />
                        <span className="text-xs font-mono">Generated Track</span>
                      </div>
                      <audio controls src={audioUrl} className="h-8" />
                      <button onClick={() => setAudioUrl(null)}><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  {videoUrl && (
                    <div className="flex flex-col bg-neutral-800 p-3 rounded-xl gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Video className="w-5 h-5 text-purple-400" />
                          <span className="text-xs font-mono">Generated Video</span>
                        </div>
                        <button onClick={() => setVideoUrl(null)}><X className="w-4 h-4" /></button>
                      </div>
                      <video controls src={videoUrl} className="w-full rounded-lg" />
                    </div>
                  )}
                </div>
              )}

              <div className="p-6 border-t border-white/10 space-y-4 bg-neutral-950/50 backdrop-blur-md">
                <div className="flex gap-2">
                  <button 
                    onClick={handleGenerateMusic}
                    className="flex-1 py-3 bg-neutral-900 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/5 hover:border-blue-500/50 transition-all group"
                  >
                    <Music className="w-3 h-3 group-hover:text-blue-400" /> Music
                  </button>
                  <button 
                    onClick={handleGenerateVideo}
                    className="flex-1 py-3 bg-neutral-900 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/5 hover:border-purple-500/50 transition-all group"
                  >
                    <Video className="w-3 h-3 group-hover:text-purple-400" /> Video
                  </button>
                </div>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask me anything..."
                      className="w-full bg-neutral-900 border border-white/10 rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={isChatting || !input}
                      className="absolute right-2 top-2 bottom-2 px-4 bg-white text-black rounded-xl font-bold disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      if (isListening) {
                        recognitionRef.current?.stop();
                        setIsListening(false);
                      } else {
                        recognitionRef.current?.start();
                        setIsListening(true);
                      }
                    }}
                    className={cn(
                      "p-4 rounded-2xl transition-all",
                      isListening ? "bg-red-500 text-white animate-pulse" : "bg-neutral-900 border border-white/10 text-neutral-400"
                    )}
                  >
                    <Mic className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-8"
            >
              <h2 className="text-3xl font-bold tracking-tighter">History</h2>
              {historyWallpapers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-500 gap-4">
                  <History className="w-12 h-12 opacity-20" />
                  <p className="font-mono text-sm">No history found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {historyWallpapers.map((wp, i) => (
                    <motion.div 
                      key={wp.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedImage(wp.imageUrl)}
                      className="aspect-[9/16] rounded-2xl overflow-hidden border border-white/5 relative group"
                    >
                      <img src={wp.imageUrl} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <p className="text-[10px] font-mono truncate">{wp.prompt}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-t border-white/5 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <NavButton 
            active={activeTab === 'wallpapers'} 
            onClick={() => setActiveTab('wallpapers')} 
            icon={<ImageIcon />} 
            label="Wallpapers" 
          />
          <NavButton 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')} 
            icon={<Bot />} 
            label="Chat" 
          />
          <NavButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<History />} 
            label="History" 
          />
        </div>
      </nav>

      {/* Full Screen Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
              <button onClick={() => setSelectedImage(null)} className="p-3 bg-black/50 backdrop-blur-md rounded-full">
                <X className="w-6 h-6" />
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleDownload(selectedImage)}
                  className="p-3 bg-black/50 backdrop-blur-md rounded-full"
                >
                  <Download className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => handleRemix(selectedImage)}
                  className="p-3 bg-blue-500 rounded-full"
                >
                  <RefreshCw className="w-6 h-6" />
                </button>
              </div>
            </div>
            <img src={selectedImage} className="w-full h-full object-contain" alt="" />
            <div className="absolute bottom-12 left-0 right-0 text-center px-6">
              <p className="text-sm font-mono text-neutral-400 bg-black/50 backdrop-blur-md py-2 px-4 rounded-full inline-block">
                Tap Remix to use this as a reference
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Overlay */}
      <AnimatePresence>
        {isListening && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-24 left-6 right-6 z-50 bg-blue-600 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-2xl shadow-blue-500/20"
          >
            <div className="flex gap-1 items-center h-12">
              {[1, 2, 3, 4, 5].map(i => (
                <motion.div 
                  key={i}
                  animate={{ height: [10, 40, 10] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                  className="w-1.5 bg-white rounded-full"
                />
              ))}
            </div>
            <p className="text-lg font-bold">Listening...</p>
            <button 
              onClick={() => setIsListening(false)}
              className="px-6 py-2 bg-white/20 rounded-full text-sm font-bold"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1 transition-all",
      active ? "text-blue-500" : "text-neutral-500 hover:text-neutral-300"
    )}
  >
    <div className={cn(
      "p-2 rounded-xl transition-all",
      active ? "bg-blue-500/10" : ""
    )}>
      {React.cloneElement(icon as any, { className: "w-6 h-6" })}
    </div>
    <span className="text-[10px] uppercase tracking-widest font-bold font-mono">{label}</span>
  </button>
);
