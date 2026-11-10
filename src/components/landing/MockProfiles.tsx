const PROFILES = [
  { name: "Buffet Vita Sorocaba", meta: "Posts, fotos e avaliações" },
  { name: "Padaria Pão Nosso", meta: "Posts, fotos e avaliações" },
  { name: "Clínica Sorriso", meta: "Posts, fotos e avaliações" },
  { name: "Auto Center Vale", meta: "Posts, fotos e avaliações" },
];

export default function MockProfiles() {
  return (
    <div className="rounded-3xl border border-border bg-white p-5 card-soft">
      <p className="text-base font-semibold">Conecte seus perfis do Google</p>
      <p className="text-sm text-muted">Todos os seus perfis, numa conta só.</p>
      <div className="mt-4 space-y-2">
        {PROFILES.map((p, i) => (
          <div
            key={p.name}
            className="fadeup flex items-center justify-between rounded-2xl border border-border bg-surface-2 px-4 py-3"
            style={{ animationDelay: `${i * 140}ms` }}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-sm font-bold text-brand-2">
                {p.name[0]}
              </span>
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted">{p.meta}</p>
              </div>
            </div>
            <span className="flex items-center gap-2">
              <span className="hidden text-xs font-medium text-brand-2 sm:inline">Conectado</span>
              <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-brand">
                <span className="ml-auto mr-0.5 h-5 w-5 rounded-full bg-white" />
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
