import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Mic, MicOff, FileText, Phone, MessageSquarePlus, History, ArrowDown, Paperclip, X } from "lucide-react";
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
import heroDubai from "@/assets/hero-dubai.jpg";
import heroParis from "@/assets/hero-paris.jpg";
import heroLondon from "@/assets/hero-london.jpg";
import heroChatCities from "@/assets/hero-chat-cities.jpg";

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

const POPULAR_DESTINATIONS = [
  { name: "Dubai", image: heroDubai, alt: "Dubai skyline" },
  { name: "Paris", image: heroParis, alt: "Paris Eiffel Tower" },
  { name: "London", image: heroLondon, alt: "London Big Ben" },
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
  const [guestMsgCount, setGuestMsgCount] = useState(0);
  const [attachments, setAttachments] = useState<{ file: File; preview: string; url?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { guestId, showGate, incrementCount, dismissGate, migrateToUser } = useGuestSession();
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
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        continue;
      }
      const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || isLoading) return;

    if (!user) {
      if (guestMsgCount >= 2) {
        setShowSignupGate(true);
        return;
      }
      setGuestMsgCount((c) => c + 1);
    }

    let attachmentUrls: string[] = [];
    if (attachments.length > 0) {
      setUploading(true);
      attachmentUrls = await uploadAttachments();
      setAttachments([]);
      setUploading(false);
    }

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
    if (!SR) {
      toast({ title: "Not supported", description: "Speech recognition is not supported.", variant: "destructive" });
      return;
    }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "";
    recognition.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setQuery(t);
      if (e.results[0].isFinal) {
        setIsListening(false);
        sendMessage(t);
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
      <SignupGateModal
        open={showSignupGate || showGate}
        onDismiss={() => {
          setShowSignupGate(false);
          dismissGate();
        }}
      />

      <section className="relative min-h-[90vh] overflow-hidden bg-background">
        <div className="container relative z-10 flex flex-col items-center gap-8 px-4 py-16 lg:flex-row lg:py-24">
          <div className="flex w-full max-w-xl flex-1 flex-col">
            <div className="mb-2 flex items-center justify-between">
              <Button onClick={() => setSidebarOpen(true)} variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </Button>
              {chatActive && (
                <Button onClick={startNewChat} variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <MessageSquarePlus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Chat</span>
                </Button>
              )}
            </div>

            {!chatActive && (
              <div className="mb-8">
                <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
                  Your visa. Sorted in{" "}
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">minutes.</span>
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                  Ask me about tourist visa eligibility, documents & requirements — I'll guide you through it.
                </p>

                <div className="mt-6 flex gap-3 overflow-x-auto pb-1">
                  {POPULAR_DESTINATIONS.map((city) => (
                    <div key={city.name} className="flex min-w-[160px] items-center gap-3 rounded-2xl border border-border/60 bg-card/85 p-2.5 shadow-sm backdrop-blur-sm">
                      <img
                        src={city.image}
                        alt={city.alt}
                        className="h-14 w-14 rounded-xl object-cover"
                        loading="lazy"
                        width={120}
                        height={120}
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{city.name}</p>
                        <p className="text-xs text-muted-foreground">Popular destination</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chatActive && (
              <div className="relative mb-4 overflow-hidden rounded-[2rem] border border-border/60 bg-muted/40 shadow-xl">
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100"
                  style={{ backgroundImage: `url(${heroChatCities})` }}
                />
                <div className="absolute inset-0 bg-background/55 backdrop-blur-[1px]" />
                <div ref={scrollRef} className="relative max-h-[50vh] overflow-y-auto px-4 py-4 pr-2 sm:px-5">
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
                          <div
                            className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                              isUser
                                ? "rounded-tr-md bg-primary text-primary-foreground"
                                : "rounded-tl-md border border-border/60 bg-card/90 text-foreground backdrop-blur-sm"
                            }`}
                          >
                            {isUser ? (
                              <>
                                {msg.content.match(/\[Attachment\]\((https?:\/\/[^\)]+)\)/g)?.map((match, j) => {
                                  const url = match.match(/\((https?:\/\/[^\)]+)\)/)?.[1];
                                  if (!url) return null;
                                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                  return isImage ? (
                                    <img key={j} src={url} alt="attachment" className="mb-2 max-h-40 max-w-full rounded-lg" />
                                  ) : (
                                    <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="mb-1 flex items-center gap-1.5 text-xs underline">
                                      <FileText className="h-3 w-3" /> Attachment
                                    </a>
                                  );
                                })}
                                <p className="whitespace-pre-wrap">{msg.content.replace(/\n?\n?\[Attachment\]\(https?:\/\/[^\)]+\)/g, "").trim()}</p>
                              </>
                            ) : (
                              <div className="prose prose-sm max-w-none text-left dark:prose-invert">
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
                        <Button variant="outline" size="sm" className="gap-2 rounded-full bg-background/90" onClick={() => window.location.assign("/apply")}>
                          <FileText className="h-4 w-4" /> Apply for Visa
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2 rounded-full bg-background/90" onClick={() => window.location.assign("/book-call")}>
                          <Phone className="h-4 w-4" /> Talk to Visa Officer
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((att, i) => (
                  <div key={i} className="group relative">
                    {att.preview ? (
                      <img src={att.preview} alt={att.file.name} className="h-16 w-16 rounded-lg border border-border object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-muted">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <p className="mt-0.5 w-16 truncate text-[10px] text-muted-foreground">{att.file.name}</p>
                  </div>
                ))}
              </div>
            )}

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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="relative flex-1">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  placeholder=""
                  className="w-full resize-none bg-transparent px-2 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {!query && !chatActive && attachments.length === 0 && (
                  <div className="pointer-events-none absolute inset-0 flex items-start px-2 py-2">
                    <span className="text-base text-muted-foreground">
                      {autoType.text}
                      <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-primary align-middle" />
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 pb-1">
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    isListening ? "animate-pulse bg-destructive text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <button
                  type="submit"
                  disabled={(!query.trim() && attachments.length === 0) || isLoading || uploading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>

            {!chatActive && (
              <div className="mt-5 flex flex-wrap gap-2.5">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-accent/30 bg-accent/15 px-5 py-2.5 text-sm text-foreground transition-all hover:border-accent/50 hover:bg-accent/25"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {!chatActive && (
              <a href="#how-it-works" className="mt-8 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                See how I can help you <ArrowDown className="h-4 w-4 animate-bounce" />
              </a>
            )}
          </div>

          <div className="hidden flex-1 items-center justify-center lg:flex" style={{ minHeight: 480 }}>
            <div className="relative h-full w-full">
              <div className="absolute right-0 top-0 h-72 w-72 overflow-hidden rounded-full shadow-2xl">
                <img src={heroDubai} alt="Dubai skyline" className="h-full w-full object-cover" width={800} height={800} />
              </div>
              <div className="absolute bottom-0 left-4 h-64 w-64 overflow-hidden rounded-full shadow-2xl">
                <img src={heroParis} alt="Paris Eiffel Tower" className="h-full w-full object-cover" loading="lazy" width={800} height={800} />
              </div>
              <div className="absolute right-24 top-40 h-52 w-52 overflow-hidden rounded-full shadow-xl">
                <img src={heroLondon} alt="London Big Ben" className="h-full w-full object-cover" loading="lazy" width={800} height={800} />
              </div>
              <div className="absolute left-20 top-16 h-16 w-16 rounded-full bg-primary/20" />
              <div className="absolute bottom-20 right-8 h-10 w-10 rounded-full bg-accent/20" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroSection;
