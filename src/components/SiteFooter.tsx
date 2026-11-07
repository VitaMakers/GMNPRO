import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <div className="font-display font-semibold">
            GMN <span className="text-brand-2">PRO</span>
          </div>
          <p className="mt-3 text-sm text-muted">
            Ferramentas gratuitas para otimizar o seu Google Meu Negócio.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Ferramentas</p>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/geotag" className="hover:text-foreground">Geotag de Fotos</Link></li>
            <li><Link href="/checklist" className="hover:text-foreground">Checklist GMB</Link></li>
            <li><Link href="/auditoria" className="hover:text-foreground">Auditoria do Perfil</Link></li>
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
        © {new Date().getFullYear()} Grupo Vita · GMN PRO
      </div>
    </footer>
  );
}
