import { useState, useRef, useEffect } from "react";
import { Send, ArrowDown, Plane } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import TypingIndicator from "@/components/TypingIndicator";
import { streamChat, type Msg } from "@/lib/chat-stream";
import { useToast } from "@/hooks/use-toast";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const chatActive = messages.length > 0;

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Msg = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setIsLoading(true);
    scrollToBottom();

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
    <section className="relative flex min-h-[90vh] flex-col overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <img src={heroBg} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      </div>

      {/* Content area */}
      <div className="container relative z-10 flex flex-1 flex-col items-center px-4">
        {/* Hero text — shrinks when chat is active */}
        <div className={`flex flex-col items-center text-center transition-all duration-500 ${chatActive ? "pt-8 pb-4" : "flex-1 justify-center"}`}>
          <h1 className={`font-extrabold tracking-tight text-white animate-fade-in transition-all duration-500 ${chatActive ? "mb-2 text-2xl md:text-3xl" : "mb-6 text-4xl md:text-6xl lg:text-7xl"}`}>
            Your visa. Sorted in{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">minutes.</span>
          </h1>

          {!chatActive && (
            <p className="mb-10 max-w-2xl text-lg text-white/70 md:text-xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Ask me about tourist visa eligibility, documents, costs — I'll guide you through it.
            </p>
          )}
        </div>

        {/* Chat messages area — only when chat is active */}
        {chatActive && (
          <div ref={scrollRef} className="w-full max-w-2xl flex-1 overflow-y-auto px-2 pb-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} />
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}
            </div>
          </div>
        )}

        {/* Suggestion chips — only before chat starts */}
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

        {/* Input bar — always at bottom */}
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
              type="submit"
              disabled={!query.trim() || isLoading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>

        {/* Scroll indicator — only before chat */}
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
  );
};

export default HeroSection;
