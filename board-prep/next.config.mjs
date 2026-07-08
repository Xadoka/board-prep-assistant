/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse / mammoth / xlsx are server-only; keep them out of the client bundle.
  serverExternalPackages: ["pdf-parse", "mammoth", "xlsx", "mailparser", "pg"],
};

export default nextConfig;
