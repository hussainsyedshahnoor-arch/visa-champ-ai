import { Link } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";

const Footer = () => (
  <footer className="border-t bg-card py-12">
    <div className="container">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <Link to="/" className="mb-3 inline-flex">
            <BrandLogo size="sm" />
          </Link>
          <p className="text-sm text-muted-foreground">AI-powered tourist visa guidance for Pakistani passport holders.</p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/#how-it-works" className="hover:text-foreground">How It Works</a></li>
            <li><a href="/#features" className="hover:text-foreground">Features</a></li>
            <li><Link to="/chat" className="hover:text-foreground">AI Chat</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">About Us</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/help-center" className="hover:text-foreground">Help Center</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact Us</Link></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Visa Champ. All rights reserved.</p>
        <p className="mt-1">This platform provides AI-generated guidance only and does not constitute legal advice.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
