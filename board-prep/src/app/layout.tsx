export const metadata = {
  title: "Board Prep Assistant",
  description: "Ингест → извлечение проверяемых фактов → синтез board packet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
