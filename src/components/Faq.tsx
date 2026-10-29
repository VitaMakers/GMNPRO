export interface FaqItem {
  q: string;
  a: string;
}

export default function Faq({ items }: { items: FaqItem[] }) {
  return (
    <section className="mt-12">
      <h2 className="mb-5 text-xl font-bold">Perguntas frequentes</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border border-border bg-surface p-4"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
              {item.q}
              <span className="text-muted transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
