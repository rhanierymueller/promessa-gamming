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
