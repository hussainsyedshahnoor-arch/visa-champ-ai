import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Globe, ArrowLeft, CheckCircle, AlertCircle, Loader2, FileText, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import ThemeToggle from "@/components/ThemeToggle";

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
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    employmentStatus: "",
    monthlyIncome: "",
    bankBalance: "",
    hasTravelHistory: false,
    previousCountries: "",
    ownsProperty: false,
    maritalStatus: "",
    purposeOfVisit: "",
    travellingWith: "",
    numberOfDependents: "",
    hasOtherNationality: false,
    otherNationality: "",
    hasOtherResidency: false,
    otherResidencyCountry: "",
    hasReturnTies: "",
  });

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

  const updateForm = (key: string, value: any) => {
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
          formData,
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
      setStep(4);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary">
              <Globe className="h-5 w-5" /> Visa Champ
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container max-w-2xl py-8 px-4">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {["Destination", "Your Details", "Review", "Results"].map((label, i) => (
              <div key={label} className={`flex items-center gap-1.5 text-xs font-medium ${step > i + 1 ? "text-primary" : step === i + 1 ? "text-foreground" : "text-muted-foreground"}`}>
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${step > i + 1 ? "bg-primary text-primary-foreground" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <span className="hidden sm:inline">{label}</span>
              </div>
            ))}
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>

        {/* Step 1: Destination */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Where do you want to go? 🌍</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Destination Country</Label>
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
                  <Label>Visa Type</Label>
                  <Select value={selectedVisaType} onValueChange={setSelectedVisaType}>
                    <SelectTrigger><SelectValue placeholder="Select visa type" /></SelectTrigger>
                    <SelectContent>
                      {visaTypes.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedVisaType && (() => {
                    const vt = visaTypes.find((v) => v.id === selectedVisaType);
                    return vt ? (
                      <p className="text-xs text-muted-foreground">
                        Processing: {vt.processing_days_min}-{vt.processing_days_max} days · Stay: up to {vt.stay_days} days
                      </p>
                    ) : null;
                  })()}
                </div>
              )}

              <Button onClick={() => setStep(2)} disabled={!selectedCountry || !selectedVisaType} className="w-full">
                Next →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Tell us about yourself 📋</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Full Name</Label>
                  <Input value={formData.fullName} onChange={(e) => updateForm("fullName", e.target.value)} placeholder="Muhammad Ali" />
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" value={formData.age} onChange={(e) => updateForm("age", e.target.value)} placeholder="30" />
                </div>
                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Select value={formData.maritalStatus} onValueChange={(v) => updateForm("maritalStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Employment Status</Label>
                <Select value={formData.employmentStatus} onValueChange={(v) => updateForm("employmentStatus", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employed">Employed (Full-time)</SelectItem>
                    <SelectItem value="self-employed">Self-Employed / Business Owner</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                    <SelectItem value="unemployed">Unemployed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Income (PKR)</Label>
                  <Input type="number" value={formData.monthlyIncome} onChange={(e) => updateForm("monthlyIncome", e.target.value)} placeholder="100,000" />
                </div>
                <div className="space-y-2">
                  <Label>Bank Balance (PKR)</Label>
                  <Input type="number" value={formData.bankBalance} onChange={(e) => updateForm("bankBalance", e.target.value)} placeholder="500,000" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="travel" checked={formData.hasTravelHistory} onChange={(e) => updateForm("hasTravelHistory", e.target.checked)} className="rounded" />
                  <Label htmlFor="travel">I have previous international travel history</Label>
                </div>
                {formData.hasTravelHistory && (
                  <Input value={formData.previousCountries} onChange={(e) => updateForm("previousCountries", e.target.value)} placeholder="e.g., UAE, Turkey, Malaysia" />
                )}
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="property" checked={formData.ownsProperty} onChange={(e) => updateForm("ownsProperty", e.target.checked)} className="rounded" />
                  <Label htmlFor="property">I own property in Pakistan</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Travelling With</Label>
                  <Select value={formData.travellingWith} onValueChange={(v) => updateForm("travellingWith", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solo">Solo</SelectItem>
                      <SelectItem value="spouse">With Spouse</SelectItem>
                      <SelectItem value="family">With Family (Spouse + Children)</SelectItem>
                      <SelectItem value="group">Group / Friends</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Number of Dependents</Label>
                  <Input type="number" value={formData.numberOfDependents} onChange={(e) => updateForm("numberOfDependents", e.target.value)} placeholder="0" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="otherNationality" checked={formData.hasOtherNationality} onChange={(e) => updateForm("hasOtherNationality", e.target.checked)} className="rounded" />
                  <Label htmlFor="otherNationality">I hold another nationality / passport</Label>
                </div>
                {formData.hasOtherNationality && (
                  <Input value={formData.otherNationality} onChange={(e) => updateForm("otherNationality", e.target.value)} placeholder="e.g., British, Canadian, UAE" />
                )}
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="otherResidency" checked={formData.hasOtherResidency} onChange={(e) => updateForm("hasOtherResidency", e.target.checked)} className="rounded" />
                  <Label htmlFor="otherResidency">I have residency in another country</Label>
                </div>
                {formData.hasOtherResidency && (
                  <Input value={formData.otherResidencyCountry} onChange={(e) => updateForm("otherResidencyCountry", e.target.value)} placeholder="e.g., UAE, UK, Canada" />
                )}
              </div>




              <div className="space-y-2">
                <Label>Purpose of Visit</Label>
                <Input value={formData.purposeOfVisit} onChange={(e) => updateForm("purposeOfVisit", e.target.value)} placeholder="Tourism, family visit, sightseeing..." />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Back</Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!formData.fullName || !formData.employmentStatus || !formData.bankBalance}
                  className="flex-1"
                >
                  Next →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Review Your Details ✅</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Destination</span><span className="font-medium">{countries.find((c) => c.id === selectedCountry)?.flag_emoji} {countries.find((c) => c.id === selectedCountry)?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Visa Type</span><span className="font-medium">{visaTypes.find((v) => v.id === selectedVisaType)?.name}</span></div>
                <hr />
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{formData.fullName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Age</span><span className="font-medium">{formData.age}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Employment</span><span className="font-medium capitalize">{formData.employmentStatus}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Monthly Income</span><span className="font-medium">PKR {Number(formData.monthlyIncome).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bank Balance</span><span className="font-medium">PKR {Number(formData.bankBalance).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Travel History</span><span className="font-medium">{formData.hasTravelHistory ? "Yes" : "No"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Property Owner</span><span className="font-medium">{formData.ownsProperty ? "Yes" : "No"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Marital Status</span><span className="font-medium capitalize">{formData.maritalStatus}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Travelling With</span><span className="font-medium capitalize">{formData.travellingWith || "Solo"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dependents</span><span className="font-medium">{formData.numberOfDependents || "0"}</span></div>
                {formData.hasOtherNationality && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Other Nationality</span><span className="font-medium">{formData.otherNationality}</span></div>
                )}
                {formData.hasOtherResidency && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Other Residency</span><span className="font-medium">{formData.otherResidencyCountry}</span></div>
                )}
                
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">← Edit</Button>
                <Button onClick={handleSubmit} disabled={isAnalyzing} className="flex-1 gap-2">
                  {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : "Check Eligibility 🚀"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Results */}
        {step === 4 && result && (
          <div className="space-y-6">
            {/* Score card */}
            {result.score !== null && (
              <Card className="text-center">
                <CardContent className="pt-8 pb-6">
                  <div className={`mb-2 text-6xl font-bold ${getScoreColor(result.score)}`}>
                    {result.score}<span className="text-2xl text-muted-foreground">/100</span>
                  </div>
                  <p className="text-lg font-medium text-foreground">
                    {result.score >= 70 ? "High Chance ✅" : result.score >= 40 ? "Medium Chance ⚠️" : "Low Chance ❌"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {countries.find((c) => c.id === selectedCountry)?.flag_emoji} {countries.find((c) => c.id === selectedCountry)?.name} — {visaTypes.find((v) => v.id === selectedVisaType)?.name}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Full analysis */}
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

            {/* Action buttons */}
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
