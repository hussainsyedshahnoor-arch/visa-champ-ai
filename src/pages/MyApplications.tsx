import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Globe, ArrowLeft, FileText, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: FileText },
  submitted: { label: "Submitted", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  in_review: { label: "In Review", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: AlertCircle },
  approved: { label: "Approved", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
};

const MyApplications = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchApps = async () => {
      const { data } = await supabase
        .from("applications")
        .select("*, countries(name, flag_emoji)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setApplications(data || []);
      setLoading(false);
    };
    fetchApps();
  }, [user]);

  if (authLoading || loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-3xl py-8 px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Applications</h1>
            <p className="mt-1 text-muted-foreground">Track your visa application status</p>
          </div>
          <Button asChild>
            <Link to="/apply">New Application</Link>
          </Button>
        </div>

        {applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No applications yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Start your first visa application</p>
            <Button className="mt-6" asChild><Link to="/apply">Apply Now</Link></Button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const status = STATUS_CONFIG[app.status] || STATUS_CONFIG.draft;
              const StatusIcon = status.icon;
              return (
                <div key={app.id} className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{app.countries?.flag_emoji}</span>
                        <h3 className="font-semibold">{app.countries?.name || "Unknown"}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{app.applicant_name} • {app.passport_number}</p>
                      <p className="text-xs text-muted-foreground">
                        Applied {new Date(app.created_at).toLocaleDateString()}
                        {app.travel_date && ` • Travel: ${app.travel_date}`}
                      </p>
                    </div>
                    <Badge className={`gap-1.5 ${status.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyApplications;
