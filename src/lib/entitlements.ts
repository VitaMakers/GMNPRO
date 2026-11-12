// Define o que cada plano (tier) libera. É a fonte única da separação
// Agência × Dono de negócio. Recursos de agência NUNCA entram no Essencial.

export type Tier = "essencial" | "agencia2" | "agencia4";
export type Cycle = "mensal" | "anual";

export interface Entitlements {
  tier: Tier;
  label: string;
  isAgency: boolean;
  maxProfiles: number | null; // null = ilimitado
  maxUsers: number;
  geoGrid: boolean;
  whiteLabelReport: boolean;
  monthlyCredits: number; // créditos de geo-grid inclusos por mês
}

export const ENTITLEMENTS: Record<Tier, Entitlements> = {
  essencial: {
    tier: "essencial",
    label: "Essencial",
    isAgency: false,
    maxProfiles: 3,
    maxUsers: 1,
    geoGrid: false,
    whiteLabelReport: false,
    monthlyCredits: 0,
  },
  agencia2: {
    tier: "agencia2",
    label: "Agência 2",
    isAgency: true,
    maxProfiles: null,
    maxUsers: 2,
    geoGrid: true,
    whiteLabelReport: true,
    monthlyCredits: 500,
  },
  agencia4: {
    tier: "agencia4",
    label: "Agência 4",
    isAgency: true,
    maxProfiles: null,
    maxUsers: 4,
    geoGrid: true,
    whiteLabelReport: true,
    monthlyCredits: 500,
  },
};

/** Entitlements de um tier; cai em Essencial se desconhecido (segurança). */
export function entitlementsFor(tier?: string | null): Entitlements {
  return ENTITLEMENTS[(tier as Tier) ?? "essencial"] ?? ENTITLEMENTS.essencial;
}

/** Admin tem tudo liberado. */
export const ADMIN_ENTITLEMENTS: Entitlements = {
  tier: "agencia4",
  label: "Admin",
  isAgency: true,
  maxProfiles: null,
  maxUsers: 999,
  geoGrid: true,
  whiteLabelReport: true,
  monthlyCredits: 500,
};
