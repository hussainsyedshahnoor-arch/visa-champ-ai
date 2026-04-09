import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out" });
    navigate("/");
    setMobileOpen(false);
  };

  const navLink = "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors";

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center">
          <BrandLogo size="sm" />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="/#how-it-works" className={navLink}>How It Works</a>
          <Link to="/eligibility" className={navLink}>Eligibility Check</Link>
          {user && (
            <>
              <Link to="/dashboard" className={navLink}>Dashboard</Link>
              <Link to="/apply" className={navLink}>Apply</Link>
              <Link to="/applications" className={navLink}>My Applications</Link>
              <Link to="/documents" className={navLink}>Documents</Link>
            </>
          )}
          <a href="/#features" className={navLink}>Features</a>
        </div>

        {/* Desktop right side */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell />
              <Button variant="ghost" size="sm" asChild><Link to="/profile">Profile</Link></Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5">
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild><Link to="/login">Log in</Link></Button>
              <Button asChild><Link to="/signup">Sign up free</Link></Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t bg-card p-4 md:hidden">
          <div className="flex flex-col gap-3">
            <a href="/#how-it-works" className="text-sm font-medium" onClick={() => setMobileOpen(false)}>How It Works</a>
            <Link to="/eligibility" className="text-sm font-medium" onClick={() => setMobileOpen(false)}>Eligibility Check</Link>
            {user && (
              <>
                <Link to="/apply" className="text-sm font-medium" onClick={() => setMobileOpen(false)}>Apply</Link>
                <Link to="/applications" className="text-sm font-medium" onClick={() => setMobileOpen(false)}>My Applications</Link>
                <Link to="/documents" className="text-sm font-medium" onClick={() => setMobileOpen(false)}>Documents</Link>
              </>
            )}
            <a href="/#features" className="text-sm font-medium" onClick={() => setMobileOpen(false)}>Features</a>
            <hr />
            {user ? (
              <>
                <Link to="/profile" className="text-sm font-medium" onClick={() => setMobileOpen(false)}>Profile</Link>
                <Button variant="ghost" onClick={handleLogout} className="justify-start gap-1.5">
                  <LogOut className="h-4 w-4" /> Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/login">Log in</Link></Button>
                <Button asChild><Link to="/signup">Sign up free</Link></Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
