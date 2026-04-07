import { useEffect } from "react";
import { MessageSquare, Trash2, X, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatSession } from "@/hooks/use-chat-history";
import { Link } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onFetch: () => void;
  isLoggedIn: boolean;
}

const ChatHistorySidebar = ({
  open,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onFetch,
  isLoggedIn,
}: Props) => {
  useEffect(() => {
    if (open && isLoggedIn) onFetch();
  }, [open, isLoggedIn, onFetch]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-background/95 backdrop-blur-md shadow-2xl border-r animate-in slide-in-from-left duration-300">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Chat History</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!isLoggedIn ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <LogIn className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Log in to save and view your chat history</p>
            <Link to="/login" onClick={onClose}>
              <Button size="sm">Log in</Button>
            </Link>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No chats yet. Start a conversation!</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                    s.id === activeSessionId
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                  onClick={() => {
                    onSelectSession(s.id);
                    onClose();
                  }}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{s.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                    className="hidden shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </>
  );
};

export default ChatHistorySidebar;
