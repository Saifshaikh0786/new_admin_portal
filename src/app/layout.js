import "./globals.css";

export const metadata = {
  title: "Admin Portal",
  description: "Ed-tech Admin Platform",
  icons: {
    icon: '/logo.png',
  },
};

import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { GlobalLogger } from "@/components/GlobalLogger";
import { Toaster } from "react-hot-toast";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <GlobalLogger />
            <Toaster position="top-right" />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
