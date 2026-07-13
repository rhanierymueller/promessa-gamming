# Promessa API

Esqueleto do backend do Promessa — Express + TypeScript com envelope padrão
(`{ success, data, error }`), validação Zod e repositório trocável
(memória hoje; banco/Supabase quando houver deploy).

## Rodar

```bash
cd server
npm install
npm run dev      # http://localhost:3001
npm test
```

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Status do serviço |
| POST | `/api/players` | Cria jogador `{ name, clubId }` |
| GET | `/api/players/:id` | Busca jogador |
| POST | `/api/players/:id/matches` | Registra resultado de partida |
| GET | `/api/players/:id/matches` | Lista partidas do jogador |
| GET | `/api/leaderboard?limit=10` | Ranking por nota média |

## Estado

O front ainda NÃO consome a API (save é local). Integração planejada junto com
as ligas entre amigos (Fase 3) — o contrato acima já cobre cadastro, histórico
e ranking.
