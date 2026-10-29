/**
 * Checklist de otimização do Google Meu Negócio.
 * Auto-avaliação gratuita (sem API): o usuário marca o que já faz e recebe
 * uma nota de 0 a 100 com as prioridades.
 */

export interface ChecklistItem {
  id: string;
  label: string;
  tip: string;
  weight: number;
}

export interface ChecklistCategory {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export const CHECKLIST: ChecklistCategory[] = [
  {
    id: "info",
    title: "Informações básicas",
    items: [
      { id: "nome", label: "Nome igual ao do negócio real (sem palavras-chave extras)", tip: "Use exatamente o nome da fachada; encher de palavra-chave viola as regras e pode suspender o perfil.", weight: 6 },
      { id: "cat_principal", label: "Categoria principal específica e correta", tip: "Escolha a categoria mais específica possível — é um dos fatores que mais pesam no ranqueamento local.", weight: 8 },
      { id: "cat_secundarias", label: "Categorias secundárias preenchidas", tip: "Adicione todas as categorias que descrevem seus serviços.", weight: 5 },
      { id: "endereco", label: "Endereço ou área de atendimento corretos", tip: "Mantenha o endereço idêntico ao do site e redes (consistência de NAP).", weight: 5 },
      { id: "horarios", label: "Horários preenchidos, incluindo feriados", tip: "Horários atualizados evitam frustração e melhoram a exibição nas buscas.", weight: 6 },
      { id: "telefone", label: "Telefone de contato cadastrado", tip: "Um telefone local aumenta a confiança e facilita o contato.", weight: 4 },
      { id: "site", label: "Site ou link cadastrado", tip: "Mesmo uma página simples dá autoridade e cliques.", weight: 4 },
      { id: "atributos", label: "Atributos preenchidos (wi-fi, acessibilidade, etc.)", tip: "Atributos ajudam o cliente a decidir e o Google a entender o negócio.", weight: 3 },
    ],
  },
  {
    id: "conteudo",
    title: "Conteúdo e fotos",
    items: [
      { id: "descricao", label: "Descrição completa com palavras-chave naturais", tip: "Descreva o negócio com os termos que os clientes buscam, de forma natural.", weight: 5 },
      { id: "foto_capa", label: "Foto de capa e logo definidas", tip: "Capa e logo passam a primeira impressão do perfil.", weight: 4 },
      { id: "fotos_variadas", label: "Fotos de fachada, interior, produtos e equipe", tip: "Variedade de fotos reais ajuda o cliente e o reconhecimento pelo Google.", weight: 6 },
      { id: "fotos_recentes", label: "Fotos novas adicionadas no último mês", tip: "Perfis com fotos recentes e frequentes performam melhor.", weight: 6 },
      { id: "fotos_otimizadas", label: "Fotos otimizadas (boa resolução e nome de arquivo)", tip: "Use a ferramenta de Geotag para preparar as fotos antes de subir.", weight: 3 },
    ],
  },
  {
    id: "avaliacoes",
    title: "Avaliações",
    items: [
      { id: "pedir", label: "Peço avaliações ativamente aos clientes", tip: "Crie uma rotina: link e QR code para pedir avaliação no pós-venda.", weight: 7 },
      { id: "responder", label: "Respondo todas as avaliações (boas e ruins)", tip: "Responder mostra cuidado e é visto positivamente pelo Google e clientes.", weight: 6 },
      { id: "nota", label: "Nota média acima de 4,5", tip: "Mantenha a qualidade e peça avaliações a clientes satisfeitos.", weight: 4 },
      { id: "volume", label: "Volume de avaliações crescente", tip: "Constância vale mais que picos: peça avaliações toda semana.", weight: 4 },
    ],
  },
  {
    id: "postagens",
    title: "Postagens e interação",
    items: [
      { id: "posts", label: "Faço postagens (novidades/ofertas) com frequência", tip: "Postar semanalmente mantém o perfil ativo e aparece nas buscas.", weight: 6 },
      { id: "botao", label: "Uso botão de ação nas postagens (ligar, reservar, saiba mais)", tip: "O botão transforma visualização em contato.", weight: 3 },
      { id: "qa", label: "Perguntas e respostas (Q&A) preenchidas", tip: "Antecipe dúvidas comuns criando e respondendo perguntas no perfil.", weight: 3 },
      { id: "mensagens", label: "Mensagens ativadas e respondidas rapidamente", tip: "Respostas rápidas melhoram a experiência e a reputação.", weight: 3 },
    ],
  },
];

export const TOTAL_WEIGHT = CHECKLIST.reduce(
  (sum, cat) => sum + cat.items.reduce((s, i) => s + i.weight, 0),
  0,
);

export function scoreFrom(checked: Record<string, boolean>): number {
  let got = 0;
  for (const cat of CHECKLIST) {
    for (const item of cat.items) {
      if (checked[item.id]) got += item.weight;
    }
  }
  return Math.round((got / TOTAL_WEIGHT) * 100);
}

export function priorities(checked: Record<string, boolean>): ChecklistItem[] {
  const pending: ChecklistItem[] = [];
  for (const cat of CHECKLIST) {
    for (const item of cat.items) {
      if (!checked[item.id]) pending.push(item);
    }
  }
  return pending.sort((a, b) => b.weight - a.weight);
}
