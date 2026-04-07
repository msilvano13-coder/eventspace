import type { Metadata } from "next";
import { Playfair_Display, Inter, Caveat } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import PostHogProvider from "@/components/providers/PostHogProvider";
import ErrorToast from "@/components/ui/ErrorToast";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-hand",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://soireespace.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SoiréeSpace — Event Planning Software for Professional Planners",
    template: "%s | SoiréeSpace",
  },
  description:
    "Plan weddings, galas, and corporate events with interactive floor plans, vendor management, guest tracking, contracts, and a branded client portal. Try free for 30 days.",
  keywords: [
    "event planning software",
    "wedding planner tool",
    "event management platform",
    "floor plan designer",
    "vendor management",
    "guest list manager",
    "client portal for event planners",
    "event planner CRM",
    "wedding planning app",
    "event coordination software",
  ],
  authors: [{ name: "SoiréeSpace" }],
  creator: "SoiréeSpace",
  publisher: "SoiréeSpace",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "SoiréeSpace",
    title: "SoiréeSpace — Event Planning Software for Professional Planners",
    description:
      "Plan weddings, galas, and corporate events with interactive floor plans, vendor management, guest tracking, contracts, and a branded client portal.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SoiréeSpace — Event Planning Software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SoiréeSpace — Event Planning Software for Professional Planners",
    description:
      "Interactive floor plans, vendor management, guest tracking, contracts, and a branded client portal. Try free for 30 days.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SoiréeSpace",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Event planning software with interactive floor plans, vendor management, guest tracking, contracts, and a branded client portal.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Try free for 30 days",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "127",
    },
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${playfair.variable} ${inter.variable} ${caveat.variable} font-body antialiased`}
      >
        <PostHogProvider>{children}</PostHogProvider>
        <ErrorToast />
        <Analytics />
      </body>
    </html>
  );
}
