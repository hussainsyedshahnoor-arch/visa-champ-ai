

# Visa Champ — Landing Page + AI Chatbot

## Overview
Build the public-facing landing page with an integrated AI chatbot ("Visa Champ") as the hero experience. Modern & friendly design with approachable colors, rounded corners, and clean typography — similar to Wise or Deel.

## Design System
- **Primary**: Vibrant blue (#2563EB) with warm accent (#F59E0B amber/gold)
- **Background**: Soft warm white (#FAFAF9) with subtle gradients
- **Typography**: Inter for body, bold headings with friendly tone
- **Cards**: Rounded-lg corners, soft shadows, white backgrounds
- **Chat UI**: WhatsApp-like bubble style with Visa Champ branding

## Pages & Components

### 1. Landing Page (Homepage)
- **Navbar**: Visa Champ logo, navigation links (How It Works, Features, Pricing), Login/Sign Up buttons
- **Hero Section**: Bold headline ("Your AI Visa Consultant"), subtext about simplifying visa applications, and an embedded chat preview/CTA
- **AI Chat Widget**: Prominent chatbot embedded in the hero or as a floating panel — the main interaction point
  - Suggested prompt chips: "Tourist visa for UAE", "Student visa for UK", "Work visa requirements"
  - Guest message cap (5 messages), then soft signup gate modal
  - AI disclaimer footer: "This is an AI assistant. Responses are for guidance only."
- **How It Works**: 4-step visual flow (Chat → Requirements → Eligibility → Apply)
- **Features Section**: Cards highlighting AI consultation, eligibility checks, officer support, document vault
- **Testimonials**: Social proof section with placeholder reviews
- **Footer**: Links, contact info, legal disclaimers

### 2. Auth Pages
- **Sign Up**: Email + password form, Google SSO button, Apple SSO button
- **Login**: Email + password, SSO options
- Post-auth redirect back to chat with history preserved

### 3. AI Chatbot (Core Feature)
- Full-screen chat view for authenticated users at `/chat`
- Chat session list sidebar (conversation history)
- Streaming AI responses via Lovable AI edge function
- RAG-aware system prompt with visa consultation persona
- Suggested prompts for cold start
- Message bubbles with timestamps and typing indicator
- Visa Champ bot avatar and branding

## Backend (Lovable Cloud)

### Edge Function: `chat`
- Accepts user messages + conversation history
- System prompt as visa consultant personality ("Visa Champ")
- Streams responses via Lovable AI gateway
- Returns structured guidance on visa types, documents, eligibility

### Database Tables (initial)
- `chat_sessions` — track user conversations
- `chat_messages` — store message history
- `guest_sessions` — track unauthenticated users with message count

### Auth Setup
- Email + password authentication
- Google SSO

## Guest → Registered Flow
- Guest lands on homepage, interacts with chat widget
- After 5 messages, soft-gate modal appears: "Create a free account to continue"
- On signup, chat history is preserved and migrated to their account

