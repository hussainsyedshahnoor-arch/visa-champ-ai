import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2, FileText, Clock, CheckCircle, XCircle, AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: FileText },
  submitted: { label: "Submitted", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  in_review: { label: "In Review", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: AlertCircle },
  approved: { label: "Approved", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
};

const ApplicationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [app, setApp] = useState<any>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !id) return;

    const fetchAll = async () => {
      const [appRes, historyRes, msgRes] = await Promise.all([
        supabase.from("applications").select("*, countries(name, flag_emoji), visa_types(name)").eq("id", id).single(),
        supabase.from("application_status_history").select("*").eq("application_id", id).order("created_at", { ascending: true }),
        supabase.from("messages").select("*").eq("application_id", id).order("created_at", { ascending: true }),
      ]);

      if (appRes.error || !appRes.data) {
        toast({ title: "Not found", description: "Application not found.", variant: "destructive" });
        navigate("/applications");
        return;
      }
      setApp(appRes.data);
      setStatusHistory(historyRes.data || []);
      setMessages(msgRes.data || []);
      setLoading(false);
    };
    fetchAll();

    // Realtime messages
    const channel = supabase
      .channel(`app-messages-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `application_id=eq.${id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = msgInput.trim();
    if (!text || !user || !id) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      application_id: id,
      sender_id: user.id,
      content: text,
    });
    if (error) {
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    }
    setMsgInput("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (authLoading || loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!app) return null;

  const status = STATUS_CONFIG[app.status] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-5xl py-8 px-4">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/applications")}>
          <ArrowLeft className="h-4 w-4" /> Back to Applications
        </Button>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{app.countries?.flag_emoji}</span>
              <h1 className="text-2xl font-bold text-foreground">{app.countries?.name || "Unknown"}</h1>
            </div>
            <p className="mt-1 text-muted-foreground">
              {app.visa_types?.name || "Tourist Visa"} • {app.applicant_name}
            </p>
          </div>
          <Badge className={`gap-1.5 text-sm ${status.color}`}>
            <StatusIcon className="h-4 w-4" />
            {status.label}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left: Details & History */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Application Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Applicant</span><span className="font-medium">{app.applicant_name}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Passport</span><span className="font-medium">{app.passport_number || "—"}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{app.applicant_email || "—"}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{app.applicant_phone || "—"}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Travel Date</span><span className="font-medium">{app.travel_date || "—"}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Applied</span><span className="font-medium">{new Date(app.created_at).toLocaleDateString()}</span></div>
              </CardContent>
            </Card>

            {statusHistory.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Status History</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statusHistory.map((h) => (
                      <div key={h.id} className="flex items-start gap-3 text-sm">
                        <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                        <div>
                          <p className="font-medium">{h.to_status.replace("_", " ")}</p>
                          {h.note && <p className="text-muted-foreground">{h.note}</p>}
                          <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Messages */}
          <Card className="lg:col-span-3 flex flex-col" style={{ height: "520px" }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" /> Messages
              </CardTitle>
            </CardHeader>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pb-2">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No messages yet. Send a message to your visa officer.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"}`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p className={`mt-1 text-[10px] ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message to your visa officer..."
                  className="min-h-[44px] max-h-24 resize-none"
                  rows={1}
                />
                <Button onClick={sendMessage} disabled={!msgInput.trim() || sending} size="icon" className="shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetail;
