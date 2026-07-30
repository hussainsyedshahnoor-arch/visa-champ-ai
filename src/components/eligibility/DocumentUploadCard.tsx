import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  fullName?: string;
  email?: string;
  whatsapp?: string;
  countryName?: string;
  visaTypeName?: string;
  score?: number | null;
}

const MAX_SIZE = 10 * 1024 * 1024;

const DocumentUploadCard = ({ fullName, email, whatsapp, countryName, visaTypeName, score }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list).filter((f) => {
      if (f.size > MAX_SIZE) {
        toast({ title: "File too large", description: `${f.name} is over 10MB.`, variant: "destructive" });
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...picked]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        // Server issues a scoped signed upload URL and records the submission.
        const { data, error } = await supabase.functions.invoke("submit-eligibility-doc", {
          body: {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || null,
            fullName: fullName || null,
            email: email || null,
            whatsapp: whatsapp || null,
            countryName: countryName || null,
            visaTypeName: visaTypeName || null,
            score: score ?? null,
          },
        });
        if (error) throw error;

        const { error: upErr } = await supabase.storage
          .from("eligibility-docs")
          .uploadToSignedUrl(data.path, data.token, file);
        if (upErr) throw upErr;
      }

      setDone(true);
      setFiles([]);
      toast({ title: "Documents received ✅", description: "Our visa officer will review them shortly." });
    } catch (e: any) {
      toast({ title: "Upload failed", description: "We couldn't upload your documents. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload your documents 📎</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Note:</span> Passport or any supporting document so our visa
          officer can check your eligibility.
        </p>

        {done ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span>Thanks! Your documents were submitted for review.</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium">Click to select files</span>
              <span className="text-xs text-muted-foreground">PDF, JPG or PNG · up to 10MB each</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {files.length > 0 && (
              <ul className="space-y-2">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md border bg-card p-2 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <Button onClick={handleUpload} disabled={files.length === 0 || uploading} className="w-full gap-2">
              {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Submit documents</>}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentUploadCard;
