import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Globe, ArrowLeft, Plus, Trash2, Edit2, Save, X, Shield, ClipboardList, MessageSquare, Calendar, FileText, History, AlertTriangle, StickyNote, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";
import ApplicationsTab from "@/components/admin/ApplicationsTab";
import MessagesTab from "@/components/admin/MessagesTab";
import BookingsTab from "@/components/admin/BookingsTab";
import DocumentRequestsTab from "@/components/admin/DocumentRequestsTab";
import AuditLogTab from "@/components/admin/AuditLogTab";
import FlaggedResponsesTab from "@/components/admin/FlaggedResponsesTab";
import ApplicationNotesTab from "@/components/admin/ApplicationNotesTab";
import UsersTab from "@/components/admin/UsersTab";
import EligibilityLeadsTab from "@/components/admin/EligibilityLeadsTab";


const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Data states
  const [countries, setCountries] = useState<any[]>([]);
  const [visaTypes, setVisaTypes] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedVisaType, setSelectedVisaType] = useState("");

  // Edit states
  const [editingCountry, setEditingCountry] = useState<any>(null);
  const [editingVisaType, setEditingVisaType] = useState<any>(null);
  const [newCountry, setNewCountry] = useState({ name: "", code: "", flag_emoji: "", region: "Other" });
  const [newVisaType, setNewVisaType] = useState({ name: "", description: "", processing_days_min: "", processing_days_max: "", validity_days: "", stay_days: "" });
  const [newDocument, setNewDocument] = useState({ document_name: "", description: "", is_mandatory: true });
  const [newCriteria, setNewCriteria] = useState({ criteria_name: "", criteria_description: "", criteria_type: "text", min_value: "", is_mandatory: true });
  const [showAddCountry, setShowAddCountry] = useState(false);
  const [showAddVisaType, setShowAddVisaType] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [showAddCriteria, setShowAddCriteria] = useState(false);

  const resolveAdminAccess = useCallback(async (userId: string) => {
    const { data: roleFromRpc, error: rpcError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (!rpcError && roleFromRpc) {
      return true;
    }

    const { data: directRoleRows, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .limit(1);

    if (rolesError) {
      console.error("Admin access lookup failed", { rpcError, rolesError });
      return false;
    }

    return (directRoleRows?.length ?? 0) > 0;
  }, []);

  const checkAdminAccess = useCallback(
    async ({ showLoading = false, showToast = false }: { showLoading?: boolean; showToast?: boolean } = {}) => {
      if (!user) return false;
      if (showLoading) setChecking(true);

      try {
        const hasAccess = await resolveAdminAccess(user.id);
        setIsAdmin(hasAccess);

        if (!hasAccess && showToast) {
          toast({
            title: "Access Denied",
            description: "Your admin access may still be syncing. Click retry or refresh the page.",
            variant: "destructive",
          });
        }

        return hasAccess;
      } catch (error) {
        console.error("Unable to verify admin access", error);
        setIsAdmin(false);

        if (showToast) {
          toast({
            title: "Unable to verify access",
            description: "Please refresh the page and try again.",
            variant: "destructive",
          });
        }

        return false;
      } finally {
        if (showLoading) setChecking(false);
      }
    },
    [resolveAdminAccess, toast, user]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    void checkAdminAccess({ showLoading: true, showToast: true });
  }, [authLoading, checkAdminAccess, navigate, user]);

  useEffect(() => {
    if (!user) return;

    const refreshAccess = () => {
      if (document.visibilityState === "hidden") return;
      void checkAdminAccess();
    };

    window.addEventListener("focus", refreshAccess);
    document.addEventListener("visibilitychange", refreshAccess);

    return () => {
      window.removeEventListener("focus", refreshAccess);
      document.removeEventListener("visibilitychange", refreshAccess);
    };
  }, [checkAdminAccess, user]);

  const fetchCountries = useCallback(async () => {
    const { data } = await supabase.from("countries").select("*").order("name");
    if (data) setCountries(data);
  }, []);

  const fetchVisaTypes = useCallback(async () => {
    if (!selectedCountry) return;
    const { data } = await supabase.from("visa_types").select("*").eq("country_id", selectedCountry).order("name");
    if (data) setVisaTypes(data);
  }, [selectedCountry]);

  const fetchDocuments = useCallback(async () => {
    if (!selectedVisaType) return;
    const { data } = await supabase.from("visa_required_documents").select("*").eq("visa_type_id", selectedVisaType).order("sort_order");
    if (data) setDocuments(data);
  }, [selectedVisaType]);

  const fetchCriteria = useCallback(async () => {
    if (!selectedVisaType) return;
    const { data } = await supabase.from("visa_eligibility_criteria").select("*").eq("visa_type_id", selectedVisaType).order("sort_order");
    if (data) setCriteria(data);
  }, [selectedVisaType]);

  useEffect(() => { if (isAdmin) fetchCountries(); }, [isAdmin, fetchCountries]);
  useEffect(() => { fetchVisaTypes(); }, [fetchVisaTypes]);
  useEffect(() => { fetchDocuments(); fetchCriteria(); }, [fetchDocuments, fetchCriteria]);

  // CRUD handlers
  const addCountry = async () => {
    const { error } = await supabase.from("countries").insert(newCountry as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewCountry({ name: "", code: "", flag_emoji: "", region: "Other" });
    setShowAddCountry(false);
    fetchCountries();
    toast({ title: "Country added" });
  };

  const deleteCountry = async (id: string) => {
    await supabase.from("countries").delete().eq("id", id);
    fetchCountries();
    toast({ title: "Country deleted" });
  };

  const addVisaType = async () => {
    const { error } = await supabase.from("visa_types").insert({
      ...newVisaType,
      country_id: selectedCountry,
      processing_days_min: Number(newVisaType.processing_days_min) || null,
      processing_days_max: Number(newVisaType.processing_days_max) || null,
      validity_days: Number(newVisaType.validity_days) || null,
      stay_days: Number(newVisaType.stay_days) || null,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewVisaType({ name: "", description: "", processing_days_min: "", processing_days_max: "", validity_days: "", stay_days: "" });
    setShowAddVisaType(false);
    fetchVisaTypes();
    toast({ title: "Visa type added" });
  };

  const deleteVisaType = async (id: string) => {
    await supabase.from("visa_types").delete().eq("id", id);
    fetchVisaTypes();
    toast({ title: "Visa type deleted" });
  };

  const addDocument = async () => {
    const { error } = await supabase.from("visa_required_documents").insert({
      ...newDocument,
      visa_type_id: selectedVisaType,
      sort_order: documents.length,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewDocument({ document_name: "", description: "", is_mandatory: true });
    setShowAddDoc(false);
    fetchDocuments();
    toast({ title: "Document added" });
  };

  const deleteDocument = async (id: string) => {
    await supabase.from("visa_required_documents").delete().eq("id", id);
    fetchDocuments();
    toast({ title: "Document deleted" });
  };

  const addCriteriaItem = async () => {
    const { error } = await supabase.from("visa_eligibility_criteria").insert({
      ...newCriteria,
      visa_type_id: selectedVisaType,
      sort_order: criteria.length,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewCriteria({ criteria_name: "", criteria_description: "", criteria_type: "text", min_value: "", is_mandatory: true });
    setShowAddCriteria(false);
    fetchCriteria();
    toast({ title: "Criteria added" });
  };

  const deleteCriteria = async (id: string) => {
    await supabase.from("visa_eligibility_criteria").delete().eq("id", id);
    fetchCriteria();
    toast({ title: "Criteria deleted" });
  };

  if (authLoading || checking) {
    return <div className="flex h-screen items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Checking access...</div></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4 px-4 text-center">
        <Shield className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="max-w-md text-muted-foreground">You need admin privileges to access this page. If you were just promoted, click retry or refresh this page.</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => void checkAdminAccess({ showLoading: true, showToast: true })}>Retry Access</Button>
          <Button variant="outline" asChild><Link to="/">Go Home</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/"><ArrowLeft className="h-5 w-5" /></Link></Button>
            <h1 className="text-lg font-bold text-foreground">Admin CMS</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container py-6 px-4">
        <Tabs defaultValue="applications">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="applications" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Applications</TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5"><MessageSquare className="h-4 w-4" /> Messages</TabsTrigger>
            <TabsTrigger value="bookings" className="gap-1.5"><Calendar className="h-4 w-4" /> Bookings</TabsTrigger>
            <TabsTrigger value="doc-requests" className="gap-1.5"><FileText className="h-4 w-4" /> Doc Requests</TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5"><StickyNote className="h-4 w-4" /> Notes</TabsTrigger>
            <TabsTrigger value="flagged" className="gap-1.5"><AlertTriangle className="h-4 w-4" /> Flagged AI</TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5"><History className="h-4 w-4" /> Audit Log</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" /> Users</TabsTrigger>
            <TabsTrigger value="countries">Countries</TabsTrigger>
            <TabsTrigger value="visa-details" disabled={!selectedCountry}>Visa Types & Details</TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <ApplicationsTab />
          </TabsContent>

          <TabsContent value="messages">
            <MessagesTab />
          </TabsContent>

          <TabsContent value="bookings">
            <BookingsTab />
          </TabsContent>

          <TabsContent value="doc-requests">
            <DocumentRequestsTab />
          </TabsContent>

          <TabsContent value="notes">
            <ApplicationNotesTab />
          </TabsContent>

          <TabsContent value="flagged">
            <FlaggedResponsesTab />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="leads">
            <EligibilityLeadsTab />
          </TabsContent>


          {/* Countries Tab */}
          <TabsContent value="countries">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{countries.length} Countries</h2>
              <Button size="sm" onClick={() => setShowAddCountry(!showAddCountry)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Country
              </Button>
            </div>

            {showAddCountry && (
              <Card className="mb-4">
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div><Label>Name</Label><Input value={newCountry.name} onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })} placeholder="France" /></div>
                    <div><Label>Code</Label><Input value={newCountry.code} onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value })} placeholder="FR" maxLength={2} /></div>
                    <div><Label>Flag</Label><Input value={newCountry.flag_emoji} onChange={(e) => setNewCountry({ ...newCountry, flag_emoji: e.target.value })} placeholder="🇫🇷" /></div>
                    <div><Label>Region</Label><Input value={newCountry.region} onChange={(e) => setNewCountry({ ...newCountry, region: e.target.value })} placeholder="Europe" /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addCountry} disabled={!newCountry.name || !newCountry.code}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddCountry(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {countries.map((c) => (
                <Card key={c.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedCountry === c.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => { setSelectedCountry(c.id); setSelectedVisaType(""); }}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{c.flag_emoji}</span>
                      <div>
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.code} · {c.region}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteCountry(c.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Visa Types Tab */}
          <TabsContent value="visa-details">
            {selectedCountry && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{countries.find((c) => c.id === selectedCountry)?.flag_emoji}</span>
                  <h2 className="text-lg font-semibold">{countries.find((c) => c.id === selectedCountry)?.name}</h2>
                </div>

                {/* Visa Types section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-foreground">Visa Types</h3>
                    <Button size="sm" variant="outline" onClick={() => setShowAddVisaType(!showAddVisaType)} className="gap-1.5"><Plus className="h-3 w-3" /> Add</Button>
                  </div>

                  {showAddVisaType && (
                    <Card className="mb-3">
                      <CardContent className="pt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2"><Label>Name</Label><Input value={newVisaType.name} onChange={(e) => setNewVisaType({ ...newVisaType, name: e.target.value })} placeholder="Tourist Visa" /></div>
                          <div className="col-span-2"><Label>Description</Label><Input value={newVisaType.description} onChange={(e) => setNewVisaType({ ...newVisaType, description: e.target.value })} /></div>
                          <div><Label>Min Days</Label><Input type="number" value={newVisaType.processing_days_min} onChange={(e) => setNewVisaType({ ...newVisaType, processing_days_min: e.target.value })} /></div>
                          <div><Label>Max Days</Label><Input type="number" value={newVisaType.processing_days_max} onChange={(e) => setNewVisaType({ ...newVisaType, processing_days_max: e.target.value })} /></div>
                          <div><Label>Validity (days)</Label><Input type="number" value={newVisaType.validity_days} onChange={(e) => setNewVisaType({ ...newVisaType, validity_days: e.target.value })} /></div>
                          <div><Label>Stay (days)</Label><Input type="number" value={newVisaType.stay_days} onChange={(e) => setNewVisaType({ ...newVisaType, stay_days: e.target.value })} /></div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={addVisaType} disabled={!newVisaType.name}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowAddVisaType(false)}>Cancel</Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-2">
                    {visaTypes.map((v) => (
                      <Card key={v.id} className={`cursor-pointer transition-all ${selectedVisaType === v.id ? "ring-2 ring-primary" : ""}`}
                        onClick={() => setSelectedVisaType(v.id)}>
                        <CardContent className="flex items-center justify-between p-3">
                          <div>
                            <p className="font-medium text-sm text-foreground">{v.name}</p>
                            <p className="text-xs text-muted-foreground">{v.processing_days_min}-{v.processing_days_max} days · {v.stay_days} days stay</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteVisaType(v.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Documents & Criteria for selected visa type */}
                {selectedVisaType && (
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Documents */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-foreground">Required Documents</h3>
                        <Button size="sm" variant="outline" onClick={() => setShowAddDoc(!showAddDoc)} className="gap-1.5"><Plus className="h-3 w-3" /> Add</Button>
                      </div>

                      {showAddDoc && (
                        <Card className="mb-3">
                          <CardContent className="pt-4 space-y-3">
                            <div><Label>Document Name</Label><Input value={newDocument.document_name} onChange={(e) => setNewDocument({ ...newDocument, document_name: e.target.value })} /></div>
                            <div><Label>Description</Label><Input value={newDocument.description} onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })} /></div>
                            <div className="flex items-center gap-2"><Switch checked={newDocument.is_mandatory} onCheckedChange={(v) => setNewDocument({ ...newDocument, is_mandatory: v })} /><Label>Mandatory</Label></div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={addDocument} disabled={!newDocument.document_name}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setShowAddDoc(false)}>Cancel</Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <div className="space-y-2">
                        {documents.map((d) => (
                          <div key={d.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">{d.document_name}</p>
                              <p className="text-xs text-muted-foreground">{d.is_mandatory ? "Mandatory" : "Optional"}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteDocument(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        ))}
                        {documents.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No documents added</p>}
                      </div>
                    </div>

                    {/* Criteria */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-foreground">Eligibility Criteria</h3>
                        <Button size="sm" variant="outline" onClick={() => setShowAddCriteria(!showAddCriteria)} className="gap-1.5"><Plus className="h-3 w-3" /> Add</Button>
                      </div>

                      {showAddCriteria && (
                        <Card className="mb-3">
                          <CardContent className="pt-4 space-y-3">
                            <div><Label>Criteria Name</Label><Input value={newCriteria.criteria_name} onChange={(e) => setNewCriteria({ ...newCriteria, criteria_name: e.target.value })} /></div>
                            <div><Label>Description</Label><Input value={newCriteria.criteria_description} onChange={(e) => setNewCriteria({ ...newCriteria, criteria_description: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-3">
                              <div><Label>Type</Label>
                                <Select value={newCriteria.criteria_type} onValueChange={(v) => setNewCriteria({ ...newCriteria, criteria_type: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="boolean">Yes/No</SelectItem>
                                    <SelectItem value="select">Select</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div><Label>Min Value</Label><Input value={newCriteria.min_value} onChange={(e) => setNewCriteria({ ...newCriteria, min_value: e.target.value })} /></div>
                            </div>
                            <div className="flex items-center gap-2"><Switch checked={newCriteria.is_mandatory} onCheckedChange={(v) => setNewCriteria({ ...newCriteria, is_mandatory: v })} /><Label>Mandatory</Label></div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={addCriteriaItem} disabled={!newCriteria.criteria_name}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setShowAddCriteria(false)}>Cancel</Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <div className="space-y-2">
                        {criteria.map((c) => (
                          <div key={c.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">{c.criteria_name}</p>
                              <p className="text-xs text-muted-foreground">{c.criteria_type}{c.min_value ? ` · Min: ${c.min_value}` : ""} · {c.is_mandatory ? "Required" : "Optional"}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCriteria(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        ))}
                        {criteria.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No criteria added</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
