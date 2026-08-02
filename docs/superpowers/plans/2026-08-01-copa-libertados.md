# Copa Libertados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar a Copa Libertados — competição continental de clubes com 32 times, grupos e mata-mata em ida e volta, disputada de abril a setembro em paralelo com a Série A.

**Architecture:** Um catálogo novo de clubes sul-americanos (`src/data/continentalClubs.ts`) alimenta um motor próprio em `src/engine/libertados/`, separado do torneio de seleções porque ida e volta não se mistura com jogo único. O calendário passa a ter dois ritmos (semanal sem Libertados, quinzenal com) e uma função que decide qual competição joga primeiro. A UI espelha o que já existe para a seleção: aba própria durante o torneio, cerimônia de entrada e taça na estante.

**Tech Stack:** TypeScript, React 19, Vite, vitest. Sem dependências novas.

## Global Constraints

- **Spec:** [docs/superpowers/specs/2026-08-01-copa-libertados-design.md](../specs/2026-08-01-copa-libertados-design.md)
- **Imutabilidade:** nada de mutação. Toda função devolve objeto novo. O RNG é o de `src/engine/rng.ts`, estilo imutável (`{ value, next }`).
- **Determinismo:** mesma seed = mesmo resultado, sempre. Nenhum `Math.random()` dentro do motor.
- **Nomes de clube:** nunca uma marca de clube real. `clubs.test.ts` já tem uma lista de marcas proibidas; o mesmo teste passa a valer para o catálogo continental.
- **Testes:** vitest, arquivo `.test.ts` ao lado do módulo, padrão Arrange-Act-Assert, nomes descritivos em português.
- **Comandos:** `npm test` roda tudo; `npx vitest run <caminho>` roda um arquivo; `npm run build` faz typecheck + build.
- **Idioma:** comentários, nomes de teste e textos de UI em português, com acentuação correta.
- **Tamanho de arquivo:** 200-400 linhas típico. Se um arquivo passar disso, extrair.

---

### Task 1: Catálogo de clubes sul-americanos

**Files:**
- Create: `src/data/continentalClubs.ts`
- Create: `src/data/continentalClubs.test.ts`
- Modify: `src/data/nationalNames.ts` (adicionar Peru, Bolívia, Venezuela)
- Modify: `src/data/clubs.ts:89-90` (`clubById` procura nos dois catálogos)
- Modify: `src/data/nations.ts:31-69` (adicionar Peru, Bolívia, Venezuela em `NATIONS`)
- Modify: `src/engine/squad/players.ts:244-262` (`nationalityOf` reconhece clube continental)
- Modify: `src/engine/squad/players.test.ts` (ou criar, se não existir)

**Interfaces:**
- Consumes: `Club` de `src/data/clubs.ts`; `NATIONS` de `src/data/nations.ts`
- Produces:
  - `ContinentalClub extends Club { readonly nationId: string }`
  - `CONTINENTAL_CLUBS: readonly ContinentalClub[]` (36 clubes)
  - `continentalClubById(id: string): ContinentalClub | null`
  - `CONTINENTAL_NATIONS: readonly string[]` (9 ids de país)
  - `clubById(id)` passa a achar clube continental

- [ ] **Step 1: Escrever o teste do catálogo**

Criar `src/data/continentalClubs.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { CONTINENTAL_CLUBS, CONTINENTAL_NATIONS, continentalClubById } from './continentalClubs'
import { CLUBS, clubById } from './clubs'
import { nationById } from './nations'

const REAL_CLUB_MARKS = [
  'boca', 'river plate', 'racing', 'independiente', 'san lorenzo', 'vélez', 'velez',
  'estudiantes', 'newell', 'rosario central', 'talleres', 'lanús', 'lanus',
  'peñarol', 'penarol', 'nacional', 'danubio', 'defensor', 'liverpool', 'wanderers',
  'olimpia', 'cerro porteño', 'cerro porteno', 'libertad', 'guaraní', 'guarani',
  'colo-colo', 'colo colo', 'universidad de chile', 'católica', 'catolica', 'cobreloa',
  'huachipato', 'palestino', 'audax', 'unión española', 'union espanola',
  'millonarios', 'américa de cali', 'america de cali', 'junior', 'santa fe',
  'deportivo cali', 'once caldas', 'tolima', 'bucaramanga', 'pereira',
  'barcelona', 'emelec', 'liga de quito', 'independiente del valle', 'aucas', 'delfín', 'delfin',
  'alianza lima', 'universitario', 'sporting cristal', 'cienciano', 'melgar', 'binacional',
  'bolívar', 'bolivar', 'the strongest', 'oriente petrolero', 'blooming', 'wilstermann',
  'always ready', 'guabirá', 'guabira',
  'caracas fc', 'táchira', 'tachira', 'zamora', 'deportivo lara', 'carabobo', 'monagas',
  'metropolitanos', 'portuguesa', 'aragua', 'mineros',
]

describe('CONTINENTAL_CLUBS (catálogo sul-americano)', () => {
  test('tem 36 clubes com ids e abreviações únicos', () => {
    expect(CONTINENTAL_CLUBS.length).toBe(36)
    expect(new Set(CONTINENTAL_CLUBS.map((c) => c.id)).size).toBe(36)
    expect(new Set(CONTINENTAL_CLUBS.map((c) => c.abbr)).size).toBe(36)
  })

  test('nenhum id ou abreviação colide com a pirâmide brasileira', () => {
    const brasileiros = new Set(CLUBS.map((c) => c.id))
    const siglas = new Set(CLUBS.map((c) => c.abbr))
    for (const club of CONTINENTAL_CLUBS) {
      expect(brasileiros.has(club.id)).toBe(false)
      expect(siglas.has(club.abbr)).toBe(false)
      expect(club.id.startsWith('sa-')).toBe(true)
    }
  })

  test('são nove países com quatro clubes cada, todos existentes em NATIONS', () => {
    expect(CONTINENTAL_NATIONS.length).toBe(9)
    for (const nationId of CONTINENTAL_NATIONS) {
      expect(nationById(nationId)).not.toBeNull()
      expect(CONTINENTAL_CLUBS.filter((c) => c.nationId === nationId)).toHaveLength(4)
    }
  })

  test('a força cobre quatro potes de oito num torneio de 32', () => {
    const porForca = (valor: number) => CONTINENTAL_CLUBS.filter((c) => c.strength === valor).length
    expect(porForca(5)).toBe(8)
    expect(porForca(4)).toBe(10)
    expect(porForca(3)).toBe(10)
    expect(porForca(2)).toBe(8)
  })

  test('nenhum nome contém marca de clube real (regra jurídica do projeto)', () => {
    for (const club of CONTINENTAL_CLUBS) {
      const haystack = `${club.name} ${club.nickname}`.toLowerCase()
      for (const mark of REAL_CLUB_MARKS) {
        expect(haystack).not.toContain(mark)
      }
    }
  })

  test('continentalClubById acha pelo id e devolve null para desconhecido', () => {
    expect(continentalClubById('sa-charrua')?.name).toBe('Club Charrúa')
    expect(continentalClubById('nao-existe')).toBeNull()
  })

  test('clubById acha clube continental sem perder os brasileiros', () => {
    expect(clubById('sa-charrua')?.name).toBe('Club Charrúa')
    expect(clubById('leoes-capital')?.name).toBe('Atlético da Capital')
    expect(clubById('nao-existe')).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/data/continentalClubs.test.ts`
Expected: FAIL — "Failed to resolve import ./continentalClubs"

- [ ] **Step 3: Adicionar os três países novos em `NATIONS`**

Em `src/data/nations.ts`, depois da linha do México (linha 39), inserir:

```ts
  { id: 'peru', name: 'Peru', abbr: 'PER', colors: { primary: '#C1272D', secondary: '#F5F0E6' }, strength: 3, confederation: 'america' },
  { id: 'bolivia', name: 'Bolívia', abbr: 'BOL', colors: { primary: '#1E7A3C', secondary: '#F5C518' }, strength: 2, confederation: 'america' },
  { id: 'venezuela', name: 'Venezuela', abbr: 'VEN', colors: { primary: '#F5C518', secondary: '#7A1E3C' }, strength: 2, confederation: 'america' },
```

- [ ] **Step 4: Adicionar os bancos de nomes**

Em `src/data/nationalNames.ts`, dentro de `NATIONAL_NAMES`, depois do bloco `equador` (linha 152), inserir:

```ts
  peru: {
    firsts: ['Renato', 'Christian', 'Yoshimar', 'Wilder', 'Marcos', 'Andy', 'Piero', 'Alexander', 'Miguel', 'Luis', 'Jefferson', 'Bryan', 'Sergio', 'Franco', 'Joao', 'Aldo'],
    firstsF: ['Mia', 'Xioczana', 'Alessandra', 'Rosa', 'Milagros', 'Steffani', 'Cindy', 'Fabiola', 'Adriana', 'Sandy', 'Pierina', 'Claudia', 'Heidy', 'Nahomi', 'Mariel', 'Birka'],
    lasts: ['Tapia', 'Cueva', 'Yotún', 'Trauco', 'Corzo', 'Polo', 'Quispe', 'Callens', 'Zambrano', 'Grimaldo', 'Concha', 'Peña', 'Valera', 'Sonne', 'Noriega', 'Cartagena'],
  },
  bolivia: {
    firsts: ['Marcelo', 'Ramiro', 'Roberto', 'Bruno', 'Diego', 'Leonel', 'Boris', 'Gabriel', 'Efraín', 'Moisés', 'Henry', 'Danny', 'Jaume', 'Ervin', 'Rodrigo', 'Luis'],
    firstsF: ['Erika', 'Fabiola', 'Daniela', 'Rosmery', 'Karen', 'Andrea', 'Lucía', 'Mariana', 'Sofía', 'Verónica', 'Gabriela', 'Marisol', 'Nayra', 'Ximena', 'Rocío', 'Tania'],
    lasts: ['Terceros', 'Villamil', 'Sagredo', 'Chumacero', 'Justiniano', 'Añez', 'Vaca', 'Melgar', 'Cuéllar', 'Arce', 'Saucedo', 'Bejarano', 'Quinteros', 'Menacho', 'Suárez', 'Roca'],
  },
  venezuela: {
    firsts: ['Yeferson', 'Darwin', 'Wuilker', 'Jhon', 'Nahuel', 'Yangel', 'Cristian', 'Eduard', 'Jefferson', 'Alexander', 'José', 'Rómulo', 'Jorge', 'Ronald', 'Bernaldo', 'Telasco'],
    firstsF: ['Deyna', 'Oriana', 'Yerliane', 'Michelle', 'Gabriela', 'Verónica', 'Ysaura', 'Nayluisa', 'Raiderlin', 'Sandra', 'Yenifer', 'Daniuska', 'Floriangel', 'Ana', 'Mariana', 'Zulay'],
    lasts: ['Cásseres', 'Machís', 'Faríñez', 'Osorio', 'Ferraresi', 'Savarino', 'Bello', 'Sosa', 'Rondón', 'Aramburu', 'Contreras', 'Chancellor', 'Segovia', 'Hernández', 'Anzola', 'Ramírez'],
  },
```

- [ ] **Step 5: Criar o catálogo**

Criar `src/data/continentalClubs.ts`:

```ts
import type { Club } from './clubs'

/**
 * Clubes da América do Sul para a Copa Libertados. Mesma regra jurídica dos
 * clubes brasileiros: nome, apelido e cores vêm da geografia e da cultura de
 * cada país, nunca de um clube real.
 *
 * `division` é sempre 0 — todos jogam a primeira divisão do país deles — mas
 * eles NÃO entram na pirâmide brasileira: `initialDivisions` e o mercado leem
 * só `CLUBS`.
 */

export interface ContinentalClub extends Club {
  /** País do clube — id de NATIONS. */
  readonly nationId: string
}

/** Os nove países com clubes no torneio. */
export const CONTINENTAL_NATIONS: readonly string[] = [
  'argentina', 'uruguai', 'paraguai', 'chile', 'colombia',
  'equador', 'peru', 'bolivia', 'venezuela',
]

export const CONTINENTAL_CLUBS: readonly ContinentalClub[] = [
  // ==== Argentina ====
  { id: 'sa-riachuelo', nationId: 'argentina', name: 'Atlético del Riachuelo', abbr: 'RIC', city: 'Buenos Aires', nickname: 'El Ribereño', colors: { primary: '#1B3A6B', secondary: '#F5F0E6' }, strength: 5, division: 0 },
  { id: 'sa-pampero', nationId: 'argentina', name: 'Club Pampero', abbr: 'PPO', city: 'Bahía Blanca', nickname: 'El Viento del Sur', colors: { primary: '#C1272D', secondary: '#1A1A1A' }, strength: 5, division: 0 },
  { id: 'sa-cordobes', nationId: 'argentina', name: 'Deportivo Cordobés', abbr: 'CBS', city: 'Córdoba', nickname: 'El Mediterráneo', colors: { primary: '#2E7D46', secondary: '#F2C230' }, strength: 4, division: 0 },
  { id: 'sa-andino', nationId: 'argentina', name: 'Andino de Mendoza', abbr: 'AND', city: 'Mendoza', nickname: 'El Cuyano', colors: { primary: '#6B2FA0', secondary: '#F5F0E6' }, strength: 4, division: 0 },

  // ==== Uruguai ====
  { id: 'sa-charrua', nationId: 'uruguai', name: 'Club Charrúa', abbr: 'CHA', city: 'Montevidéu', nickname: 'La Garra', colors: { primary: '#2C4F8C', secondary: '#F5F0E6' }, strength: 5, division: 0 },
  { id: 'sa-rambla', nationId: 'uruguai', name: 'Rambla FC', abbr: 'RMB', city: 'Montevidéu', nickname: 'El Ramblero', colors: { primary: '#5CB8E4', secondary: '#1A1A1A' }, strength: 5, division: 0 },
  { id: 'sa-salteno', nationId: 'uruguai', name: 'Deportivo Salteño', abbr: 'SLT', city: 'Salto', nickname: 'El Naranjero', colors: { primary: '#E8762C', secondary: '#F5F0E6' }, strength: 4, division: 0 },
  { id: 'sa-esteno', nationId: 'uruguai', name: 'Club Esteño', abbr: 'ESN', city: 'Punta del Este', nickname: 'El Faro', colors: { primary: '#123A6B', secondary: '#F2C230' }, strength: 3, division: 0 },

  // ==== Paraguai ====
  { id: 'sa-nanduti', nationId: 'paraguai', name: 'Deportivo Ñandutí', abbr: 'NDT', city: 'Assunção', nickname: 'El Encaje', colors: { primary: '#F5F0E6', secondary: '#C1272D' }, strength: 4, division: 0 },
  { id: 'sa-ypacarai', nationId: 'paraguai', name: 'Club Ypacaraí', abbr: 'YPA', city: 'Ypacaraí', nickname: 'El Lacustre', colors: { primary: '#2C7FB8', secondary: '#F2C230' }, strength: 4, division: 0 },
  { id: 'sa-chaqueno', nationId: 'paraguai', name: 'Atlético Chaqueño', abbr: 'CQO', city: 'Filadelfia', nickname: 'El Chaqueño', colors: { primary: '#E8A33D', secondary: '#5B3A24' }, strength: 3, division: 0 },
  { id: 'sa-mburucuya', nationId: 'paraguai', name: 'Mburucuyá FC', abbr: 'MBU', city: 'Encarnación', nickname: 'La Flor', colors: { primary: '#6B2FA0', secondary: '#F2C230' }, strength: 3, division: 0 },

  // ==== Chile ====
  { id: 'sa-cordillera', nationId: 'chile', name: 'Cordillera FC', abbr: 'CDL', city: 'Santiago', nickname: 'Los Cóndores', colors: { primary: '#1A1A1A', secondary: '#C1272D' }, strength: 5, division: 0 },
  { id: 'sa-atacama', nationId: 'chile', name: 'Atacama FC', abbr: 'ATA', city: 'Copiapó', nickname: 'Los Salitreros', colors: { primary: '#E8A33D', secondary: '#2C4F8C' }, strength: 4, division: 0 },
  { id: 'sa-porteno', nationId: 'chile', name: 'Deportivo Porteño', abbr: 'PRT', city: 'Valparaíso', nickname: 'El Muelle', colors: { primary: '#2C4F8C', secondary: '#F5F0E6' }, strength: 4, division: 0 },
  { id: 'sa-araucano', nationId: 'chile', name: 'Club Araucano', abbr: 'ARC', city: 'Temuco', nickname: 'El Araucano', colors: { primary: '#1E7A3C', secondary: '#F2C230' }, strength: 3, division: 0 },

  // ==== Colômbia ====
  { id: 'sa-cafetero', nationId: 'colombia', name: 'Deportivo Cafetero', abbr: 'CFT', city: 'Manizales', nickname: 'El Grano de Oro', colors: { primary: '#5B3A24', secondary: '#F2C230' }, strength: 5, division: 0 },
  { id: 'sa-vallenato', nationId: 'colombia', name: 'Club Vallenato', abbr: 'VLL', city: 'Valledupar', nickname: 'Los Juglares', colors: { primary: '#F2C230', secondary: '#2C4F8C' }, strength: 4, division: 0 },
  { id: 'sa-esmeralda', nationId: 'colombia', name: 'Esmeralda FC', abbr: 'ESM', city: 'Bogotá', nickname: 'La Piedra Verde', colors: { primary: '#1E7A3C', secondary: '#F5F0E6' }, strength: 4, division: 0 },
  { id: 'sa-tayrona', nationId: 'colombia', name: 'Tayrona FC', abbr: 'TAY', city: 'Santa Marta', nickname: 'Los Tayronas', colors: { primary: '#E8A33D', secondary: '#1A1A1A' }, strength: 3, division: 0 },

  // ==== Equador ====
  { id: 'sa-mitad-mundo', nationId: 'equador', name: 'Mitad del Mundo FC', abbr: 'MDM', city: 'Quito', nickname: 'Los Equinocciales', colors: { primary: '#F5C518', secondary: '#C1272D' }, strength: 5, division: 0 },
  { id: 'sa-manabita', nationId: 'equador', name: 'Deportivo Manabita', abbr: 'MNB', city: 'Manta', nickname: 'Los Atuneros', colors: { primary: '#1E7A3C', secondary: '#F5F0E6' }, strength: 4, division: 0 },
  { id: 'sa-guayaco', nationId: 'equador', name: 'Atlético Guayaco', abbr: 'GYC', city: 'Guayaquil', nickname: 'Los Astilleros', colors: { primary: '#2C4F8C', secondary: '#F2C230' }, strength: 3, division: 0 },
  { id: 'sa-cotopaxi', nationId: 'equador', name: 'Cotopaxi FC', abbr: 'CTX', city: 'Latacunga', nickname: 'Los Volcánicos', colors: { primary: '#8A8F98', secondary: '#C1272D' }, strength: 3, division: 0 },

  // ==== Peru ====
  { id: 'sa-inti', nationId: 'peru', name: 'Club Inti', abbr: 'INT', city: 'Lima', nickname: 'Los Hijos del Sol', colors: { primary: '#F5C518', secondary: '#C1272D' }, strength: 5, division: 0 },
  { id: 'sa-chimu', nationId: 'peru', name: 'Deportivo Chimú', abbr: 'CHM', city: 'Trujillo', nickname: 'Los Chimúes', colors: { primary: '#E8A33D', secondary: '#1A1A1A' }, strength: 3, division: 0 },
  { id: 'sa-misti', nationId: 'peru', name: 'Atlético Misti', abbr: 'MST', city: 'Arequipa', nickname: 'Los Characatos', colors: { primary: '#F5F0E6', secondary: '#C1272D' }, strength: 2, division: 0 },
  { id: 'sa-vicuna', nationId: 'peru', name: 'Club Vicuña', abbr: 'VCN', city: 'Cusco', nickname: 'Las Vicuñas', colors: { primary: '#7A4A21', secondary: '#F2C230' }, strength: 2, division: 0 },

  // ==== Bolívia ====
  { id: 'sa-altiplano', nationId: 'bolivia', name: 'Altiplano FC', abbr: 'ALP', city: 'La Paz', nickname: 'Los de Arriba', colors: { primary: '#C1272D', secondary: '#F2C230' }, strength: 3, division: 0 },
  { id: 'sa-illimani', nationId: 'bolivia', name: 'Deportivo Illimani', abbr: 'ILM', city: 'La Paz', nickname: 'El Nevado', colors: { primary: '#F5F0E6', secondary: '#2C4F8C' }, strength: 2, division: 0 },
  { id: 'sa-camba', nationId: 'bolivia', name: 'Club Camba', abbr: 'CMB', city: 'Santa Cruz de la Sierra', nickname: 'Los Cambas', colors: { primary: '#1E7A3C', secondary: '#F5F0E6' }, strength: 2, division: 0 },
  { id: 'sa-salar', nationId: 'bolivia', name: 'Club Salar', abbr: 'SAL', city: 'Uyuni', nickname: 'Los del Salar', colors: { primary: '#F5F0E6', secondary: '#8A8F98' }, strength: 2, division: 0 },

  // ==== Venezuela ====
  { id: 'sa-orinoco', nationId: 'venezuela', name: 'Deportivo Orinoco', abbr: 'ORN', city: 'Ciudad Guayana', nickname: 'El Caudaloso', colors: { primary: '#2C7FB8', secondary: '#F2C230' }, strength: 3, division: 0 },
  { id: 'sa-avila', nationId: 'venezuela', name: 'Club Ávila', abbr: 'AVL', city: 'Caracas', nickname: 'La Montaña', colors: { primary: '#1E7A3C', secondary: '#F5F0E6' }, strength: 2, division: 0 },
  { id: 'sa-llanero', nationId: 'venezuela', name: 'Atlético Llanero', abbr: 'LLN', city: 'Barinas', nickname: 'Los Llaneros', colors: { primary: '#C1272D', secondary: '#F5F0E6' }, strength: 2, division: 0 },
  { id: 'sa-tepuy', nationId: 'venezuela', name: 'Tepuy FC', abbr: 'TPY', city: 'Santa Elena de Uairén', nickname: 'La Mesa de Piedra', colors: { primary: '#6B2FA0', secondary: '#F2C230' }, strength: 2, division: 0 },
]

export const continentalClubById = (id: string): ContinentalClub | null =>
  CONTINENTAL_CLUBS.find((club) => club.id === id) ?? null
```

- [ ] **Step 6: Estender `clubById`**

Em `src/data/clubs.ts`, substituir a implementação de `clubById` (linhas 89-90) por:

```ts
export const clubById = (id: string): Club | null =>
  CLUBS.find((club) => club.id === id) ?? continentalClubById(id)
```

E adicionar no topo do arquivo, depois dos imports existentes (o arquivo hoje não tem import; adicionar como primeira linha):

```ts
import { continentalClubById } from './continentalClubs'
```

Nota: `continentalClubs.ts` importa só o **tipo** `Club` (`import type`), então não há ciclo em tempo de execução.

- [ ] **Step 7: Escrever o teste dos elencos estrangeiros**

Sem isto, o Club Charrúa escala "Zeca" e "Serrote": `nationalityOf` em
`src/engine/squad/players.ts` só reconhece o prefixo `nation-` das seleções, e
qualquer outro clube cai no gerador brasileiro.

Adicionar em `src/engine/squad/players.test.ts` (criar o arquivo se não existir,
com `import { describe, expect, test } from 'vitest'`):

```ts
import { squadPlayersFor } from './players'
import { continentalClubById } from '../../data/continentalClubs'
import { clubById } from '../../data/clubs'
import { NATIONAL_NAMES } from '../../data/nationalNames'

describe('elenco de clube sul-americano', () => {
  test('os nomes vêm do banco do país do clube, não do brasileiro', () => {
    // Arrange
    const club = continentalClubById('sa-charrua')!
    const uruguaios = NATIONAL_NAMES.uruguai

    // Act
    const squad = squadPlayersFor(club)

    // Assert
    for (const player of squad) {
      const [first, ...rest] = player.name.split(' ')
      expect(uruguaios.firsts).toContain(first)
      expect(uruguaios.lasts).toContain(rest.join(' '))
    }
  })

  test('clube brasileiro continua com o gerador da liga', () => {
    const squad = squadPlayersFor(clubById('leoes-capital')!)
    expect(squad).toHaveLength(18)
    // apelidos de várzea são exclusivos do gerador brasileiro
    expect(squad.every((player) => player.name.length > 0)).toBe(true)
  })
})
```

- [ ] **Step 8: Rodar e ver falhar**

Run: `npx vitest run src/engine/squad/players.test.ts`
Expected: FAIL — nome do elenco uruguaio sai da lista brasileira

- [ ] **Step 9: Fazer `nationalityOf` reconhecer clube continental**

Em `src/engine/squad/players.ts`, adicionar ao import de dados:

```ts
import { continentalClubById } from '../../data/continentalClubs'
```

E substituir `nationalityOf` (linhas 244-246) por:

```ts
/**
 * Id da nacionalidade do "clube": seleção pelo prefixo, clube da Libertados
 * pelo país do catálogo continental. null = clube da liga brasileira.
 */
const nationalityOf = (clubId: string): string | null => {
  if (clubId.startsWith(NATION_PREFIX)) return clubId.slice(NATION_PREFIX.length)
  return continentalClubById(clubId)?.nationId ?? null
}
```

- [ ] **Step 10: Rodar os testes**

Run: `npx vitest run src/data/ src/engine/squad/`
Expected: PASS — catálogo, clubes e elencos verdes.

- [ ] **Step 11: Commit**

```bash
git add src/data/continentalClubs.ts src/data/continentalClubs.test.ts src/data/clubs.ts src/data/nations.ts src/data/nationalNames.ts src/engine/squad/players.ts src/engine/squad/players.test.ts
git commit -m "feat: catálogo de clubes sul-americanos para a Copa Libertados"
```

---

### Task 2: Escudos dos clubes continentais

**Files:**
- Modify: `src/ui/clubCrestIdentity.ts` (8 emblemas novos no tipo + 36 identidades)
- Modify: `src/ui/ClubCrest.tsx:139-429` (8 casos novos no `switch` do `Emblem`)
- Modify: `src/ui/clubCrestIdentity.test.ts`

**Interfaces:**
- Consumes: `CONTINENTAL_CLUBS` da Task 1
- Produces: `EmblemKind` ganha `'condor' | 'jaguar' | 'volcano' | 'harp' | 'llama' | 'orchid' | 'maize' | 'cordillera'`; `hasNamedCrestIdentity(id)` passa a ser verdadeiro para os 36

- [ ] **Step 1: Escrever o teste**

Adicionar em `src/ui/clubCrestIdentity.test.ts`:

```ts
import { CONTINENTAL_CLUBS } from '../data/continentalClubs'

describe('identidade de escudo dos clubes continentais', () => {
  test('todo clube sul-americano tem identidade declarada, sem cair no fallback', () => {
    for (const club of CONTINENTAL_CLUBS) {
      expect(hasNamedCrestIdentity(club.id)).toBe(true)
    }
  })

  test('os oito emblemas novos são usados por algum clube', () => {
    const usados = new Set(CONTINENTAL_CLUBS.map((club) => crestIdentityFor(club.id).emblem))
    for (const emblem of ['condor', 'jaguar', 'volcano', 'harp', 'llama', 'orchid', 'maize', 'cordillera']) {
      expect(usados.has(emblem as never)).toBe(true)
    }
  })
})
```

Se `hasNamedCrestIdentity` e `crestIdentityFor` ainda não estiverem importados no arquivo, ajustar o import do topo para incluí-los.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/clubCrestIdentity.test.ts`
Expected: FAIL — `hasNamedCrestIdentity` devolve `false` para `sa-riachuelo`

- [ ] **Step 3: Estender o tipo e declarar as identidades**

Em `src/ui/clubCrestIdentity.ts`, adicionar ao final da união `EmblemKind` (depois de `| 'rain'`):

```ts
  | 'condor'
  | 'jaguar'
  | 'volcano'
  | 'harp'
  | 'llama'
  | 'orchid'
  | 'maize'
  | 'cordillera'
```

E adicionar dentro de `CLUB_CREST_IDENTITIES`, depois da entrada `garoa`:

```ts
  // ==== Copa Libertados ====
  'sa-riachuelo':   { shield: 'rounded', pattern: 'band',     emblem: 'anchor',     plate: 'round' },
  'sa-pampero':     { shield: 'pennant', pattern: 'sash',     emblem: 'wind',       plate: 'diamond' },
  'sa-cordobes':    { shield: 'classic', pattern: 'quarters', emblem: 'tower',      plate: 'banner' },
  'sa-andino':      { shield: 'diamond', pattern: 'chevron',  emblem: 'cordillera', plate: 'diamond' },

  'sa-charrua':     { shield: 'crowned', pattern: 'halves',   emblem: 'sun',        plate: 'round' },
  'sa-rambla':      { shield: 'roundel', pattern: 'waves',    emblem: 'wave',       plate: 'round' },
  'sa-salteno':     { shield: 'banner',  pattern: 'stripes',  emblem: 'maize',      plate: 'banner' },
  'sa-esteno':      { shield: 'classic', pattern: 'waves',    emblem: 'lighthouse', plate: 'round' },

  'sa-nanduti':     { shield: 'rounded', pattern: 'rays',     emblem: 'harp',       plate: 'round' },
  'sa-ypacarai':    { shield: 'roundel', pattern: 'waves',    emblem: 'drop',       plate: 'round' },
  'sa-chaqueno':    { shield: 'pennant', pattern: 'chevron',  emblem: 'cactus',     plate: 'diamond' },
  'sa-mburucuya':   { shield: 'diamond', pattern: 'quarters', emblem: 'orchid',     plate: 'round' },

  'sa-cordillera':  { shield: 'classic', pattern: 'chevron',  emblem: 'condor',     plate: 'round' },
  'sa-atacama':     { shield: 'banner',  pattern: 'rays',     emblem: 'crystal',    plate: 'diamond' },
  'sa-porteno':     { shield: 'rounded', pattern: 'hoops',    emblem: 'ship',       plate: 'banner' },
  'sa-araucano':    { shield: 'crowned', pattern: 'halves',   emblem: 'tree',       plate: 'round' },

  'sa-cafetero':    { shield: 'classic', pattern: 'band',     emblem: 'coffee',     plate: 'round' },
  'sa-vallenato':   { shield: 'pennant', pattern: 'rays',     emblem: 'star',       plate: 'diamond' },
  'sa-esmeralda':   { shield: 'diamond', pattern: 'halves',   emblem: 'crystal',    plate: 'round' },
  'sa-tayrona':     { shield: 'banner',  pattern: 'chevron',  emblem: 'jaguar',     plate: 'banner' },

  'sa-mitad-mundo': { shield: 'roundel', pattern: 'quarters', emblem: 'globe',      plate: 'round' },
  'sa-manabita':    { shield: 'classic', pattern: 'waves',    emblem: 'fish',       plate: 'diamond' },
  'sa-guayaco':     { shield: 'rounded', pattern: 'stripes',  emblem: 'hook',       plate: 'round' },
  'sa-cotopaxi':    { shield: 'pennant', pattern: 'chevron',  emblem: 'volcano',    plate: 'none' },

  'sa-inti':        { shield: 'crowned', pattern: 'rays',     emblem: 'sun',        plate: 'round' },
  'sa-chimu':       { shield: 'diamond', pattern: 'quarters', emblem: 'maize',      plate: 'diamond' },
  'sa-misti':       { shield: 'classic', pattern: 'chevron',  emblem: 'volcano',    plate: 'banner' },
  'sa-vicuna':      { shield: 'rounded', pattern: 'band',     emblem: 'llama',      plate: 'round' },

  'sa-altiplano':   { shield: 'banner',  pattern: 'halves',   emblem: 'cordillera', plate: 'banner' },
  'sa-illimani':    { shield: 'diamond', pattern: 'chevron',  emblem: 'peak',       plate: 'diamond' },
  'sa-camba':       { shield: 'classic', pattern: 'quarters', emblem: 'palm',       plate: 'round' },
  'sa-salar':       { shield: 'roundel', pattern: 'hoops',    emblem: 'crystal',    plate: 'none' },

  'sa-orinoco':     { shield: 'rounded', pattern: 'waves',    emblem: 'wave',       plate: 'round' },
  'sa-avila':       { shield: 'crowned', pattern: 'chevron',  emblem: 'orchid',     plate: 'round' },
  'sa-llanero':     { shield: 'pennant', pattern: 'band',     emblem: 'horseshoe',  plate: 'diamond' },
  'sa-tepuy':       { shield: 'diamond', pattern: 'halves',   emblem: 'mesa',       plate: 'diamond' },
```

- [ ] **Step 4: Desenhar os oito emblemas**

Em `src/ui/ClubCrest.tsx`, dentro do `switch (kind)` do componente `Emblem`, adicionar antes do fechamento (depois do `case 'rain'`):

```tsx
    case 'condor':
      return (
        <g>
          <path d="M5.4 12.6 C8.2 10.9 10.2 11.8 12 13.9 C13.8 11.8 15.8 10.9 18.6 12.6 C16.5 13.3 15 14.6 14 16.2 L12 18.9 L10 16.2 C9 14.6 7.5 13.3 5.4 12.6 Z" fill={color} />
          <circle cx="12" cy="11.2" r="1.6" fill={color} />
          <path d="M12 9.9 L13.4 10.8 L12 11.4 Z" fill={accent} />
        </g>
      )
    case 'jaguar':
      return (
        <g>
          <path d="M12 7.6 L14.3 9 L16.6 8.6 L16.1 11 C17.9 13.2 17.3 17.2 15 18.9 L12 19.9 L9 18.9 C6.7 17.2 6.1 13.2 7.9 11 L7.4 8.6 L9.7 9 Z" fill={color} />
          <path d="M9.4 12.4 L10.9 13 M14.6 12.4 L13.1 13 M10.4 16.6 C11.3 17.3 12.7 17.3 13.6 16.6" fill="none" stroke={accent} strokeWidth="0.9" strokeLinecap="round" />
          <circle cx="9.2" cy="15" r="0.65" fill={accent} />
          <circle cx="14.8" cy="15" r="0.65" fill={accent} />
          <circle cx="12" cy="17.9" r="0.6" fill={accent} />
        </g>
      )
    case 'volcano':
      return (
        <g>
          <path d="M4.8 19.4 L9.6 10.4 H14.4 L19.2 19.4 Z" fill={color} />
          <path d="M9.6 10.4 L10.9 12.6 L12 11.2 L13.1 12.6 L14.4 10.4 Z" fill={accent} />
          <path d="M10.4 8.6 C10.4 7.4 12 7.6 12 6.4 M13.6 8.6 C13.6 7.6 14.9 7.7 14.9 6.8" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
        </g>
      )
    case 'harp':
      return (
        <g>
          <path d="M8 19.4 C8 13.4 10.4 9.4 15.6 7.8" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
          <path d="M8 19.4 H15.6 V7.8" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M10.4 18.2 V11.6 M12.1 18.2 V10.2 M13.8 18.2 V9.1" fill="none" stroke={accent} strokeWidth="0.85" strokeLinecap="round" />
        </g>
      )
    case 'llama':
      return (
        <g>
          <path d="M9 19.2 V14.4 C9 12.6 10.4 11.6 12.2 11.6 H14 V19.2 H12.4 V15.6 H10.6 V19.2 Z" fill={color} />
          <path d="M14 11.6 C14 9.8 15.2 8.6 16.4 8.6 C17 8.6 17.4 9 17.4 9.8 V12 C17.4 12.9 16.7 13.4 15.8 13.4 H14 Z" fill={color} />
          <path d="M16.1 8.6 L15.8 6.9 M17.2 8.8 L17.9 7.2" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
          <circle cx="16.5" cy="10.6" r="0.6" fill={accent} />
        </g>
      )
    case 'orchid':
      return (
        <g>
          <path d="M12 7.4 C13.6 8.6 13.6 11 12 12.2 C10.4 11 10.4 8.6 12 7.4 Z" fill={color} />
          <path d="M16.9 10.6 C16.6 12.6 14.5 13.7 12.8 13.1 C13.5 11.2 15.3 10.2 16.9 10.6 Z" fill={color} />
          <path d="M7.1 10.6 C8.7 10.2 10.5 11.2 11.2 13.1 C9.5 13.7 7.4 12.6 7.1 10.6 Z" fill={color} />
          <path d="M15.5 17.4 C13.9 18.4 11.9 17.6 11.6 15.6 C13.4 15 15 15.7 15.5 17.4 Z" fill={color} />
          <path d="M8.5 17.4 C9 15.7 10.6 15 12.4 15.6 C12.1 17.6 10.1 18.4 8.5 17.4 Z" fill={color} />
          <circle cx="12" cy="13.9" r="1.5" fill={accent} />
        </g>
      )
    case 'maize':
      return (
        <g>
          <path d="M12 8.2 C14 9.4 14.6 12.4 14 15.4 C13.6 17.4 12.8 18.8 12 19.4 C11.2 18.8 10.4 17.4 10 15.4 C9.4 12.4 10 9.4 12 8.2 Z" fill={color} />
          <path d="M12 9.8 V18.4 M10.7 11.6 L13.3 11.6 M10.4 13.8 L13.6 13.8 M10.6 16 L13.4 16" fill="none" stroke={accent} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M10.2 12.4 C8.2 12 7.2 13.6 7.6 16 C9.2 16.2 10 15 10.2 13.4" fill={color} />
        </g>
      )
    case 'cordillera':
      return (
        <g>
          <path d="M4.6 19.2 L9 11.4 L11.6 15.6 L14.4 9.4 L19.4 19.2 Z" fill={color} />
          <path d="M9 11.4 L10.3 13.7 L9 14.3 L7.8 13.6 Z M14.4 9.4 L16 12.5 L14.4 13.2 L12.9 12.4 Z" fill={accent} />
        </g>
      )
```

- [ ] **Step 5: Rodar os testes**

Run: `npx vitest run src/ui/clubCrestIdentity.test.ts && npm run build`
Expected: PASS nos testes; build sem erro de tipo (o `switch` do `Emblem` cobre todos os `EmblemKind`).

- [ ] **Step 6: Commit**

```bash
git add src/ui/clubCrestIdentity.ts src/ui/clubCrestIdentity.test.ts src/ui/ClubCrest.tsx
git commit -m "feat: escudos e emblemas dos clubes da Copa Libertados"
```

---

### Task 3: Tipos e constantes do torneio

**Files:**
- Create: `src/engine/libertados/types.ts`
- Create: `src/engine/libertados/types.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `LibertadosStage`, `LibertadosKnockoutStage`, `LibertadosMatch`, `LibertadosState`, `KNOCKOUT_ORDER`, `STAGE_NAMES`, `LIBERTADOS_NAME`, `GROUP_COUNT`, `GROUP_SIZE`, `GROUP_ROUNDS`, `POT_COUNT`, `BRAZILIAN_SPOTS`, `CONTINENTAL_SPOTS`, `MATCHES_PER_EDITION`, `groupLetter`, `isKnockoutStage`, `isLibertadosRunning`, `libertadosMatchIndex`

- [ ] **Step 1: Escrever o teste**

Criar `src/engine/libertados/types.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import {
  groupLetter,
  isKnockoutStage,
  isLibertadosRunning,
  libertadosMatchIndex,
  MATCHES_PER_EDITION,
} from './types'

describe('tipos e constantes da Copa Libertados', () => {
  test('groupLetter numera de A a H', () => {
    expect(groupLetter(0)).toBe('A')
    expect(groupLetter(7)).toBe('H')
  })

  test('isKnockoutStage separa mata-mata de grupos e estados finais', () => {
    expect(isKnockoutStage('r16')).toBe(true)
    expect(isKnockoutStage('final')).toBe(true)
    expect(isKnockoutStage('groups')).toBe(false)
    expect(isKnockoutStage('champion')).toBe(false)
  })

  test('isLibertadosRunning cobre grupos e todo o mata-mata', () => {
    expect(isLibertadosRunning('groups')).toBe(true)
    expect(isLibertadosRunning('quarter')).toBe(true)
    expect(isLibertadosRunning('champion')).toBe(false)
    expect(isLibertadosRunning('eliminated')).toBe(false)
  })

  test('os 14 jogos da edição têm índice único e em ordem', () => {
    const indices = [
      ...[0, 1, 2, 3, 4, 5].map((round) => libertadosMatchIndex('groups', round)),
      ...(['r16', 'quarter', 'semi', 'final'] as const).flatMap((stage) =>
        [0, 1].map((round) => libertadosMatchIndex(stage, round)),
      ),
    ]
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
    expect(indices.length).toBe(MATCHES_PER_EDITION)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/engine/libertados/types.test.ts`
Expected: FAIL — "Failed to resolve import ./types"

- [ ] **Step 3: Criar os tipos**

Criar `src/engine/libertados/types.ts`:

```ts
import type { ScoredMatch } from '../season/season'

/**
 * Copa Libertados: 32 clubes, 8 grupos de 4 em ida e volta e mata-mata das
 * oitavas à final, também em ida e volta. Quem passa é o AGREGADO dos dois
 * jogos; empate vai aos pênaltis. Não existe gol fora — a regra foi abolida.
 */

export const LIBERTADOS_NAME = 'Copa Libertados'

export const GROUP_COUNT = 8
export const GROUP_SIZE = 4
/** Ida e volta: três rodadas de turno, três de returno. */
export const GROUP_ROUNDS = (GROUP_SIZE - 1) * 2
export const POT_COUNT = 4
/** Vagas do Brasil: os 4 primeiros da Série A do ano anterior. */
export const BRAZILIAN_SPOTS = 4
export const CONTINENTAL_SPOTS = GROUP_COUNT * GROUP_SIZE - BRAZILIAN_SPOTS
/** 6 jogos de grupo + 2 em cada uma das 4 fases de mata-mata. */
export const MATCHES_PER_EDITION = GROUP_ROUNDS + 8

export type LibertadosStage =
  | 'groups'
  | 'r16'
  | 'quarter'
  | 'semi'
  | 'final'
  | 'champion'
  | 'eliminated'

export type LibertadosKnockoutStage = Extract<
  LibertadosStage,
  'r16' | 'quarter' | 'semi' | 'final'
>

export const KNOCKOUT_ORDER: readonly LibertadosKnockoutStage[] = [
  'r16', 'quarter', 'semi', 'final',
]

export const STAGE_NAMES: Record<LibertadosStage, string> = {
  groups: 'Fase de grupos',
  r16: 'Oitavas de final',
  quarter: 'Quartas de final',
  semi: 'Semifinal',
  final: 'Final',
  champion: 'Campeão',
  eliminated: 'Eliminado',
}

export interface LibertadosMatch extends ScoredMatch {
  readonly stage: 'groups' | LibertadosKnockoutStage
  /** Grupos: 0-5. Mata-mata: 0 = ida, 1 = volta. */
  readonly round: number
  /** Só na volta: quem levou nos pênaltis com o agregado empatado. */
  readonly penaltyWinnerId?: string
}

export interface LibertadosState {
  readonly seed: number
  /** Ano de carreira da edição. */
  readonly year: number
  /** null = edição simulada, sem clube do jogador. */
  readonly playerClubId: string | null
  /** 8 grupos de 4, na ordem A-H. Com jogador, ele abre o grupo A. */
  readonly groups: readonly (readonly string[])[]
  readonly stage: LibertadosStage
  readonly round: number
  readonly results: readonly LibertadosMatch[]
  readonly championId: string | null
}

/** Letra do grupo na tabela: 0 → A, 1 → B… */
export const groupLetter = (index: number): string => String.fromCharCode(65 + index)

export const isKnockoutStage = (stage: LibertadosStage): stage is LibertadosKnockoutStage =>
  KNOCKOUT_ORDER.includes(stage as LibertadosKnockoutStage)

/** O torneio ainda tem jogo a fazer? */
export const isLibertadosRunning = (stage: LibertadosStage): boolean =>
  stage === 'groups' || isKnockoutStage(stage)

/**
 * Posição do jogo na edição (0-13). É a ponte entre o estado do torneio e a
 * data no calendário.
 */
export const libertadosMatchIndex = (
  stage: 'groups' | LibertadosKnockoutStage,
  round: number,
): number => {
  if (stage === 'groups') return round
  return GROUP_ROUNDS + KNOCKOUT_ORDER.indexOf(stage) * 2 + round
}
```

- [ ] **Step 4: Rodar o teste**

Run: `npx vitest run src/engine/libertados/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/libertados/types.ts src/engine/libertados/types.test.ts
git commit -m "feat: tipos e constantes da Copa Libertados"
```

---

### Task 4: Sorteio por potes

**Files:**
- Create: `src/engine/libertados/draw.ts`
- Create: `src/engine/libertados/draw.test.ts`

**Interfaces:**
- Consumes: `CONTINENTAL_CLUBS` (Task 1); `GROUP_COUNT`, `GROUP_SIZE`, `POT_COUNT`, `CONTINENTAL_SPOTS` (Task 3); `clubById` de `src/data/clubs.ts`; `createRng`, `nextFloat`, `RngState`, `RngResult` de `src/engine/rng.ts`
- Produces:
  - `pickContinentalClubs(count: number, rng: RngState): RngResult<readonly string[]>`
  - `buildPots(clubIds: readonly string[]): readonly (readonly string[])[]`
  - `drawGroups(clubIds: readonly string[], playerClubId: string | null, rng: RngState): RngResult<readonly (readonly string[])[]>`
  - `nationOf(clubId: string): string` — país do clube (`'brasil'` para os da pirâmide)

- [ ] **Step 1: Escrever o teste**

Criar `src/engine/libertados/draw.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { buildPots, drawGroups, nationOf, pickContinentalClubs } from './draw'
import { CONTINENTAL_CLUBS } from '../../data/continentalClubs'
import { createRng } from '../rng'
import { CONTINENTAL_SPOTS, GROUP_COUNT, GROUP_SIZE, POT_COUNT } from './types'

const BRASILEIROS = ['leoes-capital', 'mare-rubra', 'imperial', 'atlantico']

const edicao = (seed: number) => {
  const sorteados = pickContinentalClubs(CONTINENTAL_SPOTS, createRng(seed))
  return drawGroups([...BRASILEIROS, ...sorteados.value], BRASILEIROS[0], sorteados.next)
}

describe('sorteio da Copa Libertados', () => {
  test('nationOf devolve o país do clube continental e brasil para a pirâmide', () => {
    expect(nationOf('sa-charrua')).toBe('uruguai')
    expect(nationOf('leoes-capital')).toBe('brasil')
  })

  test('sorteia 28 clubes continentais distintos', () => {
    const { value } = pickContinentalClubs(CONTINENTAL_SPOTS, createRng(7))
    expect(value).toHaveLength(CONTINENTAL_SPOTS)
    expect(new Set(value).size).toBe(CONTINENTAL_SPOTS)
    for (const id of value) {
      expect(CONTINENTAL_CLUBS.some((club) => club.id === id)).toBe(true)
    }
  })

  test('os potes têm oito clubes cada, do mais forte para o mais fraco', () => {
    const { value } = edicao(3)
    const potes = buildPots(value.flat())
    expect(potes).toHaveLength(POT_COUNT)
    for (const pote of potes) expect(pote).toHaveLength(GROUP_SIZE * 2)
  })

  test('o sorteio monta 8 grupos de 4 sem repetir clube', () => {
    const { value: grupos } = edicao(11)
    expect(grupos).toHaveLength(GROUP_COUNT)
    for (const grupo of grupos) expect(grupo).toHaveLength(GROUP_SIZE)
    const todos = grupos.flat()
    expect(new Set(todos).size).toBe(GROUP_COUNT * GROUP_SIZE)
  })

  test('cada grupo recebe um clube de cada pote', () => {
    const { value: grupos } = edicao(23)
    const potes = buildPots(grupos.flat())
    for (const grupo of grupos) {
      const origem = grupo.map((id) => potes.findIndex((pote) => pote.includes(id)))
      expect([...origem].sort()).toEqual([0, 1, 2, 3])
    }
  })

  test('nenhum grupo tem dois clubes do mesmo país', () => {
    for (const seed of [1, 42, 99, 256, 1024]) {
      for (const grupo of edicao(seed).value) {
        const paises = grupo.map(nationOf)
        expect(new Set(paises).size).toBe(GROUP_SIZE)
      }
    }
  })

  test('a restrição de país vale em toda seed, não só nas escolhidas', () => {
    // Arrange: o algoritmo guloso original só falhava em algumas sementes e
    // sempre no último grupo da fila — uma varredura pega esse viés
    const violacoes: number[] = []

    // Act
    for (let seed = 0; seed < 60; seed++) {
      edicao(seed).value.forEach((grupo, indice) => {
        if (new Set(grupo.map(nationOf)).size !== GROUP_SIZE) violacoes.push(indice)
      })
    }

    // Assert
    expect(violacoes).toEqual([])
  })

  test('o clube do jogador abre o grupo A', () => {
    const { value: grupos } = edicao(5)
    expect(grupos[0][0]).toBe(BRASILEIROS[0])
  })

  test('mesma seed, mesmo sorteio', () => {
    expect(edicao(77).value).toEqual(edicao(77).value)
  })

  test('sem jogador, o sorteio funciona igual', () => {
    const sorteados = pickContinentalClubs(CONTINENTAL_SPOTS, createRng(9))
    const { value: grupos } = drawGroups([...BRASILEIROS, ...sorteados.value], null, sorteados.next)
    expect(grupos.flat()).toHaveLength(GROUP_COUNT * GROUP_SIZE)
  })

  test('jogador fora do pote mais forte não some do sorteio nem deixa vaga vazia', () => {
    /*
     * Arrange: 'aurora-paulista' tem força 3 e cai num pote baixo. Inferir o
     * pote do jogador pelo tamanho do grupo dava certo só quando ele estava no
     * pote 1 — nos outros casos um clube sumia e um `undefined` entrava no
     * lugar. Os quatro brasileiros do fixture padrão são todos força 5, então
     * nenhum outro teste alcança este caminho.
     */
    const classificados = ['leoes-capital', 'mare-rubra', 'imperial', 'aurora-paulista']
    const sorteados = pickContinentalClubs(CONTINENTAL_SPOTS, createRng(31))

    // Act
    const { value: grupos } = drawGroups(
      [...classificados, ...sorteados.value],
      'aurora-paulista',
      sorteados.next,
    )

    // Assert
    const todos = grupos.flat()
    expect(todos).toHaveLength(GROUP_COUNT * GROUP_SIZE)
    expect(todos.every((id) => typeof id === 'string' && id.length > 0)).toBe(true)
    expect(new Set(todos).size).toBe(GROUP_COUNT * GROUP_SIZE)
    expect(grupos[0][0]).toBe('aurora-paulista')
    for (const grupo of grupos) expect(grupo).toHaveLength(GROUP_SIZE)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/engine/libertados/draw.test.ts`
Expected: FAIL — "Failed to resolve import ./draw"

- [ ] **Step 3: Implementar o sorteio**

Criar `src/engine/libertados/draw.ts`:

```ts
import { clubById } from '../../data/clubs'
import { CONTINENTAL_CLUBS, continentalClubById } from '../../data/continentalClubs'
import { nextFloat, type RngResult, type RngState } from '../rng'
import { GROUP_COUNT, GROUP_SIZE, POT_COUNT } from './types'

/**
 * Sorteio da Libertados: quatro potes por força e um clube de cada pote por
 * grupo, recusando quem repetiria país no grupo. Determinístico pela seed.
 */

/** País do clube. Quem não está no catálogo continental é da pirâmide. */
export const nationOf = (clubId: string): string =>
  continentalClubById(clubId)?.nationId ?? 'brasil'

const strengthOf = (clubId: string): number => clubById(clubId)?.strength ?? 3

/** Tira `count` clubes do catálogo continental, sem repetir. */
export const pickContinentalClubs = (
  count: number,
  rng: RngState,
): RngResult<readonly string[]> => {
  const pool = CONTINENTAL_CLUBS.map((club) => club.id)
  const drawn: string[] = []
  let current = rng
  while (drawn.length < count && pool.length > 0) {
    const roll = nextFloat(current)
    current = roll.next
    drawn.push(pool.splice(Math.floor(roll.value * pool.length) % pool.length, 1)[0])
  }
  return { value: drawn, next: current }
}

/**
 * Quatro potes de oito: ordena os 32 por força e fatia. O desempate é o id,
 * para o pote não depender da ordem em que os clubes chegaram.
 */
export const buildPots = (clubIds: readonly string[]): readonly (readonly string[])[] => {
  const ranked = [...clubIds].sort((a, b) => {
    const diff = strengthOf(b) - strengthOf(a)
    return diff !== 0 ? diff : a.localeCompare(b)
  })
  const size = ranked.length / POT_COUNT
  return Array.from({ length: POT_COUNT }, (_, pot) =>
    ranked.slice(pot * size, (pot + 1) * size),
  )
}

/** Embaralho determinístico (Fisher-Yates com o RNG do jogo). */
const shuffle = (items: readonly string[], rng: RngState): RngResult<readonly string[]> => {
  const shuffled = [...items]
  let current = rng
  for (let index = shuffled.length - 1; index > 0; index--) {
    const roll = nextFloat(current)
    current = roll.next
    const swap = Math.floor(roll.value * (index + 1)) % (index + 1)
    const held = shuffled[index]
    shuffled[index] = shuffled[swap]
    shuffled[swap] = held
  }
  return { value: shuffled, next: current }
}

/**
 * Distribui os clubes de UM pote entre os grupos que ainda esperam por ele —
 * um clube por grupo, sem repetir país.
 *
 * Precisa voltar atrás quando um grupo fica sem candidato válido. Sem isso, o
 * último grupo a ser preenchido herda o que sobrou do pote e não tem escolha:
 * numa varredura de 300 seeds, 87% dos grupos com país repetido eram o último
 * da fila, que chegou a juntar três paraguaios.
 *
 * Devolve null quando nem com retrocesso existe distribuição válida.
 */
const assignPot = (
  clubs: readonly string[],
  nationsByGroup: readonly (readonly string[])[],
  slot = 0,
  used: readonly number[] = [],
): readonly string[] | null => {
  if (slot === nationsByGroup.length) return []
  for (let index = 0; index < clubs.length; index++) {
    if (used.includes(index)) continue
    if (nationsByGroup[slot].includes(nationOf(clubs[index]))) continue
    const rest = assignPot(clubs, nationsByGroup, slot + 1, [...used, index])
    if (rest) return [clubs[index], ...rest]
  }
  return null
}

/**
 * Monta os grupos tirando um clube de cada pote, na ordem sorteada e sem dois
 * clubes do mesmo país no mesmo grupo. Sem distribuição possível, o pote entra
 * na ordem embaralhada mesmo — o sorteio nunca trava.
 */
export const drawGroups = (
  clubIds: readonly string[],
  playerClubId: string | null,
  rng: RngState,
): RngResult<readonly (readonly string[])[]> => {
  const pots = buildPots(clubIds).map((pot) => [...pot])
  const groups: string[][] = Array.from({ length: GROUP_COUNT }, () => [])
  let current = rng

  /*
   * O clube do jogador abre o grupo A, saindo do pote dele — que NÃO é
   * necessariamente o primeiro. Um clube de força 3 pode terminar entre os
   * quatro primeiros da Série A numa temporada de zebra e cair num pote baixo.
   * Inferir o pote pelo tamanho do grupo assumia o contrário e, quando a
   * suposição falhava, sumia com um clube do sorteio e empurrava `undefined`
   * para dentro de um grupo.
   */
  const playerPot = playerClubId ? pots.findIndex((pot) => pot.includes(playerClubId)) : -1
  if (playerClubId && playerPot >= 0) {
    pots[playerPot].splice(pots[playerPot].indexOf(playerClubId), 1)
    groups[0].push(playerClubId)
  }

  for (let potIndex = 0; potIndex < POT_COUNT; potIndex++) {
    // o grupo do jogador não espera clube do pote de onde ele já saiu
    const pending = groups
      .map((_, index) => index)
      .filter((index) => index !== 0 || potIndex !== playerPot)
    const shuffled = shuffle(pots[potIndex], current)
    current = shuffled.next
    const nationsByGroup = pending.map((index) => groups[index].map(nationOf))
    const assigned =
      assignPot(shuffled.value, nationsByGroup) ?? shuffled.value.slice(0, pending.length)
    pending.forEach((groupIndex, slot) => groups[groupIndex].push(assigned[slot]))
  }

  return { value: groups.map((group) => group.slice(0, GROUP_SIZE)), next: current }
}
```

- [ ] **Step 4: Rodar o teste**

Run: `npx vitest run src/engine/libertados/draw.test.ts`
Expected: PASS

Se o teste de "dois clubes do mesmo país" falhar em alguma seed, é porque `assignPot` devolveu null — não existia distribuição válida para aquele pote nem com retrocesso. Investigue a composição do pote antes de afrouxar o teste: com no máximo quatro clubes por país e oito grupos, uma distribuição válida deveria existir sempre.

- [ ] **Step 5: Commit**

```bash
git add src/engine/libertados/draw.ts src/engine/libertados/draw.test.ts
git commit -m "feat: sorteio por potes da Copa Libertados"
```

---

### Task 5: Confrontos, tabela e agregado

**Files:**
- Create: `src/engine/libertados/fixtures.ts`
- Create: `src/engine/libertados/fixtures.test.ts`

**Interfaces:**
- Consumes: tipos da Task 3; `roundRobinFixtures` de `src/engine/season/roundrobin.ts`; `computeStandings` de `src/engine/season/season.ts`; `SeasonFixture`, `TableRow` de `src/engine/season/types.ts`
- Produces:
  - `groupFixtures(group: readonly string[], round: number): readonly SeasonFixture[]`
  - `groupStandingsFor(state: LibertadosState, group: readonly string[]): readonly TableRow[]`
  - `knockoutPairs(state: LibertadosState, stage: LibertadosKnockoutStage): readonly (readonly [string, string])[]`
  - `tieFixture(pair: readonly [string, string], round: number): SeasonFixture`
  - `tieWinner(state, stage, pair): string | null`
  - `stageWinners(state, stage): readonly string[]`
  - `playerFixture(state: LibertadosState): SeasonFixture | null`
  - `playerOpponentId(state: LibertadosState): string | null`

- [ ] **Step 1: Escrever o teste**

Criar `src/engine/libertados/fixtures.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { groupFixtures, knockoutPairs, playerFixture, tieFixture, tieWinner } from './fixtures'
import { GROUP_ROUNDS, type LibertadosMatch, type LibertadosState } from './types'

const GRUPO = ['a', 'b', 'c', 'd']

const estado = (over: Partial<LibertadosState> = {}): LibertadosState => ({
  seed: 1,
  year: 5,
  playerClubId: 'a',
  groups: [GRUPO, ['e', 'f', 'g', 'h'], ['i', 'j', 'k', 'l'], ['m', 'n', 'o', 'p'],
           ['q', 'r', 's', 't'], ['u', 'v', 'w', 'x'], ['y', 'z', 'a1', 'b1'], ['c1', 'd1', 'e1', 'f1']],
  stage: 'groups',
  round: 0,
  results: [],
  championId: null,
  ...over,
})

const jogo = (over: Partial<LibertadosMatch>): LibertadosMatch => ({
  stage: 'r16', round: 0, homeId: 'x', awayId: 'y', homeGoals: 0, awayGoals: 0, ...over,
})

describe('confrontos da Copa Libertados', () => {
  test('a fase de grupos tem seis rodadas: returno é o turno com mando trocado', () => {
    expect(GROUP_ROUNDS).toBe(6)
    for (let round = 0; round < 3; round++) {
      const ida = groupFixtures(GRUPO, round)
      const volta = groupFixtures(GRUPO, round + 3)
      expect(volta).toEqual(ida.map((f) => ({ homeId: f.awayId, awayId: f.homeId })))
    }
  })

  test('todo clube joga contra todos os outros duas vezes, uma em casa', () => {
    const jogos = Array.from({ length: GROUP_ROUNDS }, (_, r) => groupFixtures(GRUPO, r)).flat()
    expect(jogos).toHaveLength(12)
    for (const time of GRUPO) {
      expect(jogos.filter((f) => f.homeId === time)).toHaveLength(3)
      expect(jogos.filter((f) => f.awayId === time)).toHaveLength(3)
    }
  })

  test('o cabeça da chave decide em casa: ida fora, volta em casa', () => {
    expect(tieFixture(['cabeca', 'desafiante'], 0)).toEqual({ homeId: 'desafiante', awayId: 'cabeca' })
    expect(tieFixture(['cabeca', 'desafiante'], 1)).toEqual({ homeId: 'cabeca', awayId: 'desafiante' })
  })

  test('quem passa é o agregado dos dois jogos', () => {
    // cabeça perde por 1 fora e ganha por 3 em casa: 3x1 no agregado
    const state = estado({
      stage: 'r16',
      results: [
        jogo({ round: 0, homeId: 'desafiante', awayId: 'cabeca', homeGoals: 1, awayGoals: 0 }),
        jogo({ round: 1, homeId: 'cabeca', awayId: 'desafiante', homeGoals: 3, awayGoals: 0 }),
      ],
    })
    expect(tieWinner(state, 'r16', ['cabeca', 'desafiante'])).toBe('cabeca')
  })

  test('gol fora não vale nada: 1x0 fora e 0x1 em casa vai aos pênaltis', () => {
    const state = estado({
      stage: 'r16',
      results: [
        jogo({ round: 0, homeId: 'desafiante', awayId: 'cabeca', homeGoals: 0, awayGoals: 1 }),
        jogo({ round: 1, homeId: 'cabeca', awayId: 'desafiante', homeGoals: 0, awayGoals: 1, penaltyWinnerId: 'desafiante' }),
      ],
    })
    expect(tieWinner(state, 'r16', ['cabeca', 'desafiante'])).toBe('desafiante')
  })

  test('confronto sem os dois jogos ainda não tem vencedor', () => {
    const state = estado({
      stage: 'r16',
      results: [jogo({ round: 0, homeId: 'desafiante', awayId: 'cabeca', homeGoals: 2, awayGoals: 0 })],
    })
    expect(tieWinner(state, 'r16', ['cabeca', 'desafiante'])).toBeNull()
  })

  test('agregado empatado sem pênaltis registrados não elege ninguém', () => {
    // Arrange: 1x1 nos dois jogos e nenhum desempate gravado — estado que só
    // existe por defeito de quem gravou o resultado. Devolver o cabeça por
    // padrão inventaria um classificado que não venceu nada.
    const state = estado({
      stage: 'r16',
      results: [
        jogo({ round: 0, homeId: 'desafiante', awayId: 'cabeca', homeGoals: 1, awayGoals: 1 }),
        jogo({ round: 1, homeId: 'cabeca', awayId: 'desafiante', homeGoals: 1, awayGoals: 1 }),
      ],
    })

    // Act & Assert
    expect(tieWinner(state, 'r16', ['cabeca', 'desafiante'])).toBeNull()
  })

  test('fase seguinte só tem chave quando a anterior inteira terminou', () => {
    /*
     * Arrange: oitavas com um único confronto decidido. Se as quartas
     * montassem a chave com a lista encurtada, os pares sairiam desalinhados e
     * cruzariam clubes de metades diferentes da chave.
     */
    const state = estado({
      stage: 'quarter',
      results: [
        jogo({ stage: 'r16', round: 0, homeId: 'f', awayId: 'a', homeGoals: 0, awayGoals: 2 }),
        jogo({ stage: 'r16', round: 1, homeId: 'a', awayId: 'f', homeGoals: 3, awayGoals: 0 }),
      ],
    })

    // Act & Assert
    expect(knockoutPairs(state, 'quarter')).toEqual([])
  })

  test('as oitavas cruzam 1º de um grupo com 2º do vizinho', () => {
    // grupos vazios: computeStandings devolve a ordem de entrada, então o 1º do
    // grupo A é 'a' e o 2º do grupo B é 'f'
    const pares = knockoutPairs(estado({ stage: 'r16' }), 'r16')
    expect(pares).toHaveLength(8)
    expect(pares[0]).toEqual(['a', 'f'])
    expect(new Set(pares.flat()).size).toBe(16)
  })

  test('o jogo do jogador sai do grupo dele na rodada atual', () => {
    const fixture = playerFixture(estado({ stage: 'groups', round: 0 }))
    expect(fixture).not.toBeNull()
    expect([fixture!.homeId, fixture!.awayId]).toContain('a')
  })

  test('torneio encerrado não tem jogo do jogador', () => {
    expect(playerFixture(estado({ stage: 'eliminated' }))).toBeNull()
    expect(playerFixture(estado({ stage: 'champion' }))).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/engine/libertados/fixtures.test.ts`
Expected: FAIL — "Failed to resolve import ./fixtures"

- [ ] **Step 3: Implementar**

Criar `src/engine/libertados/fixtures.ts`:

```ts
import { roundRobinFixtures } from '../season/roundrobin'
import { computeStandings } from '../season/season'
import type { SeasonFixture, TableRow } from '../season/types'
import {
  GROUP_ROUNDS,
  isKnockoutStage,
  KNOCKOUT_ORDER,
  type LibertadosKnockoutStage,
  type LibertadosState,
} from './types'

/**
 * Confrontos da Libertados. Os grupos são ida e volta (returno = turno com o
 * mando trocado) e o mata-mata é um par [cabeça, desafiante] em que o cabeça
 * decide em casa.
 */

const TURN_ROUNDS = GROUP_ROUNDS / 2

export const groupFixtures = (
  group: readonly string[],
  round: number,
): readonly SeasonFixture[] => {
  const turn = roundRobinFixtures(group, round % TURN_ROUNDS)
  if (round < TURN_ROUNDS) return turn
  return turn.map((fixture) => ({ homeId: fixture.awayId, awayId: fixture.homeId }))
}

const groupResults = (state: LibertadosState, group: readonly string[]) =>
  state.results.filter((result) => result.stage === 'groups' && group.includes(result.homeId))

export const groupStandingsFor = (
  state: LibertadosState,
  group: readonly string[],
): readonly TableRow[] => computeStandings(group, groupResults(state, group))

const groupQualifiers = (state: LibertadosState, group: readonly string[]): readonly string[] =>
  groupStandingsFor(state, group).slice(0, 2).map((row) => row.clubId)

/**
 * Cruzamento clássico: o 1º de um grupo pega o 2º do grupo vizinho. Os
 * confrontos "de cima" vêm primeiro e os "de baixo" depois, para que dois
 * clubes do mesmo grupo só se reencontrem na final.
 */
const seededQualifiers = (state: LibertadosState): readonly string[] => {
  const byGroup = state.groups.map((group) => groupQualifiers(state, group))
  const upper: string[] = []
  const lower: string[] = []
  for (let i = 0; i + 1 < byGroup.length; i += 2) {
    const [first1, second1] = byGroup[i]
    const [first2, second2] = byGroup[i + 1]
    upper.push(first1, second2)
    lower.push(first2, second1)
  }
  return [...upper, ...lower]
}

const stageBefore = (stage: LibertadosKnockoutStage): LibertadosKnockoutStage | null => {
  const index = KNOCKOUT_ORDER.indexOf(stage)
  return index <= 0 ? null : KNOCKOUT_ORDER[index - 1]
}

export const stageAfter = (
  stage: LibertadosKnockoutStage,
): LibertadosKnockoutStage | 'champion' => {
  const index = KNOCKOUT_ORDER.indexOf(stage)
  return index === KNOCKOUT_ORDER.length - 1 ? 'champion' : KNOCKOUT_ORDER[index + 1]
}

/** Ida: casa do desafiante. Volta: casa do cabeça, que decide em casa. */
export const tieFixture = (pair: readonly [string, string], round: number): SeasonFixture =>
  round === 0
    ? { homeId: pair[1], awayId: pair[0] }
    : { homeId: pair[0], awayId: pair[1] }

const tieMatches = (
  state: LibertadosState,
  stage: LibertadosKnockoutStage,
  pair: readonly [string, string],
) =>
  state.results.filter(
    (result) =>
      result.stage === stage &&
      pair.includes(result.homeId) &&
      pair.includes(result.awayId),
  )

/**
 * Vencedor do confronto pelo agregado; null enquanto o confronto não tiver
 * dono. Agregado empatado só tem vencedor com os pênaltis registrados na
 * volta: sem eles o confronto ainda não terminou, e devolver um dos dois lados
 * por padrão inventaria um classificado.
 */
export const tieWinner = (
  state: LibertadosState,
  stage: LibertadosKnockoutStage,
  pair: readonly [string, string],
): string | null => {
  const matches = tieMatches(state, stage, pair)
  if (matches.length < 2) return null
  const goalsFor = (clubId: string): number =>
    matches.reduce(
      (sum, match) => sum + (match.homeId === clubId ? match.homeGoals : match.awayGoals),
      0,
    )
  const [head, challenger] = pair
  const headGoals = goalsFor(head)
  const challengerGoals = goalsFor(challenger)
  if (headGoals !== challengerGoals) return headGoals > challengerGoals ? head : challenger
  return matches.find((match) => match.penaltyWinnerId)?.penaltyWinnerId ?? null
}

/**
 * Os confrontos de uma fase, na ordem da chave.
 *
 * A chave de uma fase só existe quando TODOS os confrontos da fase anterior
 * terminaram: os pares saem de posições consecutivas na lista de vencedores, e
 * um vencedor faltando não deixaria só um buraco — ele encurtaria a lista e
 * desalinharia todos os pares seguintes, cruzando clubes de chaves diferentes.
 * Fase anterior incompleta devolve lista vazia.
 */
export const knockoutPairs = (
  state: LibertadosState,
  stage: LibertadosKnockoutStage,
): readonly (readonly [string, string])[] => {
  const previous = stageBefore(stage)
  let teams: readonly string[]
  if (previous === null) {
    teams = seededQualifiers(state)
  } else {
    const winners = knockoutPairs(state, previous).map((pair) =>
      tieWinner(state, previous, pair),
    )
    if (winners.length === 0 || winners.some((winner) => winner === null)) return []
    teams = winners as readonly string[]
  }
  const pairs: [string, string][] = []
  for (let i = 0; i + 1 < teams.length; i += 2) pairs.push([teams[i], teams[i + 1]])
  return pairs
}

/** Vencedores já decididos de uma fase, na ordem da chave. */
export const stageWinners = (
  state: LibertadosState,
  stage: LibertadosKnockoutStage,
): readonly string[] =>
  knockoutPairs(state, stage)
    .map((pair) => tieWinner(state, stage, pair))
    .filter((winner): winner is string => winner !== null)

/** O jogo atual do jogador, ou null se o torneio terminou para ele. */
export const playerFixture = (state: LibertadosState): SeasonFixture | null => {
  if (!state.playerClubId) return null
  if (state.stage === 'groups') {
    return (
      groupFixtures(state.groups[0], state.round).find(
        (fixture) =>
          fixture.homeId === state.playerClubId || fixture.awayId === state.playerClubId,
      ) ?? null
    )
  }
  if (!isKnockoutStage(state.stage)) return null
  const pair = knockoutPairs(state, state.stage).find((candidate) =>
    candidate.includes(state.playerClubId!),
  )
  return pair ? tieFixture(pair, state.round) : null
}

export const playerOpponentId = (state: LibertadosState): string | null => {
  const fixture = playerFixture(state)
  if (!fixture) return null
  return fixture.homeId === state.playerClubId ? fixture.awayId : fixture.homeId
}
```

- [ ] **Step 4: Rodar o teste**

Run: `npx vitest run src/engine/libertados/fixtures.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/libertados/fixtures.ts src/engine/libertados/fixtures.test.ts
git commit -m "feat: confrontos, tabela e agregado da Copa Libertados"
```

---

### Task 6: Criar, avançar e simular a edição

**Files:**
- Create: `src/engine/libertados/libertados.ts`
- Create: `src/engine/libertados/libertados.test.ts`

**Interfaces:**
- Consumes: tudo das Tasks 3-5; `clubById`; `createRng`, `nextFloat`
- Produces:
  - `createLibertados(seed, year, playerClubId, brazilianIds): LibertadosState`
  - `advanceLibertados(state, playerGoalsFor, playerGoalsAgainst, rng, playerShootoutWon?): RngResult<LibertadosAdvance>`
  - `simulateEdition(state, rng): RngResult<LibertadosState>`
  - `interface LibertadosAdvance { readonly state: LibertadosState; readonly playerPenaltyWon: boolean | null }`

- [ ] **Step 1: Escrever o teste**

Criar `src/engine/libertados/libertados.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { advanceLibertados, createLibertados, simulateEdition } from './libertados'
import { playerFixture, playerOpponentId } from './fixtures'
import { createRng } from '../rng'
import { GROUP_COUNT, GROUP_ROUNDS, GROUP_SIZE, isLibertadosRunning, type LibertadosState } from './types'

const BRASILEIROS = ['leoes-capital', 'mare-rubra', 'imperial', 'atlantico']

const nova = (seed = 42, playerClubId: string | null = BRASILEIROS[0]): LibertadosState =>
  createLibertados(seed, 6, playerClubId, BRASILEIROS)

/** Joga a edição inteira com o jogador vencendo por 2x0 sempre. */
const vencerTudo = (state: LibertadosState): LibertadosState => {
  let current = state
  let rng = createRng(1234)
  let guard = 0
  while (isLibertadosRunning(current.stage) && guard++ < 40) {
    const advanced = advanceLibertados(current, 2, 0, rng)
    current = advanced.value.state
    rng = advanced.next
  }
  return current
}

describe('edição da Copa Libertados', () => {
  test('nasce com 32 clubes em 8 grupos, o jogador na frente do grupo A', () => {
    const state = nova()
    expect(state.groups).toHaveLength(GROUP_COUNT)
    expect(state.groups.flat()).toHaveLength(GROUP_COUNT * GROUP_SIZE)
    expect(state.groups[0][0]).toBe(BRASILEIROS[0])
    expect(state.stage).toBe('groups')
    expect(state.championId).toBeNull()
  })

  test('os quatro brasileiros classificados estão na chave', () => {
    const todos = nova().groups.flat()
    for (const id of BRASILEIROS) expect(todos).toContain(id)
  })

  test('mesma seed, mesma edição', () => {
    expect(nova(88)).toEqual(nova(88))
  })

  test('cada rodada de grupo registra os 16 jogos da data', () => {
    const { value } = advanceLibertados(nova(), 1, 0, createRng(5))
    expect(value.state.results).toHaveLength(GROUP_COUNT * (GROUP_SIZE / 2))
    expect(value.state.round).toBe(1)
    expect(value.state.stage).toBe('groups')
  })

  test('vencendo tudo, o jogador passa dos grupos ao mata-mata', () => {
    let state = nova()
    let rng = createRng(3)
    for (let round = 0; round < GROUP_ROUNDS; round++) {
      const advanced = advanceLibertados(state, 3, 0, rng)
      state = advanced.value.state
      rng = advanced.next
    }
    expect(state.stage).toBe('r16')
    expect(state.round).toBe(0)
  })

  test('perdendo todos os jogos de grupo, o jogador é eliminado e o torneio ainda tem campeão', () => {
    let state = nova()
    let rng = createRng(4)
    for (let round = 0; round < GROUP_ROUNDS; round++) {
      const advanced = advanceLibertados(state, 0, 4, rng)
      state = advanced.value.state
      rng = advanced.next
    }
    expect(state.stage).toBe('eliminated')
    expect(state.championId).not.toBeNull()
    expect(state.championId).not.toBe(BRASILEIROS[0])
  })

  test('o mata-mata é ida e volta: só depois da volta a fase vira', () => {
    let state = nova()
    let rng = createRng(3)
    for (let round = 0; round < GROUP_ROUNDS; round++) {
      const advanced = advanceLibertados(state, 3, 0, rng)
      state = advanced.value.state
      rng = advanced.next
    }
    const ida = advanceLibertados(state, 1, 0, rng)
    expect(ida.value.state.stage).toBe('r16')
    expect(ida.value.state.round).toBe(1)
    const volta = advanceLibertados(ida.value.state, 1, 0, ida.next)
    expect(volta.value.state.stage).toBe('quarter')
    expect(volta.value.state.round).toBe(0)
  })

  test('agregado empatado no mata-mata vai aos pênaltis', () => {
    let state = nova()
    let rng = createRng(3)
    for (let round = 0; round < GROUP_ROUNDS; round++) {
      const advanced = advanceLibertados(state, 3, 0, rng)
      state = advanced.value.state
      rng = advanced.next
    }
    const ida = advanceLibertados(state, 0, 1, rng)
    const volta = advanceLibertados(ida.value.state, 1, 0, ida.next, true)
    expect(volta.value.playerPenaltyWon).toBe(true)
    expect(volta.value.state.stage).toBe('quarter')
  })

  test('vencer a final dá o título ao jogador', () => {
    const final = vencerTudo(nova())
    expect(final.stage).toBe('champion')
    expect(final.championId).toBe(BRASILEIROS[0])
  })

  test('perder a final dá a taça ao adversário, não deixa a edição sem campeão', () => {
    // Arrange: vence tudo até a volta da final
    let state = nova()
    let rng = createRng(1234)
    let guard = 0
    while (!(state.stage === 'final' && state.round === 1) && guard++ < 40) {
      const advanced = advanceLibertados(state, 2, 0, rng)
      state = advanced.value.state
      rng = advanced.next
    }
    const adversario = playerOpponentId(state)

    // Act: leva 0x4 na volta, revertendo o agregado
    const { value } = advanceLibertados(state, 0, 4, rng)

    // Assert
    expect(value.state.stage).toBe('eliminated')
    expect(value.state.championId).toBe(adversario)
  })

  test('eliminado na semifinal, a edição segue e entrega a taça a outro', () => {
    let state = nova()
    let rng = createRng(1234)
    let guard = 0
    while (state.stage !== 'semi' && guard++ < 40) {
      const advanced = advanceLibertados(state, 2, 0, rng)
      state = advanced.value.state
      rng = advanced.next
    }
    const ida = advanceLibertados(state, 0, 3, rng)
    const volta = advanceLibertados(ida.value.state, 0, 3, ida.next)

    expect(volta.value.state.stage).toBe('eliminated')
    expect(volta.value.state.championId).not.toBeNull()
    expect(volta.value.state.championId).not.toBe(BRASILEIROS[0])
  })

  test('o jogo do jogador sempre tem adversário enquanto o torneio roda', () => {
    let state = nova()
    let rng = createRng(9)
    let guard = 0
    while (isLibertadosRunning(state.stage) && guard++ < 40) {
      expect(playerFixture(state)).not.toBeNull()
      expect(playerOpponentId(state)).not.toBe(BRASILEIROS[0])
      const advanced = advanceLibertados(state, 2, 1, rng)
      state = advanced.value.state
      rng = advanced.next
    }
  })

  test('edição sem jogador roda sozinha e produz um campeão', () => {
    const { value } = simulateEdition(nova(21, null), createRng(77))
    expect(value.stage).toBe('champion')
    expect(value.championId).not.toBeNull()
    expect(value.groups.flat()).toContain(value.championId!)
  })

  test('simulação é determinística', () => {
    const a = simulateEdition(nova(21, null), createRng(77)).value
    const b = simulateEdition(nova(21, null), createRng(77)).value
    expect(a.championId).toBe(b.championId)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/engine/libertados/libertados.test.ts`
Expected: FAIL — "Failed to resolve import ./libertados"

- [ ] **Step 3: Implementar**

Criar `src/engine/libertados/libertados.ts`:

```ts
import { clubById } from '../../data/clubs'
import { createRng, nextFloat, type RngResult, type RngState } from '../rng'
import type { SeasonFixture } from '../season/types'
import { drawGroups, pickContinentalClubs } from './draw'
import {
  groupFixtures,
  groupStandingsFor,
  knockoutPairs,
  playerFixture,
  stageAfter,
  stageWinners,
  tieFixture,
  tieWinner,
} from './fixtures'
import {
  CONTINENTAL_SPOTS,
  GROUP_ROUNDS,
  isKnockoutStage,
  isLibertadosRunning,
  type LibertadosKnockoutStage,
  type LibertadosMatch,
  type LibertadosState,
} from './types'

/**
 * O ciclo da edição: sorteio, jogo do jogador, simulação do resto da data e
 * avanço de fase. Quando o jogador cai, o resto é simulado até a final — o
 * continente não para porque você foi eliminado.
 */

export const createLibertados = (
  seed: number,
  year: number,
  playerClubId: string | null,
  brazilianIds: readonly string[],
): LibertadosState => {
  const rng = createRng(seed)
  const drawn = pickContinentalClubs(CONTINENTAL_SPOTS, rng)
  const groups = drawGroups([...brazilianIds, ...drawn.value], playerClubId, drawn.next)
  return {
    seed,
    year,
    playerClubId,
    groups: groups.value,
    stage: 'groups',
    round: 0,
    results: [],
    championId: null,
  }
}

const simulateGoals = (clubId: string, rng: RngState): RngResult<number> => {
  const strength = clubById(clubId)?.strength ?? 3
  const spread = nextFloat(rng)
  const luck = nextFloat(spread.next)
  const expected = 0.5 + strength * 0.28 + (spread.value * 2 - 1) * 1.2 + (luck.value - 0.5)
  return { value: Math.max(0, Math.min(5, Math.round(expected))), next: luck.next }
}

const simulateMatch = (
  stage: 'groups' | LibertadosKnockoutStage,
  round: number,
  fixture: SeasonFixture,
  rng: RngState,
): RngResult<LibertadosMatch> => {
  const home = simulateGoals(fixture.homeId, rng)
  const away = simulateGoals(fixture.awayId, home.next)
  return {
    value: {
      stage,
      round,
      homeId: fixture.homeId,
      awayId: fixture.awayId,
      homeGoals: home.value,
      awayGoals: away.value,
    },
    next: away.next,
  }
}

/** Desempate por pênaltis do agregado, quando a volta termina igual na soma. */
const withShootout = (
  match: LibertadosMatch,
  pair: readonly [string, string],
  aggregateTied: boolean,
  rng: RngState,
): RngResult<LibertadosMatch> => {
  if (!aggregateTied) return { value: match, next: rng }
  const coin = nextFloat(rng)
  return {
    value: { ...match, penaltyWinnerId: coin.value < 0.5 ? pair[0] : pair[1] },
    next: coin.next,
  }
}

const aggregateOf = (
  matches: readonly LibertadosMatch[],
  clubId: string,
): number =>
  matches.reduce(
    (sum, match) => sum + (match.homeId === clubId ? match.homeGoals : match.awayGoals),
    0,
  )

/** Os jogos já registrados de um confronto do mata-mata. */
const tieMatchesOf = (
  state: LibertadosState,
  stage: LibertadosKnockoutStage,
  pair: readonly [string, string],
): readonly LibertadosMatch[] =>
  state.results.filter(
    (result) =>
      result.stage === stage && pair.includes(result.homeId) && pair.includes(result.awayId),
  )

/** Simula todos os jogos da data atual, pulando o do jogador. */
const simulateDate = (state: LibertadosState, rng: RngState): RngResult<readonly LibertadosMatch[]> => {
  const played: LibertadosMatch[] = []
  let current = rng

  if (state.stage === 'groups') {
    for (const group of state.groups) {
      for (const fixture of groupFixtures(group, state.round)) {
        if (fixture.homeId === state.playerClubId || fixture.awayId === state.playerClubId) continue
        const simulated = simulateMatch('groups', state.round, fixture, current)
        current = simulated.next
        played.push(simulated.value)
      }
    }
    return { value: played, next: current }
  }

  if (!isKnockoutStage(state.stage)) return { value: played, next: current }

  for (const pair of knockoutPairs(state, state.stage)) {
    if (state.playerClubId && pair.includes(state.playerClubId)) continue
    const fixture = tieFixture(pair, state.round)
    const simulated = simulateMatch(state.stage, state.round, fixture, current)
    current = simulated.next
    // na volta, agregado empatado precisa de vencedor
    if (state.round === 1) {
      const both = [...tieMatchesOf(state, state.stage, pair), simulated.value]
      const tied = aggregateOf(both, pair[0]) === aggregateOf(both, pair[1])
      const decided = withShootout(simulated.value, pair, tied, current)
      current = decided.next
      played.push(decided.value)
      continue
    }
    played.push(simulated.value)
  }
  return { value: played, next: current }
}

/** Decide o estado seguinte depois que a data inteira foi registrada. */
const advanceStage = (state: LibertadosState): LibertadosState => {
  if (state.stage === 'groups') {
    const nextRound = state.round + 1
    if (nextRound < GROUP_ROUNDS) return { ...state, round: nextRound }
    if (!state.playerClubId) return { ...state, round: 0, stage: 'r16' }
    const qualified = groupStandingsFor(state, state.groups[0])
      .slice(0, 2)
      .some((row) => row.clubId === state.playerClubId)
    return { ...state, round: 0, stage: qualified ? 'r16' : 'eliminated' }
  }

  if (!isKnockoutStage(state.stage)) return state
  if (state.round === 0) return { ...state, round: 1 }

  const stage = state.stage
  const playerWon =
    state.playerClubId === null ||
    stageWinners(state, stage).includes(state.playerClubId)

  // a final decide o campeão com ou sem você: perder ali dá a taça ao outro
  if (stageAfter(stage) === 'champion') {
    const champion = stageWinners(state, 'final')[0] ?? null
    return {
      ...state,
      stage: playerWon ? 'champion' : 'eliminated',
      round: 0,
      championId: champion,
    }
  }

  if (!playerWon) return { ...state, stage: 'eliminated' }
  return { ...state, stage: stageAfter(stage) as LibertadosKnockoutStage, round: 0 }
}

/** Roda o torneio até o fim sem jogo do jogador — é o mundo sem você. */
export const simulateEdition = (
  state: LibertadosState,
  rng: RngState,
): RngResult<LibertadosState> => {
  let current: LibertadosState = { ...state, playerClubId: null }
  let currentRng = rng
  let guard = 0
  while (isLibertadosRunning(current.stage) && guard++ < 40) {
    const date = simulateDate(current, currentRng)
    currentRng = date.next
    current = advanceStage({ ...current, results: [...current.results, ...date.value] })
  }
  return { value: current, next: currentRng }
}

export interface LibertadosAdvance {
  readonly state: LibertadosState
  /** Empate no agregado do jogador: quem levou nos pênaltis. */
  readonly playerPenaltyWon: boolean | null
}

interface DecidedPlayerMatch {
  readonly match: LibertadosMatch
  readonly playerPenaltyWon: boolean | null
}

/**
 * Fecha a volta do jogador nos pênaltis quando o agregado termina empatado.
 * Gravar o vencedor aqui não é detalhe: um confronto sem dono deixa a chave da
 * fase seguinte sem montar.
 */
const resolvePlayerShootout = (
  state: LibertadosState,
  stage: LibertadosKnockoutStage,
  scored: LibertadosMatch,
  rng: RngState,
  playerShootoutWon?: boolean,
): RngResult<DecidedPlayerMatch> => {
  const pair = knockoutPairs(state, stage).find((candidate) =>
    candidate.includes(state.playerClubId!),
  )
  const undecided: DecidedPlayerMatch = { match: scored, playerPenaltyWon: null }
  if (!pair) return { value: undecided, next: rng }

  const both = [...tieMatchesOf(state, stage, pair), scored]
  if (aggregateOf(both, pair[0]) !== aggregateOf(both, pair[1])) {
    return { value: undecided, next: rng }
  }

  const coin = nextFloat(rng)
  const playerPenaltyWon = playerShootoutWon ?? coin.value < 0.5
  const opponentId = pair[0] === state.playerClubId ? pair[1] : pair[0]
  return {
    value: {
      match: {
        ...scored,
        penaltyWinnerId: playerPenaltyWon ? state.playerClubId! : opponentId,
      },
      playerPenaltyWon,
    },
    next: coin.next,
  }
}

/**
 * O jogador caiu antes da final: o resto da edição roda simulado para o
 * campeão existir de qualquer jeito. Os jogos que ele já disputou continuam no
 * histórico — só o que falta é preenchido.
 */
const continueAfterElimination = (
  eliminated: LibertadosState,
  fromStage: LibertadosState['stage'],
  rng: RngState,
): RngResult<LibertadosState> => {
  const rest = simulateEdition({ ...eliminated, stage: fromStage, round: 0 }, rng)
  return {
    value: { ...eliminated, results: rest.value.results, championId: rest.value.championId },
    next: rest.next,
  }
}

/**
 * Fecha o jogo atual do jogador com o placar REAL e simula o resto da data.
 * Quando o jogador cai, o resto da edição é simulado para que o campeão exista.
 */
export const advanceLibertados = (
  state: LibertadosState,
  playerGoalsFor: number,
  playerGoalsAgainst: number,
  rng: RngState,
  /**
   * Rede de segurança para o agregado que chega empatado aqui. Na prática o
   * desempate acontece DENTRO da partida, no lance dos dados.
   */
  playerShootoutWon?: boolean,
): RngResult<LibertadosAdvance> => {
  const fixture = playerFixture(state)
  if (!fixture || !isLibertadosRunning(state.stage)) {
    return { value: { state, playerPenaltyWon: null }, next: rng }
  }

  const playerIsHome = fixture.homeId === state.playerClubId
  const stage = state.stage as 'groups' | LibertadosKnockoutStage
  const scored: LibertadosMatch = {
    stage,
    round: state.round,
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    homeGoals: playerIsHome ? playerGoalsFor : playerGoalsAgainst,
    awayGoals: playerIsHome ? playerGoalsAgainst : playerGoalsFor,
  }

  // volta do mata-mata com agregado empatado: alguém tem de passar
  const decided: RngResult<DecidedPlayerMatch> =
    isKnockoutStage(stage) && state.round === 1
      ? resolvePlayerShootout(state, stage, scored, rng, playerShootoutWon)
      : { value: { match: scored, playerPenaltyWon: null }, next: rng }

  const date = simulateDate(state, decided.next)
  const advanced = advanceStage({
    ...state,
    results: [...state.results, decided.value.match, ...date.value],
  })
  const { playerPenaltyWon } = decided.value

  // caiu antes da final: quem perde a PRÓPRIA final já sai com championId
  if (advanced.stage === 'eliminated' && advanced.championId === null) {
    const resumed = continueAfterElimination(
      advanced,
      // retoma da fase seguinte à que ele perdeu; dos grupos, vai às oitavas
      state.stage === 'groups' ? 'r16' : stageAfter(state.stage as LibertadosKnockoutStage),
      date.next,
    )
    return { value: { state: resumed.value, playerPenaltyWon }, next: resumed.next }
  }

  return { value: { state: advanced, playerPenaltyWon }, next: date.next }
}
```

- [ ] **Step 4: Rodar o teste**

Run: `npx vitest run src/engine/libertados/`
Expected: PASS — todos os quatro arquivos do módulo verdes.

- [ ] **Step 5: Commit**

```bash
git add src/engine/libertados/libertados.ts src/engine/libertados/libertados.test.ts
git commit -m "feat: ciclo completo da edição da Copa Libertados"
```

---

### Task 7: Calendário de duas competições

**Files:**
- Modify: `src/engine/career/calendar.ts` (arquivo inteiro)
- Modify: `src/engine/career/calendar.test.ts`

**Interfaces:**
- Consumes: `SEASON_ROUNDS` de `src/engine/season/types.ts`; `MATCHES_PER_EDITION` (Task 3)
- Produces:
  - `LEAGUE_WEEKDAYS: readonly number[]`, `CUP_WEEKDAYS: readonly number[]`
  - `leagueWeekdayFor(careerYear): number`, `cupWeekdayFor(careerYear): number`
  - `roundDate(careerYear, round, inLibertados?: boolean): CalendarDate`
  - `libertadosDate(careerYear, matchIndex): CalendarDate`
  - `compareDates(a, b): number`
  - `tournamentDate`, `seasonYearFor`, `BASE_SEASON_YEAR`, `CalendarDate` (inalterados)
- **Removidos:** `MATCH_DAY_PATTERNS` e `matchDaysFor` — quem usa é `SeasonCalendar.tsx` (Task 13) e o próprio teste.

- [ ] **Step 1: Reescrever o teste**

Substituir o conteúdo de `src/engine/career/calendar.test.ts` por:

```ts
import { describe, expect, test } from 'vitest'
import {
  compareDates,
  cupWeekdayFor,
  leagueWeekdayFor,
  libertadosDate,
  roundDate,
  seasonYearFor,
  tournamentDate,
} from './calendar'
import { SEASON_ROUNDS } from '../season/types'
import { MATCHES_PER_EDITION } from '../libertados/types'

const weekdayOf = (date: { year: number; month: number; day: number }): number =>
  new Date(Date.UTC(date.year, date.month, date.day)).getUTCDay()

const daysBetween = (
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number },
): number => (Date.UTC(b.year, b.month, b.day) - Date.UTC(a.year, a.month, a.day)) / 86_400_000

const SUNDAY = 0
const WEDNESDAY = 3
const THURSDAY = 4
const SATURDAY = 6

/** Anos de carreira variados: o alinhamento não pode depender do ano de estreia. */
const ANOS = [1, 2, 3, 4, 5, 8, 13, 21, 34]

describe('calendário real da temporada', () => {
  test('ano 1 da carreira é 2026; cada temporada avança um ano', () => {
    expect(seasonYearFor(1)).toBe(2026)
    expect(seasonYearFor(10)).toBe(2035)
  })

  test('a liga joga sábado ou domingo, alternando por temporada', () => {
    expect(leagueWeekdayFor(1)).toBe(SATURDAY)
    expect(leagueWeekdayFor(2)).toBe(SUNDAY)
    expect(leagueWeekdayFor(3)).toBe(SATURDAY)
  })

  test('a copa continental joga quarta ou quinta, alternando por temporada', () => {
    expect(cupWeekdayFor(1)).toBe(WEDNESDAY)
    expect(cupWeekdayFor(2)).toBe(THURSDAY)
  })

  test('sem Libertados a liga é semanal e fecha em maio', () => {
    const datas = Array.from({ length: SEASON_ROUNDS }, (_, round) => roundDate(1, round))
    expect(datas[0].month).toBe(2)
    expect(weekdayOf(datas[0])).toBe(SATURDAY)
    for (let i = 1; i < datas.length; i++) {
      expect(daysBetween(datas[i - 1], datas[i])).toBe(7)
    }
    expect(datas[datas.length - 1].month).toBe(4)
  })

  test('com Libertados a liga é quinzenal e se estica até agosto', () => {
    const datas = Array.from({ length: SEASON_ROUNDS }, (_, round) => roundDate(1, round, true))
    for (let i = 1; i < datas.length; i++) {
      expect(daysBetween(datas[i - 1], datas[i])).toBe(14)
    }
    expect(datas[datas.length - 1].month).toBe(7)
  })

  test('a rodada de abertura é a mesma nos dois ritmos', () => {
    expect(roundDate(1, 0, true)).toEqual(roundDate(1, 0))
  })

  test('a Libertados abre em abril e joga de quinze em quinze dias', () => {
    const datas = Array.from({ length: MATCHES_PER_EDITION }, (_, index) => libertadosDate(1, index))
    expect(datas[0].month).toBe(3)
    expect(weekdayOf(datas[0])).toBe(WEDNESDAY)
    for (let i = 1; i < datas.length; i++) {
      expect(daysBetween(datas[i - 1], datas[i])).toBe(14)
      expect(weekdayOf(datas[i])).toBe(WEDNESDAY)
    }
  })

  test('a edição abre em abril em qualquer ano de carreira', () => {
    for (const careerYear of ANOS) {
      const abertura = libertadosDate(careerYear, 0)
      expect(abertura.month).toBe(3)
      expect(weekdayOf(abertura)).toBe(cupWeekdayFor(careerYear))
    }
  })

  test('a edição fecha antes do torneio de seleções, em qualquer ano', () => {
    for (const careerYear of ANOS) {
      const ultima = libertadosDate(careerYear, MATCHES_PER_EDITION - 1)
      expect(compareDates(ultima, tournamentDate(careerYear))).toBeLessThan(0)
    }
  })

  test('todo jogo da Libertados divide a semana com uma rodada, em qualquer ano', () => {
    /*
     * É a razão de existir a cadência quinzenal. Ancorar as duas competições
     * de forma independente alinhava só no ano de estreia: do ano 3 em diante
     * nenhum jogo caía perto de uma rodada. Só valem os jogos disputados
     * enquanto a liga ainda está em andamento — depois dela, o continente
     * segue sozinho.
     */
    for (const careerYear of ANOS) {
      const rodadas = Array.from({ length: SEASON_ROUNDS }, (_, round) =>
        roundDate(careerYear, round, true),
      )
      const ultimaRodada = rodadas[rodadas.length - 1]
      for (let index = 0; index < MATCHES_PER_EDITION; index++) {
        const jogo = libertadosDate(careerYear, index)
        if (daysBetween(jogo, ultimaRodada) < 0) continue
        const acompanhado = rodadas.some((rodada) => Math.abs(daysBetween(jogo, rodada)) <= 3)
        expect(acompanhado).toBe(true)
      }
    }
  })

  test('compareDates ordena no tempo', () => {
    expect(compareDates({ year: 2026, month: 3, day: 1 }, { year: 2026, month: 3, day: 2 })).toBeLessThan(0)
    expect(compareDates({ year: 2026, month: 3, day: 2 }, { year: 2026, month: 3, day: 2 })).toBe(0)
  })

  test('torneio de seleções segue num domingo de dezembro', () => {
    const date = tournamentDate(2)
    expect(date.year).toBe(2027)
    expect(date.month).toBe(11)
    expect(weekdayOf(date)).toBe(SUNDAY)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/engine/career/calendar.test.ts`
Expected: FAIL — `leagueWeekdayFor` não existe

- [ ] **Step 3: Reescrever o calendário**

Substituir o conteúdo de `src/engine/career/calendar.ts` por:

```ts
/**
 * Calendário real da temporada. O ano N da carreira vira um ano de verdade e a
 * liga joga aos fins de semana: semanal numa temporada comum, quinzenal quando
 * o clube disputa a Copa Libertados — aí as quartas ficam para o continente e
 * as duas competições dividem a mesma semana, em vez de correrem separadas.
 */

export interface CalendarDate {
  readonly year: number
  readonly month: number
  readonly day: number
}

/** Ano real do primeiro ano de carreira. */
export const BASE_SEASON_YEAR = 2026

/** Mês (0-11) da rodada de abertura da liga. */
const OPENING_MONTH = 2
/** Mês (0-11) do primeiro jogo da Libertados — sempre abril. */
const LIBERTADOS_MONTH = 3

const WEEK_DAYS = 7
const FORTNIGHT_DAYS = 14

/** Dias possíveis de rodada (0=domingo), alternando por temporada. */
export const LEAGUE_WEEKDAYS: readonly number[] = [6, 0] // sábado, domingo
export const CUP_WEEKDAYS: readonly number[] = [3, 4] // quarta, quinta

const alternating = (days: readonly number[], careerYear: number): number =>
  days[(careerYear - 1) % days.length]

export const leagueWeekdayFor = (careerYear: number): number =>
  alternating(LEAGUE_WEEKDAYS, careerYear)

export const cupWeekdayFor = (careerYear: number): number =>
  alternating(CUP_WEEKDAYS, careerYear)

export const seasonYearFor = (careerYear: number): number =>
  BASE_SEASON_YEAR + careerYear - 1

/** Primeira ocorrência de um dia da semana no mês (0=domingo). */
const firstWeekdayOf = (year: number, month: number, weekday: number): CalendarDate => {
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay()
  return { year, month, day: 1 + ((weekday - firstDay + 7) % 7) }
}

const addDays = (date: CalendarDate, days: number): CalendarDate => {
  const shifted = new Date(Date.UTC(date.year, date.month, date.day + days))
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  }
}

/** Ordena duas datas no tempo: negativo se `a` vem antes. */
export const compareDates = (a: CalendarDate, b: CalendarDate): number =>
  Date.UTC(a.year, a.month, a.day) - Date.UTC(b.year, b.month, b.day)

/**
 * Data real da rodada (0-based): sai do primeiro dia de jogo de março e anda de
 * semana em semana — ou de quinze em quinze dias, em ano de Libertados.
 */
export const roundDate = (
  careerYear: number,
  round: number,
  inLibertados = false,
): CalendarDate => {
  const opening = firstWeekdayOf(
    seasonYearFor(careerYear),
    OPENING_MONTH,
    leagueWeekdayFor(careerYear),
  )
  return addDays(opening, round * (inLibertados ? FORTNIGHT_DAYS : WEEK_DAYS))
}

/**
 * Data real de um jogo da Libertados (0-13): abril, de quinze em quinze dias.
 *
 * A âncora sai do calendário da LIGA, não de uma data própria. O jogo
 * continental é sempre o meio de semana que antecede uma rodada — é isso que
 * faz as duas competições dividirem a semana. Ancorar as duas de forma
 * independente (primeiro sábado de março de um lado, primeira quarta de abril
 * do outro) alinhava por sorte: a distância entre as âncoras muda de ano para
 * ano e, fora do ano de estreia, nenhum jogo caía perto de uma rodada.
 */
export const libertadosDate = (careerYear: number, matchIndex: number): CalendarDate => {
  const leagueWeekday = leagueWeekdayFor(careerYear)
  const daysBefore = (leagueWeekday - cupWeekdayFor(careerYear) + 7) % 7
  const opening = firstWeekdayOf(seasonYearFor(careerYear), OPENING_MONTH, leagueWeekday)
  // a edição abre em abril: anda de quinzena em quinzena até chegar no mês
  let first = addDays(opening, -daysBefore)
  while (first.month < LIBERTADOS_MONTH) first = addDays(first, FORTNIGHT_DAYS)
  return addDays(first, matchIndex * FORTNIGHT_DAYS)
}

const firstSundayOf = (year: number, month: number): CalendarDate =>
  firstWeekdayOf(year, month, 0)

/** Data real do torneio de seleções (dezembro). */
export const tournamentDate = (careerYear: number): CalendarDate =>
  firstSundayOf(seasonYearFor(careerYear), 11)
```

- [ ] **Step 4: Rodar o teste**

Run: `npx vitest run src/engine/career/calendar.test.ts`
Expected: PASS

Nota: `npm run build` ainda vai falhar em `SeasonCalendar.tsx`, que importa `matchDaysFor`. A Task 13 corrige — é esperado até lá.

- [ ] **Step 5: Commit**

```bash
git add src/engine/career/calendar.ts src/engine/career/calendar.test.ts
git commit -m "feat: calendário com dois ritmos para conviver com a Libertados"
```

---

### Task 8: Save v20 — estado, taça e classificação

**Files:**
- Modify: `src/state/save.ts`
- Modify: `src/state/save.test.ts`

**Interfaces:**
- Consumes: `LibertadosState`, `isLibertadosRunning` (Task 3); `createLibertados`, `simulateEdition` (Task 6); `computeTable`, `isSeasonOver`; `simulateDivisionOrder` de `src/engine/pyramid/pyramid.ts`
- Produces:
  - `PlayerSave` ganha `libertados: LibertadosState | null`, `libertadosQualified: boolean`, `continentalChampions: readonly ContinentalTitle[]`
  - `interface ContinentalTitle { readonly year: number; readonly clubId: string }`
  - `TrophyKind` ganha `'libertados'`; `Competition` ganha `'libertados'`
  - `withLibertadosState(save, state): PlayerSave`
  - `applyLibertados(save, state: LibertadosState | null): PlayerSave`
  - `LIBERTADOS_PRIZE = 10_000_000`
  - `LIBERTADOS_SPOTS = 4`
  - `isInLibertados(save): boolean`

- [ ] **Step 1: Escrever o teste**

Adicionar em `src/state/save.test.ts` (imports novos no topo conforme necessário):

```ts
import { createLibertados } from '../engine/libertados/libertados'
import {
  applyLibertados,
  isInLibertados,
  LIBERTADOS_PRIZE,
  withLibertadosState,
} from './save'

describe('Copa Libertados no save', () => {
  const base = () => createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!

  test('carreira nova nasce sem Libertados e sem vaga', () => {
    const save = base()
    expect(save.libertados).toBeNull()
    expect(save.libertadosQualified).toBe(false)
    expect(save.continentalChampions).toEqual([])
    expect(isInLibertados(save)).toBe(false)
  })

  test('vencer a Libertados dá taça e prêmio uma vez só', () => {
    const save = base()
    const edicao = createLibertados(9, save.careerYear, save.clubId, [save.clubId, 'mare-rubra', 'imperial', 'atlantico'])
    const campeao = { ...edicao, stage: 'champion' as const, championId: save.clubId }
    const primeiro = withLibertadosState(save, campeao)
    const segundo = withLibertadosState(primeiro, campeao)

    expect(primeiro.trophies).toHaveLength(1)
    expect(primeiro.trophies[0].kind).toBe('libertados')
    expect(primeiro.budget).toBe(save.budget + LIBERTADOS_PRIZE)
    expect(segundo.trophies).toHaveLength(1)
    expect(segundo.budget).toBe(primeiro.budget)
  })

  test('campeão continental entra no histórico mesmo sem o título ser seu', () => {
    const save = base()
    const edicao = createLibertados(9, save.careerYear, save.clubId, [save.clubId, 'mare-rubra', 'imperial', 'atlantico'])
    const eliminado = { ...edicao, stage: 'eliminated' as const, championId: 'sa-charrua' }
    const updated = withLibertadosState(save, eliminado)

    expect(updated.continentalChampions).toEqual([{ year: save.careerYear, clubId: 'sa-charrua' }])
    expect(updated.trophies).toHaveLength(0)
  })

  test('dispensar o torneio limpa o estado sem perder o histórico', () => {
    const save = base()
    const edicao = createLibertados(9, save.careerYear, save.clubId, [save.clubId, 'mare-rubra', 'imperial', 'atlantico'])
    const comHistorico = withLibertadosState(save, { ...edicao, stage: 'eliminated', championId: 'sa-inti' })
    const limpo = applyLibertados(comHistorico, null)

    expect(limpo.libertados).toBeNull()
    expect(limpo.continentalChampions).toHaveLength(1)
  })

  test('terminar no topo da Série A classifica para o ano seguinte', () => {
    // Arrange: clube da Série A com a temporada encerrada em 1º lugar
    const save = base()
    const encerrada = {
      ...save.season,
      currentRound: SEASON_ROUNDS,
      results: save.season.participants
        .filter((id) => id !== save.clubId)
        .map((id, index) => ({ round: index, homeId: save.clubId, awayId: id, homeGoals: 5, awayGoals: 0 })),
    }

    // Act
    const proxima = startNewSeason({ ...save, season: encerrada }, () => 0.5)

    // Assert
    expect(proxima.libertadosQualified).toBe(true)
    expect(proxima.libertados).not.toBeNull()
    expect(proxima.libertados!.playerClubId).toBe(save.clubId)
    expect(proxima.libertados!.groups.flat()).toContain(save.clubId)
  })

  test('dispensar o torneio não faz a virada do ano gravar um segundo campeão', () => {
    /*
     * Arrange: torneio disputado e encerrado, campeão já no histórico, e o
     * card dispensado — o que zera `save.libertados`. Sem guarda por ano, a
     * virada leria isso como "ano sem jogador" e simularia outra edição.
     */
    const save = base()
    const edicao = createLibertados(9, save.careerYear, save.clubId, [save.clubId, 'mare-rubra', 'imperial', 'atlantico'])
    const encerrado = withLibertadosState(save, { ...edicao, stage: 'eliminated', championId: 'sa-inti' })
    const dispensado = applyLibertados(encerrado, null)

    // Act
    const proxima = startNewSeason(dispensado, () => 0.5)

    // Assert
    const doAno = proxima.continentalChampions.filter((title) => title.year === save.careerYear)
    expect(doAno).toHaveLength(1)
    expect(doAno[0].clubId).toBe('sa-inti')
  })

  test('sem classificação, a edição do ano roda simulada e vira histórico', () => {
    // Arrange: clube da Série D nunca entra no top 4 da Série A
    const save = createSave({ playerName: 'Tuca', clubId: 'real-vila' })!

    // Act
    const proxima = startNewSeason(save, () => 0.5)

    // Assert
    expect(proxima.libertadosQualified).toBe(false)
    expect(proxima.libertados).toBeNull()
    expect(proxima.continentalChampions).toHaveLength(1)
    expect(proxima.continentalChampions[0].year).toBe(save.careerYear)
    expect(proxima.continentalChampions[0].clubId).not.toBe(save.clubId)
  })

  test('save da versão anterior carrega sem Libertados', () => {
    const antigo = JSON.stringify({ ...base(), version: 19, libertados: undefined })
    const carregado = parseSave(antigo)

    expect(carregado).not.toBeNull()
    expect(carregado!.version).toBe(SAVE_VERSION)
    expect(carregado!.libertados).toBeNull()
    expect(carregado!.continentalChampions).toEqual([])
  })
})
```

Se `SEASON_ROUNDS`, `startNewSeason`, `parseSave` ou `SAVE_VERSION` ainda não estiverem importados no arquivo de teste, adicionar aos imports do topo.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/state/save.test.ts`
Expected: FAIL — `withLibertadosState` não existe

- [ ] **Step 3: Estender os tipos do save**

Em `src/state/save.ts`:

Bumpar a versão (linha 53):

```ts
export const SAVE_VERSION = 20
```

Adicionar aos imports do topo:

```ts
import type { LibertadosState } from '../engine/libertados/types'
import { isLibertadosRunning } from '../engine/libertados/types'
import { createLibertados, simulateEdition } from '../engine/libertados/libertados'
import { simulateDivisionOrder } from '../engine/pyramid/pyramid'
```

(`simulateDivisionOrder` pode já vir do import existente de `pyramid`; nesse caso só acrescentar o nome.)

Ampliar `Competition` (linha 128):

```ts
export type Competition = 'liga' | 'amistoso' | 'selecao' | 'libertados'
```

Ampliar `TrophyKind` (linha 226):

```ts
export type TrophyKind = 'serie-a' | 'serie-b' | 'serie-c' | 'serie-d' | TournamentKind | 'libertados'
```

Adicionar em `PlayerSave`, depois de `tournament` (linha 150):

```ts
  /** Edição da Copa Libertados em andamento — null fora do torneio. */
  readonly libertados: LibertadosState | null
  /** Vaga conquistada na temporada passada: joga a Libertados deste ano. */
  readonly libertadosQualified: boolean
  /** Campeões continentais recentes, com ou sem você. */
  readonly continentalChampions: readonly ContinentalTitle[]
```

E o tipo, junto de `Trophy`:

```ts
export interface ContinentalTitle {
  readonly year: number
  readonly clubId: string
}

/** Prêmio do título continental — acima do da Série A, como o peso da taça. */
export const LIBERTADOS_PRIZE = 10_000_000
/** Quantos clubes da Série A vão à Libertados. */
export const LIBERTADOS_SPOTS = 4
/** Quantos campeões continentais o save guarda. */
const CONTINENTAL_HISTORY_LIMIT = 10
```

Em `createSave`, no objeto devolvido (junto de `tournament: null`, linha 330):

```ts
    libertados: null,
    libertadosQualified: false,
    continentalChampions: [],
```

- [ ] **Step 4: Implementar taça, prêmio e histórico**

Adicionar em `src/state/save.ts`, logo depois de `withTournamentState` (linha 531):

```ts
/** O clube está na Libertados nesta temporada? Decide o ritmo do calendário. */
export const isInLibertados = (save: PlayerSave): boolean => save.libertados !== null

/**
 * Aplica o estado da Libertados. Título dá TAÇA e prêmio em dinheiro; o campeão
 * da edição — seja quem for — entra no histórico continental. Os dois só
 * acontecem uma vez, para reaplicar o mesmo estado não pagar de novo.
 */
export const withLibertadosState = (save: PlayerSave, state: LibertadosState): PlayerSave => {
  const becameChampion = state.stage === 'champion' && save.libertados?.stage !== 'champion'
  const alreadyLogged = save.continentalChampions.some((title) => title.year === state.year)
  const logChampion = state.championId !== null && !alreadyLogged

  return {
    ...save,
    libertados: state,
    trophies: becameChampion
      ? [...save.trophies, { kind: 'libertados', year: save.careerYear }]
      : save.trophies,
    budget: becameChampion ? save.budget + LIBERTADOS_PRIZE : save.budget,
    continentalChampions: logChampion
      ? [...save.continentalChampions, { year: state.year, clubId: state.championId! }].slice(
          -CONTINENTAL_HISTORY_LIMIT,
        )
      : save.continentalChampions,
  }
}

/** Guarda ou dispensa a edição sem mexer no histórico já registrado. */
export const applyLibertados = (
  save: PlayerSave,
  state: LibertadosState | null,
): PlayerSave => (state === null ? { ...save, libertados: null } : withLibertadosState(save, state))
```

- [ ] **Step 5: Classificar na virada do ano**

Em `src/state/save.ts`, dentro de `startNewSeason` (linha 923), adicionar depois do cálculo de `nextSeason` e antes de montar `updated`:

```ts
  /*
   * Libertados do ano que vem: os 4 primeiros da Série A. A tabela da SUA
   * divisão é real; se você não está na Série A, a ordem dela é simulada.
   */
  const serieAOrder =
    playerDivision === 0
      ? finalOrder
      : simulateDivisionOrder(save.divisions[0], createRng(shiftSeed ^ 0x2c1b3a5f)).value
  const qualifiers = serieAOrder.slice(0, LIBERTADOS_SPOTS)
  const nextQualified = qualifiers.includes(save.clubId)
  const nextYear = save.careerYear + 1
  const editionSeed = seasonSeed(roll)
  const nextLibertados = nextQualified
    ? createLibertados(editionSeed, nextYear, save.clubId, qualifiers)
    : null

  /*
   * Ano sem você: a edição que se encerra agora roda simulada, para o
   * continente ter campeão de qualquer jeito. Com você, o campeão já foi
   * registrado quando o torneio terminou.
   *
   * Quem disputou essa edição saiu da Série A do ano PASSADO, e aquela tabela
   * não fica guardada — então ela é reconstruída pela seed do próprio ano.
   * Reaproveitar os classificados recém-apurados colocaria na edição que
   * acabou justamente os clubes que só entram na próxima.
   *
   * A guarda por ano é o que impede um segundo campeão para a mesma
   * temporada: dispensar o card de fim de torneio zera `save.libertados`, e
   * sem ela a virada do ano trataria uma edição já disputada como ano sem
   * jogador, simulando uma segunda por cima.
   */
  const alreadyLogged = save.continentalChampions.some(
    (title) => title.year === save.careerYear,
  )
  const pastQualifiers = simulateDivisionOrder(
    save.divisions[0],
    createRng((editionSeed ^ 0x7f4a7c15) >>> 0),
  ).value.slice(0, LIBERTADOS_SPOTS)
  const finishedEdition =
    save.libertados || alreadyLogged
      ? null
      : simulateEdition(
          createLibertados(editionSeed ^ 0x2545f491, save.careerYear, null, pastQualifiers),
          createRng(editionSeed ^ 0x1b873593),
        ).value
  const continentalChampions =
    finishedEdition?.championId
      ? [
          ...save.continentalChampions,
          { year: save.careerYear, clubId: finishedEdition.championId },
        ].slice(-CONTINENTAL_HISTORY_LIMIT)
      : save.continentalChampions
```

E dentro do objeto `updated`, adicionar:

```ts
    libertados: nextLibertados,
    libertadosQualified: nextQualified,
    continentalChampions,
```

- [ ] **Step 6: Migrar saves antigos**

Em `src/state/save.ts`, adicionar antes de `parseCurrent`:

```ts
const isValidLibertados = (value: unknown): value is LibertadosState => {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Record<string, unknown>
  return (
    typeof state.seed === 'number' &&
    typeof state.year === 'number' &&
    Array.isArray(state.groups) &&
    state.groups.length > 0 &&
    state.groups.every((group) => Array.isArray(group)) &&
    typeof state.stage === 'string' &&
    Array.isArray(state.results)
  )
}

const normalizeContinentalChampions = (value: unknown): readonly ContinentalTitle[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (entry): entry is ContinentalTitle =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as ContinentalTitle).year === 'number' &&
        typeof (entry as ContinentalTitle).clubId === 'string',
    )
    .slice(-CONTINENTAL_HISTORY_LIMIT)
}
```

Dentro de `parseCurrent`, no objeto `base`, junto de `tournament`:

```ts
    libertados: isValidLibertados(candidate.libertados) ? candidate.libertados : null,
    libertadosQualified: candidate.libertadosQualified === true,
    continentalChampions: normalizeContinentalChampions(candidate.continentalChampions),
```

E em `parseSave`, adicionar `candidate.version === 19` à lista de versões aceitas (a linha `candidate.version === 18 ||` ganha uma irmã logo abaixo).

Verificar também `normalizeTrophies` e a validação de `MatchRecord.competition`: se elas comparam contra uma lista fixa de valores, incluir `'libertados'` nas duas.

- [ ] **Step 7: Rodar os testes**

Run: `npx vitest run src/state/save.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/state/save.ts src/state/save.test.ts
git commit -m "feat: save v20 com estado, taça e classificação da Libertados"
```

---

### Task 9: Próximo compromisso da temporada

**Files:**
- Create: `src/engine/career/nextFixture.ts`
- Create: `src/engine/career/nextFixture.test.ts`

**Interfaces:**
- Consumes: `roundDate`, `libertadosDate`, `compareDates`, `CalendarDate` (Task 7); `libertadosMatchIndex`, `isLibertadosRunning` (Task 3); `isSeasonOver` de season; `PlayerSave`, `isInLibertados` (Task 8)
- Produces:
  - `type FixtureKind = 'liga' | 'libertados'`
  - `interface NextFixture { readonly kind: FixtureKind; readonly date: CalendarDate }`
  - `nextFixture(save: PlayerSave): NextFixture | null`

- [ ] **Step 1: Escrever o teste**

Criar `src/engine/career/nextFixture.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { nextFixture } from './nextFixture'
import { createSave, type PlayerSave } from '../../state/save'
import { createLibertados } from '../libertados/libertados'
import { SEASON_ROUNDS } from '../season/types'

const BRASILEIROS = ['leoes-capital', 'mare-rubra', 'imperial', 'atlantico']

const base = (): PlayerSave => createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!

const comLibertados = (over: Partial<PlayerSave> = {}): PlayerSave => {
  const save = base()
  return {
    ...save,
    libertados: createLibertados(4, save.careerYear, save.clubId, BRASILEIROS),
    libertadosQualified: true,
    ...over,
  }
}

describe('próximo compromisso da temporada', () => {
  test('sem Libertados, o compromisso é sempre a rodada da liga', () => {
    expect(nextFixture(base())?.kind).toBe('liga')
  })

  test('temporada encerrada e sem torneio não tem compromisso', () => {
    const save = base()
    expect(nextFixture({ ...save, season: { ...save.season, currentRound: SEASON_ROUNDS } })).toBeNull()
  })

  test('em março, antes de a Libertados começar, a liga vem primeiro', () => {
    const escolhido = nextFixture(comLibertados())
    expect(escolhido?.kind).toBe('liga')
    expect(escolhido?.date.month).toBe(2)
  })

  test('com a liga adiantada, o jogo do continente vem primeiro', () => {
    // liga na 10ª rodada (julho) e Libertados ainda na 1ª rodada de grupo (abril)
    const save = comLibertados()
    const escolhido = nextFixture({ ...save, season: { ...save.season, currentRound: 10 } })
    expect(escolhido?.kind).toBe('libertados')
    expect(escolhido?.date.month).toBe(3)
  })

  test('torneio encerrado deixa só a liga', () => {
    const save = comLibertados()
    const encerrado = { ...save.libertados!, stage: 'eliminated' as const }
    expect(nextFixture({ ...save, libertados: encerrado })?.kind).toBe('liga')
  })

  test('liga encerrada deixa só o torneio', () => {
    const save = comLibertados()
    const escolhido = nextFixture({ ...save, season: { ...save.season, currentRound: SEASON_ROUNDS } })
    expect(escolhido?.kind).toBe('libertados')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/engine/career/nextFixture.test.ts`
Expected: FAIL — "Failed to resolve import ./nextFixture"

- [ ] **Step 3: Implementar**

Criar `src/engine/career/nextFixture.ts`:

```ts
import { isInLibertados, type PlayerSave } from '../../state/save'
import { isLibertadosRunning, libertadosMatchIndex } from '../libertados/types'
import { isSeasonOver } from '../season/season'
import { compareDates, libertadosDate, roundDate, type CalendarDate } from './calendar'

/**
 * Com duas competições abertas, "próxima rodada" não basta: quem joga primeiro
 * é quem tem a data mais próxima. É esta função que a Home consulta.
 */

export type FixtureKind = 'liga' | 'libertados'

export interface NextFixture {
  readonly kind: FixtureKind
  readonly date: CalendarDate
}

export const nextFixture = (save: PlayerSave): NextFixture | null => {
  const inLibertados = isInLibertados(save)

  const league: NextFixture | null = isSeasonOver(save.season)
    ? null
    : { kind: 'liga', date: roundDate(save.careerYear, save.season.currentRound, inLibertados) }

  const cup: NextFixture | null =
    save.libertados && isLibertadosRunning(save.libertados.stage)
      ? {
          kind: 'libertados',
          date: libertadosDate(
            save.careerYear,
            libertadosMatchIndex(
              save.libertados.stage as 'groups' | 'r16' | 'quarter' | 'semi' | 'final',
              save.libertados.round,
            ),
          ),
        }
      : null

  if (!league) return cup
  if (!cup) return league
  return compareDates(cup.date, league.date) < 0 ? cup : league
}
```

- [ ] **Step 4: Rodar o teste**

Run: `npx vitest run src/engine/career/nextFixture.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/career/nextFixture.ts src/engine/career/nextFixture.test.ts
git commit -m "feat: escolha do próximo compromisso entre liga e Libertados"
```

---

### Task 10: Troféu na estante

**Files:**
- Create: `scripts/trophy-from-art.mjs`
- Create: `src/assets/trophies/libertados.png` (gerado da arte-fonte)
- Modify: `src/ui/TrophyRoom.tsx`

**Interfaces:**
- Consumes: `TrophyKind` com `'libertados'` (Task 8)
- Produces: nada novo — só fecha os `Record<TrophyKind, string>`

- [ ] **Step 1: Preparar a arte para a estante**

A arte-fonte (`src/assets/images/art-source/objetos/libertados_trofeu.png`) é um PNG
de 1054×1492 **sem canal alfa**, com fundo magenta de chroma-key. Copiada como
está, ela vira um retângulo rosa na estante: `.trophy-img` aplica
`drop-shadow` sobre um cartão escuro, efeito que só funciona com silhueta
recortada. Os sete troféus que já existem são RGBA de 160px de altura, entre
21 KB e 37 KB — a arte crua tem 1,1 MB.

Criar `scripts/trophy-from-art.mjs` (o repo já usa `sharp` em
`scripts/slice-faces.mjs`):

```js
import sharp from 'sharp'

/**
 * Prepara a arte de um troféu para a Sala de Troféus: derruba o fundo de
 * chroma-key, apara as bordas vazias e reduz para a altura de exibição.
 *
 * A arte-fonte vem em alta resolução e com fundo chapado, do jeito que o
 * ilustrador entrega. A estante precisa do oposto: silhueta recortada, para o
 * drop-shadow funcionar, e alguns quilobytes em vez de um megabyte.
 */

const [, , input, output] = process.argv
if (!input || !output) {
  console.error('uso: node scripts/trophy-from-art.mjs <arte.png> <destino.png>')
  process.exit(1)
}

/** Altura dos troféus já existentes na estante. */
const TARGET_HEIGHT = 160
/** Distância máxima até a cor de fundo para o pixel virar transparente. */
const CHROMA_TOLERANCE = 90

const source = sharp(input)
const { width, height } = await source.metadata()
const pixels = await source.ensureAlpha().raw().toBuffer()

// a cor do canto superior esquerdo é o fundo — é assim que a arte é entregue
const [keyRed, keyGreen, keyBlue] = pixels

for (let i = 0; i < pixels.length; i += 4) {
  const distance = Math.hypot(
    pixels[i] - keyRed,
    pixels[i + 1] - keyGreen,
    pixels[i + 2] - keyBlue,
  )
  if (distance <= CHROMA_TOLERANCE) pixels[i + 3] = 0
}

await sharp(pixels, { raw: { width, height, channels: 4 } })
  .trim()
  .resize({ height: TARGET_HEIGHT })
  .png({ compressionLevel: 9 })
  .toFile(output)

console.log(`gravado ${output}`)
```

Rodar:

```bash
node scripts/trophy-from-art.mjs \
  src/assets/images/art-source/objetos/libertados_trofeu.png \
  src/assets/trophies/libertados.png
```

Conferir o resultado antes de seguir — ele precisa bater com os vizinhos:

```bash
file src/assets/trophies/libertados.png src/assets/trophies/copa-mundo.png
ls -l src/assets/trophies/
```

Esperado: `8-bit/color RGBA`, altura 160, tamanho na casa das dezenas de KB.
Se o fundo não sair limpo, ajuste `CHROMA_TOLERANCE` — magenta puro contra
prata e madeira tem folga grande, mas a arte pode ter antisserrilhado nas
bordas.

- [ ] **Step 2: Registrar na sala de troféus**

Em `src/ui/TrophyRoom.tsx`, adicionar o import junto dos outros troféus:

```ts
import trophyLibertados from '../assets/trophies/libertados.png'
```

Adicionar em `TROPHY_IMAGES`:

```ts
  libertados: trophyLibertados,
```

E em `TROPHY_LABELS`:

```ts
  libertados: 'Copa Libertados',
```

- [ ] **Step 3: Verificar o typecheck**

Run: `npx tsc -b --force`
Expected: nenhum erro em `TrophyRoom.tsx` (os dois `Record<TrophyKind, string>` estão completos).

- [ ] **Step 4: Commit**

A arte-fonte também entra: ela estava fora do controle de versão.

```bash
git add scripts/trophy-from-art.mjs src/assets/trophies/libertados.png \
  src/assets/images/art-source/objetos/libertados_trofeu.png src/ui/TrophyRoom.tsx
git commit -m "feat: taça da Copa Libertados na sala de troféus"
```

---

### Task 11: Cerimônia de entrada

**Files:**
- Create: `src/ui/LibertadosIntro.tsx`
- Create: `src/ui/styles/libertados.css`

**Interfaces:**
- Consumes: `LibertadosState` (Task 3); `clubById`, `continentalClubById`; `ClubCrest`; `NationFlag`; `nationOf` (Task 4); `LIBERTADOS_NAME` (Task 3)
- Produces: `LibertadosIntro` — props `{ state: LibertadosState; clubName: string; playerName: string; onDone: () => void }`

- [ ] **Step 1: Criar a cerimônia**

Criar `src/ui/LibertadosIntro.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import trophyLibertados from '../assets/trophies/libertados.png'
import { clubById } from '../data/clubs'
import { nationOf } from '../engine/libertados/draw'
import { GROUP_SIZE, LIBERTADOS_NAME, type LibertadosState } from '../engine/libertados/types'
import { nationById } from '../data/nations'
import { ClubCrest } from './ClubCrest'
import { NationFlag } from './NationFlag'
import './styles/libertados.css'

/**
 * A entrada na Libertados. Vale o mesmo que a convocação para a seleção: sem
 * cerimônia, o continente inteiro apareceria de uma vez numa tabela. Aqui a
 * taça entra, os potes giram e os três adversários do grupo são revelados um
 * a um.
 *
 * Sai igual à convocação e à abertura de partida: escurece até o preto antes
 * de revelar a tela, para todas as transições terem a mesma linguagem.
 */

const HOLD_MS = 15000
const DARKEN_MS = 420
const REVEAL_MS = 420

type Phase = 'show' | 'dark' | 'reveal'

interface LibertadosIntroProps {
  readonly state: LibertadosState
  readonly clubName: string
  readonly playerName: string
  readonly onDone: () => void
}

export const LibertadosIntro = ({
  state,
  clubName,
  playerName,
  onDone,
}: LibertadosIntroProps) => {
  const [phase, setPhase] = useState<Phase>('show')
  const timers = useRef<number[]>([])
  /*
   * A guarda de saída mora numa ref, não no estado: o timer de HOLD_MS é
   * agendado uma vez, na montagem, e carrega a `phase` congelada daquela
   * renderização. Lendo o estado, ele acharia que a cerimônia ainda está
   * rodando mesmo depois de o jogador ter pulado, e chamaria `onDone` de novo.
   */
  const leaving = useRef(false)

  const leave = (): void => {
    if (leaving.current) return
    leaving.current = true
    setPhase('dark')
    timers.current.push(window.setTimeout(() => setPhase('reveal'), DARKEN_MS))
    timers.current.push(window.setTimeout(onDone, DARKEN_MS + REVEAL_MS))
  }

  useEffect(() => {
    timers.current.push(window.setTimeout(leave, HOLD_MS))
    return () => {
      for (const id of timers.current) window.clearTimeout(id)
    }
    // dispara uma vez; o resto é encadeado pelos timers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
   * Os adversários do grupo. O corte em GROUP_SIZE - 1 protege a edição sem
   * jogador: ali o filtro não tira ninguém, e o quarto card entraria sem
   * atraso próprio, fora da cascata de revelação.
   */
  const rivals = state.groups[0]
    .filter((id) => id !== state.playerClubId)
    .slice(0, GROUP_SIZE - 1)
    .map((id) => clubById(id))
    .filter((club): club is NonNullable<typeof club> => club !== null)

  return (
    <div
      className={`libertados-intro match-intro-${phase}`}
      role="button"
      tabIndex={0}
      aria-label="Pular a abertura da Copa Libertados"
      onClick={leave}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') leave() }}
    >
      <img className="libertados-trophy" src={trophyLibertados} alt="" aria-hidden="true" />

      <h2 className="libertados-word">{LIBERTADOS_NAME.toUpperCase()}</h2>
      <p className="libertados-year">Temporada {state.year}</p>

      <p className="libertados-club">
        <strong>{clubName}</strong> está na fase de grupos.
      </p>

      <div className="libertados-pots" aria-hidden="true">
        {[0, 1, 2, 3].map((pot) => (
          <span key={pot} className={`libertados-pot libertados-pot-${pot}`}>{pot + 1}</span>
        ))}
      </div>

      <p className="libertados-draw-label">Grupo A</p>
      <div className="libertados-rivals">
        {rivals.map((club, index) => {
          const nation = nationById(nationOf(club.id))
          return (
            <div className={`libertados-rival libertados-rival-${index + 1}`} key={club.id}>
              <ClubCrest club={club} size={44} />
              <strong className="libertados-rival-name">{club.name}</strong>
              {nation && (
                <span className="libertados-rival-nation">
                  <NationFlag nationId={nation.id} size={14} title={nation.name} />
                  {nation.name}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <p className="libertados-line">
        O continente inteiro na frente, {playerName}. Vai buscar.
      </p>

      <span className="match-intro-skip">toque para pular</span>
    </div>
  )
}
```

- [ ] **Step 2: Estilizar**

Criar `src/ui/styles/libertados.css`:

```css
/* Cerimônia de entrada e aba da Copa Libertados. */

.libertados-intro {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  padding: 1.5rem;
  text-align: center;
  background: radial-gradient(circle at 50% 20%, #1d3d2a 0%, #0b1410 60%, #05080a 100%);
  color: #f5f0e6;
  cursor: pointer;
  overflow-y: auto;
}

/*
 * A taça é estreita e alta (47×160). Dimensionar pela LARGURA a esticava para
 * mais de 600px de altura e empurrava o sorteio para fora da tela — a altura é
 * que manda aqui.
 */
.libertados-trophy {
  height: min(34vh, 220px);
  width: auto;
  filter: drop-shadow(0 0 26px rgba(242, 194, 48, 0.55));
  animation: libertados-rise 1.1s cubic-bezier(0.2, 0.8, 0.3, 1) both;
}

@keyframes libertados-rise {
  from { opacity: 0; transform: translateY(38px) scale(0.86); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.libertados-word {
  margin: 0;
  font-size: clamp(1.6rem, 6vw, 2.6rem);
  letter-spacing: 0.14em;
  color: #f2c230;
  animation: libertados-fade 0.7s ease both 0.9s;
}

.libertados-year,
.libertados-club {
  margin: 0;
  animation: libertados-fade 0.7s ease both 1.4s;
}

.libertados-pots {
  display: flex;
  gap: 0.6rem;
  animation: libertados-fade 0.7s ease both 2.1s;
}

.libertados-pot {
  display: grid;
  place-items: center;
  width: 2.1rem;
  height: 2.1rem;
  border: 1px solid rgba(242, 194, 48, 0.5);
  border-radius: 50%;
  font-size: 0.85rem;
  animation: libertados-spin 1.6s ease-in-out infinite;
}

.libertados-pot-1 { animation-delay: 0.12s; }
.libertados-pot-2 { animation-delay: 0.24s; }
.libertados-pot-3 { animation-delay: 0.36s; }

@keyframes libertados-spin {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.libertados-draw-label {
  margin: 0.3rem 0 0;
  font-size: 0.8rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.75;
  animation: libertados-fade 0.6s ease both 2.6s;
}

.libertados-rivals {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.1rem;
}

.libertados-rival {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 6.5rem;
  opacity: 0;
  animation: libertados-drop 0.6s cubic-bezier(0.2, 0.8, 0.3, 1) both;
}

.libertados-rival-1 { animation-delay: 3s; }
.libertados-rival-2 { animation-delay: 4.2s; }
.libertados-rival-3 { animation-delay: 5.4s; }

.libertados-rival-name { font-size: 0.85rem; }

.libertados-rival-nation {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  opacity: 0.72;
}

.libertados-line {
  margin: 0.4rem 0 0;
  font-size: 1rem;
  animation: libertados-fade 0.8s ease both 6.6s;
}

@keyframes libertados-fade {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes libertados-drop {
  from { opacity: 0; transform: translateY(-16px) scale(0.9); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .libertados-trophy,
  .libertados-word,
  .libertados-year,
  .libertados-club,
  .libertados-pots,
  .libertados-pot,
  .libertados-draw-label,
  .libertados-rival,
  .libertados-line {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

- [ ] **Step 3: Verificar o typecheck**

Run: `npx tsc -b --force`
Expected: nenhum erro novo (`SeasonCalendar.tsx` ainda pode acusar `matchDaysFor` — resolve na Task 13).

- [ ] **Step 4: Commit**

```bash
git add src/ui/LibertadosIntro.tsx src/ui/styles/libertados.css
git commit -m "feat: cerimônia de entrada da Copa Libertados"
```

---

### Task 12: Aba da Libertados

**Files:**
- Create: `src/ui/tabs/LibertadosTab.tsx`
- Modify: `src/ui/styles/libertados.css` (estilos da aba)

**Interfaces:**
- Consumes: `groupStandingsFor`, `knockoutPairs` (Task 5); `groupLetter`, `STAGE_NAMES`, `KNOCKOUT_ORDER`, `LIBERTADOS_NAME`, `isKnockoutStage` (Task 3); `nationOf` (Task 4); `clubDisplayName`, `displayClub`, `PlayerSave` de save; `ClubCrest`, `NationFlag`
- Produces: `LibertadosTab` — props `{ save: PlayerSave }`

- [ ] **Step 1: Criar a aba**

Criar `src/ui/tabs/LibertadosTab.tsx`:

```tsx
import { clubById } from '../../data/clubs'
import { nationById } from '../../data/nations'
import { nationOf } from '../../engine/libertados/draw'
import { groupStandingsFor, knockoutPairs, tieWinner } from '../../engine/libertados/fixtures'
import {
  groupLetter,
  KNOCKOUT_ORDER,
  LIBERTADOS_NAME,
  STAGE_NAMES,
  type LibertadosKnockoutStage,
  type LibertadosState,
} from '../../engine/libertados/types'
import { clubDisplayName, displayClub, type PlayerSave } from '../../state/save'
import { ClubCrest } from '../ClubCrest'
import { NationFlag } from '../NationFlag'
import '../styles/libertados.css'

/**
 * A aba da Copa Libertados. Só existe enquanto a edição está aberta — é onde
 * se acompanha o grupo, os outros sete e a chave inteira com o agregado dos
 * confrontos.
 */

interface LibertadosTabProps {
  readonly save: PlayerSave
}

/** Placar somado do confronto: "3 × 2", "1 × 1 (ida)" ou "2 × 2 nos pênaltis". */
const aggregateLabel = (
  state: LibertadosState,
  stage: LibertadosKnockoutStage,
  pair: readonly [string, string],
): string => {
  const matches = state.results.filter(
    (result) =>
      result.stage === stage && pair.includes(result.homeId) && pair.includes(result.awayId),
  )
  if (matches.length === 0) return 'a jogar'
  const goalsOf = (clubId: string): number =>
    matches.reduce(
      (sum, match) => sum + (match.homeId === clubId ? match.homeGoals : match.awayGoals),
      0,
    )
  const score = `${goalsOf(pair[0])} × ${goalsOf(pair[1])}`
  if (matches.length === 1) return `${score} (ida)`
  /*
   * Agregado empatado só tem vencedor nos pênaltis. Sem dizer isso, a tela
   * mostraria um empate com um dos lados em negrito e nenhuma explicação de
   * por que ele passou.
   */
  return matches.some((match) => match.penaltyWinnerId) ? `${score} nos pênaltis` : score
}

export const LibertadosTab = ({ save }: LibertadosTabProps) => {
  const state = save.libertados
  if (!state) {
    return (
      <div className="tab-panel">
        <div className="card">
          <span className="card-label">{LIBERTADOS_NAME}</span>
          <p className="muted">
            Sua vaga sai da Série A: terminar entre os quatro primeiros classifica o clube para a
            edição do ano seguinte.
          </p>
        </div>
      </div>
    )
  }

  const activeKnockout = KNOCKOUT_ORDER.filter((stage) =>
    state.results.some((result) => result.stage === stage),
  )

  return (
    <div className="tab-panel">
      <div className="card libertados-head">
        <div>
          <strong>{LIBERTADOS_NAME}</strong>
          <p className="muted">
            Temporada {state.year} · {STAGE_NAMES[state.stage]}
          </p>
        </div>
      </div>

      <div className="libertados-groups">
        {state.groups.map((group, groupIndex) => (
          <div className="card card-wide" key={groupLetter(groupIndex)}>
            <span className="card-label">
              Grupo {groupLetter(groupIndex)}
              {groupIndex === 0 && state.playerClubId ? ' · o seu' : ''}
            </span>
            <div
              className="league-table"
              role="table"
              aria-label={`Grupo ${groupLetter(groupIndex)}`}
            >
              <div className="table-row table-head" role="row">
                <span className="table-pos">#</span>
                <span className="table-club">Clube</span>
                <span className="table-num">P</span>
                <span className="table-num">J</span>
                <span className="table-num">GP</span>
                <span className="table-num">GC</span>
                <span className="table-num">SG</span>
              </div>
              {groupStandingsFor(state, group).map((row, position) => {
                const club = clubById(row.clubId)
                const nation = nationById(nationOf(row.clubId))
                if (!club) return null
                return (
                  <div
                    key={row.clubId}
                    className={`table-row${row.clubId === state.playerClubId ? ' table-player' : ''}${position < 2 ? ' table-through' : ''}`}
                    role="row"
                  >
                    <span className="table-pos">{position + 1}</span>
                    <span className="table-club">
                      <ClubCrest
                        club={displayClub(save, club)}
                        customUrl={save.customClubCrests[club.id]}
                        size={16}
                      />
                      <span className="table-club-name">{clubDisplayName(save, club.id)}</span>
                      {nation && <NationFlag nationId={nation.id} size={12} title={nation.name} />}
                    </span>
                    <span className="table-num table-points">{row.points}</span>
                    <span className="table-num">{row.played}</span>
                    <span className="table-num">{row.goalsFor}</span>
                    <span className="table-num">{row.goalsAgainst}</span>
                    <span className="table-num">{row.goalsFor - row.goalsAgainst}</span>
                  </div>
                )
              })}
            </div>
            <p className="muted table-note">Os 2 primeiros avançam · ida e volta.</p>
          </div>
        ))}
      </div>

      {activeKnockout.map((stage) => (
        <div className="card card-wide" key={stage}>
          <span className="card-label">{STAGE_NAMES[stage]}</span>
          {knockoutPairs(state, stage).map((pair) => {
            const head = clubById(pair[0])
            const challenger = clubById(pair[1])
            if (!head || !challenger) return null
            const winner = tieWinner(state, stage, pair)
            return (
              <div className="libertados-tie" key={`${stage}-${pair[0]}`}>
                <span className={`libertados-tie-side${winner === pair[0] ? ' libertados-tie-won' : ''}`}>
                  <ClubCrest club={displayClub(save, head)} customUrl={save.customClubCrests[head.id]} size={16} />
                  {head.abbr}
                </span>
                <span className="libertados-tie-score">{aggregateLabel(state, stage, pair)}</span>
                <span className={`libertados-tie-side${winner === pair[1] ? ' libertados-tie-won' : ''}`}>
                  {challenger.abbr}
                  <ClubCrest club={displayClub(save, challenger)} customUrl={save.customClubCrests[challenger.id]} size={16} />
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Estilizar a aba**

Adicionar ao final de `src/ui/styles/libertados.css`:

```css
.libertados-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.libertados-groups {
  display: grid;
  gap: 0.75rem;
}

@media (min-width: 720px) {
  .libertados-groups { grid-template-columns: 1fr 1fr; }
}

.libertados-tie {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.libertados-tie:last-child { border-bottom: none; }

.libertados-tie-side {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  opacity: 0.72;
}

.libertados-tie-side:last-child { justify-content: flex-end; }

.libertados-tie-won {
  opacity: 1;
  font-weight: 700;
}

.libertados-tie-score {
  font-variant-numeric: tabular-nums;
  font-size: 0.82rem;
  opacity: 0.85;
}
```

- [ ] **Step 3: Verificar o typecheck**

Run: `npx tsc -b --force`
Expected: nenhum erro novo em `LibertadosTab.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/ui/tabs/LibertadosTab.tsx src/ui/styles/libertados.css
git commit -m "feat: aba da Copa Libertados com grupos e chave"
```

---

### Task 13: Ligar tudo no App

**Files:**
- Modify: `src/ui/App.tsx`
- Modify: `src/ui/tabs/HomeTab.tsx`
- Modify: `src/ui/SeasonCalendar.tsx`

**Interfaces:**
- Consumes: tudo das tasks anteriores
- Produces: fluxo jogável de ponta a ponta — cerimônia, partida, avanço, aba e calendário

- [ ] **Step 1: Estender o fluxo de partida no App**

Em `src/ui/App.tsx`:

Adicionar aos imports:

```ts
import { advanceLibertados } from '../engine/libertados/libertados'
import { isLibertadosRunning, LIBERTADOS_NAME } from '../engine/libertados/types'
import { playerOpponentId as libertadosOpponentId } from '../engine/libertados/fixtures'
import { applyLibertados, withLibertadosState } from '../state/save'
import { LibertadosIntro } from './LibertadosIntro'
import { LibertadosTab } from './tabs/LibertadosTab'
```

Ampliar os tipos de aba e de partida (linhas 75 e 82-86):

```ts
type Tab = 'home' | 'matches' | 'selecao' | 'libertados' | 'team' | 'market' | 'profile'
```

```ts
interface MatchSetup {
  readonly seed: number
  readonly kind: 'liga' | 'torneio' | 'libertados'
  readonly club: Club
  readonly opponent: Club
}
```

Estender `applyMatchOutcome` (linhas 89-116), adicionando um ramo antes do `return`:

```ts
  } else if (kind === 'libertados' && updated.libertados) {
    const advanced = advanceLibertados(
      updated.libertados,
      record.teamGoals,
      record.opponentGoals,
      createRng((seed ^ 0x3c6ef372) >>> 0),
      shootoutFor(seed).playerWon,
    )
    updated = withLibertadosState(updated, advanced.value.state)
  }
```

Adicionar a aba na barra (linha 193):

```ts
  { id: 'libertados', icon: Trophy, label: 'Libertados' },
```

E ampliar o filtro de abas visíveis (linhas 299-302):

```ts
  const visibleTabs = useMemo(
    () =>
      TAB_ITEMS.filter(
        (item) =>
          (item.id !== 'selecao' || save?.tournament) &&
          (item.id !== 'libertados' || save?.libertados),
      ),
    [save?.tournament, save?.libertados],
  )
```

- [ ] **Step 2: Iniciar a partida da Libertados**

Ainda em `src/ui/App.tsx`, adicionar depois de `startTournamentMatch` (linha 372):

```ts
  /* a abertura da Libertados roda uma vez, antes do primeiro jogo da edição */
  const [libertadosCeremony, setLibertadosCeremony] = useState(false)

  /** Abre a tela de partida da Libertados, sem passar pela cerimônia. */
  const openLibertadosMatch = (): void => {
    if (!save?.libertados || !club) return
    const opponentId = libertadosOpponentId(save.libertados)
    const base = opponentId ? clubById(opponentId) : null
    if (!base) return
    initAudio()
    const seed = Date.now() & 0xffffffff
    const opponent = displayClub(save, base)
    markPendingMatch(localStorage, { opponentId: opponent.id, kind: 'libertados', seed })
    setMatchSetup({ seed, kind: 'libertados', club, opponent })
    setScreen('match')
  }

  const startLibertadosMatch = (): void => {
    if (!save?.libertados) return
    // a edição estreia pela cerimônia; dela se vai direto para o jogo
    if (save.libertados.results.length === 0) {
      setLibertadosCeremony(true)
      return
    }
    openLibertadosMatch()
  }

  /*
   * Sair da cerimônia abre a partida DIRETO. Voltar por `startLibertadosMatch`
   * caía de novo no teste de "edição sem jogos" — que continua verdadeiro
   * antes do primeiro jogo — e reabria a cerimônia no mesmo ciclo de
   * renderização: a tela ficava transparente, mas o overlay seguia montado por
   * cima de tudo, engolindo os cliques.
   */
  const finishLibertadosCeremony = (): void => {
    setLibertadosCeremony(false)
    openLibertadosMatch()
  }
```

Nota: `markPendingMatch` grava `kind`; conferir se o tipo de `PendingMatch` em `src/state/pendingMatch.ts` aceita `'libertados'` e, se não, ampliá-lo junto com `forfeitRecord` (o W.O. da Libertados conta como derrota, igual aos outros).

E cobrir esse mapeamento com teste, em `src/state/pendingMatch.test.ts`:

```ts
test('forfeitRecord de Libertados computa como jogo continental', () => {
  // Arrange
  const pending = { opponentId: 'sa-charrua', kind: 'libertados' as const, seed: 7 }

  // Act
  const record = forfeitRecord(pending, 1_700_000_000_000)

  // Assert
  expect(record.competition).toBe('libertados')
  expect(record.teamGoals).toBe(0)
  expect(record.opponentGoals).toBeGreaterThan(0)
})

test('readPendingMatch aceita uma partida de Libertados gravada', () => {
  // Arrange
  const storage = new Map<string, string>()
  const fake = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value) },
    removeItem: (key: string) => { storage.delete(key) },
  }
  markPendingMatch(fake, { opponentId: 'sa-inti', kind: 'libertados', seed: 3 })

  // Act
  const lido = readPendingMatch(fake)

  // Assert
  expect(lido?.kind).toBe('libertados')
})
```

Ajustar os nomes/assinaturas ao que o arquivo de teste já usa (o helper de storage
falso pode já existir ali; reaproveite em vez de duplicar).

Renderizar a cerimônia junto da convocação (linha 659):

```tsx
      {libertadosCeremony && save.libertados && (
        <LibertadosIntro
          state={save.libertados}
          clubName={club.name}
          playerName={save.playerName}
          onDone={finishLibertadosCeremony}
        />
      )}
```

E a aba, junto das outras (linha 691):

```tsx
      {tab === 'libertados' && <LibertadosTab save={save} />}
```

- [ ] **Step 3: Passar o jogo certo para a partida**

Ainda em `src/ui/App.tsx`, no bloco `screen === 'match'` (linhas 506-557), ajustar as props que hoje assumem só liga ou seleção:

- O rótulo do cabeçalho:

```tsx
            {matchSetup.kind === 'torneio'
              ? 'Jogo da seleção'
              : matchSetup.kind === 'libertados'
                ? LIBERTADOS_NAME
                : `Rodada ${save.season.currentRound + 1}`}
```

- `competition`:

```tsx
          competition={
            matchSetup.kind === 'torneio'
              ? 'selecao'
              : matchSetup.kind === 'libertados'
                ? 'libertados'
                : 'liga'
          }
```

- `decisive` — o mata-mata da Libertados só é decisivo na VOLTA, porque a ida pode terminar empatada:

```tsx
          decisive={
            (matchSetup.kind === 'torneio' &&
              save.tournament !== null &&
              save.tournament.stage !== 'groups' &&
              isTournamentRunning(save.tournament.stage)) ||
            (matchSetup.kind === 'libertados' &&
              save.libertados !== null &&
              save.libertados.stage !== 'groups' &&
              save.libertados.round === 1 &&
              isLibertadosRunning(save.libertados.stage))
          }
```

- `stadiumUrl` e `opponentDivision` tratam a Libertados como jogo de Série A (o adversário é sempre um clube de primeira divisão):

```tsx
          stadiumUrl={stadiumBackgroundUrl(
            stadiumTierFor(
              matchSetup.kind === 'torneio' ? null : divisionOf(save.divisions, save.clubId),
              matchSetup.kind === 'torneio' ? 'selecao' : 'liga',
            ),
          )}
          opponentDivision={matchSetup.kind === 'torneio' ? -1 : 0}
          lineup={matchSetup.kind === 'torneio' ? undefined : save.lineup}
          signings={matchSetup.kind === 'torneio' ? undefined : save.signings}
```

E em `onMatchFinished`, todo jogo desemboca na Home — é lá que estão o próximo
compromisso, a reação ao que acabou de acontecer e o fecho de temporada:

```tsx
    setMatchSetup(null)
    setScreen('tabs')
    // todo jogo desemboca na Home: é lá que estão o próximo compromisso, a
    // reação ao que acabou de acontecer e o fecho de temporada
    setTab('home')
```

- [ ] **Step 4: Card do próximo compromisso na Home**

Em `src/ui/tabs/HomeTab.tsx`:

Adicionar aos imports:

```ts
import { nextFixture } from '../../engine/career/nextFixture'
import { isLibertadosRunning, LIBERTADOS_NAME, STAGE_NAMES as LIBERTADOS_STAGE_NAMES } from '../../engine/libertados/types'
import { playerOpponentId as libertadosOpponentId } from '../../engine/libertados/fixtures'
import { clubById } from '../../data/clubs'
import { displayClub } from '../../state/save'
```

Adicionar às props:

```ts
  readonly onPlayLibertadosMatch: () => void
  readonly onDismissLibertados: () => void
```

Adicionar ao corpo do componente, junto dos outros derivados (depois da linha 98):

```ts
  const libertados = save.libertados
  const libertadosActive = libertados !== null && isLibertadosRunning(libertados.stage)
  const libertadosDone = libertados !== null && !isLibertadosRunning(libertados.stage)
  const libertadosRivalBase = libertadosActive ? clubById(libertadosOpponentId(libertados) ?? '') : null
  const libertadosRival = libertadosRivalBase ? displayClub(save, libertadosRivalBase) : null
  // com duas competições, quem joga primeiro é quem tem a data mais próxima
  const upNext = nextFixture(save)?.kind ?? 'liga'
```

E renderizar os dois cards novos, logo antes do bloco `{tournamentActive && ...}` (linha 238):

```tsx
      {libertadosActive && libertadosRival && (
        <div className="card callup-card">
          <div>
            <strong>{LIBERTADOS_NAME} · {LIBERTADOS_STAGE_NAMES[libertados.stage]}</strong>
            <p className="muted">
              {libertados.stage === 'groups'
                ? `Jogo ${libertados.round + 1}/6 do grupo: `
                : libertados.round === 0
                  ? 'Jogo de ida: '
                  : 'Jogo de volta: '}
              {club.name} × {libertadosRival.name}
            </p>
            {upNext === 'liga' && (
              <p className="muted">A rodada da liga vem antes deste jogo.</p>
            )}
          </div>
          <button className="btn callup-btn" onClick={onPlayLibertadosMatch}>Jogar</button>
        </div>
      )}

      {libertadosDone && (
        <div className="card callup-card">
          <div>
            <strong>
              {libertados.stage === 'champion'
                ? `CAMPEÃO DA ${LIBERTADOS_NAME.toUpperCase()}!`
                : `Fim de linha na ${LIBERTADOS_NAME}.`}
            </strong>
            <p className="muted">
              {libertados.stage === 'champion'
                ? 'O continente é seu. A taça já está na estante.'
                : `Quem levou a taça foi ${clubById(libertados.championId ?? '')?.name ?? 'outro clube'}. Ano que vem tem mais.`}
            </p>
          </div>
          <button className="btn btn-secondary callup-btn" onClick={onDismissLibertados}>OK</button>
        </div>
      )}
```

E no `App.tsx`, passar as duas props novas para o `HomeTab`:

```tsx
          onPlayLibertadosMatch={startLibertadosMatch}
          onDismissLibertados={() => save && updateSave(applyLibertados(save, null))}
```

- [ ] **Step 5: Marcar a Libertados no calendário**

Em `src/ui/SeasonCalendar.tsx`:

Trocar o import de `matchDaysFor` (linha 5) por:

```ts
import {
  leagueWeekdayFor,
  cupWeekdayFor,
  libertadosDate,
  roundDate,
  seasonYearFor,
  tournamentDate,
} from '../engine/career/calendar'
import { libertadosMatchIndex, MATCHES_PER_EDITION, LIBERTADOS_NAME } from '../engine/libertados/types'
import { isInLibertados } from '../state/save'
```

Ajustar `buildSchedule` para receber o ritmo certo — trocar a chamada de `roundDate` (linha 45) por:

```ts
    const date = roundDate(save.careerYear, round, isInLibertados(save))
```

Substituir o rótulo do rodapé (linhas 56-62 e 169-172). Trocar `WEEKDAY_NAMES`/`matchDayLabel` por:

```ts
const WEEKDAY_NAMES = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados']
```

```ts
  const inLibertados = isInLibertados(save)
  const matchDayLabel = WEEKDAY_NAMES[leagueWeekdayFor(save.careerYear)]
  const cupDayLabel = WEEKDAY_NAMES[cupWeekdayFor(save.careerYear)]
```

```tsx
      <p className="muted table-note">
        Rodadas {inLibertados ? 'quinzenais' : 'semanais'} às {matchDayLabel}
        {inLibertados ? ` · ${LIBERTADOS_NAME} às ${cupDayLabel}, de quinze em quinze dias.` : ''}
        {cupName ? ` · ${cupName} em dezembro.` : ''}
      </p>
```

Adicionar o mapa dos jogos continentais, depois de `schedule` (linha 63):

```ts
  /** Datas da Libertados indexadas por "mês-dia", com o adversário quando houver. */
  const cupSchedule = new Map<string, string | null>()
  if (save.libertados) {
    const state = save.libertados
    for (let index = 0; index < MATCHES_PER_EDITION; index++) {
      const date = libertadosDate(save.careerYear, index)
      const played = state.results.find(
        (result) =>
          libertadosMatchIndex(result.stage, result.round) === index &&
          (result.homeId === save.clubId || result.awayId === save.clubId),
      )
      const opponentId = played
        ? played.homeId === save.clubId ? played.awayId : played.homeId
        : null
      cupSchedule.set(`${date.month}-${date.day}`, opponentId)
    }
  }
```

E no laço dos dias, antes do `if (isCupDay)` (linha 152), inserir:

```tsx
          const libertadosOpponentId = cupSchedule.get(`${month}-${day}`)
          if (libertadosOpponentId !== undefined) {
            const rival = libertadosOpponentId ? clubById(libertadosOpponentId) : null
            return (
              <div key={day} className="cal-day cal-day-match cal-day-libertados" role="gridcell">
                <span className="cal-day-num">{day}</span>
                {rival ? (
                  <>
                    <ClubCrest
                      club={displayClub(save, rival)}
                      customUrl={save.customClubCrests[rival.id]}
                      size={18}
                    />
                    <span className="cal-day-opponent">{clubDisplayName(save, rival.id)}</span>
                  </>
                ) : (
                  <>
                    <Trophy size={16} aria-hidden="true" className="cal-day-cup-icon" />
                    <span className="cal-day-opponent">{LIBERTADOS_NAME}</span>
                  </>
                )}
                <span className="cal-day-venue">continental</span>
              </div>
            )
          }
```

Adicionar ao final de `src/ui/styles/libertados.css`:

```css
.cal-day-libertados {
  border-color: rgba(242, 194, 48, 0.45);
  background: rgba(242, 194, 48, 0.08);
}
```

E garantir que `src/ui/SeasonCalendar.tsx` importe esse CSS:

```ts
import './styles/libertados.css'
```

- [ ] **Step 6: Rodar tudo**

Run: `npm test && npm run build`
Expected: PASS nos testes e build limpo. Se `pendingMatch.ts` reclamar do `kind: 'libertados'`, ampliar o tipo lá e rodar de novo.

- [ ] **Step 7: Commit**

```bash
git add src/ui/App.tsx src/ui/tabs/HomeTab.tsx src/ui/SeasonCalendar.tsx src/ui/styles/libertados.css src/state/pendingMatch.ts
git commit -m "feat: Copa Libertados jogável — cerimônia, partidas, aba e calendário"
```

---

### Task 14: Notícia do campeão continental

**Files:**
- Modify: `src/engine/career/news.ts`
- Modify: `src/engine/career/news.test.ts`

**Interfaces:**
- Consumes: `save.continentalChampions` (Task 8); `clubById`
- Produces: nada novo — só mais uma manchete no feed

- [ ] **Step 1: Escrever o teste**

Adicionar em `src/engine/career/news.test.ts`:

```ts
describe('notícia do campeão continental', () => {
  const base = () => createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!

  test('o título de outro clube vira manchete no feed', () => {
    // Arrange
    const save = base()
    const comCampeao = {
      ...save,
      continentalChampions: [{ year: save.careerYear, clubId: 'sa-charrua' }],
    }

    // Act
    const manchetes = newsFor(comCampeao)

    // Assert
    expect(manchetes.some((item) => item.headline.includes('Club Charrúa'))).toBe(true)
  })

  test('sem campeão continental, nenhuma manchete continental aparece', () => {
    // Arrange
    const save = base()

    // Act & Assert
    expect(newsFor(save).some((item) => item.id.startsWith('libertados'))).toBe(false)
  })

  test('o título do próprio clube tem manchete própria', () => {
    // Arrange
    const save = base()
    const campeao = {
      ...save,
      continentalChampions: [{ year: save.careerYear, clubId: save.clubId }],
    }

    // Act
    const manchete = newsFor(campeao).find((item) => item.id.startsWith('libertados'))

    // Assert
    expect(manchete?.headline).toContain('é campeão')
    expect(manchete?.body).toContain('é sua')
  })

  test('o clube rebatizado pelo jogador aparece com o nome dele', () => {
    /*
     * Arrange: o batismo local vale para qualquer clube da pirâmide. Um rival
     * renomeado que levanta a taça precisa aparecer com o nome que o jogador
     * deu, como em toda outra manchete do feed.
     */
    const save = base()
    const comApelido = {
      ...save,
      customClubNames: { ...save.customClubNames, 'mare-rubra': 'Regatas do Bairro' },
      continentalChampions: [{ year: save.careerYear, clubId: 'mare-rubra' }],
    }

    // Act
    const manchete = newsFor(comApelido).find((item) => item.id.startsWith('libertados'))

    // Assert
    expect(manchete?.headline).toContain('Regatas do Bairro')
  })
})
```

Se `createSave` e `newsFor` ainda não estiverem importados no arquivo, adicionar.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/engine/career/news.test.ts`
Expected: FAIL — nenhuma manchete contém "Club Charrúa"

- [ ] **Step 3: Implementar**

Em `src/engine/career/news.ts`, adicionar ao import de clubes:

```ts
import { clubById } from '../../data/clubs'
import { LIBERTADOS_NAME } from '../libertados/types'
```

E dentro de `newsFor`, junto das outras manchetes derivadas do save (antes do corte por `MAX_NEWS`), adicionar:

```ts
  /* o continente entrega uma taça todo ano, com ou sem você na disputa */
  const continental = save.continentalChampions[save.continentalChampions.length - 1]
  if (continental) {
    const champion = clubById(continental.clubId)
    const isPlayer = continental.clubId === save.clubId
    if (champion) {
      // o batismo local vale para qualquer clube da pirâmide, não só o seu
      const championName = clubDisplayName(save, champion.id)
      items.push(
        item(
          `libertados-${continental.year}`,
          'comentarista',
          isPlayer
            ? `${championName} é campeão da ${LIBERTADOS_NAME}!`
            : `${championName} levanta a ${LIBERTADOS_NAME}`,
          isPlayer
            ? 'O continente inteiro assistiu. A taça mais pesada do lado de cá do mundo é sua.'
            : `A América do Sul tem novo dono. Enquanto a taça não passar por aqui, ela vai continuar pesando na estante dos outros.`,
        ),
      )
    }
  }
```

Nota: o array local de manchetes em `newsFor` pode ter outro nome que não `items` — usar o nome que já existe no arquivo. O helper `item(id, source, headline, body, context?)` está definido na linha 65.

- [ ] **Step 4: Rodar o teste**

Run: `npx vitest run src/engine/career/news.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/career/news.ts src/engine/career/news.test.ts
git commit -m "feat: manchete do campeão da Copa Libertados"
```

---

### Task 15: Verificação de ponta a ponta

**Files:**
- Nenhum arquivo novo. Ajustes pontuais onde a verificação apontar.

**Interfaces:**
- Consumes: tudo
- Produces: confiança de que a temporada roda inteira

- [ ] **Step 1: Suíte completa e cobertura**

Run: `npm test -- --coverage`
Expected: tudo verde. Cobertura de `src/engine/libertados/` acima de 80%. Se algum ramo ficar descoberto (tipicamente o `simulateEdition` a partir de eliminação em fase adiantada), adicionar um teste em `libertados.test.ts` que elimine o jogador nas semifinais e confira que `championId` sai preenchido.

- [ ] **Step 2: Build de produção**

Run: `npm run build`
Expected: `tsc -b` sem erro e bundle gerado.

- [ ] **Step 3: Passar uma temporada no navegador**

Run: `npm run dev`

Checar, com um save que já esteja na Série A (ou via `startNewSeason` repetido):
1. Terminar a Série A no top 4 → virar o ano → a aba **Libertados** aparece.
2. O calendário mostra rodadas quinzenais aos sábados e jogos continentais nas quartas de abril em diante.
3. O primeiro "Jogar" da Libertados abre a **cerimônia**: taça, potes e os três adversários do grupo A, com escudo e bandeira. Toque pula.
4. Jogar um jogo de grupo → a tabela do grupo atualiza na aba.
5. Chegar ao mata-mata → a chave mostra "a jogar", depois "x × y (ida)", depois o agregado.
6. Ser campeão → taça na Sala de Troféus com a arte certa e prêmio somado à verba.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: ajustes finais da Copa Libertados"
```

---

## Notas de verificação para quem revisa

- **Determinismo:** nenhum `Math.random()` dentro de `src/engine/libertados/`. Toda aleatoriedade entra por `RngState`.
- **Imutabilidade:** `drawGroups` e `simulateDate` usam arrays locais mutáveis dentro da própria função — isso é aceitável (não escapam), mas nada que venha de fora pode ser alterado no lugar.
- **Ciclo de import:** `clubs.ts` importa `continentalClubs.ts`, que importa só o *tipo* `Club`. Se algum dia `continentalClubs.ts` precisar de um valor de `clubs.ts`, o ciclo vira real — extrair o tipo para um arquivo próprio antes disso.
- **Ordem das tasks:** 1→2→3→4→5→6 são encadeadas. A 7 (calendário) deixa `SeasonCalendar.tsx` quebrado até a 13; é esperado e está anotado nos passos.
