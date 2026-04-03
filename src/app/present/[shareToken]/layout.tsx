import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Event Presentation | EventSpace",
  description: "View your event floor plan in 3D",
};

export default function PresentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
