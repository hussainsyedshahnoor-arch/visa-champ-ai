import { useState, useEffect, useCallback } from "react";
import { FileText, Eye, Download, ChevronDown, ChevronUp, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = ["submitted", "in_review", "approved", "rejected", "on_hold"] as const;

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  submitted: { label: "Submitted", variant: "secondary" },
  draft: { label: "Draft", variant: "outline" },
  in_review: { label: "In Review", variant: "default" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  on_hold: { label: "On Hold", variant: "outline" },
};

interface Application {
  id: string;
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_phone: string | null;
  passport_number: string | null;
  status: string;
  travel_date: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  country_id: string | null;
  visa_type_id: string | null;
}

interface AppDocument {
  id: string;
  document_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  status: string;
}

const ApplicationsTab = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [countries, setCountries] = useState<Record<string, { name: string; flag_emoji: string }>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, AppDocument[]>>({});
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setApplications(data as Application[]);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setLoading(false);
  }, []);

  const fetchCountries = useCallback(async () => {
    const { data } = await supabase.from("countries").select("id, name, flag_emoji");
    if (data) {
      const map: Record<string, { name: string; flag_emoji: string }> = {};
      data.forEach((c) => { map[c.id] = { name: c.name, flag_emoji: c.flag_emoji }; });
      setCountries(map);
    }
  }, []);

  useEffect(() => { fetchApplications(); fetchCountries(); }, [fetchApplications, fetchCountries]);

  const fetchDocs = async (appId: string) => {
    if (documents[appId]) return;
    const { data } = await supabase
      .from("application_documents")
      .select("id, document_name, file_path, file_size, mime_type, status")
      .eq("application_id", appId);
    if (data) setDocuments((prev) => ({ ...prev, [appId]: data }));
  };

  const updateStatus = async (appId: string, newStatus: string) => {
    const app = applications.find((a) => a.id === appId);
    const { error } = await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", appId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    // Log status change
    await supabase.from("application_status_history").insert({
      application_id: appId,
      from_status: app?.status || null,
      to_status: newStatus,
    });

    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: newStatus } : a));
    toast({ title: "Status updated" });
  };

  const updateAssignedTo = async (appId: string, officer: string) => {
    const { error } = await supabase
      .from("applications")
      .update({ assigned_to: officer || null } as any)
      .eq("id", appId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, assigned_to: officer || null } : a));
    toast({ title: "Officer assigned" });
  };

  const downloadDoc = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("application-documents")
      .createSignedUrl(filePath, 300);
    if (error || !data?.signedUrl) {
      toast({ title: "Error", description: "Could not get download link", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const toggleExpand = (appId: string) => {
    if (expandedId === appId) { setExpandedId(null); return; }
    setExpandedId(appId);
    fetchDocs(appId);
  };

  const filtered = applications.filter((a) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.applicant_name?.toLowerCase().includes(q) ||
        a.applicant_email?.toLowerCase().includes(q) ||
        a.passport_number?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusCounts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilterStatus("all")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{applications.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        {STATUS_OPTIONS.map((s) => (
          <Card key={s} className={`cursor-pointer hover:shadow-md ${filterStatus === s ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{statusCounts[s] || 0}</p>
              <p className="text-xs text-muted-foreground">{STATUS_CONFIG[s]?.label || s}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or passport..."
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Applications list */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading applications...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No applications found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => {
            const isExpanded = expandedId === app.id;
            const country = app.country_id ? countries[app.country_id] : null;
            const docs = documents[app.id] || [];

            return (
              <Card key={app.id} className="overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30"
                  onClick={() => toggleExpand(app.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate">{app.applicant_name || "No name"}</p>
                        {country && <span className="text-sm">{country.flag_emoji} {country.name}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{app.applicant_email}</span>
                        <span>·</span>
                        <span>{new Date(app.created_at).toLocaleDateString()}</span>
                        {app.assigned_to && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1"><User className="h-3 w-3" />{app.assigned_to}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={STATUS_CONFIG[app.status]?.variant || "secondary"}>
                      {STATUS_CONFIG[app.status]?.label || app.status}
                    </Badge>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-4 bg-muted/10">
                    {/* Details */}
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{app.applicant_phone || "—"}</span></div>
                      <div><span className="text-muted-foreground">Passport:</span> <span className="font-medium">{app.passport_number || "—"}</span></div>
                      <div><span className="text-muted-foreground">Travel Date:</span> <span className="font-medium">{app.travel_date || "—"}</span></div>
                      <div><span className="text-muted-foreground">Notes:</span> <span className="font-medium">{app.notes || "—"}</span></div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="space-y-1 flex-1">
                        <label className="text-xs font-medium text-muted-foreground">Status</label>
                        <Select value={app.status} onValueChange={(v) => updateStatus(app.id, v)}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 flex-1">
                        <label className="text-xs font-medium text-muted-foreground">Assign to Officer</label>
                        <Input
                          defaultValue={app.assigned_to || ""}
                          placeholder="Officer name..."
                          className="h-9"
                          onBlur={(e) => {
                            if (e.target.value !== (app.assigned_to || "")) {
                              updateAssignedTo(app.id, e.target.value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateAssignedTo(app.id, (e.target as HTMLInputElement).value);
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Documents */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        Documents ({docs.length})
                      </h4>
                      {docs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No documents uploaded.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {docs.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between rounded-lg border bg-card p-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 shrink-0 text-primary" />
                                <div className="min-w-0">
                                  <p className="text-sm truncate">{doc.document_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : ""}
                                    {doc.mime_type ? ` · ${doc.mime_type}` : ""}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 shrink-0"
                                onClick={() => downloadDoc(doc.file_path, doc.document_name)}
                              >
                                <Download className="h-3.5 w-3.5" /> View
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApplicationsTab;
