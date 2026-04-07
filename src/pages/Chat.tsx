import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Send, Globe, ArrowLeft, Info, Mic, MicOff, MessageSquarePlus, Trash2, LogOut, FileText, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import TypingIndicator from "@/components/TypingIndicator";
import ThemeToggle from "@/components/ThemeToggle";
import { streamChat, type Msg } from "@/lib/chat-stream";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useChatHistory, type ChatSession } from "@/hooks/use-chat-history";
import { supabase } from "@/integrations/supabase/client";

const SUGGESTED_PROMPTS = [
  "Tourist visa for UAE 🇦🇪",
  "Tourist visa for UK 🇬🇧",
  "Schengen tourist visa 🇪🇺",
  "Tourist visa for USA 🇺🇸",
  "Tourist visa for Canada 🇨🇦",
  "Tourist visa for Australia 🇦🇺",
];

interface TimestampedMsg extends Msg {
  timestamp: Date;
}

const Chat = () => {
  const [messages, setMessages] = useState<TimestampedMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasResponse, setHasResponse] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const {
    sessions,
    activeSessionId,
    fetchSessions,
    createSession,
    saveMessage,
    loadSession,
    deleteSession,
    clearActive,
  } = useChatHistory(user?.id);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Load sessions on mount
  useEffect(() => {
    if (user) fetchSessions();
  }, [user, fetchSessions]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: TimestampedMsg = { role: "user", content: trimmed, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setHasResponse(false);
    scrollToBottom();

    if (!sessionIdRef.current) {
      const newId = await createSession(trimmed);
      sessionIdRef.current = newId;
    }

    if (sessionIdRef.current) {
      await saveMessage(sessionIdRef.current, userMsg);
    }

    let assistantContent = "";
    const allMessages: Msg[] = [...messages, userMsg].map(({ role, content }) => ({ role, content }));

    try {
      await streamChat({
        messages: allMessages,
        onDelta: (chunk) => {
          assistantContent += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
            }
            return [...prev, { role: "assistant", content: assistantContent, timestamp: new Date() }];
          });
          scrollToBottom();
        },
        onDone: () => {
          setIsLoading(false);
          setHasResponse(true);
          if (sessionIdRef.current && assistantContent) {
            saveMessage(sessionIdRef.current, { role: "assistant", content: assistantContent });
          }
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
          setIsLoading(false);
        },
      });
    } catch {
      setIsLoading(false);
    }
  };

  const startNewChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setIsLoading(false);
    setHasResponse(false);
    sessionIdRef.current = null;
    clearActive();
  }, [clearActive]);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    const msgs = await loadSession(sessionId);
    setMessages(msgs.map((m) => ({ ...m, timestamp: new Date() })));
    sessionIdRef.current = sessionId;
    setHasResponse(msgs.length > 0 && msgs[msgs.length - 1]?.role === "assistant");
    setTimeout(() => scrollToBottom(), 100);
  }, [loadSession]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Not supported", description: "Speech recognition is not supported in this browser.", variant: "destructive" });
      return;
    }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "";
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join("");
      setInput(transcript);
      if (event.results[0].isFinal) {
        setIsListening(false);
        sendMessage(transcript);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-72" : "w-0"} flex-shrink-0 overflow-hidden transition-all duration-300 border-r bg-card`}>
        <div className="flex h-full w-72 flex-col">
          {/* Sidebar header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary">
              <Globe className="h-5 w-5" />
              Visa Champ
            </Link>
            <ThemeToggle />
          </div>

          {/* New chat button */}
          <div className="p-3">
            <Button onClick={startNewChat} className="w-full gap-2" variant="outline">
              <MessageSquarePlus className="h-4 w-4" />
              New Chat
            </Button>
          </div>

          {/* Sessions list */}
          <ScrollArea className="flex-1 px-2">
            <div className="space-y-1 pb-4">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                    s.id === activeSessionId
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                  onClick={() => handleSelectSession(s.id)}
                >
                  <Globe className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="flex-1 truncate">{s.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                    className="hidden shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="px-3 py-8 text-center text-xs text-muted-foreground">No conversations yet</p>
              )}
            </div>
          </ScrollArea>

          {/* User footer */}
          <div className="border-t p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {user?.email?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <button
            className="hidden md:block shrink-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">Visa Champ</h1>
              <p className="text-xs text-muted-foreground">Tourist Visa Consultant for Pakistan</p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Globe className="h-10 w-10" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground">How can I help you today?</h2>
                <p className="mb-10 max-w-md text-muted-foreground">
                  Ask me about tourist visa requirements, documents, eligibility or approval chances for any country.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt.replace(/\s*[\u{1F1E0}-\u{1F1FF}]+$/u, ""))}
                      className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary hover:shadow-sm"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, i) => {
                  const isUser = msg.role === "user";
                  return (
                    <div key={i} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                      <Avatar className="h-8 w-8 shrink-0 mt-1">
                        <AvatarFallback className={isUser ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}>
                          {isUser ? (user?.email?.[0]?.toUpperCase() ?? "U") : <Globe className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[80%] ${isUser ? "text-right" : ""}`}>
                        <div className={`inline-block rounded-2xl px-4 py-3 text-sm ${
                          isUser
                            ? "bg-primary text-primary-foreground rounded-tr-md"
                            : "bg-muted text-foreground rounded-tl-md"
                        }`}>
                          {isUser ? (
                            <p className="whitespace-pre-wrap text-left">{msg.content}</p>
                          ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none text-left">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                        <p className={`mt-1 text-[10px] text-muted-foreground ${isUser ? "text-right" : "text-left"}`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {isLoading && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}

                {/* Action buttons */}
                {hasResponse && !isLoading && (
                  <div className="flex flex-wrap gap-2 pl-11">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-full"
                      onClick={() => navigate("/eligibility")}
                    >
                      <FileText className="h-4 w-4" />
                      Apply for Visa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-full"
                      onClick={() => window.open("https://wa.me/923001234567?text=Hi%2C%20I%20need%20help%20with%20my%20tourist%20visa", "_blank")}
                    >
                      <Phone className="h-4 w-4" />
                      Talk to Visa Officer
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-center justify-center gap-1.5 bg-muted/50 px-4 py-1.5 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3" />
          AI guidance only — not legal advice.
        </div>

        {/* Input */}
        <div className="border-t bg-card p-4">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about tourist visa requirements..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={toggleVoice}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isListening ? "bg-destructive text-white animate-pulse" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            </div>
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0 rounded-xl"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
