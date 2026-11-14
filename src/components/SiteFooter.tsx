import Link from "next/link";
import { BrandMark, BrandWordmark } from "@/components/BrandLogo";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <div className="inline-flex items-center gap-2">
            <BrandMark className="h-6 w-auto" />
            <BrandWordmark className="text-base" />
          </div>
          <p className="mt-3 text-sm text-muted">
            A plataforma completa para otimizar e crescer o seu Google Meu Negócio.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Produto</p>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/recursos" className="hover:text-foreground">Recursos</Link></li>
            <li><Link href="/entrar" className="hover:text-foreground">Entrar</Link></li>
            <li><Link href="/entrar?signup=1" className="hover:text-foreground">Criar conta</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Contato &amp; Legal</p>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <a href="mailto:contato@vitamakers.com.br" className="hover:text-foreground">
                contato@vitamakers.com.br
              </a>
            </li>
            <li><Link href="/privacidade" className="hover:text-foreground">Política de Privacidade</Link></li>
            <li><Link href="/termos" className="hover:text-foreground">Termos de Uso</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} Grupo Vita · GMN Profile
      </div>
    </footer>
  );
}
