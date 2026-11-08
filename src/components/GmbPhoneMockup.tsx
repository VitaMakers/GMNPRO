export default function GmbPhoneMockup() {
  return (
    <div className="relative mx-auto w-[260px]">
      {/* Card flutuante: desempenho */}
      <div className="absolute -left-20 top-16 hidden w-44 rounded-2xl border border-border bg-surface/90 p-3 shadow-2xl backdrop-blur sm:block">
        <p className="text-[11px] text-muted">Visualizações (30d)</p>
        <p className="font-display text-xl font-bold">2.132</p>
        <p className="text-[11px] font-medium text-brand-2">▲ 18% vs. mês anterior</p>
      </div>
      {/* Card flutuante: avaliações */}
      <div className="absolute -right-16 bottom-20 hidden w-40 rounded-2xl border border-border bg-surface/90 p-3 shadow-2xl backdrop-blur sm:block">
        <p className="text-[11px] text-muted">Avaliações</p>
        <p className="font-display text-xl font-bold">4,9 ★</p>
        <p className="text-[11px] text-muted">+3 esta semana</p>
      </div>

      {/* Moldura do celular */}
      <div className="relative rounded-[2.2rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
        <div className="overflow-hidden rounded-[1.5rem] bg-white">
          {/* Capa */}
          <div className="relative h-24 bg-gradient-to-br from-emerald-500 to-teal-700">
            <div className="absolute left-3 top-2 rounded-full bg-black/25 px-2 py-0.5 text-[10px] text-white">
              9:41
            </div>
          </div>
          {/* Info */}
          <div className="px-3 pb-3">
            <div className="-mt-6 flex items-end gap-2">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white text-xl shadow ring-1 ring-black/5">
                🏪
              </div>
            </div>
            <h3 className="mt-2 text-sm font-semibold text-neutral-900">Minha Empresa</h3>
            <p className="text-[11px] text-neutral-500">Serviços locais · Aberto agora</p>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-700">
              <span className="font-semibold">4,9</span>
              <span className="text-amber-500">★★★★★</span>
              <span className="text-neutral-400">(128)</span>
            </div>

            {/* Ações */}
            <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[10px] text-blue-600">
              {[
                { i: "📞", t: "Ligar" },
                { i: "🧭", t: "Rotas" },
                { i: "🔖", t: "Salvar" },
                { i: "🌐", t: "Site" },
              ].map((a) => (
                <div key={a.t} className="rounded-lg py-1">
                  <div className="text-base">{a.i}</div>
                  {a.t}
                </div>
              ))}
            </div>

            {/* Fotos */}
            <div className="mt-3 grid grid-cols-3 gap-1">
              <div className="aspect-square rounded-md bg-gradient-to-br from-emerald-200 to-emerald-400" />
              <div className="aspect-square rounded-md bg-gradient-to-br from-amber-200 to-amber-400" />
              <div className="aspect-square rounded-md bg-gradient-to-br from-sky-200 to-sky-400" />
            </div>

            {/* Post */}
            <div className="mt-3 rounded-lg border border-neutral-200 p-2">
              <p className="text-[10px] font-semibold text-neutral-700">Novidade</p>
              <p className="text-[10px] text-neutral-500">Oferta da semana — agende já!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
