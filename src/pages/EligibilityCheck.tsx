import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, FileText, Phone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BrandLogo from "@/components/BrandLogo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import ThemeToggle from "@/components/ThemeToggle";
import DocumentUploadCard from "@/components/eligibility/DocumentUploadCard";
import StepShell from "@/components/eligibility/StepShell";
import FieldRenderer from "@/components/eligibility/FieldRenderer";
import {
  ELIGIBILITY_STEPS,
  INITIAL_FORM_DATA,
  TOTAL_STEPS,
  EligibilityFormData,
  FieldConfig,
  getProfileStatus,
} from "@/components/eligibility/questions";

interface Country {
  id: string;
  name: string;
  flag_emoji: string;
  code: string;
}

interface VisaType {
  id: string;
  name: string;
  description: string;
  processing_days_min: number;
  processing_days_max: number;
  validity_days: number;
  stay_days: number;
}

const REVIEW_STEP = TOTAL_STEPS + 1; // 11
const RESULTS_STEP = TOTAL_STEPS + 2; // 12

const EligibilityCheck = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [countries, setCountries] = useState<Country[]>([]);
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get("country") || "");
  const [selectedVisaType, setSelectedVisaType] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ analysis: string; score: number | null } | null>(null);
  const [formData, setFormData] = useState<EligibilityFormData>(INITIAL_FORM_DATA);
  const { toast } = useToast();
  useEffect(() => {
    supabase.from("countries").select("id, name, flag_emoji, code").order("name").then(({ data }) => {
      if (data) setCountries(data as Country[]);
    });
  }, []);

  useEffect(() => {
    if (!selectedCountry) return;
    supabase
      .from("visa_types")
      .select("id, name, description, processing_days_min, processing_days_max, validity_days, stay_days")
      .eq("country_id", selectedCountry)
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) {
          setVisaTypes(data as VisaType[]);
          if (data.length === 1) setSelectedVisaType(data[0].id);
        }
      });
  }, [selectedCountry]);

  const updateForm = (key: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedVisaType) return;
    setIsAnalyzing(true);
    setResult(null);

    try {
      const countryObj = countries.find((c) => c.id === selectedCountry);
      const visaObj = visaTypes.find((v) => v.id === selectedVisaType);

      const [docsRes, criteriaRes] = await Promise.all([
        supabase.from("visa_required_documents").select("*").eq("visa_type_id", selectedVisaType).order("sort_order"),
        supabase.from("visa_eligibility_criteria").select("*").eq("visa_type_id", selectedVisaType).order("sort_order"),
      ]);

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/eligibility-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          formData: {
            ...formData,
            visitedCountries: Array.isArray(formData.visitedCountries)
              ? formData.visitedCountries.join(", ")
              : formData.visitedCountries,
          },
          visaTypeName: visaObj?.name,
          countryName: countryObj?.name,
          documents: docsRes.data ?? [],
          criteria: criteriaRes.data ?? [],
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to analyze eligibility");
      }

      const data = await resp.json();
      setResult(data);
      setStep(RESULTS_STEP);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "High Chance ✅";
    if (score >= 40) return "Medium Chance ⚠️";
    return "Low Chance ❌";
  };

  // Hide the visited-countries picker unless the user has travelled
  const visibleFields = (fields: FieldConfig[]) =>
    fields.filter((f) => f.key !== "visitedCountries" || formData.travelHistoryStatus === "Yes — with a visa");

  const country = countries.find((c) => c.id === selectedCountry);
  const visaType = visaTypes.find((v) => v.id === selectedVisaType);

  const reviewRows: { label: string; value: string }[] = [
    { label: "Destination", value: `${country?.flag_emoji ?? ""} ${country?.name ?? ""}`.trim() },
    { label: "Visa Type", value: visaType?.name ?? "" },
    ...ELIGIBILITY_STEPS.flatMap((s) =>
      visibleFields(s.fields).map((f) => {
        const raw = formData[f.key];
        const other = (formData[`${f.key}Other`] as string) || "";
        const base = Array.isArray(raw) ? raw.join(", ") || "—" : (raw as string) || "—";
        return {
          label: f.label,
          value: other ? `${base} (${other})` : base,
        };
      }),
    ),

  ];

  const stepIndex = step - 2; // index into ELIGIBILITY_STEPS
  const currentStep = stepIndex >= 0 && stepIndex < ELIGIBILITY_STEPS.length ? ELIGIBILITY_STEPS[stepIndex] : null;
  const currentComplete = currentStep
    ? visibleFields(currentStep.fields).every((f) => {
        if (!f.required) return true;
        const v = formData[f.key];
        return Array.isArray(v) ? v.length > 0 : Boolean(v);
      })
    : false;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <Link to="/" className="flex items-center">
              <BrandLogo size="sm" />
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container max-w-2xl py-8 px-4">
        {/* Step 1: Destination */}
        {step === 1 && (
          <StepShell
            stepNumber={1}
            totalSteps={TOTAL_STEPS}
            category="Destination"
            profileStatus={getProfileStatus(formData, 1)}
            eyebrow="STEP 1 — DESTINATION"
            title="Where do you want to go? 🌍"
            helper="Pick your destination country and the visa you want to check."
            onNext={() => setStep(2)}
            nextDisabled={!selectedCountry || !selectedVisaType}
          >
            <div className="space-y-2">
              <Label className="text-base font-semibold">Destination country <span className="text-destructive">*</span></Label>
              <Select value={selectedCountry} onValueChange={(v) => { setSelectedCountry(v); setSelectedVisaType(""); }}>
                <SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.flag_emoji} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {visaTypes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-base font-semibold">Visa type <span className="text-destructive">*</span></Label>
                <Select value={selectedVisaType} onValueChange={setSelectedVisaType}>
                  <SelectTrigger><SelectValue placeholder="Select visa type" /></SelectTrigger>
                  <SelectContent>
                    {visaTypes.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {visaType && (
                  <p className="text-xs text-muted-foreground">
                    Processing: {visaType.processing_days_min}-{visaType.processing_days_max} days · Stay: up to {visaType.stay_days} days
                  </p>
                )}
              </div>
            )}
          </StepShell>
        )}

        {/* Steps 2..10: Question categories */}
        {currentStep && (
          <StepShell
            stepNumber={step}
            totalSteps={TOTAL_STEPS}
            category={currentStep.category}
            profileStatus={getProfileStatus(formData, step)}
            eyebrow={currentStep.eyebrow}
            title={currentStep.title}
            helper={currentStep.helper}
            callout={currentStep.callout}
            onBack={() => setStep(step - 1)}
            onNext={() => (step === TOTAL_STEPS ? setStep(REVIEW_STEP) : setStep(step + 1))}
            nextDisabled={!currentComplete}
            nextLabel={step === TOTAL_STEPS ? "Review →" : "Next →"}
          >
            {visibleFields(currentStep.fields).map((field, i) => (
              <FieldRenderer
                key={field.key}
                field={field}
                data={formData}
                onChange={updateForm}
                hideLabel={i === 0 && currentStep.fields.length > 1 && field.type !== "text"}
              />
            ))}
          </StepShell>
        )}

        {/* Review */}
        {step === REVIEW_STEP && (
          <Card>
            <CardHeader>
              <CardTitle>Review Your Details ✅</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 rounded-lg border bg-muted/50 p-4 text-sm">
                {reviewRows.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="text-right font-medium">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(TOTAL_STEPS)} className="flex-1">← Edit</Button>
                <Button onClick={handleSubmit} disabled={isAnalyzing} className="flex-1 gap-2">
                  {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : "Check Eligibility 🚀"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {step === RESULTS_STEP && result && (
          <div className="space-y-6">
            {result.score !== null && (
              <Card className="text-center">
                <CardContent className="pt-8 pb-6">
                  <div className={`mb-2 text-6xl font-bold ${getScoreColor(result.score)}`}>
                    {result.score}<span className="text-2xl text-muted-foreground">/100</span>
                  </div>
                  <p className="text-lg font-medium text-foreground">{getScoreLabel(result.score)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {country?.flag_emoji} {country?.name} — {visaType?.name}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Important Disclaimer</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>This assessment is based on expert analysis and AI evaluation.</li>
                      <li>These are <strong>estimations only</strong>, not guaranteed outcomes.</li>
                      <li>The final decision rests with the consulate/embassy. Visa approval or rejection depends on individual profile assessment and varies case to case.</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detailed Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{result.analysis}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            <DocumentUploadCard
              fullName={formData.fullName as string}
              email={formData.email as string}
              whatsapp={formData.whatsapp as string}
              countryName={country?.name}
              visaTypeName={visaType?.name}
              score={result.score}
            />

            <div className="flex flex-wrap gap-3">
              <Button className="flex-1 gap-2" onClick={() => { setStep(1); setResult(null); }}>
                Check Another Country
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => navigate("/apply")}>
                <FileText className="h-4 w-4" /> Apply for Visa
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => window.open("https://wa.me/923001234567?text=Hi%2C%20I%20need%20help%20with%20my%20tourist%20visa", "_blank")}>
                <Phone className="h-4 w-4" /> Talk to Officer
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default EligibilityCheck;
