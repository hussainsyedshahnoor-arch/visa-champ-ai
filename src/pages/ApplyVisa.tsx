import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Upload, X, FileText, Check, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

interface Country {
  id: string;
  name: string;
  flag_emoji: string;
}

interface VisaType {
  id: string;
  name: string;
  description: string | null;
}

interface UploadedFile {
  file: File;
  name: string;
  preview?: string;
}

const REQUIRED_DOCS = [
  "Passport (front page scan)",
  "Passport-size Photo",
  "Bank Statement (last 6 months)",
  "Employment Letter / Business Proof",
  "Travel Itinerary",
  "Hotel Booking Confirmation",
];

const ApplyVisa = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [countries, setCountries] = useState<Country[]>([]);
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [countryId, setCountryId] = useState("");
  const [visaTypeId, setVisaTypeId] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    supabase.from("countries").select("id, name, flag_emoji").order("name").then(({ data }) => {
      if (data) setCountries(data);
    });
  }, []);

  useEffect(() => {
    if (!countryId) { setVisaTypes([]); return; }
    supabase.from("visa_types").select("id, name, description").eq("country_id", countryId).eq("is_active", true).then(({ data }) => {
      if (data) setVisaTypes(data);
    });
  }, [countryId]);

  useEffect(() => {
    if (user?.email) setApplicantEmail(user.email);
  }, [user]);

  const handleFileAdd = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const mapped = newFiles.map((f) => ({ file: f, name: f.name }));
    setFiles((prev) => [...prev, ...mapped]);
    e.target.value = "";
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles.map((f) => ({ file: f, name: f.name }))]);
  }, []);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      // Create application
      const { data: app, error: appErr } = await supabase.from("applications").insert({
        user_id: user.id,
        country_id: countryId || null,
        visa_type_id: visaTypeId || null,
        status: "submitted",
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        applicant_phone: applicantPhone,
        passport_number: passportNumber,
        travel_date: travelDate || null,
        notes: notes || null,
      }).select("id").single();

      if (appErr) throw appErr;

      // Upload files
      for (const f of files) {
        const filePath = `${user.id}/${app.id}/${Date.now()}_${f.name}`;
        const { error: uploadErr } = await supabase.storage.from("application-documents").upload(filePath, f.file);
        if (uploadErr) {
          console.error("Upload error:", uploadErr);
          continue;
        }

        await supabase.from("application_documents").insert({
          application_id: app.id,
          document_name: f.name,
          file_path: filePath,
          file_size: f.file.size,
          mime_type: f.file.type,
        });
      }

      toast({ title: "Application Submitted! 🎉", description: "We'll review your documents and get back to you soon." });
      navigate("/applications");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedStep1 = countryId && applicantName && applicantEmail && passportNumber;
  const canSubmit = canProceedStep1;

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-2xl py-8 px-4">
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Apply for Tourist Visa</h1>
          <p className="mt-2 text-muted-foreground">Fill in your details and upload required documents</p>
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex items-center gap-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              <span className={`text-sm hidden sm:block ${step >= s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {s === 1 ? "Details" : s === 2 ? "Documents" : "Review"}
              </span>
              {s < 3 && <div className={`h-px w-8 ${step > s ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Personal Details */}
        {step === 1 && (
          <div className="space-y-6 rounded-xl border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Destination Country *</Label>
                <Select value={countryId} onValueChange={setCountryId}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.flag_emoji} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {visaTypes.length > 0 && (
                <div className="space-y-2">
                  <Label>Visa Type</Label>
                  <Select value={visaTypeId} onValueChange={setVisaTypeId}>
                    <SelectTrigger><SelectValue placeholder="Select visa type" /></SelectTrigger>
                    <SelectContent>
                      {visaTypes.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={applicantName} onChange={(e) => setApplicantName(e.target.value)} placeholder="As on passport" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={applicantEmail} onChange={(e) => setApplicantEmail(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={applicantPhone} onChange={(e) => setApplicantPhone(e.target.value)} placeholder="+92..." />
              </div>
              <div className="space-y-2">
                <Label>Passport Number *</Label>
                <Input value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Travel Date</Label>
              <Input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requirements..." rows={3} />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>Next: Upload Documents</Button>
            </div>
          </div>
        )}

        {/* Step 2: Document Upload */}
        {step === 2 && (
          <div className="space-y-6 rounded-xl border bg-card p-6">
            <div>
              <h3 className="text-lg font-semibold">Upload Documents</h3>
              <p className="text-sm text-muted-foreground mt-1">Upload the following documents (PDF, JPG, PNG — max 10MB each)</p>
            </div>

            {/* Checklist */}
            <div className="space-y-2">
              {REQUIRED_DOCS.map((doc) => {
                const uploaded = files.some((f) => f.name.toLowerCase().includes(doc.split(" ")[0].toLowerCase()));
                return (
                  <div key={doc} className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${uploaded ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full ${uploaded ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/30"}`}>
                      {uploaded && <Check className="h-3 w-3" />}
                    </div>
                    <span className={uploaded ? "text-foreground" : "text-muted-foreground"}>{doc}</span>
                  </div>
                );
              })}
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-8 transition-colors hover:border-primary/50"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drag & drop files here, or</p>
              <label>
                <input type="file" multiple className="hidden" onChange={handleFileAdd} accept=".pdf,.jpg,.jpeg,.png,.webp" />
                <span className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Browse Files
                </span>
              </label>
            </div>

            {/* Uploaded files list */}
            {files.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Uploaded Files ({files.length})</h4>
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-sm">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button onClick={() => removeFile(i)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Next: Review</Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="space-y-6 rounded-xl border bg-card p-6">
            <h3 className="text-lg font-semibold">Review Your Application</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Country</span>
                <span className="font-medium">{countries.find((c) => c.id === countryId)?.name || "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Full Name</span>
                <span className="font-medium">{applicantName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{applicantEmail}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Passport</span>
                <span className="font-medium">{passportNumber}</span>
              </div>
              {travelDate && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Travel Date</span>
                  <span className="font-medium">{travelDate}</span>
                </div>
              )}
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Documents</span>
                <span className="font-medium">{files.length} file(s)</span>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplyVisa;
