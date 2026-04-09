import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Send, X, Info, FileText, Phone } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import TypingIndicator from "@/components/TypingIndicator";
import { streamChat, type Msg } from "@/lib/chat-stream";
import { useToast } from "@/hooks/use-toast";

interface ChatPanelProps {
  initialPrompt: string;
  onClose: () => void;
}

const ChatPanel = ({ initialPrompt, onClose }: ChatPanelProps) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasResponse, setHasResponse] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const hasSentInitial = useRef(false);

  useEffect(() => {
    if (initialPrompt && !hasSentInitial.current) {
      hasSentInitial.current = true;
      sendMessage(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="container px-4 pb-12">
      <div className="mx-auto flex max-w-3xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl" style={{ height: "560px" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-card px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Visa Champion</h3>
              <p className="text-xs text-muted-foreground">Tourist Visa Consultant</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5">
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}
          </div>
        </div>

        {/* Action buttons - show after first AI response */}
        {hasResponse && !isLoading && (
          <div className="flex flex-wrap gap-2 border-t px-5 py-3 bg-secondary/30">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full"
              onClick={() => window.location.href = "/eligibility"}
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

        {/* Disclaimer */}
        <div className="flex items-center justify-center gap-1.5 bg-secondary/50 px-4 py-1.5 text-xs text-muted-foreground">
          <Info className="h-3 w-3" />
          AI assistant — responses are for guidance only.
        </div>

        {/* Input */}
        <div className="border-t bg-card p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about tourist visa requirements..."
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
    </div>
  );
};

export default ChatPanel;
