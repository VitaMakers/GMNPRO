const AVATARS = [
  { src: "/clients/janoski.jpg", bg: "bg-white", alt: "Janoski Lagos & Carpas" },
  { src: "/clients/espetinhos-zan.png", bg: "bg-white", alt: "Espetinhos do Zan" },
  { src: "/clients/horse-bbq.jpg", bg: "bg-white", alt: "Horse BBQ" },
  { src: "/clients/facilitoy.png", bg: "bg-[#0b1220]", alt: "Facilitoy Sorocaba" },
];

export default function SocialProof() {
  return (
    <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center justify-center gap-3 sm:flex-row">
      <div className="flex -space-x-3">
        {AVATARS.map((a) => (
          <span
            key={a.src}
            className={`grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-background ${a.bg}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.src} alt={a.alt} className="h-full w-full object-contain p-0.5" />
          </span>
        ))}
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-bold text-white ring-2 ring-background">
          +50
        </span>
      </div>
      <p className="text-center text-sm text-muted sm:text-left">
        Empresas de vários segmentos já confiam no{" "}
        <span className="font-semibold text-foreground">GMN PRO</span>
      </p>
    </div>
  );
}
