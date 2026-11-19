import type { NextConfig } from "next";

// Cabeçalhos de segurança aplicados a todas as respostas.
// Protegem contra clickjacking, sniffing de tipo, vazamento de referência e
// forçam HTTPS. (CSP fica de fora por enquanto: exige ajuste fino para não
// quebrar Stripe/Supabase/Next; pode ser adicionada depois com teste.)
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
