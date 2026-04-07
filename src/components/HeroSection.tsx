import { useState, useRef, useCallback, useEffect } from "react";
import { Send, ArrowDown, Mic, MicOff, FileText, Phone, MessageSquarePlus, History } from "lucide-react";
import { Globe } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import TypingIndicator from "@/components/TypingIndicator";
import { streamChat, type Msg } from "@/lib/chat-stream";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useChatHistory } from "@/hooks/use-chat-history";
import { useGuestSession } from "@/hooks/use-guest-session";
import ChatHistorySidebar from "@/components/ChatHistorySidebar";
import SignupGateModal from "@/components/SignupGateModal";
import heroBg from "@/assets/hero-bg.jpg";

const SUGGESTED_PROMPTS = [
  "Tourist visa for UAE",
  "Tourist visa for UK",
  "Schengen tourist visa",
  "Tourist visa for USA",
];

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasResponse, setHasResponse] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSignupGate, setShowSignupGate] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { guestId, isAtCap, showGate, incrementCount, dismissGate, migrateToUser } = useGuestSession();

  const {
    sessions,
    activeSessionId,
    fetchSessions,
    createSession,
    saveMessage,
    loadSession,
    deleteSession,
    clearActive,
  } = useChatHistory(user?.id, guestId);

  // Migrate guest data when user logs in
  useEffect(() => {
    if (user && guestId) {
      migrateToUser(user.id).then(() => fetchSessions());
    }
  }, [user?.id]);

  const chatActive = messages.length > 0;

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    // Guest cap check
    if (!user && isAtCap) {
      setShowSignupGate(true);
      return;
    }

    const userMsg: Msg = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setIsLoading(true);
    setHasResponse(false);
    scrollToBottom();

    // Create session on first message
    if (!sessionIdRef.current) {
      const newId = await createSession(trimmed);
      sessionIdRef.current = newId;
    }

    // Save user message
    if (sessionIdRef.current) {
      await saveMessage(sessionIdRef.current, userMsg);
    }

    // Increment guest count
    if (!user) {
      await incrementCount();
    }

    let assistantContent = "";
    const allMessages = [...messages, userMsg];

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
            return [...prev, { role: "assistant", content: assistantContent }];
          });
          scrollToBottom();
        },
        onDone: () => {
          setIsLoading(false);
          setHasResponse(true);
          // Save assistant message
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
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");
      setQuery(transcript);

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

  const startNewChat = useCallback(() => {
    setMessages([]);
    setQuery("");
    setIsLoading(false);
    setHasResponse(false);
    sessionIdRef.current = null;
    clearActive();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [clearActive]);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    const msgs = await loadSession(sessionId);
    setMessages(msgs);
    sessionIdRef.current = sessionId;
    setHasResponse(msgs.length > 0 && msgs[msgs.length - 1]?.role === "assistant");
    setTimeout(() => scrollToBottom(), 100);
  }, [loadSession]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(query);
    }
  };

  return (
    <>
      <ChatHistorySidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={deleteSession}
        onFetch={fetchSessions}
        isLoggedIn={!!user}
      />

      <section className="relative flex min-h-[90vh] flex-col overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <img src={heroBg} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        </div>

        {/* Content area */}
        <div className="container relative z-10 flex flex-1 flex-col items-center px-4">
          {/* Hero text */}
          <div className={`flex flex-col items-center text-center transition-all duration-500 ${chatActive ? "pt-8 pb-4" : "flex-1 justify-center"}`}>
            <div className={`flex items-center gap-3 ${chatActive ? "w-full max-w-2xl justify-between" : "justify-center"}`}>
              {/* History button */}
              <Button
                onClick={() => setSidebarOpen(true)}
                variant="ghost"
                size="sm"
                className="shrink-0 text-white/70 hover:text-white hover:bg-white/10 gap-1.5"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </Button>

              <h1 className={`font-extrabold tracking-tight text-white animate-fade-in transition-all duration-500 ${chatActive ? "mb-0 text-2xl md:text-3xl" : "mb-6 text-4xl md:text-6xl lg:text-7xl"}`}>
                Your visa. Sorted in{" "}
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">minutes.</span>
              </h1>

              {chatActive ? (
                <Button
                  onClick={startNewChat}
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-white/70 hover:text-white hover:bg-white/10 gap-1.5"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Chat</span>
                </Button>
              ) : (
                <div className="w-[88px] hidden sm:block" /> 
              )}
            </div>

            {!chatActive && (
              <p className="mb-10 max-w-2xl text-lg text-white/70 md:text-xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
                Ask me about tourist visa eligibility, documents & requirements — I'll guide you through it.
              </p>
            )}
          </div>

          {/* Chat messages area */}
          {chatActive && (
            <div ref={scrollRef} className="w-full max-w-2xl flex-1 overflow-y-auto px-2 pb-4">
              <div className="space-y-4">
                {messages.map((msg, i) => {
                  const isUser = msg.role === "user";
                  return (
                    <div key={i} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className={isUser ? "bg-white/20 text-white" : "bg-primary text-primary-foreground"}>
                          {isUser ? "👤" : <Globe className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm backdrop-blur-md ${
                        isUser
                          ? "bg-primary/80 text-white rounded-tr-md"
                          : "bg-white/15 text-white rounded-tl-md"
                      }`}>
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="prose prose-sm prose-invert max-w-none">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {isLoading && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}

                {/* Action buttons after response */}
                {hasResponse && !isLoading && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-full border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
                      onClick={() => sendMessage("I want to apply for my visa")}
                    >
                      <FileText className="h-4 w-4" />
                      Apply for Visa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-full border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
                      onClick={() => sendMessage("I want to talk to a visa officer")}
                    >
                      <Phone className="h-4 w-4" />
                      Talk to Visa Officer
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Suggestion chips */}
          {!chatActive && (
            <div className="mb-6 flex flex-wrap justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border border-white/30 px-5 py-2.5 text-sm text-white/80 backdrop-blur-sm transition-all hover:border-white/60 hover:text-white hover:bg-white/10"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="w-full max-w-2xl pb-8 pt-2">
            <form
              onSubmit={handleSubmit}
              className="flex w-full items-center gap-2 rounded-2xl bg-white p-2 shadow-2xl"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={chatActive ? "Ask a follow-up question..." : "Ask anything about tourist visas..."}
                className="flex-1 bg-transparent px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={toggleVoice}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isListening
                    ? "bg-destructive text-white animate-pulse"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>

          {/* Scroll indicator */}
          {!chatActive && (
            <a
              href="#how-it-works"
              className="mb-8 flex flex-col items-center gap-1 text-sm text-white/60 transition-colors hover:text-white/80 animate-fade-in"
              style={{ animationDelay: "0.5s" }}
            >
              See how I can help you
              <ArrowDown className="h-4 w-4 animate-bounce" />
            </a>
          )}
        </div>
      </section>
    </>
  );
};

export default HeroSection;
