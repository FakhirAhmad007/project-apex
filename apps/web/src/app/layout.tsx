import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crust Issues — Fresh Bakes, Delivered",
  description: "AI-powered multi-branch bakery ordering, admin dashboard, and demand forecasting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
