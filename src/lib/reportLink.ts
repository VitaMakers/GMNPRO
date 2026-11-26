/**
 * Link público do relatório com o nome da empresa:
 *   /relatorio/<nome-da-empresa>-<token>
 * O token tem sempre 12 caracteres (9 bytes em base64url) e fica no FINAL,
 * então links antigos (/relatorio/<token>) continuam funcionando.
 */
export const REPORT_TOKEN_LEN = 12;

export function reportSlug(name: string | null | undefined): string {
  return (name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export function reportPath(token: string, businessName?: string | null): string {
  const slug = reportSlug(businessName);
  return `/relatorio/${slug ? `${slug}-` : ""}${token}`;
}

/** Extrai o token do parâmetro da URL (com ou sem o nome na frente). */
export function tokenFromParam(param: string): string {
  return param.length > REPORT_TOKEN_LEN ? param.slice(-REPORT_TOKEN_LEN) : param;
}
