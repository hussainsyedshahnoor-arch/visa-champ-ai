import { useEffect, useState } from "react";
import { MailPlus, Search, Shield } from "lucide-react";
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

type AppRole = "admin" | "moderator" | "user";

const ROLE_BADGE: Record<AppRole, "default" | "secondary" | "outline"> = {
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
  const [newRole, setNewRole] = useState<AppRole>("user");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: p, error: profilesError }, { data: r, error: rolesError }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (profilesError || rolesError) {
      toast({
        title: "Unable to load users",
        description: profilesError?.message || rolesError?.message || "Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setProfiles((p as ProfileRow[]) || []);
    setRoles((r as RoleRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const getUserRole = (userId: string): AppRole => {
    const userRoles = roles.filter((role) => role.user_id === userId).map((role) => role.role);
    if (userRoles.includes("admin")) return "admin";
    if (userRoles.includes("moderator")) return "moderator";
    return "user";
  };

  const assignRole = async () => {
    if (!selectedUser) return;

    const existing = roles.find((role) => role.user_id === selectedUser.user_id);
    let error: { message: string } | null = null;

    if (newRole === "user" && existing) {
      const response = await supabase.from("user_roles").delete().eq("user_id", selectedUser.user_id);
      error = response.error;
    } else if (existing) {
      const response = await supabase.from("user_roles").update({ role: newRole }).eq("user_id", selectedUser.user_id);
      error = response.error;
    } else if (newRole !== "user") {
      const response = await supabase.from("user_roles").insert({ user_id: selectedUser.user_id, role: newRole });
      error = response.error;
    }

    if (error) {
      toast({ title: "Role update failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Role updated",
      description: `${selectedUser.display_name || "User"} is now ${newRole}`,
    });
    setSelectedUser(null);
    await fetchData();
  };

  const grantAdminByEmail = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    setInviting(true);
    const { data, error } = await supabase.functions.invoke("grant-admin-by-email", {
      body: { email },
    });
    setInviting(false);

    const functionError = error?.message || (data && typeof data === "object" && "error" in data ? String(data.error) : null);
    if (functionError) {
      toast({
        title: "Unable to grant admin access",
        description: functionError,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Admin granted",
      description: `${email} can now access the admin dashboard.`,
    });
    setInviteEmail("");
    await fetchData();
  };

  const filtered = profiles.filter(
    (profile) =>
      !search ||
      profile.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      profile.user_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-9" />
          </div>
          <Badge variant="secondary">{profiles.length} users</Badge>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void grantAdminByEmail();
          }}
          className="rounded-lg border bg-card p-4"
        >
          <div className="mb-3 flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <MailPlus className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Grant admin by email</p>
              <p className="text-xs text-muted-foreground">The user must already have an account in Visa Champ.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="admin@example.com"
              className="flex-1"
            />
            <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
              {inviting ? "Granting..." : "Make Admin"}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border">
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
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No users found</TableCell>
              </TableRow>
            ) : (
              filtered.map((profile) => {
                const role = getUserRole(profile.user_id);
                return (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{profile.display_name || "No name"}</p>
                      <p className="font-mono text-xs text-muted-foreground">{profile.user_id.slice(0, 8)}...</p>
                    </TableCell>
                    <TableCell className="text-sm">{profile.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_BADGE[role]}>{role}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(profile);
                          setNewRole(role);
                        }}
                      >
                        <Shield className="mr-1 h-3.5 w-3.5" /> Role
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
                <p className="font-mono text-xs text-muted-foreground">{selectedUser.user_id}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Assign Role</p>
                <Select value={newRole} onValueChange={(value) => setNewRole(value as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
                <Button onClick={() => void assignRole()}>Save Role</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersTab;
