/**
 * Criptografia simétrica (AES-256-GCM) para guardar segredos do usuário
 * (como a chave de IA própria) de forma protegida no banco.
 * A chave mestra vem da variável de ambiente ENCRYPTION_KEY.
 */

import crypto from "crypto";

function masterKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error("ENCRYPTION_KEY não configurada no ambiente.");
  // Deriva 32 bytes de qualquer segredo (independe do tamanho informado).
  return crypto.createHash("sha256").update(secret).digest();
}

/** Cifra um texto e devolve "v1:<base64(iv|tag|ciphertext)>". */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return "v1:" + Buffer.concat([iv, tag, ct]).toString("base64");
}

/** Decifra um valor gerado por encryptSecret. Valores antigos em texto puro
 *  (sem o prefixo "v1:") são devolvidos como estão, por compatibilidade. */
export function decryptSecret(payload: string): string {
  if (!payload.startsWith("v1:")) return payload;
  const raw = Buffer.from(payload.slice(3), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ct = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
