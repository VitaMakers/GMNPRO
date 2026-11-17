// URL de instalação da extensão do Chrome (GMN Profile — Pré-análise).
// Por padrão aponta para a página oficial na Chrome Web Store.
// Pode ser sobrescrita pela variável de ambiente NEXT_PUBLIC_EXTENSION_URL
// (ex.: para apontar para uma versão de teste/beta).
export const EXTENSION_STORE_URL =
  "https://chromewebstore.google.com/detail/gmn-profile-%E2%80%94-pr%C3%A9-an%C3%A1lise/helmgdpaknlbbolpmjkklbhfgdalgmof?hl=pt-br";

/** URL final usada nos botões "Instalar extensão". */
export const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || EXTENSION_STORE_URL;
