import { useState, useEffect, useRef } from "react";
import { StickyNote, Send, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface Note {
  id: string;
  application_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface App {
  id: string;
  applicant_name: string | null;
  applicant_email: string | null;
  status: string;
}

const ApplicationNotesTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("applications").select("id, applicant_name, applicant_email, status")
      .order("updated_at", { ascending: false })
      .then(({ data }) => { if (data) setApps(data); });
  }, []);

  const fetchNotes = async (appId: string) => {
    const { data } = await supabase
      .from("application_notes")
      .select("*")
      .eq("application_id", appId)
      .order("created_at", { ascending: true });
    if (data) setNotes(data as Note[]);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 100);
  };

  useEffect(() => { if (selectedApp) fetchNotes(selectedApp); }, [selectedApp]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("app-notes")
      .on("postgres_changes", { event: "*", schema: "public", table: "application_notes" }, (payload) => {
        if (selectedApp && (payload.new as Note)?.application_id === selectedApp) {
          fetchNotes(selectedApp);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedApp]);

  const addNote = async () => {
    if (!newNote.trim() || !selectedApp || !user) return;
    const { error } = await supabase.from("application_notes").insert({
      application_id: selectedApp,
      author_id: user.id,
      content: newNote.trim(),
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewNote("");
    fetchNotes(selectedApp);
  };

  const deleteNote = async (id: string) => {
    await supabase.from("application_notes").delete().eq("id", id);
    if (selectedApp) fetchNotes(selectedApp);
    toast({ title: "Note deleted" });
  };

  const filtered = apps.filter((a) =>
    !search || a.applicant_name?.toLowerCase().includes(search.toLowerCase()) || a.applicant_email?.toLowerCase().includes(search.toLowerCase())
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
            <button key={app.id} onClick={() => setSelectedApp(app.id)}
              className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${selectedApp === app.id ? "bg-muted" : ""}`}>
              <p className="font-medium text-sm text-foreground truncate">{app.applicant_name || "Unknown"}</p>
              <p className="text-xs text-muted-foreground truncate">{app.applicant_email}</p>
              <Badge variant="outline" className="mt-1 text-xs">{app.status}</Badge>
            </button>
          ))}
          {filtered.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">No applications found</p>}
        </div>
      </div>

      {/* Notes area */}
      <div className="flex-1 flex flex-col border rounded-lg bg-card">
        {selectedApp ? (
          <>
            <div className="p-3 border-b flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-amber-500" />
              <p className="font-medium text-foreground">
                Notes — {apps.find((a) => a.id === selectedApp)?.applicant_name || "Applicant"}
              </p>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 group">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                    {note.author_id === user?.id && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => deleteNote(note.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">No notes yet. Add an internal note below.</p>
              )}
            </div>
            <div className="p-3 border-t flex gap-2">
              <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }}
                placeholder="Add internal note..." rows={2} className="resize-none" />
              <Button onClick={addNote} disabled={!newNote.trim()} size="icon" className="shrink-0 self-end">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Select an application to view notes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationNotesTab;
