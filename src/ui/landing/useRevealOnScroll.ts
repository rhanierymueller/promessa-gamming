import { useEffect, type RefObject } from 'react'

/**
 * Revela os elementos marcados com .reveal quando eles entram na tela.
 * Mora aqui porque os três blocos do túnel precisam do mesmo comportamento.
 */
export const useRevealOnScroll = (rootRef: RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.18 },
    )
    for (const element of root.querySelectorAll('.reveal')) observer.observe(element)
    return () => observer.disconnect()
  }, [rootRef])
}
