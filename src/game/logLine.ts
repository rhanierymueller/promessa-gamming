/** Uma linha da narração ao vivo da partida. */
export interface LogLine {
  readonly minute: number
  readonly text: string
  readonly tone: 'normal' | 'good' | 'bad' | 'you'
}
