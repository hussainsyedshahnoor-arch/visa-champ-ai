import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Upload, Trash2, Download, Search, Plus, X, Calendar, ArrowLeft, FolderOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

const DOC_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "photo", label: "Photo" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "employment_letter", label: "Employment Letter" },
  { value: "invitation_letter", label: "Invitation Letter" },
  { value: "travel_insurance", label: "Travel Insurance" },
  { value: "itinerary", label: "Travel Itinerary" },
  { value: "hotel_booking", label: "Hotel Booking" },
  { value: "other", label: "Other" },
];

const DOC_TYPE_ICONS: Record<string, string> = {
  passport: "🛂",
  photo: "📷",
  bank_statement: "🏦",
  employment_letter: "💼",
  invitation_letter: "✉️",
  travel_insurance: "🛡️",
  itinerary: "✈️",
  hotel_booking: "🏨",
  other: "📄",
};

interface DocRow {
  id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  notes: string | null;
  expiry_date: string | null;
  created_at: string;
}

interface DocRequest {
  id: string;
  application_id: string;
  document_name: string;
  description: string | null;
  status: string;
  response_file_path: string | null;
  created_at: string;
}

const DocumentVault = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [requests, setRequests] = useState<DocRequest[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ document_name: "", document_type: "other", notes: "", expiry_date: "" });

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading]);

  const fetchDocuments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setDocuments(data as DocRow[]);
  };

  const fetchRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("document_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (data) setRequests(data as DocRequest[]);
  };

  useEffect(() => {
    if (user) { fetchDocuments(); fetchRequests(); }
  }, [user]);

  const handleUpload = async () => {
    if (!user || !uploadFile || !uploadForm.document_name) return;
    setUploading(true);

    const ext = uploadFile.name.split(".").pop() || "bin";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("user-documents").upload(path, uploadFile);
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("documents").insert({
      user_id: user.id,
      document_name: uploadForm.document_name,
      document_type: uploadForm.document_type,
      file_path: path,
      file_size: uploadFile.size,
      mime_type: uploadFile.type || null,
      notes: uploadForm.notes || null,
      expiry_date: uploadForm.expiry_date || null,
    });

    if (dbError) {
      toast({ title: "Error", description: dbError.message, variant: "destructive" });
    } else {
      toast({ title: "Document uploaded" });
      setShowUpload(false);
      setUploadFile(null);
      setUploadForm({ document_name: "", document_type: "other", notes: "", expiry_date: "" });
      fetchDocuments();
    }
    setUploading(false);
  };

  const deleteDocument = async (doc: DocRow) => {
    await supabase.storage.from("user-documents").remove([doc.file_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    fetchDocuments();
    toast({ title: "Document deleted" });
  };

  const downloadDocument = async (doc: DocRow) => {
    const { data } = await supabase.storage.from("user-documents").createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const submitForRequest = async (req: DocRequest, docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    await supabase.from("document_requests").update({ status: "submitted", response_file_path: doc.file_path }).eq("id", req.id);
    fetchRequests();
    toast({ title: "Document submitted for request" });
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filtered = documents.filter((d) => {
    const matchSearch = !search || d.document_name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || d.document_type === filterType;
    return matchSearch && matchType;
  });

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl py-8 px-4">
        <Button variant="ghost" className="mb-4 gap-1.5" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-primary" /> My Document Vault
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Upload and manage your travel documents. Reuse them across visa applications.</p>
          </div>
          <Button onClick={() => setShowUpload(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Upload
          </Button>
        </div>

        {/* Document Requests Banner */}
        {requests.length > 0 && (
          <Card className="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                {requests.length} Document{requests.length > 1 ? "s" : ""} Requested
              </h3>
              <div className="space-y-2">
                {requests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                    <div>
                      <p className="font-medium text-sm text-foreground">{req.document_name}</p>
                      {req.description && <p className="text-xs text-muted-foreground">{req.description}</p>}
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">Submit from Vault</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Select Document for "{req.document_name}"</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {documents.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No documents in vault. Upload one first.</p>
                          ) : (
                            documents.map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() => submitForRequest(req, doc.id)}
                                className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <span>{DOC_TYPE_ICONS[doc.document_type] || "📄"}</span>
                                  <div>
                                    <p className="text-sm font-medium">{doc.document_name}</p>
                                    <p className="text-xs text-muted-foreground">{DOC_TYPES.find((t) => t.value === doc.document_type)?.label}</p>
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Filter */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." className="pl-9" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Documents Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((doc) => (
            <Card key={doc.id} className={isExpired(doc.expiry_date) ? "border-destructive/50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{DOC_TYPE_ICONS[doc.document_type] || "📄"}</span>
                    <div>
                      <p className="font-medium text-foreground">{doc.document_name}</p>
                      <p className="text-xs text-muted-foreground">{DOC_TYPES.find((t) => t.value === doc.document_type)?.label} · {formatSize(doc.file_size)}</p>
                      {doc.expiry_date && (
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className={`text-xs ${isExpired(doc.expiry_date) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            {isExpired(doc.expiry_date) ? "Expired: " : "Expires: "}{doc.expiry_date}
                          </span>
                        </div>
                      )}
                      {doc.notes && <p className="text-xs text-muted-foreground mt-1">{doc.notes}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadDocument(doc)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDocument(doc)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No documents yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Upload your travel documents to reuse them across applications.</p>
            <Button onClick={() => setShowUpload(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Upload Document</Button>
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={showUpload} onOpenChange={setShowUpload}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Document Name *</Label>
                <Input value={uploadForm.document_name} onChange={(e) => setUploadForm({ ...uploadForm, document_name: e.target.value })} placeholder="e.g. Passport Front Page" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={uploadForm.document_type} onValueChange={(v) => setUploadForm({ ...uploadForm, document_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>File *</Label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border p-6 hover:border-primary/50 transition-colors"
                >
                  <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="hidden" />
                  {uploadFile ? (
                    <div className="text-center">
                      <FileText className="h-8 w-8 mx-auto text-primary mb-1" />
                      <p className="text-sm font-medium text-foreground">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(uploadFile.size)}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                      <p className="text-sm text-muted-foreground">Click to select file</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label>Expiry Date (optional)</Label>
                <Input type="date" value={uploadForm.expiry_date} onChange={(e) => setUploadForm({ ...uploadForm, expiry_date: e.target.value })} />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input value={uploadForm.notes} onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })} placeholder="Any additional notes..." />
              </div>
              <Button className="w-full" onClick={handleUpload} disabled={!uploadFile || !uploadForm.document_name || uploading}>
                {uploading ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DocumentVault;
