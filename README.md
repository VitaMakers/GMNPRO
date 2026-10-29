# GMN PRO

Ferramentas para o seu **Google Meu Negócio**: geotag de fotos, auditoria de
perfil e (em breve) agendamento de postagens.

## Ferramentas

- **Geotag de Fotos** (`/geotag`) — adiciona localização (GPS), título,
  descrição e palavras-chave no EXIF das fotos. Roda 100% no navegador: as
  imagens nunca são enviadas para nenhum servidor. Aceita JPG e PNG, processa
  em lote e baixa tudo em um ZIP.
- **Auditoria do Perfil** (`/auditoria`) — busca a empresa pelo nome, lê dados
  públicos do Google Maps (Places API) e devolve uma nota de 0 a 100 com um
  checklist e as prioridades. Exige a variável `GOOGLE_PLACES_API_KEY`
  (ver `.env.example`); sem ela, a página avisa que falta configurar a chave.
- **Agendamento de Postagens** — _planejado_. Calendário de postagens, fotos e
  vídeos com publicação automática. Depende da aprovação da API do Google
  Business Profile.

## Tecnologia

- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- `piexifjs` para gravar o EXIF/GPS no navegador
- `jszip` para o download em lote
- Geocodificação via Nominatim (OpenStreetMap), sem chave de API
- Armazenamento (contas, histórico de auditoria, agendamentos): Supabase
  _(a ser conectado quando a Auditoria e o Agendamento forem ligados)_

## Rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000.
