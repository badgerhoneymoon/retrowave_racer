export type HeldAction = 'left' | 'right' | 'up' | 'down' | 'shoot' | 'missile'

export const HELD_BINDINGS: Record<string, HeldAction> = {
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  Space: 'shoot', KeyE: 'missile', KeyQ: 'missile', KeyM: 'missile',
}

export function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (
    target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)
  )
}

export function acceptsGameplayKey(event: KeyboardEvent): boolean {
  return !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target)
}
