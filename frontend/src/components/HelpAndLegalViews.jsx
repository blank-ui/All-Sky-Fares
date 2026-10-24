import React from "react";
import { LEGAL, legalEntity } from "@/constants/legal";
import { Mail, Clock, HeadphonesIcon, MessageCircle, ChevronRight, ArrowRight, ShieldCheck, HelpCircle, FileText, Lock, Globe, Scale, AlertTriangle, CheckCircle2, Phone, Hotel, Car, Calendar, MapPin, Users, Sparkles } from "lucide-react";

const HELP_DOCS = [
  {
    q: "How do I book a flight?",
    a: "Search by route and dates, pick a fare, then enter each traveller's name exactly as it appears on their passport. Review the total (it includes airline taxes and our service fee) and accept the terms. Where card payment is available you pay securely by card and your tickets are issued straight away. Otherwise we hold your seats with the airline and give you the airline booking code immediately; our team then takes payment before the airline's deadline and issues your tickets.",
  },
  {
    q: "When am I charged?",
    a: "When you pay by card at checkout, you're charged once, when you confirm the payment; your card is processed by Duffel, our airline booking partner, and we never see your card number. When your seats are held instead, nothing is charged online: our team contacts you to take payment before the airline's deadline. If the hold expires unpaid, the airline releases the seats and you owe nothing.",
  },
  {
    q: "What travel documents do I need?",
    a: "You're responsible for having a valid passport (many countries require at least 6 months' validity) and any visas, transit visas or travel authorisations (such as US ESTA, Canada eTA or UK ETA) required by every country you travel to or through. Check with the relevant embassies before you travel.",
  },
  {
    q: "Can I cancel or change my booking?",
    a: "You can cancel from My Bookings: we show you what you'll get back before you confirm. For flights to, from or within the US booked at least 7 days before departure, you can cancel within 24 hours of booking for a full refund. After that, changes and refunds depend on the airline's fare rules. If the airline cancels or significantly changes your flight and you don't accept the alternative, you're entitled to a refund. See our Refund Policy for details, or call us.",
  },
  {
    q: "Are there extra fees?",
    a: "The price you see is the total for all travellers, including airline taxes and our service fee. Airlines may charge separately for checked bags, seat selection and other extras; check the airline's website for its baggage fees.",
  },
  {
    q: "How do you handle my personal data?",
    a: "We use your details to make and manage your bookings and share them with the airline through our booking provider. We don't sell your data. You can download or delete your data at any time from Account Settings. See our Privacy Policy for the full details.",
  },
];

export function HelpView({ navigate }) {
  return (
    <main className="help-page max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-12" data-testid="help-page">
      <div className="help-hero liquid-glass p-8 sm:p-12 rounded-3xl border border-white/20 mb-10 text-center relative overflow-hidden shadow-xl">
        <span className="eyebrow text-xs font-semibold tracking-wider text-cyan-500 dark:text-cyan-400 uppercase block mb-1">
          24/7 GLOBAL PASSENGER ASSISTANCE
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white">
          How can we help your journey?
        </h1>
        <p className="text-slate-600 dark:text-white/60 text-sm sm:text-base max-w-2xl mx-auto mt-2">
          Explore passenger rights, airline fare conditions, travel documentation requirements, or speak with our international ticketing desk.
        </p>
      </div>

      <div className="help-grid grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-4 items-start">
        {/* Row 1: FAQ Section Title */}
        <div className="lg:col-span-7 xl:col-span-8 flex items-center gap-2.5">
          <HelpCircle size={20} className="text-sky-500 shrink-0" />
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Passenger FAQ & Travel Rules
          </h2>
        </div>

        {/* Row 1: Right Column Placeholder (Ensures Row 2 begins exactly at the first question) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4" />

        {/* Row 2, Left: FAQ Accordion (First question starts at row top) */}
        <section className="lg:col-span-7 xl:col-span-8 space-y-3.5" data-testid="help-docs">
          {HELP_DOCS.map((doc, idx) => (
            <details
              key={idx}
              data-testid={`help-doc-${idx}`}
              className="group liquid-glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 transition-all hover:border-sky-400/40 open:bg-white/95 dark:open:bg-white/[0.04] shadow-xs"
            >
              <summary className="flex items-center justify-between font-bold text-slate-800 dark:text-white text-sm sm:text-base cursor-pointer list-none select-none">
                <span>{doc.q}</span>
                <ChevronRight size={18} className="text-sky-500 transition-transform group-open:rotate-90 shrink-0 ml-4" />
              </summary>
              <p className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 text-slate-600 dark:text-white/70 text-xs sm:text-sm leading-relaxed">
                {doc.a}
              </p>
            </details>
          ))}
        </section>

        {/* Row 2, Right: The Square Contact Desk Card (Starts in line with first question) */}
        <aside
          className="lg:col-span-5 xl:col-span-4 liquid-glass-card p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-white/15 shadow-xl space-y-5"
          data-testid="help-contact"
        >
          <div className="pb-3.5 border-b border-slate-100 dark:border-white/10">
            <span className="eyebrow text-[11px] font-extrabold tracking-wider text-sky-600 dark:text-sky-400 uppercase block">
              24/7 DEDICATED CONCIERGE
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
              Contact Travel Desk
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/60 mt-1">
              Reach our reservations, ticketing, and passenger assistance team anytime.
            </p>
          </div>

          <div className="space-y-3.5 text-xs text-slate-700 dark:text-white/80">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <Phone size={18} className="text-emerald-500 shrink-0" />
              <div>
                <span className="text-slate-500 dark:text-white/40 block text-[10px] uppercase font-bold tracking-wider">Toll-Free 24/7 Phone Support</span>
                <a href="tel:+18778184167" className="text-emerald-700 dark:text-emerald-300 font-bold text-sm hover:underline">
                  +1 (877) 818-4167
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5">
              <Mail size={16} className="text-sky-500 shrink-0" />
              <div>
                <span className="text-slate-500 dark:text-white/40 block text-[10px] uppercase font-semibold">Email Support</span>
                <a href="mailto:support@allskyfares.com" className="text-slate-900 dark:text-white hover:text-sky-600 font-medium">
                  support@allskyfares.com
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5">
              <MessageCircle size={16} className="text-sky-500 shrink-0" />
              <div>
                <span className="text-slate-500 dark:text-white/40 block text-[10px] uppercase font-semibold">Live Chat Concierge</span>
                <span className="text-slate-900 dark:text-white font-medium">Available when signed into account</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5">
              <Clock size={16} className="text-sky-500 shrink-0" />
              <div>
                <span className="text-slate-500 dark:text-white/40 block text-[10px] uppercase font-semibold">Response SLA</span>
                <span className="text-emerald-600 dark:text-emerald-300 font-medium">Within 1 business hour</span>
              </div>
            </div>
          </div>

          <button
            className="primary-button spatial-btn-primary w-full py-3.5 px-6 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
            data-testid="help-support-button"
            onClick={() => navigate("support")}
          >
            <span>Open Dedicated Support Ticket</span>
            <ArrowRight size={14} />
          </button>
        </aside>
      </div>

    </main>
  );
}

const POLICIES = {
  about: {
    eyebrow: "COMPANY",
    title: "About Us",
    subtitle: `${LEGAL.brand} is an online travel agency that finds and books flights with airlines worldwide.`,
    sections: [
      {
        heading: "1. Who we are",
        body: `${LEGAL.brand} is the trading name of ${legalEntity()}${LEGAL.address ? `, ${LEGAL.address}` : ""}. We're a travel agent: we search airline inventory, book your flights and support you until you travel. The flights themselves are operated by the airlines.`,
      },
      {
        heading: "2. What we offer",
        body: "Flight search and booking across full-service and low-cost airlines, through our licensed booking provider Duffel. Fare details before you buy: baggage allowance, change and cancellation fees, seat selection and the fare brand. A 24/7 travel desk for changes, cancellations and special requests. Hotels and car rentals are coming soon.",
      },
      {
        heading: "3. How booking works",
        body: "Search, pick your departing flight (and return), choose a fare and enter traveller details. The price you see is the total for all travellers, including airline taxes and our service fee. You pay by card in a secure payment form provided by Duffel; your card details go straight to the payment provider and never to our servers. Your tickets are issued by the airline as soon as the payment is confirmed, and your e-ticket and invoice are emailed to you.",
      },
      {
        heading: "4. Our service fee",
        body: "Our fee is included in the price shown on every fare, so there's nothing added at checkout. It's listed separately on your invoice.",
      },
    ],
  },
  contact: {
    eyebrow: "COMPANY",
    title: "Contact Us",
    subtitle: "Our travel desk is open 24 hours a day, 7 days a week.",
    sections: [
      {
        heading: "1. Phone",
        body: `Call ${LEGAL.phone} (toll-free in the US) for new bookings, changes, cancellations and urgent help before you fly.`,
      },
      {
        heading: "2. Email",
        body: `Bookings and support: ${LEGAL.supportEmail}. We reply within one business day, usually much sooner. Legal notices: ${LEGAL.legalEmail}.`,
      },
      {
        heading: "3. Your account",
        body: "Signed in, you can see your bookings, download e-tickets and invoices, cancel eligible bookings and open a support ticket from My Bookings.",
      },
      {
        heading: "4. Postal address",
        body: `${legalEntity()}${LEGAL.address ? `, ${LEGAL.address}` : ""}.`,
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "What we collect, why, who we share it with, and your rights.",
    sections: [
      {
        heading: "1. Who we are",
        body: `${legalEntity()} operates allskyfares.com, an online travel agency that books flights on your behalf with airlines. For anything about your personal data, contact ${LEGAL.privacyEmail || LEGAL.legalEmail || LEGAL.supportEmail}.`,
      },
      {
        heading: "2. What we collect",
        body: "Account details: your name, email address, phone number and password (stored only as a secure hash). Traveller details you enter when booking: names, title, gender, date of birth, email and phone number. Booking details: itinerary, prices, booking references and status. Support messages you send us. Technical data: your IP address (used for security and to prevent abuse) and a sign-in cookie. If you accept optional cookies, our live chat provider also processes your chat messages. We don't collect card numbers on this website.",
      },
      {
        heading: "3. How we use it",
        body: "To create and manage your account; to search for, reserve and ticket your flights; to contact you about your booking; to answer support requests; to keep the service secure and prevent fraud; and to meet legal, tax and accounting obligations. Where the GDPR applies, our legal bases are performing our contract with you, our legal obligations, and our legitimate interest in keeping the service secure. We don't use your data for advertising and we don't sell it.",
      },
      {
        heading: "4. Who we share it with",
        body: "Airlines, through our flight booking provider Duffel, to make your reservation. Our reservations team, through our internal customer management system. Resend, to send account emails such as password resets. Tawk.to, for live chat, only if you accept optional cookies. Google, to translate the page text, only if you choose a language other than English. Our hosting and database providers, who store data on our behalf. Authorities, where the law requires it (for example, airlines must pass passenger data to border agencies). Each provider may only use your data to provide its service to us.",
      },
      {
        heading: "5. International transfers",
        body: "Our providers may process data outside your country, including in the United States, the United Kingdom and the European Union. Where required, transfers are protected by safeguards such as the European Commission's Standard Contractual Clauses.",
      },
      {
        heading: "6. How long we keep it",
        body: "Account details: until you delete your account. Booking and transaction records: as long as tax, accounting and aviation rules require (generally up to 7 years), even if you delete your account. Sign-in sessions expire after 8 hours. Password reset codes expire after 30 minutes.",
      },
      {
        heading: "7. Your rights",
        body: `You can download a copy of your data or delete your account at any time in Account Settings. You can also ask us to correct your data, restrict or object to how we use it, by writing to ${LEGAL.privacyEmail || LEGAL.legalEmail || LEGAL.supportEmail}. If you're in the EU or UK you can complain to your data protection authority. California residents have the right to know, correct and delete their personal information and to opt out of its sale or sharing; we don't sell or share personal information for cross-context behavioural advertising. We won't treat you differently for using these rights.`,
      },
      {
        heading: "8. Security",
        body: "The site uses HTTPS. Passwords are stored as salted bcrypt hashes, provider credentials are encrypted, and sign-in uses an HttpOnly cookie that scripts can't read. No system is completely secure, but we work to protect your data and will tell you about a breach where the law requires.",
      },
      {
        heading: "9. Children",
        body: "Our service isn't directed at children under 16, and bookings must be made by an adult aged 18 or over. Adults may book for children travelling with them.",
      },
      {
        heading: "10. Changes",
        body: `We'll post any changes here and update the date at the top of this page. This policy was last updated on ${LEGAL.policiesUpdated}.`,
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    subtitle: "The agreement between you and All Sky Fares when you use this site and book with us.",
    sections: [
      {
        heading: "1. Our role",
        body: `${legalEntity()} is a travel agent. We search for and book flights for you; the flights themselves are provided by the airlines. When you book, you have a contract with us for our booking service and a separate contract of carriage with each airline.`,
      },
      {
        heading: "2. Who can book",
        body: "You must be at least 18 and able to enter into a binding contract. You're responsible for the accuracy of the details you give us, including traveller names exactly as shown on passports, and for keeping your account password safe.",
      },
      {
        heading: "3. Prices",
        body: "Prices are shown as one total for all travellers that includes airline taxes, carrier fees and our service fee. Prices come from the airlines and can change until your booking is ticketed. Airlines may charge separately for checked bags, seat selection and other extras.",
      },
      {
        heading: "4. How booking works",
        body: "Depending on the fare, you either pay by card and your tickets are issued immediately, or we hold your seats with the airline and give you the airline booking code; a held booking is confirmed once payment is taken and the tickets are issued, and it's released if it isn't paid by the airline's deadline. Where the airline doesn't allow holds, your booking is sent as a request and an agent contacts you to confirm the price and take payment. If the price has changed, you can choose not to go ahead at no cost.",
      },
      {
        heading: "5. Airline rules",
        body: "Your travel is governed by each airline's conditions of carriage and fare rules, including baggage allowances, check-in deadlines, changes and refunds, and by applicable law such as the Montreal Convention. Airlines may change schedules or cancel flights; we'll help you with the options the airline offers.",
      },
      {
        heading: "6. Travel documents",
        body: "You're responsible for having valid passports, visas, travel authorisations and any health documents required for your trip. We're not responsible if a traveller is refused boarding or entry because of missing or invalid documents.",
      },
      {
        heading: "7. Changes, cancellations and refunds",
        body: "These are covered by our Refund Policy and the airline's fare rules.",
      },
      {
        heading: "8. Our liability",
        body: "We're responsible for providing our booking service with reasonable care and skill. We're not responsible for the airline's performance of your flights or for events outside our control. To the extent the law allows, our liability for our booking service is limited to the service fee you paid us for the booking concerned. Nothing in these terms limits your rights under consumer protection law or any liability that can't be limited by law.",
      },
      {
        heading: "9. Using the site",
        body: "Don't misuse the site, for example by making speculative or fraudulent bookings, scraping it, or trying to access other people's accounts. We may suspend accounts that do.",
      },
      {
        heading: "10. Governing law and contact",
        body: `These terms are governed by the laws of the place where ${legalEntity()} is registered, without affecting any mandatory consumer protections in the country where you live. Questions: ${LEGAL.supportEmail} or ${LEGAL.phone}.`,
      },
    ],
  },
  refund: {
    title: "Refund & Cancellation Policy",
    subtitle: "How cancellations, changes and refunds work.",
    sections: [
      {
        heading: "1. 24-hour cancellation",
        body: `For flights to, from or within the United States booked at least 7 days before departure, you can cancel within 24 hours of booking for a full refund, including our service fee. Call ${LEGAL.phone} or email ${LEGAL.supportEmail} within the 24 hours.`,
      },
      {
        heading: "2. Held seats and requests not yet paid",
        body: "If your seats are on hold or your booking is still a request (not paid and not ticketed), you can cancel it at any time from My Bookings at no cost.",
      },
      {
        heading: "3. After 24 hours",
        body: "Whether you can change or cancel, and any penalty, is set by the airline's fare rules for your ticket. Some fares are non-refundable or can only be changed for a fee or exchanged for a travel credit. We'll tell you what your fare allows before making any change.",
      },
      {
        heading: "4. If the airline cancels or significantly changes your flight",
        body: "If the airline cancels your flight or makes a significant change and you don't accept the alternative offered, you're entitled to a refund of the unused ticket. You may also have rights under passenger protection rules such as US DOT regulations, EU Regulation 261/2004 or UK261.",
      },
      {
        heading: "5. How to request a cancellation or change",
        body: `Contact us before your flight departs: open a support ticket from your account, call ${LEGAL.phone} or email ${LEGAL.supportEmail}. If you don't show up for a flight, the airline may cancel the rest of your itinerary and the ticket may lose its value.`,
      },
      {
        heading: "6. When you'll get your money",
        body: "Refunds go back to the original payment method. Where we process the payment, we issue refunds within 7 business days for card payments and 20 days for other payment methods, as US DOT rules require. Where the refund comes from the airline, we pass it on as soon as we receive it. Your bank may take a few more days to show it.",
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    subtitle: "The cookies and browser storage this site uses, and how to change your choice.",
    sections: [
      {
        heading: "1. Essential cookies (always on)",
        body: "One sign-in cookie (access_token) keeps you signed in for up to 8 hours. It's HttpOnly, so scripts on the page can't read it. The site can't work without it.",
      },
      {
        heading: "2. Preferences in your browser",
        body: "We remember your light or dark theme and your cookie choice in your browser's local storage. These stay on your device and aren't used to track you.",
      },
      {
        heading: "3. Optional: live chat",
        body: "If you choose \"Accept all\", we load the Tawk.to live chat widget, which sets its own cookies to keep your chat conversation going. If you choose \"Essential only\", the chat isn't loaded. If you pick a language other than English, we store your choice in your browser and Google's translator sets a googtrans cookie to show pages in that language; choosing English again removes it.",
      },
      {
        heading: "4. No advertising or tracking",
        body: "We don't use advertising, analytics or social media tracking cookies.",
      },
      {
        heading: "5. Changing your choice",
        body: "Use \"Cookie Preferences\" at the bottom of any page to change your choice at any time. You can also delete cookies in your browser settings.",
      },
    ],
  },
};

export function PolicyView({ view }) {
  const p = POLICIES[view];

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [view]);

  if (!p) return null;

  // Helper to detect and render bulleted points if body contains listed items
  const renderBodyWithPoints = (text) => {
    // If text contains (a), (b) or multiple clauses, parse into clean bulleted points
    if (text.includes("(a)") && text.includes("(b)")) {
      const firstA = text.indexOf("(a)");
      const intro = text.substring(0, firstA).trim();
      const remaining = text.substring(firstA);
      const items = remaining
        .split(/(?:;\s*(?:and\s+)?|(?<=[^;])\s+)(?=\([a-z0-9]+\))/gi)
        .filter(Boolean);

      return (
        <div className="space-y-2">
          {intro && (
            <p className="text-slate-700 dark:text-white/80 leading-relaxed text-xs sm:text-sm font-medium">
              {intro}
            </p>
          )}
          <ul className="space-y-1.5 pl-4 list-disc text-slate-700 dark:text-white/80 text-xs sm:text-sm marker:text-cyan-500">
            {items.map((it, idx) => {
              // Strip (a), (b), (c) and leading/trailing punctuation so it shows a clean single bullet point
              const cleaned = it
                .replace(/^(?:and\s+)?\([a-z0-9]+\)\s*/i, "")
                .trim()
                .replace(/;?\s*(?:and)?\s*$/i, "");
              return (
                <li key={idx} className="leading-relaxed font-normal">
                  {cleaned}
                </li>
              );
            })}
          </ul>
        </div>
      );
    }

    return (
      <p className="text-slate-700 dark:text-white/80 leading-relaxed text-xs sm:text-sm font-normal">
        {text}
      </p>
    );
  };

  return (
    <main className="policy-page max-w-5xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-12" data-testid={`policy-${view}-page`}>
      <div className="policy-hero liquid-glass p-8 sm:p-10 rounded-3xl border border-slate-300 dark:border-white/10 mb-8 shadow-xl bg-white/95 dark:bg-slate-900/80">
        <div className="flex items-center gap-2 mb-2">
          <Scale size={16} className="text-cyan-600 dark:text-cyan-400" />
          <span className="eyebrow text-xs font-bold tracking-wider text-cyan-600 dark:text-cyan-400 uppercase">
            {p.eyebrow || "LEGAL"}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">{p.title}</h1>
        <p className="text-slate-700 dark:text-white/70 text-sm mt-1 font-medium">{p.subtitle}</p>
        {!p.eyebrow && <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-700 dark:text-emerald-400 mt-4 pt-4 border-t border-slate-200 dark:border-white/10 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" /> Last updated {LEGAL.policiesUpdated}
          </span>
        </div>}
      </div>

      <div className="policy-body liquid-glass-card p-8 sm:p-10 rounded-3xl border border-slate-300 dark:border-white/10 space-y-8 shadow-lg bg-white/90 dark:bg-slate-900/60">
        {p.sections.map((sec, i) => (
          <div key={i} className="space-y-2 pb-6 border-b border-slate-100 dark:border-white/5 last:border-b-0 last:pb-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xs font-mono font-bold">
                {i + 1}
              </span>
              <span>{sec.heading.replace(/^\d+\.\s*/, "")}</span>
            </h3>
            {renderBodyWithPoints(sec.body)}
          </div>
        ))}

        <div className="p-6 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start gap-4 mt-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div className="text-xs text-slate-600 dark:text-white/60 leading-relaxed flex-1">
            <b className="text-slate-900 dark:text-white text-sm block mb-1">Contact us</b>
            <p className="mb-2">
              For booking assistance, cancellations, or voluntary refund inquiries, please contact our 24/7 Travel Desk at <a href="tel:+18778184167" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">+1 (877) 818-4167</a> or via email at <a href="mailto:support@allskyfares.com" className="text-cyan-600 dark:text-cyan-400 font-bold underline">support@allskyfares.com</a>.
            </p>
            <p>
              For legal notices or claims, write to <a href="mailto:legal@allskyfares.com" className="text-cyan-600 dark:text-cyan-300 underline font-semibold">legal@allskyfares.com</a>.
              {LEGAL.companyName && <> {LEGAL.companyName}{LEGAL.address && `, ${LEGAL.address}`}.</>}
              {LEGAL.sellerOfTravel && <> {LEGAL.sellerOfTravel}.</>}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}


export function VerticalPreviewView({ view, navigate }) {
  const isHotel = view === "hotels";
  const title = isHotel ? "Luxury Hotels & Boutique Stays" : "Premium Car Rentals & Chauffeurs";
  const subtitle = isHotel
    ? "Compare world-class accommodations with exclusive negotiated room rates. Direct inventory integration is in active preview."
    : "Rent luxury vehicles, SUVs, and seamless airport transfers. Direct fleet integration is in active preview.";

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-16" data-testid={`vertical-${view}-page`}>
      <div className="liquid-glass p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-white/10 mb-8 text-center relative overflow-hidden shadow-2xl bg-white/95 dark:bg-slate-900/90">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles size={14} />
          <span>Concierge Preview</span>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-4 border border-cyan-500/20 shadow-lg">
          {isHotel ? <Hotel size={32} /> : <Car size={32} />}
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h1>
        <p className="text-slate-600 dark:text-white/70 text-sm sm:text-base max-w-2xl mx-auto mt-3 leading-relaxed">
          {subtitle}
        </p>

        {/* 24/7 Agent Booking Hotline Callout */}
        <div className="mt-8 max-w-xl mx-auto p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-orange-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Phone size={20} className="animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Book Through Reservations Desk
              </span>
              <a
                href="tel:+18778184167"
                className="text-lg font-black text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 font-mono tracking-tight transition-colors"
              >
                +1 (877) 818-4167
              </a>
            </div>
          </div>
          <a
            href="tel:+18778184167"
            className="spatial-btn-primary px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap shadow-md cursor-pointer"
          >
            Call Desk Now
          </a>
        </div>

        {/* Action button to return to flights */}
        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate("home")}
            className="spatial-btn-primary px-6 py-3 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <span>Search Available Flights</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </main>
  );
}
