import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, FileText, Check, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
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
}

const REQUIRED_DOCS = [
  "Passport (front page scan)",
  "CNIC (front & back)",
];

const ApplyVisa = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [countries, setCountries] = useState<Country[]>([]);
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

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
    supabase.from("countries").select("id, name, flag_emoji").order("name").then(({ data }) => {
      if (data) setCountries(data);
    });
  }, []);

  useEffect(() => {
    if (!countryId) {
      setVisaTypes([]);
      setVisaTypeId("");
      return;
    }

    supabase
      .from("visa_types")
      .select("id, name, description")
      .eq("country_id", countryId)
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setVisaTypes(data);
      });
  }, [countryId]);

  useEffect(() => {
    if (user?.email) {
      setApplicantEmail((current) => current || user.email || "");
    }
  }, [user]);

  const handleFileAdd = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...newFiles.map((file) => ({ file, name: file.name }))]);
    e.target.value = "";
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles.map((file) => ({ file, name: file.name }))]);
  }, []);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Sign up to submit",
        description: "You can review the form now, but you need an account before uploading documents and submitting.",
      });
      navigate("/signup");
      return;
    }

    setSubmitting(true);

    try {
      const { data: app, error: appErr } = await supabase
        .from("applications")
        .insert({
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
        })
        .select("id")
        .single();

      if (appErr) throw appErr;

      for (const item of files) {
        const safeName = item.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${user.id}/${app.id}/${Date.now()}_${safeName}`;

        const { error: uploadErr } = await supabase.storage
          .from("application-documents")
          .upload(filePath, item.file);

        if (uploadErr) throw uploadErr;

        const { error: docErr } = await supabase.from("application_documents").insert({
          application_id: app.id,
          document_name: item.name,
          file_path: filePath,
          file_size: item.file.size,
          mime_type: item.file.type || null,
        });

        if (docErr) throw docErr;
      }

      toast({
        title: "Application submitted",
        description: "Your visa application and documents were sent successfully.",
      });
      navigate("/applications");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedStep1 = Boolean(countryId && applicantName && applicantEmail && passportNumber);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-2xl px-4 py-8">
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Apply for Tourist Visa</h1>
          <p className="mt-2 text-muted-foreground">Fill in your details and upload your supporting documents.</p>
        </div>

        {!user && (
          <div className="mb-6 flex gap-3 rounded-xl border border-border bg-card p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">You can fill the form now.</p>
              <p className="text-sm text-muted-foreground">You’ll be asked to sign up before the final submission step.</p>
            </div>
          </div>
        )}

        <div className="mb-8 flex items-center gap-4">
          {[1, 2, 3].map((currentStep) => (
            <div key={currentStep} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step >= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {step > currentStep ? <Check className="h-4 w-4" /> : currentStep}
              </div>
              <span
                className={`hidden text-sm sm:block ${
                  step >= currentStep ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {currentStep === 1 ? "Details" : currentStep === 2 ? "Documents" : "Review"}
              </span>
              {currentStep < 3 && <div className={`h-px w-8 ${step > currentStep ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6 rounded-xl border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Destination Country *</Label>
                <Select value={countryId} onValueChange={setCountryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.flag_emoji} {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {visaTypes.length > 0 && (
                <div className="space-y-2">
                  <Label>Visa Type</Label>
                  <Select value={visaTypeId} onValueChange={setVisaTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visa type" />
                    </SelectTrigger>
                    <SelectContent>
                      {visaTypes.map((visaType) => (
                        <SelectItem key={visaType.id} value={visaType.id}>
                          {visaType.name}
                        </SelectItem>
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
                <Input type="email" value={applicantEmail} onChange={(e) => setApplicantEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={applicantPhone} onChange={(e) => setApplicantPhone(e.target.value)} placeholder="+92..." />
              </div>
              <div className="space-y-2">
                <Label>Passport Number *</Label>
                <Input value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} placeholder="AB1234567" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Travel Date</Label>
              <Input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the visa team should know?" rows={3} />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next: Upload Documents
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 rounded-xl border bg-card p-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Upload Documents</h2>
              <p className="mt-1 text-sm text-muted-foreground">Add your files here. They’ll upload when you submit the application.</p>
            </div>

            <div className="space-y-2">
              {REQUIRED_DOCS.map((doc) => {
                const uploaded = files.some((file) => file.name.toLowerCase().includes(doc.split(" ")[0].toLowerCase()));
                return (
                  <div
                    key={doc}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${uploaded ? "border-primary/30 bg-primary/5" : "border-border"}`}
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full ${
                        uploaded ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/30"
                      }`}
                    >
                      {uploaded && <Check className="h-3 w-3" />}
                    </div>
                    <span className={uploaded ? "text-foreground" : "text-muted-foreground"}>{doc}</span>
                  </div>
                );
              })}
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:border-primary/50"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drag and drop files here, or browse from your device.</p>
              <label>
                <input type="file" multiple className="hidden" onChange={handleFileAdd} accept=".pdf,.jpg,.jpeg,.png,.webp" />
                <span className="inline-flex cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  Browse Files
                </span>
              </label>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Selected Files ({files.length})</h3>
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Next: Review</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">Review Your Application</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Country</span>
                <span className="font-medium text-foreground">{countries.find((country) => country.id === countryId)?.name || "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Full Name</span>
                <span className="font-medium text-foreground">{applicantName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-foreground">{applicantEmail}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Passport</span>
                <span className="font-medium text-foreground">{passportNumber}</span>
              </div>
              {travelDate && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Travel Date</span>
                  <span className="font-medium text-foreground">{travelDate}</span>
                </div>
              )}
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Documents</span>
                <span className="font-medium text-foreground">{files.length} file(s)</span>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {submitting ? "Submitting..." : user ? "Submit Application" : "Continue to Sign Up"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplyVisa;
