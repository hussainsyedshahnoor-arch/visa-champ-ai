import { useState, useEffect } from "react";
import { Plus, Search, FileText, Check, X, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const DocumentRequestsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ application_id: "", document_name: "", description: "" });

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("document_requests")
      .select("*, applications(applicant_name, applicant_email)")
      .order("created_at", { ascending: false });
    if (data) setRequests(data);
  };

  const fetchApplications = async () => {
    const { data } = await supabase
      .from("applications")
      .select("id, applicant_name, applicant_email, status")
      .order("created_at", { ascending: false });
    if (data) setApplications(data);
  };

  useEffect(() => { fetchRequests(); fetchApplications(); }, []);

  const createRequest = async () => {
    if (!form.application_id || !form.document_name || !user) return;
    const { error } = await supabase.from("document_requests").insert({
      application_id: form.application_id,
      document_name: form.document_name,
      description: form.description || null,
      requested_by: user.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setShowCreate(false);
    setForm({ application_id: "", document_name: "", description: "" });
    fetchRequests();
    toast({ title: "Document requested" });
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("document_requests").update({ status }).eq("id", id);
    fetchRequests();
    toast({ title: `Request ${status}` });
  };

  const viewFile = async (path: string) => {
    const { data } = await supabase.storage.from("user-documents").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const filtered = requests.filter((r) => {
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchSearch = !search || r.document_name.toLowerCase().includes(search.toLowerCase()) ||
      r.applications?.applicant_name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    submitted: requests.filter((r) => r.status === "submitted").length,
    approved: requests.filter((r) => r.status === "approved").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Pending", value: stats.pending, color: "text-yellow-600" },
          { label: "Submitted", value: stats.submitted, color: "text-blue-600" },
          { label: "Approved", value: stats.approved, color: "text-green-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Request Document
        </Button>
      </div>

      {/* Requests list */}
      <div className="space-y-2">
        {filtered.map((req) => (
          <Card key={req.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{req.document_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.applications?.applicant_name || "Unknown"} · {req.applications?.applicant_email || ""}
                  </p>
                  {req.description && <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(req.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_STYLES[req.status] || ""}>{req.status}</Badge>
                {req.status === "submitted" && req.response_file_path && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => viewFile(req.response_file_path)}>
                      View File
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={() => updateStatus(req.id, "approved")}>
                      <Check className="h-3 w-3" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateStatus(req.id, "rejected")}>
                      <X className="h-3 w-3" /> Reject
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground">No document requests</p>}
      </div>

      {/* Create Request Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Document from Applicant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Application</Label>
              <Select value={form.application_id} onValueChange={(v) => setForm({ ...form, application_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select application" /></SelectTrigger>
                <SelectContent>
                  {applications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.applicant_name || "Unknown"} — {app.applicant_email || app.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Document Name *</Label>
              <Input value={form.document_name} onChange={(e) => setForm({ ...form, document_name: e.target.value })} placeholder="e.g. Bank Statement (last 6 months)" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Explain what exactly is needed..." rows={3} />
            </div>
            <Button className="w-full" onClick={createRequest} disabled={!form.application_id || !form.document_name}>
              Send Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentRequestsTab;
