import cors from 'cors'
import express, { type Express } from 'express'
import { z } from 'zod'
import { fail, ok } from './envelope.js'
import type { GameRepository } from './repository.js'

const createPlayerSchema = z.object({
  name: z.string().trim().min(1).max(16),
  clubId: z.string().trim().min(1),
})

const createMatchSchema = z.object({
  opponentId: z.string().trim().min(1),
  teamGoals: z.number().int().min(0).max(99),
  opponentGoals: z.number().int().min(0).max(99),
  rating: z.number().min(0).max(10),
  playerGoals: z.number().int().min(0).max(99),
})

export const createApp = (repository: GameRepository): Express => {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json(ok({ status: 'up' }))
  })

  app.post('/api/players', async (req, res) => {
    const parsed = createPlayerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json(fail('Dados inválidos: informe name (1-16 chars) e clubId.'))
      return
    }
    const player = await repository.createPlayer(parsed.data)
    res.status(201).json(ok(player))
  })

  app.get('/api/players/:id', async (req, res) => {
    const player = await repository.findPlayerById(req.params.id)
    if (!player) {
      res.status(404).json(fail('Jogador não encontrado.'))
      return
    }
    res.json(ok(player))
  })

  app.post('/api/players/:id/matches', async (req, res) => {
    const player = await repository.findPlayerById(req.params.id)
    if (!player) {
      res.status(404).json(fail('Jogador não encontrado.'))
      return
    }
    const parsed = createMatchSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json(fail('Dados inválidos: confira placar, nota e adversário.'))
      return
    }
    const match = await repository.createMatch(player.id, parsed.data)
    res.status(201).json(ok(match))
  })

  app.get('/api/players/:id/matches', async (req, res) => {
    const player = await repository.findPlayerById(req.params.id)
    if (!player) {
      res.status(404).json(fail('Jogador não encontrado.'))
      return
    }
    res.json(ok(await repository.findMatchesByPlayer(player.id)))
  })

  app.get('/api/leaderboard', async (req, res) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    res.json(ok(await repository.leaderboard(limit)))
  })

  return app
}
