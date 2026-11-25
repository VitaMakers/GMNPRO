/**
 * Mensagem de boas-vindas enviada por WhatsApp (do nosso número de suporte)
 * para a pessoa assim que ela se cadastra e entra no período de teste.
 */
export function welcomeWhatsappMessage(name?: string): string {
  const nome = (name ?? "").trim().split(/\s+/)[0];
  const ola = nome ? `Olá, ${nome}! ` : "Olá! ";
  return (
    `${ola}Que alegria ter você no *GMN Profile*! 🎉\n\n` +
    `Ficamos muito felizes com o seu cadastro. Aproveite bastante o seu *período de teste* ` +
    `para explorar todos os recursos. 🚀\n\n` +
    `Estamos à disposição para ajudar em qualquer dúvida — *este é o seu canal de suporte oficial*. ` +
    `É só chamar aqui! 💬💚`
  );
}
