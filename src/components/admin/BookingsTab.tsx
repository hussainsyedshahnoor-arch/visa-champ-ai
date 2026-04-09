import { useState, useEffect } from "react";
import { Calendar, Clock, Phone, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const BookingsTab = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [availability, setAvailability] = useState<any[]>([]);
  const [newSlot, setNewSlot] = useState({ officer_name: "", day_of_week: 1, start_time: "09:00", end_time: "17:00" });
  const [showAddSlot, setShowAddSlot] = useState(false);

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const fetchBookings = async () => {
    const { data } = await supabase.from("call_bookings").select("*").order("booking_date", { ascending: false });
    if (data) setBookings(data);
  };

  const fetchAvailability = async () => {
    const { data } = await supabase.from("officer_availability").select("*").order("day_of_week");
    if (data) setAvailability(data);
  };

  useEffect(() => { fetchBookings(); fetchAvailability(); }, []);

  const updateBookingStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("call_bookings").update({ status }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    fetchBookings();
    toast({ title: `Booking ${status}` });
  };

  const addSlot = async () => {
    const { error } = await supabase.from("officer_availability").insert(newSlot as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setShowAddSlot(false);
    fetchAvailability();
    toast({ title: "Slot added" });
  };

  const deleteSlot = async (id: string) => {
    await supabase.from("officer_availability").delete().eq("id", id);
    fetchAvailability();
  };

  const filtered = filterStatus === "all" ? bookings : bookings.filter((b) => b.status === filterStatus);

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Pending", value: stats.pending, color: "text-yellow-600" },
          { label: "Confirmed", value: stats.confirmed, color: "text-blue-600" },
          { label: "Completed", value: stats.completed, color: "text-green-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Officer Availability */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Officer Availability</h3>
          <Button size="sm" variant="outline" onClick={() => setShowAddSlot(!showAddSlot)}>
            {showAddSlot ? "Cancel" : "Add Slot"}
          </Button>
        </div>

        {showAddSlot && (
          <Card className="mb-3">
            <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
              <Input placeholder="Officer name" value={newSlot.officer_name} onChange={(e) => setNewSlot({ ...newSlot, officer_name: e.target.value })} />
              <Select value={String(newSlot.day_of_week)} onValueChange={(v) => setNewSlot({ ...newSlot, day_of_week: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="time" value={newSlot.start_time} onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })} />
              <Input type="time" value={newSlot.end_time} onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })} />
              <Button onClick={addSlot} disabled={!newSlot.officer_name}>Save</Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {availability.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{slot.officer_name}</p>
                <p className="text-xs text-muted-foreground">
                  {DAYS[slot.day_of_week]} · {slot.start_time} - {slot.end_time}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteSlot(slot.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Bookings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Call Bookings</h3>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {filtered.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{b.booking_date}</span>
                      <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                      <span className="text-sm text-foreground">{b.time_slot}</span>
                    </div>
                    {b.phone_number && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {b.phone_number}
                      </div>
                    )}
                    {b.officer_name && <p className="text-xs text-muted-foreground mt-0.5">Officer: {b.officer_name}</p>}
                    {b.notes && <p className="text-xs text-muted-foreground mt-0.5">{b.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[b.status] || ""}>{b.status}</Badge>
                  {b.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => updateBookingStatus(b.id, "confirmed")}>
                        <Check className="h-3 w-3" /> Confirm
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateBookingStatus(b.id, "cancelled")}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {b.status === "confirmed" && (
                    <Button size="sm" variant="outline" onClick={() => updateBookingStatus(b.id, "completed")}>
                      Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground">No bookings found</p>}
        </div>
      </div>
    </div>
  );
};

export default BookingsTab;
