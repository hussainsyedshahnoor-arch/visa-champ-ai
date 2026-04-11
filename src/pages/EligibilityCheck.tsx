import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Globe, ArrowLeft, CheckCircle, AlertCircle, Loader2, FileText, Phone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BrandLogo from "@/components/BrandLogo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import ThemeToggle from "@/components/ThemeToggle";
import SignupGateModal from "@/components/SignupGateModal";
import { useAuth } from "@/hooks/use-auth";

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
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [showSignupGate, setShowSignupGate] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const autoSubmitRef = useRef(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get("country") || "");
  const [selectedVisaType, setSelectedVisaType] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ analysis: string; score: number | null } | null>(null);
  const { toast } = useToast();

  const handleNextToReview = () => {
    if (!user) {
      setPendingSubmit(true);
      setShowSignupGate(true);
      // Persist state for OAuth redirect
      localStorage.setItem("eligibility_return", "true");
      localStorage.setItem("eligibility_form", JSON.stringify({ formData, selectedCountry, selectedVisaType }));
      return;
    }
    setStep(3);
  };

  // When user logs in after being gated (same-page login), continue to review
  useEffect(() => {
    if (user && pendingSubmit) {
      setPendingSubmit(false);
      setShowSignupGate(false);
      localStorage.removeItem("eligibility_return");
      localStorage.removeItem("eligibility_form");
      setStep(3);
    }
  }, [user, pendingSubmit]);

  // On mount, check if returning from OAuth login and restore form + auto-submit
  useEffect(() => {
    if (user && localStorage.getItem("eligibility_return") === "true") {
      localStorage.removeItem("eligibility_return");
      const saved = localStorage.getItem("eligibility_form");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.formData) setFormData(parsed.formData);
          if (parsed.selectedCountry) setSelectedCountry(parsed.selectedCountry);
          if (parsed.selectedVisaType) setSelectedVisaType(parsed.selectedVisaType);
          autoSubmitRef.current = true;
        } catch {}
        localStorage.removeItem("eligibility_form");
      }
      setStep(3);
    }
  }, [user]);

  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    employmentStatus: "",
    monthlyIncome: "",
    bankBalance: "",
    hasTravelHistory: false,
    previousCountries: "",
    travelFrequency: "",
    previousVisitToDestination: false,
    travelPurposeHistory: "",
    travelledSoloOrFamily: "",
    ownsProperty: false,
    propertyDetails: "",
    closeFamilyInPakistan: "",
    bankStatementMonths: "",
    closingBalance: "",
    maintainedBalance: false,
    hasCreditCard: false,
    maritalStatus: "",
    purposeOfVisit: "",
    travellingWith: "",
    numberOfDependents: "",
    hasOtherNationality: false,
    otherNationality: "",
    hasOtherResidency: false,
    otherResidencyCountry: "",
    businessType: "",
    incomeSource: "",
    isTaxFiler: false,
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

  // Auto-submit after OAuth return once form data is restored
  useEffect(() => {
    if (autoSubmitRef.current && step === 3 && selectedVisaType) {
      autoSubmitRef.current = false;
      handleSubmit();
    }
  }, [step, selectedVisaType]);

    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "High Chance ✅";
    if (score >= 40) return "Medium Chance ⚠️";
    return "Low Chance ❌";
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
            <Link to="/" className="flex items-center">
              <BrandLogo size="sm" />
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
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-1">Basic Information</h3>
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
                <div className="space-y-2">
                  <Label>Purpose of Visit</Label>
                  <Input value={formData.purposeOfVisit} onChange={(e) => updateForm("purposeOfVisit", e.target.value)} placeholder="Tourism, family visit, sightseeing..." />
                </div>
              </div>

              {/* Travel History */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-1">Travel History</h3>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="travel" checked={formData.hasTravelHistory} onChange={(e) => updateForm("hasTravelHistory", e.target.checked)} className="rounded" />
                  <Label htmlFor="travel">I have previous international travel history</Label>
                </div>
                {formData.hasTravelHistory && (
                  <div className="space-y-3 pl-1">
                    <div className="space-y-2">
                      <Label>Countries Previously Visited</Label>
                      <Input value={formData.previousCountries} onChange={(e) => updateForm("previousCountries", e.target.value)} placeholder="e.g., UAE, Turkey, Malaysia" />
                    </div>
                    <div className="space-y-2">
                      <Label>Travel Frequency</Label>
                      <Select value={formData.travelFrequency} onValueChange={(v) => updateForm("travelFrequency", v)}>
                        <SelectTrigger><SelectValue placeholder="How often?" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first-time">First Time</SelectItem>
                          <SelectItem value="once-a-year">Once a Year</SelectItem>
                          <SelectItem value="2-3-times-year">2-3 Times a Year</SelectItem>
                          <SelectItem value="frequent">Frequent Traveller (4+/year)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="prevVisit" checked={formData.previousVisitToDestination} onChange={(e) => updateForm("previousVisitToDestination", e.target.checked)} className="rounded" />
                      <Label htmlFor="prevVisit">I have previously visited this destination country</Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Purpose of Previous Travels</Label>
                      <Input value={formData.travelPurposeHistory} onChange={(e) => updateForm("travelPurposeHistory", e.target.value)} placeholder="e.g., tourism, business, family visit" />
                    </div>
                    <div className="space-y-2">
                      <Label>Previous Trips Were</Label>
                      <Select value={formData.travelledSoloOrFamily} onValueChange={(v) => updateForm("travelledSoloOrFamily", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solo">Solo</SelectItem>
                          <SelectItem value="with-family">With Family</SelectItem>
                          <SelectItem value="mixed">Mix of Solo & Family</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Documents */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-1">Financial Documents</h3>
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
                {(formData.employmentStatus === "self-employed") && (
                  <div className="space-y-2">
                    <Label>Business Type / Model</Label>
                    <Input value={formData.businessType} onChange={(e) => updateForm("businessType", e.target.value)} placeholder="e.g., IT Services, Import/Export, Restaurant" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Source of Income</Label>
                  <Input value={formData.incomeSource} onChange={(e) => updateForm("incomeSource", e.target.value)} placeholder="e.g., Salary, Business profit, Rental income, Freelancing" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monthly Income (PKR)</Label>
                    <Input type="number" value={formData.monthlyIncome} onChange={(e) => updateForm("monthlyIncome", e.target.value)} placeholder="100,000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank Closing Balance (PKR)</Label>
                    <Input type="number" value={formData.closingBalance} onChange={(e) => updateForm("closingBalance", e.target.value)} placeholder="500,000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bank Statement Duration</Label>
                  <Select value={formData.bankStatementMonths} onValueChange={(v) => updateForm("bankStatementMonths", v)}>
                    <SelectTrigger><SelectValue placeholder="How many months?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="maintained" checked={formData.maintainedBalance} onChange={(e) => updateForm("maintainedBalance", e.target.checked)} className="rounded" />
                  <Label htmlFor="maintained">Balance was maintained consistently (no sudden deposits)</Label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="creditCard" checked={formData.hasCreditCard} onChange={(e) => updateForm("hasCreditCard", e.target.checked)} className="rounded" />
                  <Label htmlFor="creditCard">I have an active credit card</Label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="taxFiler" checked={formData.isTaxFiler} onChange={(e) => updateForm("isTaxFiler", e.target.checked)} className="rounded" />
                  <Label htmlFor="taxFiler">I am a registered tax filer (FBR)</Label>
                </div>
              </div>

              {/* Strong Ties to Home Country */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-1">Ties to Home Country</h3>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="property" checked={formData.ownsProperty} onChange={(e) => updateForm("ownsProperty", e.target.checked)} className="rounded" />
                  <Label htmlFor="property">I own property in Pakistan (in my own name)</Label>
                </div>
                {formData.ownsProperty && (
                  <div className="space-y-2 pl-1">
                    <Label>Property Details</Label>
                    <Input value={formData.propertyDetails} onChange={(e) => updateForm("propertyDetails", e.target.value)} placeholder="e.g., House in Lahore, Plot in DHA, Shop in Karachi" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Close Family in Pakistan</Label>
                  <Select value={formData.closeFamilyInPakistan} onValueChange={(v) => updateForm("closeFamilyInPakistan", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spouse-children">Spouse & Children living here</SelectItem>
                      <SelectItem value="parents-siblings">Parents & Siblings living here</SelectItem>
                      <SelectItem value="extended">Extended family only</SelectItem>
                      <SelectItem value="none">No close family in Pakistan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Other Nationality / Residency */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-1">Other Nationality / Residency</h3>
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

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Back</Button>
                <Button
                  onClick={handleNextToReview}
                  disabled={!formData.fullName || !formData.employmentStatus || !formData.closingBalance}
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
                <div className="flex justify-between"><span className="text-muted-foreground">Marital Status</span><span className="font-medium capitalize">{formData.maritalStatus}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Travelling With</span><span className="font-medium capitalize">{formData.travellingWith || "Solo"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Employment</span><span className="font-medium capitalize">{formData.employmentStatus}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Income Source</span><span className="font-medium">{formData.incomeSource || "N/A"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Monthly Income</span><span className="font-medium">PKR {Number(formData.monthlyIncome).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bank Closing Balance</span><span className="font-medium">PKR {Number(formData.closingBalance).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Balance Maintained</span><span className="font-medium">{formData.maintainedBalance ? "Yes" : "No"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Credit Card</span><span className="font-medium">{formData.hasCreditCard ? "Yes" : "No"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax Filer</span><span className="font-medium">{formData.isTaxFiler ? "Yes" : "No"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Travel History</span><span className="font-medium">{formData.hasTravelHistory ? "Yes" : "No"}</span></div>
                {formData.hasTravelHistory && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Travel Frequency</span><span className="font-medium capitalize">{formData.travelFrequency?.replace(/-/g, " ") || "N/A"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Visited Destination Before</span><span className="font-medium">{formData.previousVisitToDestination ? "Yes" : "No"}</span></div>
                  </>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Property Owner</span><span className="font-medium">{formData.ownsProperty ? "Yes" : "No"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Close Family in Pakistan</span><span className="font-medium capitalize">{formData.closeFamilyInPakistan?.replace(/-/g, " ") || "N/A"}</span></div>
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
                    {getScoreLabel(result.score)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {countries.find((c) => c.id === selectedCountry)?.flag_emoji} {countries.find((c) => c.id === selectedCountry)?.name} — {visaTypes.find((v) => v.id === selectedVisaType)?.name}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Disclaimer */}
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
      <SignupGateModal
        open={showSignupGate}
        onDismiss={() => setShowSignupGate(false)}
        required
        title="Login to see your score 🔐"
        description="Sign in or create a free account to get your personalized visa eligibility score."
      />
    </div>
  );
};

export default EligibilityCheck;
