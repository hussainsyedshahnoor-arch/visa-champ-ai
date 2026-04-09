import { useState, useEffect } from "react";
import { Search, Shield, UserCheck, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileRow {
  id: string;
  user_id: string;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface RoleRow {
  user_id: string;
  role: string;
}

const ROLE_BADGE: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  moderator: "secondary",
  user: "outline",
};

const UsersTab = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);
  const [newRole, setNewRole] = useState<string>("user");

  const fetchData = async () => {
    setLoading(true);
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (p) setProfiles(p as ProfileRow[]);
    if (r) setRoles(r as RoleRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getUserRole = (userId: string) => roles.find((r) => r.user_id === userId)?.role || "user";

  const assignRole = async () => {
    if (!selectedUser) return;
    const existing = roles.find((r) => r.user_id === selectedUser.user_id);

    if (newRole === "user" && existing) {
      // Remove role entry (default is "user" when no entry exists)
      await supabase.from("user_roles").delete().eq("user_id", selectedUser.user_id);
    } else if (existing) {
      await supabase.from("user_roles").update({ role: newRole as any }).eq("user_id", selectedUser.user_id);
    } else if (newRole !== "user") {
      await supabase.from("user_roles").insert({ user_id: selectedUser.user_id, role: newRole as any });
    }

    toast({ title: "Role updated", description: `${selectedUser.display_name || "User"} is now ${newRole}` });
    setSelectedUser(null);
    fetchData();
  };

  const filtered = profiles.filter(
    (p) =>
      !search ||
      p.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.user_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-9" />
        </div>
        <Badge variant="secondary">{profiles.length} users</Badge>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
            ) : (
              filtered.map((p) => {
                const role = getUserRole(p.user_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{p.display_name || "No name"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.user_id.slice(0, 8)}...</p>
                    </TableCell>
                    <TableCell className="text-sm">{p.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_BADGE[role] || "outline"}>{role}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedUser(p); setNewRole(role); }}>
                        <Shield className="h-3.5 w-3.5 mr-1" /> Role
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Manage Role</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedUser.display_name || "No name"}</p>
                <p className="text-xs text-muted-foreground font-mono">{selectedUser.user_id}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Assign Role</p>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
                <Button onClick={assignRole}>Save Role</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersTab;
