import { Globe } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t bg-card py-12">
    <div className="container">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary mb-3">
            <Globe className="h-5 w-5" /> Visa Champion
          </Link>
          <p className="text-sm text-muted-foreground">Your AI-powered visa consultant. Get expert guidance from questions to application.</p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#how-it-works" className="hover:text-foreground">How It Works</a></li>
            <li><a href="#features" className="hover:text-foreground">Features</a></li>
            <li><Link to="/chat" className="hover:text-foreground">AI Chat</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">About</a></li>
            <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Help Center</a></li>
            <li><a href="#" className="hover:text-foreground">Contact Us</a></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Visa Champion. All rights reserved.</p>
        <p className="mt-1">This platform provides AI-generated guidance only and does not constitute legal advice.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
