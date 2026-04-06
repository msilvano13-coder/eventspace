export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  publishedAt: string;
  updatedAt: string;
  readingTime: string;
  category: string;
  heroEmoji: string;
  sections: {
    heading: string;
    content: string; // HTML string
  }[];
  cta: {
    heading: string;
    description: string;
  };
}

export const blogPosts: BlogPost[] = [
  {
    slug: "event-floor-plan-software-guide",
    title: "How to Create an Event Floor Plan That Impresses Clients in 2026",
    description:
      "Learn how to design professional event floor plans with drag-and-drop tools, 3D visualization, and venue presets. The complete guide for wedding planners, corporate event coordinators, and venue managers.",
    keywords: [
      "event floor plan software",
      "event layout design tool",
      "wedding floor plan template",
      "3D event visualization",
      "drag and drop floor plan",
      "venue layout software",
      "event space planning",
      "floor plan for wedding reception",
      "corporate event layout",
      "event planner software",
    ],
    publishedAt: "2026-03-15",
    updatedAt: "2026-03-30",
    readingTime: "8 min read",
    category: "Floor Plans",
    heroEmoji: "🏛️",
    sections: [
      {
        heading: "Why Floor Plans Make or Break Your Events",
        content: `<p>Every experienced event planner knows the moment: a client walks into a venue for the first time and tries to imagine 200 guests, a dance floor, a head table, and a photo booth all fitting into one room. Without a clear floor plan, that conversation becomes guesswork.</p>
<p>A professional floor plan does three things. First, it proves to your client that you have a concrete vision. Second, it prevents costly day-of surprises — like discovering the DJ booth blocks the emergency exit. Third, it gives your vendor team (caterers, florists, AV crews) a shared reference so everyone sets up in the right place.</p>
<p>Whether you're planning weddings in <strong>Nashville</strong>, corporate galas in <strong>Chicago</strong>, quinceañeras in <strong>Miami</strong>, or fundraisers in <strong>San Francisco</strong>, floor planning is the foundation of a well-executed event.</p>`,
      },
      {
        heading: "The Old Way vs. the New Way",
        content: `<p>Traditionally, planners sketched layouts on graph paper or wrestled with generic diagramming tools like Visio or PowerPoint. These tools weren't built for events — you'd spend hours drawing rectangles to represent tables and still end up with something that looked amateur when you emailed it to a client.</p>
<p>Modern event floor plan software changes the game entirely. Instead of drawing shapes, you drag pre-built furniture (round tables, banquet tables, bars, stages, photo booths) onto a canvas that's scaled to your venue's actual dimensions. Some tools even let you switch to a <strong>3D view</strong> so clients can see exactly what the room will look like from their seat.</p>
<p>The best tools include <strong>venue presets</strong> — pre-configured room templates for popular venues in cities like <strong>Austin, New York, Los Angeles, Atlanta, Denver, and Dallas</strong> — so you're not starting from scratch every time.</p>`,
      },
      {
        heading: "What to Look for in Floor Plan Software",
        content: `<p>Not all floor plan tools are created equal. Here's what separates a professional-grade solution from a toy:</p>
<ul>
<li><strong>Drag-and-drop furniture library</strong> — Round tables (seats 8, 10, 12), banquet tables, cocktail tables, bars, stages, DJ booths, dance floors, lounge furniture, and buffet stations. You shouldn't have to draw these from scratch.</li>
<li><strong>Accurate room dimensions</strong> — Upload your venue's floor plan or set custom room dimensions so everything is to scale. Fire marshals care about capacity; your software should too.</li>
<li><strong>3D visualization</strong> — A 2D top-down view is useful for logistics, but a 3D walkthrough is what sells the vision to clients. Look for realistic lighting, textures, and camera angles.</li>
<li><strong>Lighting zones</strong> — Map uplighting, pin spots, and wash zones directly on the floor plan so your AV team knows exactly where to rig.</li>
<li><strong>Shareable with clients</strong> — Your client should be able to view the floor plan without downloading special software. A web-based client portal is ideal.</li>
<li><strong>Integration with seating</strong> — The floor plan should connect to your guest list so you can assign seats and see names on the layout.</li>
</ul>`,
      },
      {
        heading: "Step-by-Step: Building Your First Floor Plan",
        content: `<p>Here's how professional planners in <strong>Seattle, Portland, Charlotte, and Boston</strong> approach floor planning with modern software:</p>
<ol>
<li><strong>Start with the venue</strong> — Enter the room dimensions or select a venue preset. Set the entry/exit points and any fixed features (columns, built-in bars, stages).</li>
<li><strong>Place anchor elements</strong> — Position the head table, dance floor, and stage first. These large elements define the flow of the room.</li>
<li><strong>Add guest tables</strong> — Place round or banquet tables in the remaining space. Leave 5–6 feet between tables for comfortable movement and ADA compliance.</li>
<li><strong>Add service areas</strong> — Position the bar, buffet stations, cake table, and gift table. Keep high-traffic areas (bar, restrooms) away from the ceremony or speech area.</li>
<li><strong>Layer in details</strong> — Add lounge furniture, photo booth, DJ booth, and any specialty stations (cigar bar, dessert station, espresso cart).</li>
<li><strong>Switch to 3D</strong> — Walk through the layout from the guest's perspective. Check sightlines to the stage, lighting coverage, and overall ambiance.</li>
<li><strong>Share with the client</strong> — Send a link to your branded client portal so they can review the layout and leave feedback without emailing screenshots back and forth.</li>
</ol>`,
      },
      {
        heading: "Common Floor Plan Mistakes to Avoid",
        content: `<p>Even experienced planners make these errors:</p>
<ul>
<li><strong>Ignoring fire code capacity</strong> — Every venue has a max occupancy. Your floor plan must account for this, especially in cities like <strong>New York, Los Angeles, and Chicago</strong> where fire marshals actively inspect events.</li>
<li><strong>Blocking sightlines</strong> — Tall centerpieces, columns, or poorly placed AV equipment can block the view of the stage or head table for entire sections of guests.</li>
<li><strong>Forgetting vendor needs</strong> — Caterers need a staging area near the kitchen. DJs need power outlets and space for speakers. Florists need a setup area that isn't in the middle of the guest flow.</li>
<li><strong>Not accounting for flow</strong> — Guests naturally cluster around the bar and entrance. Plan wide pathways to prevent bottlenecks, especially during cocktail hour transitions.</li>
<li><strong>Using a 2D-only plan for client approval</strong> — Clients who aren't spatial thinkers will struggle with a top-down diagram. A 3D view eliminates "I didn't realize it would look like that" surprises.</li>
</ul>`,
      },
      {
        heading: "How SoiréeSpace Makes Floor Planning Effortless",
        content: `<p>SoiréeSpace was built specifically for professional event planners. The floor plan tool includes a full drag-and-drop furniture library, custom room dimensions, lighting zones, and a stunning <strong>3D visualization</strong> with venue presets and realistic lighting.</p>
<p>Every floor plan is automatically shared through your <strong>branded client portal</strong> — your logo, your colors, your tagline. Clients see the layout, the guest list, the timeline, and the contracts all in one place.</p>
<p>And because SoiréeSpace connects your floor plan to your guest list, you can assign seats directly on the layout and use <strong>smart seating</strong> to auto-arrange guests based on VIP priority, group relationships, and dietary needs.</p>
<p>Plans start at just <strong>$99 one-time</strong> for the DIY plan, or try Professional free for 30 days with unlimited events and all features.</p>`,
      },
    ],
    cta: {
      heading: "Ready to Design Floor Plans Your Clients Will Love?",
      description:
        "Start your free 30-day trial and build your first 3D floor plan in minutes. No credit card required.",
    },
  },

  {
    slug: "event-planner-contract-templates-esignature-guide",
    title: "Event Planner Contract Templates: The Complete Guide to E-Signatures in 2026",
    description:
      "Protect your event planning business with professional contracts and legally binding e-signatures. Free templates, ESIGN Act compliance, and best practices for wedding and corporate event planners.",
    keywords: [
      "event planner contract template",
      "e-signature for event planners",
      "wedding planner contract",
      "event planning agreement template",
      "electronic signature legal",
      "ESIGN Act event contracts",
      "client contract for events",
      "event planner agreement",
      "how to sign contracts online",
      "contract management for planners",
    ],
    publishedAt: "2026-03-18",
    updatedAt: "2026-03-30",
    readingTime: "10 min read",
    category: "Contracts",
    heroEmoji: "📝",
    sections: [
      {
        heading: "Why Every Event Planner Needs a Signed Contract",
        content: `<p>A handshake and a deposit used to be enough. Not anymore. In today's event industry, a signed contract is your single most important business protection — and most planners are still doing it wrong.</p>
<p>Without a contract, you have no legal recourse if a client cancels two weeks before the event, disputes the scope of services, or refuses to pay the balance. With a contract, you have a clear, enforceable agreement that protects both parties.</p>
<p>This is true whether you're planning a 500-person corporate conference in <strong>Dallas</strong>, an intimate wedding in <strong>Savannah</strong>, a bar mitzvah in <strong>Philadelphia</strong>, or a product launch in <strong>San Francisco</strong>. Every market, every event type, every price point needs a contract.</p>`,
      },
      {
        heading: "What Your Event Planning Contract Must Include",
        content: `<p>A solid event planning contract covers these essential sections:</p>
<ul>
<li><strong>Scope of services</strong> — Exactly what you will (and won't) do. Be specific: "Full-service planning including vendor management, timeline creation, and day-of coordination" is better than "event planning services."</li>
<li><strong>Payment terms</strong> — Total fee, deposit amount, payment schedule, accepted methods, and late payment penalties. Many planners in <strong>New York, Los Angeles, and Chicago</strong> require 50% upfront.</li>
<li><strong>Cancellation policy</strong> — What happens if the client cancels? What's the refund schedule based on timing? Most planners use a tiered approach: full refund 90+ days out, 50% refund 60–90 days, no refund within 60 days.</li>
<li><strong>Force majeure</strong> — What happens if the event can't proceed due to circumstances outside anyone's control (weather, venue closure, public health orders).</li>
<li><strong>Liability limitations</strong> — Cap your liability at the total fee paid. Require the client to carry event insurance for large events.</li>
<li><strong>Intellectual property</strong> — Who owns the event design? Can you use photos in your portfolio? Spell it out.</li>
<li><strong>Signatures from both parties</strong> — The contract isn't valid until both the planner and client sign. Electronic signatures are legally equivalent to handwritten ones under federal law.</li>
</ul>`,
      },
      {
        heading: "Are E-Signatures Legally Binding? Yes — Here's Why",
        content: `<p>The <strong>ESIGN Act</strong> (Electronic Signatures in Global and National Commerce Act), signed into federal law in 2000, establishes that electronic signatures are legally equivalent to handwritten signatures in all 50 states.</p>
<p>For an e-signature to be legally binding, four conditions must be met:</p>
<ol>
<li><strong>Intent to sign</strong> — The signer must clearly intend to sign the document (clicking "I agree" counts).</li>
<li><strong>Consent to do business electronically</strong> — The signer must agree to use electronic records and signatures.</li>
<li><strong>Association of signature with the record</strong> — The system must connect the signature to the specific document being signed.</li>
<li><strong>Record retention</strong> — The signed document must be stored and reproducible.</li>
</ol>
<p>This means that when your client draws their signature on a digital pad and checks a consent box, that signature carries the same legal weight as signing with a pen at a meeting in <strong>Atlanta, Houston, Phoenix, or Denver</strong>.</p>
<p>The key is using software that captures the right evidence: timestamp, IP address, consent acknowledgment, and the identity of the signer. This audit trail is what holds up if the contract is ever disputed.</p>`,
      },
      {
        heading: "How to Set Up E-Signatures for Your Event Planning Business",
        content: `<p>Here's the workflow professional planners follow:</p>
<ol>
<li><strong>Create contract templates</strong> — Build 2–3 templates for your most common event types (wedding, corporate, social). Include all the clauses above with blanks for event-specific details.</li>
<li><strong>Customize per event</strong> — Fill in the client name, event date, venue, services, and pricing. Attach the template to the specific event in your planning software.</li>
<li><strong>Sign first as the planner</strong> — Your signature demonstrates commitment and professionalism. The e-signature disclosure confirms your intent.</li>
<li><strong>Send to the client</strong> — Share via your client portal (not email attachments that get lost). The client reviews, checks the disclosure box, draws their signature, and both parties receive a signed copy.</li>
<li><strong>Store the audit trail</strong> — Every action (viewed, signed, downloaded) should be logged with timestamps, IP addresses, and identity information. This is your legal evidence.</li>
</ol>`,
      },
      {
        heading: "Contract Red Flags: What Clients Push Back On",
        content: `<p>Experienced planners in <strong>Nashville, Austin, San Diego, and Minneapolis</strong> have seen it all. Here are the most common client objections and how to handle them:</p>
<ul>
<li><strong>"Why do I need to pay a deposit?"</strong> — Because you're reserving your time and turning away other clients. The deposit secures their date on your calendar.</li>
<li><strong>"Can we skip the contract?"</strong> — Never. Politely explain that the contract protects them too — it guarantees the services they're paying for.</li>
<li><strong>"I don't want to sign digitally"</strong> — Explain that e-signatures are federally legal and actually more secure than paper (they create an audit trail). If they insist, offer a printed copy, but log it digitally too.</li>
<li><strong>"Your cancellation policy is too strict"</strong> — Explain the economics: by the time they cancel, you've already turned away other clients and spent hours planning. The policy reflects real costs.</li>
</ul>`,
      },
      {
        heading: "How SoiréeSpace Handles Contracts and E-Signatures",
        content: `<p>SoiréeSpace includes a complete contract management system built specifically for event planners. You can create reusable templates, assign contracts to specific events, and collect <strong>dual e-signatures</strong> — planner and client — with full ESIGN Act compliance.</p>
<p>Every signature includes a legally compliant <strong>e-signature disclosure</strong> that the signer must acknowledge before signing. The system automatically logs a full <strong>audit trail</strong>: who viewed the contract, when they signed, their IP address, and the exact text they agreed to.</p>
<p>Clients sign through your <strong>branded client portal</strong> — no account creation required. They see your logo, your colors, and the contract. One tap to review, one signature to sign.</p>
<p>Contract templates, e-signatures, and audit trails are included in both the <strong>$99 DIY plan</strong> and the Professional plan.</p>`,
      },
    ],
    cta: {
      heading: "Protect Your Business with Professional Contracts",
      description:
        "Start your free trial and send your first e-signature contract today. Templates included, no legal degree required.",
    },
  },

  {
    slug: "day-of-timeline-template-event-planners",
    title: "The Ultimate Day-of Timeline Template for Event Planners",
    description:
      "Build a minute-by-minute event timeline your team and clients can follow. Includes a free day-of timeline template, PDF export tips, and best practices for weddings, galas, and corporate events.",
    keywords: [
      "day-of timeline template",
      "event timeline software",
      "wedding day timeline",
      "event schedule template",
      "day-of coordination timeline",
      "event run of show template",
      "minute by minute event schedule",
      "event planner timeline tool",
      "wedding timeline template free",
      "corporate event schedule",
    ],
    publishedAt: "2026-03-20",
    updatedAt: "2026-03-30",
    readingTime: "9 min read",
    category: "Timelines",
    heroEmoji: "⏱️",
    sections: [
      {
        heading: "The Day-of Timeline Is Your Event's Backbone",
        content: `<p>Ask any seasoned planner what separates a smooth event from a chaotic one, and they'll say the same thing: the timeline. A detailed, minute-by-minute day-of timeline is the single document that keeps vendors, venue staff, the wedding party, and the planner all synchronized.</p>
<p>Without one, you're relying on memory, text chains, and hope. With one, every person involved knows exactly where to be and when — from the florist arriving at 7:00 AM to the last song at 11:45 PM.</p>
<p>This guide covers how to build a professional day-of timeline, whether you're coordinating a wedding in <strong>Charleston</strong>, a corporate retreat in <strong>Scottsdale</strong>, a gala in <strong>Washington D.C.</strong>, or a festival in <strong>Austin</strong>.</p>`,
      },
      {
        heading: "What Goes Into a Day-of Timeline",
        content: `<p>A complete day-of timeline includes every moment from vendor load-in to the final exit. Here's the framework:</p>
<h4>Pre-Event (Vendor Setup)</h4>
<ul>
<li>Venue access / load-in time</li>
<li>Florist arrival and setup</li>
<li>AV / lighting setup and sound check</li>
<li>Catering team arrival and kitchen prep</li>
<li>Photographer arrival for detail shots</li>
<li>Table setting and place card arrangement</li>
</ul>
<h4>Pre-Ceremony / Pre-Program</h4>
<ul>
<li>Hair and makeup (for weddings)</li>
<li>First look or pre-event photos</li>
<li>Guest arrival and welcome drinks</li>
<li>VIP or speaker check-in (for corporate)</li>
</ul>
<h4>Main Event</h4>
<ul>
<li>Ceremony start time (or program kickoff)</li>
<li>Key moments: vows, speeches, toasts, awards</li>
<li>Meal service (cocktail hour, dinner, dessert)</li>
<li>Entertainment transitions (DJ, band, speakers)</li>
<li>Special moments (cake cutting, first dance, bouquet toss)</li>
</ul>
<h4>Post-Event</h4>
<ul>
<li>Last call / final song</li>
<li>Guest departure and transportation</li>
<li>Vendor breakdown and load-out</li>
<li>Final venue walkthrough</li>
</ul>`,
      },
      {
        heading: "Sample Wedding Day Timeline",
        content: `<p>Here's a real-world timeline planners in <strong>Nashville, Savannah, Napa Valley, and Palm Springs</strong> use as a starting point:</p>
<table>
<tr><td><strong>7:00 AM</strong></td><td>Florist arrives, begins setup</td></tr>
<tr><td><strong>8:00 AM</strong></td><td>Hair and makeup begins for bridal party</td></tr>
<tr><td><strong>9:00 AM</strong></td><td>AV team arrives for sound check</td></tr>
<tr><td><strong>10:00 AM</strong></td><td>Catering team arrives</td></tr>
<tr><td><strong>11:00 AM</strong></td><td>Photographer arrives for detail shots</td></tr>
<tr><td><strong>12:00 PM</strong></td><td>First look photos</td></tr>
<tr><td><strong>1:00 PM</strong></td><td>Bridal party photos</td></tr>
<tr><td><strong>2:30 PM</strong></td><td>Planner does final walkthrough</td></tr>
<tr><td><strong>3:00 PM</strong></td><td>Guests begin arriving</td></tr>
<tr><td><strong>3:30 PM</strong></td><td>Ceremony begins</td></tr>
<tr><td><strong>4:00 PM</strong></td><td>Cocktail hour starts</td></tr>
<tr><td><strong>5:00 PM</strong></td><td>Guests seated for dinner</td></tr>
<tr><td><strong>5:15 PM</strong></td><td>Couple's grand entrance</td></tr>
<tr><td><strong>5:30 PM</strong></td><td>First dance</td></tr>
<tr><td><strong>5:45 PM</strong></td><td>Toasts and speeches</td></tr>
<tr><td><strong>6:15 PM</strong></td><td>Dinner service begins</td></tr>
<tr><td><strong>7:30 PM</strong></td><td>Cake cutting</td></tr>
<tr><td><strong>7:45 PM</strong></td><td>Open dancing begins</td></tr>
<tr><td><strong>9:30 PM</strong></td><td>Bouquet toss</td></tr>
<tr><td><strong>10:00 PM</strong></td><td>Last dance</td></tr>
<tr><td><strong>10:15 PM</strong></td><td>Grand exit / send-off</td></tr>
<tr><td><strong>10:30 PM</strong></td><td>Vendor breakdown begins</td></tr>
<tr><td><strong>11:30 PM</strong></td><td>Final walkthrough and venue handoff</td></tr>
</table>`,
      },
      {
        heading: "Pro Tips for Better Timelines",
        content: `<ul>
<li><strong>Build in buffer time</strong> — Add 15-minute buffers between major transitions. Things always run long, especially hair and makeup, photo sessions, and dinner service.</li>
<li><strong>Create vendor-specific versions</strong> — The DJ doesn't need to know about hair and makeup. Send each vendor only the sections relevant to them, plus 30 minutes before and after their slot for context.</li>
<li><strong>Use drag-and-drop reordering</strong> — Plans change. When the florist calls and says they'll be an hour late, you need to shift everything downstream instantly — not re-type a spreadsheet.</li>
<li><strong>Export to PDF</strong> — Print a hard copy for your day-of binder. Digital tools fail (dead batteries, no signal). A printed timeline in a clipboard is your safety net.</li>
<li><strong>Share with the client</strong> — Clients in <strong>Houston, Phoenix, Minneapolis, and Tampa</strong> consistently say that seeing the timeline before the event is what made them feel most confident in their planner.</li>
<li><strong>Include contact info</strong> — Add the lead contact name and phone number for each vendor directly on the timeline. On event day, you don't have time to look up numbers.</li>
</ul>`,
      },
      {
        heading: "Spreadsheets vs. Dedicated Timeline Software",
        content: `<p>Many planners start with Excel or Google Sheets. It works — until it doesn't. Spreadsheets have no drag-and-drop reordering, no client sharing, no PDF export with your branding, and no connection to your vendor list or guest count.</p>
<p>Dedicated timeline software lets you:</p>
<ul>
<li>Drag to reorder items when plans change</li>
<li>Auto-calculate duration gaps and overlaps</li>
<li>Share a live, updating timeline with clients via a portal</li>
<li>Export branded PDFs for your day-of binder</li>
<li>Link timeline items to specific vendors</li>
</ul>
<p>The difference becomes obvious when you're managing 3–5 events simultaneously and each one has 40+ timeline items.</p>`,
      },
      {
        heading: "How SoiréeSpace Handles Day-of Timelines",
        content: `<p>SoiréeSpace includes a built-in timeline builder with <strong>drag-and-drop reordering</strong>, PDF export for day-of binders, and automatic sharing through your branded client portal.</p>
<p>Build your timeline once, drag to adjust when plans change, and export a beautiful PDF with your business branding. Your client sees the same timeline in real time through their portal — no email attachments, no version confusion.</p>
<p>The timeline connects to your vendor list and guest count, so everything stays synchronized. When you update the dinner time, everyone sees it.</p>
<p>Timeline management is included in both the <strong>$99 DIY plan</strong> and the Professional plan.</p>`,
      },
    ],
    cta: {
      heading: "Build Your First Day-of Timeline in Minutes",
      description:
        "Start your free trial and create a drag-and-drop timeline your vendors and clients will love. Export to PDF instantly.",
    },
  },

  {
    slug: "client-portal-for-event-planners",
    title: "How to Build a Client Portal That Wows Your Event Planning Clients",
    description:
      "Stop sending email attachments. Learn how a branded client portal improves client experience, reduces back-and-forth, and makes your event planning business look more professional.",
    keywords: [
      "client portal for event planners",
      "event planner client portal",
      "branded client portal",
      "share event details with clients",
      "wedding planner client experience",
      "event planning client communication",
      "client-facing event software",
      "event planner CRM portal",
      "how to share event plans with clients",
      "event client management",
    ],
    publishedAt: "2026-03-22",
    updatedAt: "2026-03-30",
    readingTime: "7 min read",
    category: "Client Experience",
    heroEmoji: "✨",
    sections: [
      {
        heading: "Your Clients Deserve Better Than Email Attachments",
        content: `<p>Think about the last time you sent a client an event update. You probably attached a PDF floor plan, a Word doc timeline, an Excel guest list, and maybe a mood board in a separate email. The client downloaded some of them, missed others, and replied asking for the same file you sent last week.</p>
<p>This isn't a client problem — it's a workflow problem. When event information is scattered across emails, Google Drive folders, and text messages, things get lost. Clients feel out of the loop. You spend hours answering questions that could be self-serve.</p>
<p>A <strong>client portal</strong> solves this by giving every client a single, branded destination where they can see everything about their event: the floor plan, timeline, guest list, contracts, invoices, mood boards, and messages. One link. Always up to date.</p>
<p>The best planners in <strong>New York, Los Angeles, Chicago, Nashville, and Atlanta</strong> have been using client portals for years. Now the technology is accessible to solo planners and small teams too.</p>`,
      },
      {
        heading: "What a Great Client Portal Includes",
        content: `<p>Not all client portals are equal. Here's what separates a professional experience from a basic shared folder:</p>
<ul>
<li><strong>Your branding</strong> — Your logo, brand color, and tagline should be front and center. The portal should feel like an extension of your business, not a generic software product.</li>
<li><strong>Event overview</strong> — Date, venue, guest count, and status at a glance. Clients should know exactly where things stand the moment they open the portal.</li>
<li><strong>Guest list with RSVP</strong> — Clients can add guests, track RSVPs, and manage meal choices and dietary needs without calling you.</li>
<li><strong>Timeline view</strong> — A clear, minute-by-minute schedule they can review and reference on event day.</li>
<li><strong>Contracts and e-signatures</strong> — Review and sign contracts directly in the portal. No printing, scanning, or mailing.</li>
<li><strong>Shared files</strong> — Contracts, photos, vendor proposals, and any other documents in one place.</li>
<li><strong>Mood boards</strong> — Inspiration images and color palettes so clients can visualize the aesthetic.</li>
<li><strong>Messaging</strong> — Direct chat between planner and client. No more digging through email threads for that one message about the linen color.</li>
</ul>`,
      },
      {
        heading: "How a Client Portal Saves You 5+ Hours Per Event",
        content: `<p>Here's where the time savings come from:</p>
<ul>
<li><strong>Fewer "where's that file?" emails</strong> — Everything is in the portal. You send the link once and never answer that question again.</li>
<li><strong>Self-serve guest management</strong> — Clients add their own guests, update RSVPs, and manage dietary needs. You review instead of data-entering.</li>
<li><strong>No version confusion</strong> — The portal always shows the latest version of the floor plan, timeline, and guest list. No more "which PDF is the current one?"</li>
<li><strong>Instant contract turnaround</strong> — Clients can review and sign contracts in the portal the same day you send the link. No printing, no mailing, no chasing signatures.</li>
<li><strong>Centralized communication</strong> — All messages in one thread, organized by event. Search for any conversation in seconds.</li>
</ul>
<p>Planners in <strong>Denver, Portland, San Diego, and Raleigh</strong> report saving 5–10 hours per event after switching to a portal-based workflow. Over 20 events a year, that's 100–200 hours back.</p>`,
      },
      {
        heading: "What Clients Actually Think About Portals",
        content: `<p>The number one factor in client referrals isn't the event itself — it's the <strong>planning experience</strong>. When clients feel informed, included, and impressed by your process, they tell their friends.</p>
<p>A branded client portal communicates three things:</p>
<ol>
<li><strong>Professionalism</strong> — "This planner has their act together." A polished portal with your branding signals that you run a serious business.</li>
<li><strong>Transparency</strong> — "I can see exactly what's happening." Clients who feel in the loop are calmer, more trusting, and easier to work with.</li>
<li><strong>Modern experience</strong> — "This feels like a premium service." In 2026, clients in <strong>Miami, Austin, Seattle, and Charlotte</strong> expect a digital experience. Emailing PDFs feels outdated by comparison.</li>
</ol>
<p>The result: higher satisfaction, more referrals, and the ability to charge premium rates because your service <em>feels</em> premium from the first interaction.</p>`,
      },
      {
        heading: "DIY Portals vs. Purpose-Built Solutions",
        content: `<p>Some planners try to build their own portal using a combination of Google Drive, Canva, Honeybook, and a website builder. It works in theory, but in practice:</p>
<ul>
<li>Clients need multiple logins or links</li>
<li>The branding is inconsistent across tools</li>
<li>You're paying for 4–5 separate subscriptions</li>
<li>Nothing is truly integrated — updating the guest list doesn't update the seating chart</li>
</ul>
<p>A purpose-built client portal, integrated into your planning software, eliminates all of these issues. One tool, one login, one brand experience.</p>`,
      },
      {
        heading: "How SoiréeSpace's Client Portal Works",
        content: `<p>Every event in SoiréeSpace gets a <strong>branded client portal</strong> with your logo, brand color, and tagline. Share a single link with your client — no account creation required.</p>
<p>From the portal, clients can:</p>
<ul>
<li>View and manage the guest list with RSVP tracking</li>
<li>See the day-of timeline in real time</li>
<li>Review and e-sign contracts with ESIGN Act compliance</li>
<li>Browse mood boards and color palettes</li>
<li>Download shared files (contracts, vendor proposals, photos)</li>
<li>Message you directly within the event</li>
</ul>
<p>Everything updates in real time. When you adjust the timeline or add a vendor, your client sees it immediately. No re-sending files, no version confusion.</p>
<p>The branded client portal is included in both the <strong>$99 DIY plan</strong> and the Professional plan.</p>`,
      },
    ],
    cta: {
      heading: "Give Your Clients a Portal They'll Rave About",
      description:
        "Start your free trial and share a branded client portal with your next event. Your logo, your colors, one link.",
    },
  },

  {
    slug: "smart-seating-chart-software-guide",
    title: "Smart Seating Chart Software: How to Seat 200+ Guests Without the Headache",
    description:
      "Automate your event seating arrangements with smart algorithms that handle VIP priority, group cohesion, and dietary needs. The complete guide for wedding and event planners in 2026.",
    keywords: [
      "seating chart software",
      "event seating arrangement tool",
      "wedding seating chart maker",
      "auto seating assignment",
      "smart seating algorithm",
      "event table assignment software",
      "seating plan for wedding reception",
      "guest seating chart tool",
      "how to make a seating chart",
      "seating chart for large events",
    ],
    publishedAt: "2026-03-25",
    updatedAt: "2026-03-30",
    readingTime: "8 min read",
    category: "Guest Management",
    heroEmoji: "🪑",
    sections: [
      {
        heading: "Why Seating Charts Are the Most Dreaded Task in Event Planning",
        content: `<p>Ask any planner what task they'd happily hand off to a robot, and "seating charts" wins every time. For a 200-guest wedding, you're juggling 20+ tables with constraints like:</p>
<ul>
<li>Keep the bride's college friends together but away from the groom's rowdy cousins</li>
<li>Uncle Jim and Aunt Karen are divorced — separate tables, opposite sides of the room</li>
<li>Table 4 needs three vegetarian meals and one gluten-free</li>
<li>The CEO should be near the stage but the intern shouldn't be at the VIP table</li>
<li>Two guests use wheelchairs — they need accessible seating near the exit</li>
</ul>
<p>Multiply this by 200 guests and you're spending an entire afternoon on a spreadsheet, moving names around like a puzzle that never quite fits. Planners in <strong>Dallas, Houston, Phoenix, and Orlando</strong> know this frustration well — large guest lists in large venues make manual seating nearly impossible.</p>`,
      },
      {
        heading: "The Manual Approach vs. Smart Seating",
        content: `<p><strong>Manual approach:</strong> Print the guest list, cut it into strips, arrange the strips on a table, shuffle for two hours, realize you forgot the plus-ones, start over. Some planners use sticky notes on a poster board. Others use Excel with color coding. All of them hate it.</p>
<p><strong>Smart seating approach:</strong> Import your guest list with tags (VIP, family, friend group, dietary needs), set your table sizes, define any must-sit-together and must-keep-apart rules, and let an algorithm generate the optimal arrangement in seconds. Review, tweak, done.</p>
<p>The difference isn't just time savings — it's <strong>better outcomes</strong>. An algorithm can evaluate thousands of possible arrangements and find one that satisfies the most constraints simultaneously. A human working with sticky notes can't do that.</p>`,
      },
      {
        heading: "What Makes a Seating Algorithm 'Smart'",
        content: `<p>Not all auto-seating tools are equal. A truly smart algorithm considers:</p>
<ul>
<li><strong>VIP priority</strong> — High-priority guests (family, hosts, key clients) get seated first at preferred tables near the stage or head table.</li>
<li><strong>Group cohesion</strong> — Guests tagged as a group (college friends, coworkers, family branch) are kept together at the same table or adjacent tables.</li>
<li><strong>Keep-together rules</strong> — Couples, families, and friend pairs should always be at the same table.</li>
<li><strong>Keep-apart rules</strong> — Divorced couples, feuding relatives, or guests with conflicting personalities are placed at distant tables.</li>
<li><strong>Dietary clustering</strong> — When possible, group vegetarian, vegan, kosher, or allergen-restricted guests together to simplify kitchen plating and service.</li>
<li><strong>Accessibility</strong> — Wheelchair users and guests with mobility needs are assigned to accessible seating positions automatically.</li>
<li><strong>Table balance</strong> — Fill tables evenly. Nothing looks worse than one table of 10 and one table of 3.</li>
</ul>
<p>Event planners in <strong>Boston, Chicago, San Francisco, and Atlanta</strong> managing large-scale events with complex social dynamics benefit most from smart seating — the more constraints, the more valuable the algorithm.</p>`,
      },
      {
        heading: "Step-by-Step: Creating a Smart Seating Chart",
        content: `<ol>
<li><strong>Build your guest list</strong> — Add every confirmed guest with their name, RSVP status, meal choice, dietary needs, and any plus-ones. Tag them by group (bride's family, groom's friends, corporate team A).</li>
<li><strong>Define your tables</strong> — On your floor plan, place tables and set the capacity for each. Round tables typically seat 8 or 10; banquet tables seat 12–16.</li>
<li><strong>Set rules</strong> — Add must-sit-together pairs (couples, specific friend groups) and must-keep-apart pairs. Mark VIP guests who need priority seating.</li>
<li><strong>Run the algorithm</strong> — Click once and the smart seating engine generates an optimized arrangement. Review the result on the floor plan — you'll see names on each table.</li>
<li><strong>Fine-tune manually</strong> — The algorithm gets you 90% there. Drag individual guests between tables to handle any edge cases the algorithm couldn't anticipate.</li>
<li><strong>Share with the client</strong> — Send the seating chart through your client portal for approval. The client can review each table and suggest changes.</li>
<li><strong>Print place cards</strong> — Export the final arrangement for your day-of team to set up place cards, escort cards, or a seating chart display.</li>
</ol>`,
      },
      {
        heading: "Seating Chart Best Practices for Large Events",
        content: `<p>Planners who manage 150+ guest events in <strong>New York, Los Angeles, Las Vegas, and Miami</strong> follow these rules:</p>
<ul>
<li><strong>Don't seat guests at a table where they know nobody</strong> — Even introverts need a conversation partner. Ensure every guest has at least one familiar face at their table.</li>
<li><strong>Put the bar and restroom path away from the head table</strong> — High-traffic areas create noise and disruption. Shield the head table from the flow.</li>
<li><strong>Use round tables for social events, banquet tables for corporate</strong> — Round tables encourage conversation because everyone faces each other. Banquet tables work better for panel-style events or dinner programs with a stage.</li>
<li><strong>Plan for no-shows</strong> — Expect 5–10% of RSVPs to not show up. Don't leave empty chairs conspicuously at half-empty tables. Have a plan to consolidate.</li>
<li><strong>Finalize seating last</strong> — Seating should be one of the last things you lock in, ideally 5–7 days before the event, after final RSVPs are in.</li>
<li><strong>Label tables by name, not number</strong> — "Table Magnolia" feels more elegant than "Table 7" and avoids the social hierarchy of numbered tables.</li>
</ul>`,
      },
      {
        heading: "How SoiréeSpace Handles Smart Seating",
        content: `<p>SoiréeSpace includes a <strong>smart seating algorithm</strong> that automatically assigns guests to tables based on VIP priority, group cohesion, keep-together rules, and dietary needs.</p>
<p>Your guest list connects directly to your floor plan. After running smart seating, you see guest names on each table in the 2D and 3D views. Drag to adjust, then share the result through your branded client portal for approval.</p>
<p>Guest management in SoiréeSpace also includes RSVP tracking, meal choice management, plus-one handling, and dietary need tagging — everything flows into the seating algorithm automatically.</p>
<p>Smart seating and guest management are included in both the <strong>$99 DIY plan</strong> and the Professional plan.</p>`,
      },
    ],
    cta: {
      heading: "Stop Shuffling Sticky Notes. Start Smart Seating.",
      description:
        "Start your free trial and let the algorithm handle the seating chart. You handle the applause.",
    },
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
