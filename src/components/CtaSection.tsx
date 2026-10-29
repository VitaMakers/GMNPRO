export default function CtaSection() {
  return (
    <section className="mt-12 rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 to-surface p-6 text-center">
      <h2 className="text-xl font-bold">Quer ajuda profissional com seu Google Meu Negócio?</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
        Cuidamos do seu perfil com foco em ranqueamento e geração de contatos:
        otimização, fotos, avaliações e postagens.
      </p>
      <a
        href="mailto:contato@vitamakers.com.br?subject=Quero%20ajuda%20com%20meu%20Google%20Meu%20Negócio"
        className="mt-5 inline-block rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Falar com a VitaMakers
      </a>
    </section>
  );
}
