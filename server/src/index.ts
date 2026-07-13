import { createApp } from './app.js'
import { createInMemoryRepository } from './repository.js'

const PORT = Number(process.env.PORT) || 3001

const app = createApp(createInMemoryRepository())

app.listen(PORT, () => {
  process.stdout.write(`Promessa API ouvindo em http://localhost:${PORT}\n`)
})
