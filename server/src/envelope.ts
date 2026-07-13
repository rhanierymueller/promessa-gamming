/** Envelope padrão de resposta da API (regra de arquitetura do projeto). */
export interface ApiResponse<T> {
  readonly success: boolean
  readonly data: T | null
  readonly error: string | null
}

export const ok = <T>(data: T): ApiResponse<T> => ({ success: true, data, error: null })

export const fail = (error: string): ApiResponse<never> => ({ success: false, data: null, error })
