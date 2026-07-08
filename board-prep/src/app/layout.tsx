import "./globals.css";
import Toaster from "./_components/Toaster";

export const metadata = {
  title: "Board Prep Assistant",
  description: "Ингест → извлечение проверяемых фактов → синтез board packet",
};

// Set the saved theme before paint to avoid a flash.
const themeBootstrap = `try{var t=localStorage.getItem('bpa-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
