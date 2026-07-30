import { useState, useEffect } from "react";
import { Search, RefreshCw, Trash2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const STATUS_STYLES: Record<string, string> = {
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  abandoned: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  submitted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In progress",
  abandoned: "Abandoned",
  submitted: "Submitted",
};

const EligibilityLeadsTab = () => {
  const { toast } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("eligibility_leads")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) toast({ title: "Could not load leads", description: error.message, variant: "destructive" });
    if (data) setLeads(data);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const removeLead = async (id: string) => {
    const { error } = await supabase.from("eligibility_leads").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const filtered = leads.filter((l) => {
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      [l.full_name, l.email, l.whatsapp, l.country_name, l.visa_type_name]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  const counts = {
    all: leads.length,
    in_progress: leads.filter((l) => l.status === "in_progress").length,
    abandoned: leads.filter((l) => l.status === "abandoned").length,
    submitted: leads.filter((l) => l.status === "submitted").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["all", "in_progress", "abandoned", "submitted"] as const).map((k) => (
          <Card key={k} className="cursor-pointer" onClick={() => setFilterStatus(k === "all" ? "all" : k)}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k === "all" ? "Total leads" : STATUS_LABELS[k]}</p>
              <p className="text-2xl font-bold">{counts[k]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, email, phone, country" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="abandoned">Abandoned</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchLeads} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No leads yet.</p>
        )}
        {filtered.map((lead) => (
          <Card key={lead.id}>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-[180px] flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{lead.full_name || "Unnamed visitor"}</span>
                  <Badge className={STATUS_STYLES[lead.status] ?? ""}>{STATUS_LABELS[lead.status] ?? lead.status}</Badge>
                  {lead.score !== null && lead.score !== undefined && (
                    <Badge variant="outline">Score {lead.score}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {lead.country_name || "No country"} · {lead.visa_type_name || "No visa type"} · step {lead.furthest_step ?? "—"}
                </p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                  {lead.whatsapp && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.whatsapp}</span>}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(lead.updated_at).toLocaleString()}</span>
              <Button variant="outline" size="sm" onClick={() => setSelected(lead)}>View</Button>
              {lead.whatsapp && (
                <Button size="sm" variant="secondary" asChild>
                  <a href={`https://wa.me/${String(lead.whatsapp).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => removeLead(lead.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.full_name || "Lead details"}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            {Object.entries(selected?.form_data ?? {}).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b pb-1">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-right font-medium">{Array.isArray(v) ? v.join(", ") : String(v || "—")}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EligibilityLeadsTab;
