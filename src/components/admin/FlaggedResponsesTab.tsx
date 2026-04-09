import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface FlaggedResponse {
  id: string;
  session_id: string | null;
  message_content: string;
  flag_reason: string;
  status: string;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  pending: { variant: "destructive", label: "Pending" },
  reviewed: { variant: "secondary", label: "Reviewed" },
  dismissed: { variant: "outline", label: "Dismissed" },
  escalated: { variant: "default", label: "Escalated" },
};

const FlaggedResponsesTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<FlaggedResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState<FlaggedResponse | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    let query = supabase.from("flagged_responses").select("*").order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    const { data } = await query;
    setItems((data as FlaggedResponse[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [statusFilter]);

  const resolve = async (id: string, status: string) => {
    await supabase.from("flagged_responses").update({
      status,
      reviewer_id: user?.id,
      reviewer_notes: reviewNotes || null,
    }).eq("id", id);
    toast({ title: `Marked as ${status}` });
    setSelected(null);
    setReviewNotes("");
    fetchItems();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" /> Flagged AI Responses
        </h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mb-3 opacity-30" />
            <p>No flagged responses{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const badge = STATUS_BADGE[item.status] || STATUS_BADGE.pending;
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <span className="text-xs text-muted-foreground">{item.flag_reason}</span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">{item.message_content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setSelected(item); setReviewNotes(item.reviewer_notes || ""); }}>
                      <Eye className="h-4 w-4 mr-1" /> Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Flagged Response</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Flag Reason</p>
                <Badge variant="secondary">{selected.flag_reason}</Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">AI Response</p>
                <div className="bg-muted rounded-lg p-3 text-sm max-h-[200px] overflow-y-auto">
                  {selected.message_content}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Reviewer Notes</p>
                <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Add notes..." rows={3} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => resolve(selected.id, "dismissed")}>
                  <XCircle className="h-4 w-4 mr-1" /> Dismiss
                </Button>
                <Button variant="secondary" size="sm" onClick={() => resolve(selected.id, "reviewed")}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Mark Reviewed
                </Button>
                <Button variant="destructive" size="sm" onClick={() => resolve(selected.id, "escalated")}>
                  <AlertTriangle className="h-4 w-4 mr-1" /> Escalate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlaggedResponsesTab;
