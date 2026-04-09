import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardList, Bell, Calendar, FileText, ArrowRight, Globe, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import Navbar from "@/components/Navbar";

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft: <Clock className="h-4 w-4 text-muted-foreground" />,
  submitted: <AlertCircle className="h-4 w-4 text-amber-500" />,
  in_review: <AlertCircle className="h-4 w-4 text-primary" />,
  approved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  rejected: <AlertCircle className="h-4 w-4 text-destructive" />,
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }

    const fetch = async () => {
      const [apps, notifs, calls] = await Promise.all([
        supabase.from("applications").select("id, applicant_name, status, country_id, created_at, travel_date").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(5),
        supabase.from("notifications").select("id, title, message, type, is_read, created_at, link").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
        supabase.from("call_bookings").select("id, booking_date, time_slot, officer_name, status").eq("user_id", user.id).gte("booking_date", new Date().toISOString().split("T")[0]).order("booking_date", { ascending: true }).limit(3),
      ]);
      if (apps.data) setApplications(apps.data);
      if (notifs.data) setNotifications(notifs.data);
      if (calls.data) setBookings(calls.data);
      setLoading(false);
    };
    fetch();
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="flex h-[60vh] items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading dashboard...</div></div>
      </>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <Navbar />
      <div className="container max-w-5xl py-8 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of your visa journey.</p>
        </div>

        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-primary/10 p-2.5"><ClipboardList className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{applications.length}</p>
                <p className="text-xs text-muted-foreground">Applications</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-amber-500/10 p-2.5"><Bell className="h-5 w-5 text-amber-500" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
                <p className="text-xs text-muted-foreground">Unread Notifications</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-green-500/10 p-2.5"><Calendar className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{bookings.length}</p>
                <p className="text-xs text-muted-foreground">Upcoming Calls</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Applications */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Recent Applications</CardTitle>
                <Button variant="ghost" size="sm" asChild><Link to="/applications" className="gap-1">View all <ArrowRight className="h-3 w-3" /></Link></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {applications.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">No applications yet</p>
                  <Button size="sm" asChild><Link to="/apply">Start Application</Link></Button>
                </div>
              ) : (
                applications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {STATUS_ICON[app.status] || STATUS_ICON.draft}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{app.applicant_name || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground">
                          {app.travel_date ? new Date(app.travel_date).toLocaleDateString() : "No travel date"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{app.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4" /> Notifications
                  {unreadCount > 0 && <Badge variant="default" className="text-xs">{unreadCount}</Badge>}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">No notifications</p>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className={`rounded-lg border p-3 ${!n.is_read ? "bg-primary/5 border-primary/20" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Calls */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Upcoming Calls</CardTitle>
              <Button variant="ghost" size="sm" asChild><Link to="/book-call" className="gap-1">Book a call <ArrowRight className="h-3 w-3" /></Link></Button>
            </div>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">No upcoming calls</p>
                <Button size="sm" variant="outline" asChild><Link to="/book-call">Schedule a Call</Link></Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {bookings.map((b) => (
                  <div key={b.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium text-foreground">{new Date(b.booking_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                    <p className="text-xs text-muted-foreground">{b.time_slot}</p>
                    {b.officer_name && <p className="text-xs text-muted-foreground mt-1">with {b.officer_name}</p>}
                    <Badge variant="outline" className="mt-2 text-xs">{b.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid gap-3 sm:grid-cols-4">
          <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
            <Link to="/apply"><ClipboardList className="h-5 w-5" /><span className="text-xs">New Application</span></Link>
          </Button>
          <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
            <Link to="/documents"><FileText className="h-5 w-5" /><span className="text-xs">Document Vault</span></Link>
          </Button>
          <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
            <Link to="/book-call"><Calendar className="h-5 w-5" /><span className="text-xs">Book a Call</span></Link>
          </Button>
          <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
            <Link to="/eligibility"><Globe className="h-5 w-5" /><span className="text-xs">Check Eligibility</span></Link>
          </Button>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
