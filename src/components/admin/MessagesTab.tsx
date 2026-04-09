import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  application_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface AppWithMessages {
  id: string;
  applicant_name: string | null;
  applicant_email: string | null;
  status: string;
  unread_count: number;
}

const MessagesTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apps, setApps] = useState<AppWithMessages[]>([]);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchApps = async () => {
    const { data: applications } = await supabase
      .from("applications")
      .select("id, applicant_name, applicant_email, status")
      .order("updated_at", { ascending: false });

    if (!applications) return;

    // Get unread counts
    const appsWithCounts: AppWithMessages[] = await Promise.all(
      applications.map(async (app) => {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("application_id", app.id)
          .eq("is_read", false)
          .neq("sender_id", user?.id ?? "");
        return { ...app, unread_count: count ?? 0 };
      })
    );

    setApps(appsWithCounts.filter((a) => a.unread_count > 0 || messages.length > 0).length > 0
      ? appsWithCounts
      : appsWithCounts);
  };

  const fetchMessages = async (appId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("application_id", appId)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data);
      // Mark as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("application_id", appId)
        .neq("sender_id", user?.id ?? "");
    }
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 100);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedApp || !user) return;
    const { error } = await supabase.from("messages").insert({
      application_id: selectedApp,
      sender_id: user.id,
      content: newMessage.trim(),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setNewMessage("");
    fetchMessages(selectedApp);
  };

  useEffect(() => { fetchApps(); }, []);

  useEffect(() => {
    if (selectedApp) fetchMessages(selectedApp);
  }, [selectedApp]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if (selectedApp && (payload.new as Message).application_id === selectedApp) {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 100);
        }
        fetchApps();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedApp]);

  const filtered = apps.filter((a) =>
    !search || (a.applicant_name?.toLowerCase().includes(search.toLowerCase()) || a.applicant_email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex gap-4 h-[70vh]">
      {/* App list */}
      <div className="w-80 shrink-0 flex flex-col border rounded-lg bg-card">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search applicants..." className="pl-9" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((app) => (
            <button
              key={app.id}
              onClick={() => setSelectedApp(app.id)}
              className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${selectedApp === app.id ? "bg-muted" : ""}`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm text-foreground truncate">{app.applicant_name || "Unknown"}</p>
                {app.unread_count > 0 && (
                  <Badge variant="default" className="text-xs">{app.unread_count}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{app.applicant_email}</p>
              <Badge variant="outline" className="mt-1 text-xs">{app.status}</Badge>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground text-center">No applications found</p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col border rounded-lg bg-card">
        {selectedApp ? (
          <>
            <div className="p-3 border-b">
              <p className="font-medium text-foreground">
                {apps.find((a) => a.id === selectedApp)?.applicant_name || "Applicant"}
              </p>
              <p className="text-xs text-muted-foreground">
                {apps.find((a) => a.id === selectedApp)?.applicant_email}
              </p>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isAdmin = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                      isAdmin ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                    }`}>
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-1 ${isAdmin ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Start the conversation.</p>
              )}
            </div>
            <div className="p-3 border-t flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Select an application to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesTab;
