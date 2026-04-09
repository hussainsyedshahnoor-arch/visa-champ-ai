import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Mic, MicOff, FileText, Phone, MessageSquarePlus, History, ArrowDown, Paperclip, X, Image as ImageIcon } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import heroBeach1 from "@/assets/hero-beach-1.jpg";
import heroBeach2 from "@/assets/hero-beach-2.jpg";
import heroCity from "@/assets/hero-city.jpg";

const SUGGESTED_PROMPTS = [
  "Tourist visa for UAE",
  "Tourist visa for UK",
  "Schengen tourist visa",
  "Tourist visa for USA",
];

const AUTO_TYPE_PROMPTS = [
  "Check my UAE tourist visa eligibility",
  "Documents for UK visitor visa",
  "Plan a trip to Turkey",
  "Schengen visa requirements",
];

/* ── Auto-typing hook ── */
function useAutoType(prompts: string[], speed = 60, pause = 1800) {
  const [text, setText] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!active) return;
    let idx = 0;
    let charIdx = 0;
    let typing = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (!typing) return;
      const current = prompts[idx];
      if (charIdx <= current.length) {
        setText(current.slice(0, charIdx));
        charIdx++;
        timer = setTimeout(tick, speed);
      } else {
        timer = setTimeout(() => {
          idx = (idx + 1) % prompts.length;
          charIdx = 0;
          setText("");
          timer = setTimeout(tick, 300);
        }, pause);
      }
    };
    tick();
    return () => {
      typing = false;
      clearTimeout(timer);
    };
  }, [active, prompts, speed, pause]);

  return { text, stop: () => setActive(false), start: () => setActive(true), isActive: active };
}

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasResponse, setHasResponse] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSignupGate, setShowSignupGate] = useState(false);
  const [attachments, setAttachments] = useState<{ file: File; preview: string; url?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { guestId, isAtCap, showGate, incrementCount, dismissGate, migrateToUser } = useGuestSession();
  const autoType = useAutoType(AUTO_TYPE_PROMPTS);

  const {
    sessions, activeSessionId, fetchSessions, createSession,
    saveMessage, loadSession, deleteSession, clearActive,
  } = useChatHistory(user?.id, guestId);

  useEffect(() => {
    if (user && guestId) {
      migrateToUser(user.id).then(() => fetchSessions());
    }
  }, [user?.id]);

  const chatActive = messages.length > 0;

  // Stop auto-type when user starts typing or chat is active
  useEffect(() => {
    if (chatActive || query.length > 0) autoType.stop();
    else if (!chatActive && query.length === 0) autoType.start();
  }, [chatActive, query]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map((file) => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    }));
    setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => {
      const a = prev[idx];
      if (a.preview) URL.revokeObjectURL(a.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const uploadAttachments = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const att of attachments) {
      const ext = att.file.name.split(".").pop() || "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("chat-attachments").upload(path, att.file);
      if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); continue; }
      const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || isLoading) return;
    if (!user && isAtCap) { setShowSignupGate(true); return; }

    // Upload attachments first
    let attachmentUrls: string[] = [];
    if (attachments.length > 0) {
      setUploading(true);
      attachmentUrls = await uploadAttachments();
      setAttachments([]);
      setUploading(false);
    }

    // Build message content with attachments
    let content = trimmed;
    if (attachmentUrls.length > 0) {
      const attachmentText = attachmentUrls.map((url) => `[Attachment](${url})`).join("\n");
      content = content ? `${content}\n\n${attachmentText}` : attachmentText;
    }

    const userMsg: Msg = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setIsLoading(true);
    setHasResponse(false);
    scrollToBottom();

    if (!sessionIdRef.current) {
      const newId = await createSession(trimmed);
      sessionIdRef.current = newId;
    }
    if (sessionIdRef.current) await saveMessage(sessionIdRef.current, userMsg);
    if (!user) await incrementCount();

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
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast({ title: "Not supported", description: "Speech recognition is not supported.", variant: "destructive" }); return; }
    if (isListening && recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); return; }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "";
    recognition.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setQuery(t);
      if (e.results[0].isFinal) { setIsListening(false); sendMessage(t); }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, toast]);

  const startNewChat = useCallback(() => {
    setMessages([]); setQuery(""); setIsLoading(false); setHasResponse(false);
    sessionIdRef.current = null; clearActive();
    if (recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); }
  }, [clearActive]);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    const msgs = await loadSession(sessionId);
    setMessages(msgs);
    sessionIdRef.current = sessionId;
    setHasResponse(msgs.length > 0 && msgs[msgs.length - 1]?.role === "assistant");
    setTimeout(() => scrollToBottom(), 100);
  }, [loadSession]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(query); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(query); }
  };

  return (
    <>
      <ChatHistorySidebar
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        sessions={sessions} activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession} onDeleteSession={deleteSession}
        onFetch={fetchSessions} isLoggedIn={!!user}
      />
      <SignupGateModal
        open={showSignupGate || showGate}
        onDismiss={() => { setShowSignupGate(false); dismissGate(); }}
      />

      <section className="relative min-h-[90vh] bg-background overflow-hidden">
        <div className="container relative z-10 flex flex-col lg:flex-row items-center gap-8 px-4 py-16 lg:py-24">
          {/* ── Left: Chat ── */}
          <div className="flex-1 w-full max-w-xl flex flex-col">
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <Button onClick={() => setSidebarOpen(true)} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </Button>
              {chatActive && (
                <Button onClick={startNewChat} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5">
                  <MessageSquarePlus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Chat</span>
                </Button>
              )}
            </div>

            {/* Heading */}
            {!chatActive && (
              <div className="mb-8">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
                  Your visa. Sorted in{" "}
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">minutes.</span>
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                  Ask me about tourist visa eligibility, documents & requirements — I'll guide you through it.
                </p>
              </div>
            )}

            {/* Chat messages */}
            {chatActive && (
              <div ref={scrollRef} className="flex-1 max-h-[50vh] overflow-y-auto mb-4 pr-2">
                <div className="space-y-4">
                  {messages.map((msg, i) => {
                    const isUser = msg.role === "user";
                    return (
                      <div key={i} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={isUser ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}>
                            {isUser ? "👤" : <Globe className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                          isUser ? "bg-primary text-primary-foreground rounded-tr-md" : "bg-muted text-foreground rounded-tl-md"
                        }`}>
                          {isUser ? (
                            <>
                              {/* Render inline images from attachments */}
                              {msg.content.match(/\[Attachment\]\((https?:\/\/[^\)]+)\)/g)?.map((match, j) => {
                                const url = match.match(/\((https?:\/\/[^\)]+)\)/)?.[1];
                                if (!url) return null;
                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                return isImage ? (
                                  <img key={j} src={url} alt="attachment" className="rounded-lg max-w-full max-h-40 mb-2" />
                                ) : (
                                  <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs underline mb-1">
                                    <FileText className="h-3 w-3" /> Attachment
                                  </a>
                                );
                              })}
                              <p className="whitespace-pre-wrap">{msg.content.replace(/\n?\n?\[Attachment\]\(https?:\/\/[^\)]+\)/g, "").trim()}</p>
                            </>
                          ) : (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {isLoading && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}

                  {hasResponse && !isLoading && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => window.location.assign("/eligibility")}>
                        <FileText className="h-4 w-4" /> Apply for Visa
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => window.location.assign("https://wa.me/923001234567?text=Hi%2C%20I%20need%20help%20with%20my%20tourist%20visa")}>
                        <Phone className="h-4 w-4" /> Talk to Visa Officer
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Attachment previews */}
            {attachments.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {attachments.map((att, i) => (
                  <div key={i} className="relative group">
                    {att.preview ? (
                      <img src={att.preview} alt={att.file.name} className="h-16 w-16 rounded-lg object-cover border border-border" />
                    ) : (
                      <div className="h-16 w-16 rounded-lg border border-border bg-muted flex items-center justify-center">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <p className="text-[10px] text-muted-foreground truncate w-16 mt-0.5">{att.file.name}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Input box */}
            <form onSubmit={handleSubmit} className="flex w-full items-end gap-2 rounded-2xl border border-border bg-card p-3 shadow-lg">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="flex-1 relative">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  placeholder=""
                  className="w-full resize-none bg-transparent px-2 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {/* Auto-typing overlay */}
                {!query && !chatActive && attachments.length === 0 && (
                  <div className="absolute inset-0 flex items-start px-2 py-2 pointer-events-none">
                    <span className="text-base text-muted-foreground">
                      {autoType.text}
                      <span className="inline-block w-0.5 h-5 bg-primary animate-pulse ml-0.5 align-middle" />
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 pb-1">
                <button
                  type="button" onClick={toggleVoice}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    isListening ? "bg-destructive text-white animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <button
                  type="submit" disabled={(!query.trim() && attachments.length === 0) || isLoading || uploading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>

            {/* Suggestion chips */}
            {!chatActive && (
              <div className="mt-5 flex flex-wrap gap-2.5">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt} onClick={() => sendMessage(prompt)}
                    className="rounded-full bg-accent/15 border border-accent/30 px-5 py-2.5 text-sm text-foreground transition-all hover:bg-accent/25 hover:border-accent/50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Scroll indicator */}
            {!chatActive && (
              <a href="#how-it-works" className="mt-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                See how I can help you <ArrowDown className="h-4 w-4 animate-bounce" />
              </a>
            )}
          </div>

          {/* ── Right: Decorative bubble images ── */}
          
            <div className="hidden lg:flex flex-1 items-center justify-center relative" style={{ minHeight: 480 }}>
              {/* Large top-right circle */}
              <div className="absolute top-0 right-0 w-72 h-72 rounded-full overflow-hidden shadow-2xl">
                <img src={heroBeach1} alt="Tropical beach" className="w-full h-full object-cover" width={800} height={800} />
              </div>
              {/* Large bottom-left circle */}
              <div className="absolute bottom-0 left-4 w-64 h-64 rounded-full overflow-hidden shadow-2xl">
                <img src={heroBeach2} alt="Overwater bungalows" className="w-full h-full object-cover" width={800} height={800} />
              </div>
              {/* Medium center-right circle */}
              <div className="absolute top-40 right-24 w-52 h-52 rounded-full overflow-hidden shadow-xl">
                <img src={heroCity} alt="Dubai skyline" className="w-full h-full object-cover" loading="lazy" width={800} height={800} />
              </div>
              {/* Decorative dots */}
              <div className="absolute top-16 left-20 w-16 h-16 rounded-full bg-primary/20" />
              <div className="absolute bottom-20 right-8 w-10 h-10 rounded-full bg-accent/20" />
            </div>
        </div>
      </section>
    </>
  );
};

export default HeroSection;
