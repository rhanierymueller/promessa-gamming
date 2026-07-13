import request from 'supertest'
import { describe, expect, test } from 'vitest'
import { createApp } from './app.js'
import { createInMemoryRepository } from './repository.js'

const makeApp = () => createApp(createInMemoryRepository())

const createPlayer = async (app: ReturnType<typeof makeApp>, name = 'Rhany') => {
  const response = await request(app).post('/api/players').send({ name, clubId: 'real-vila' })
  return response.body.data as { id: string }
}

describe('POST /api/players', () => {
  test('cria jogador válido com envelope de sucesso', async () => {
    // Arrange
    const app = makeApp()

    // Act
    const response = await request(app).post('/api/players').send({ name: 'Rhany', clubId: 'real-vila' })

    // Assert
    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.name).toBe('Rhany')
    expect(response.body.data.id).toBeTruthy()
    expect(response.body.error).toBeNull()
  })

  test('rejeita corpo inválido com 400 e mensagem clara', async () => {
    // Arrange
    const app = makeApp()

    // Act
    const response = await request(app).post('/api/players').send({ name: '' })

    // Assert
    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.error).toContain('inválidos')
  })
})

describe('GET /api/players/:id', () => {
  test('encontra jogador criado e devolve 404 para desconhecido', async () => {
    // Arrange
    const app = makeApp()
    const player = await createPlayer(app)

    // Act
    const found = await request(app).get(`/api/players/${player.id}`)
    const missing = await request(app).get('/api/players/nao-existe')

    // Assert
    expect(found.status).toBe(200)
    expect(found.body.data.id).toBe(player.id)
    expect(missing.status).toBe(404)
    expect(missing.body.success).toBe(false)
  })
})

describe('matches e leaderboard', () => {
  const validMatch = {
    opponentId: 'mare-rubra',
    teamGoals: 2,
    opponentGoals: 1,
    rating: 8.2,
    playerGoals: 2,
  }

  test('registra partida e lista pelo jogador', async () => {
    // Arrange
    const app = makeApp()
    const player = await createPlayer(app)

    // Act
    const created = await request(app).post(`/api/players/${player.id}/matches`).send(validMatch)
    const listed = await request(app).get(`/api/players/${player.id}/matches`)

    // Assert
    expect(created.status).toBe(201)
    expect(listed.body.data).toHaveLength(1)
    expect(listed.body.data[0].rating).toBe(8.2)
  })

  test('rejeita partida com nota fora da escala', async () => {
    // Arrange
    const app = makeApp()
    const player = await createPlayer(app)

    // Act
    const response = await request(app)
      .post(`/api/players/${player.id}/matches`)
      .send({ ...validMatch, rating: 15 })

    // Assert
    expect(response.status).toBe(400)
  })

  test('leaderboard ordena por nota média', async () => {
    // Arrange
    const app = makeApp()
    const ace = await createPlayer(app, 'Craque')
    const rookie = await createPlayer(app, 'Novato')
    await request(app).post(`/api/players/${ace.id}/matches`).send({ ...validMatch, rating: 9.5 })
    await request(app).post(`/api/players/${rookie.id}/matches`).send({ ...validMatch, rating: 6.0 })

    // Act
    const response = await request(app).get('/api/leaderboard')

    // Assert
    expect(response.body.data.map((entry: { name: string }) => entry.name)).toEqual(['Craque', 'Novato'])
  })
})
