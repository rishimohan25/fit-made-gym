import "./globals.css";

export const metadata = {
  title: "FIT MADE GYM • Today's Workout | Stay Fit. Be on Top",
  description:
    "Official daily workout protocol for FIT MADE GYM (ESTD 2017). Scan QR code to view today's warm-ups, exercises, rep counts, cardio, and human muscle infographics. Stay Fit. Be on Top.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#090d16",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
