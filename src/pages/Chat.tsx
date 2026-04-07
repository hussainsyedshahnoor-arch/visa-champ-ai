import { useState, useRef, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Send, ArrowLeft, Info } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import TypingIndicator from "@/components/TypingIndicator";
import { streamChat, type Msg } from "@/lib/chat-stream";
import { useToast } from "@/hooks/use-toast";

const SUGGESTED_PROMPTS = [
  "Tourist visa for UAE",
  "Student visa for UK",
  "Work visa for Canada",
  "Schengen visa requirements",
];

const Chat = () => {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Handle pre-filled prompt from URL
  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (prompt && messages.length === 0) {
      sendMessage(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setInput("");
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
        onDone: () => setIsLoading(false),
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
          setIsLoading(false);
        },
      });
    } catch {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">Visa Champ</h1>
            <p className="text-xs text-muted-foreground">AI Visa Consultant</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Globe className="h-8 w-8" />
              </div>
              <h2 className="mb-2 text-xl font-bold">Welcome to Visa Champ</h2>
              <p className="mb-8 max-w-md text-muted-foreground">
                I'm your AI visa consultant. Ask me about visa requirements, eligibility, or documents for any country.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center justify-center gap-1.5 border-t bg-secondary/50 px-4 py-1.5 text-xs text-muted-foreground">
        <Info className="h-3 w-3" />
        AI assistant — responses are for guidance only and do not constitute legal advice.
      </div>

      {/* Input */}
      <div className="border-t bg-card p-4">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about visa requirements..."
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
