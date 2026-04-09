import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Phone, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

const BookCall = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [availability, setAvailability] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading]);

  useEffect(() => {
    supabase.from("officer_availability").select("*").eq("is_active", true).order("day_of_week").then(({ data }) => {
      if (data) setAvailability(data);
    });
  }, []);

  // Get available slots for selected date
  const dayOfWeek = selectedDate ? new Date(selectedDate).getDay() : -1;
  const slotsForDay = availability.filter((a) => a.day_of_week === dayOfWeek);

  const generateTimeSlots = (start: string, end: string) => {
    const slots: string[] = [];
    let [h, m] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    while (h < eh || (h === eh && m < em)) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      m += 30;
      if (m >= 60) { h++; m = 0; }
    }
    return slots;
  };

  const allSlots = slotsForDay.flatMap((s) =>
    generateTimeSlots(s.start_time, s.end_time).map((time) => ({ time, officer: s.officer_name }))
  );

  const handleSubmit = async () => {
    if (!user || !selectedDate || !selectedSlot || !phone) return;
    setSubmitting(true);
    const slot = allSlots.find((s) => s.time === selectedSlot);
    const { error } = await supabase.from("call_bookings").insert({
      user_id: user.id,
      booking_date: selectedDate,
      time_slot: selectedSlot,
      phone_number: phone,
      notes: notes || null,
      officer_name: slot?.officer || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-lg py-20 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Call Booked!</h1>
          <p className="text-muted-foreground mb-6">
            Your call has been scheduled for {selectedDate} at {selectedSlot}. We'll confirm shortly.
          </p>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  // Min date is tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-lg py-12 px-4">
        <Button variant="ghost" className="mb-4 gap-1.5" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Book a Call with Visa Officer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label>Select Date</Label>
              <Input type="date" min={minDate} value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(""); }} />
            </div>

            {selectedDate && (
              <div>
                <Label>Available Time Slots</Label>
                {allSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {allSlots.map((s) => (
                      <button
                        key={s.time}
                        onClick={() => setSelectedSlot(s.time)}
                        className={`rounded-lg border p-2 text-sm transition-colors ${
                          selectedSlot === s.time
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Clock className="h-3 w-3 mx-auto mb-1" />
                        {s.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
                    No slots available on {DAYS[dayOfWeek]}. Try another date.
                  </p>
                )}
              </div>
            )}

            <div>
              <Label>Your Phone Number</Label>
              <Input type="tel" placeholder="+92 300 1234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Input placeholder="What do you need help with?" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={!selectedDate || !selectedSlot || !phone || submitting}>
              {submitting ? "Booking..." : "Book Call"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookCall;
