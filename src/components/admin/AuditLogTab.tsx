import { useState, useEffect } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  status_change: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

const AuditLogTab = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (actionFilter !== "all") query = query.eq("action", actionFilter);

      const { data } = await query;
      setEntries((data as AuditEntry[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [actionFilter]);

  const filtered = entries.filter(
    (e) =>
      !search ||
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.target_table?.toLowerCase().includes(search.toLowerCase()) ||
      e.target_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs..." className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="status_change">Status Change</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Target ID</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit logs found</TableCell></TableRow>
            ) : (
              filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={ACTION_COLORS[e.action] || ""}>
                      {e.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{e.target_table || "—"}</TableCell>
                  <TableCell className="text-xs font-mono truncate max-w-[120px]">{e.target_id || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {Object.keys(e.details).length > 0 ? JSON.stringify(e.details) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AuditLogTab;
