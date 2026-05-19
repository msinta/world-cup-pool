import { useState, useEffect } from 'react'

export interface ToastData {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
}

type Listener = (toasts: ToastData[]) => void

let toasts: ToastData[] = []
const listeners: Listener[] = []

function emitChange() {
  for (const listener of listeners) {
    listener([...toasts])
  }
}

export function toast(data: Omit<ToastData, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  const newToast: ToastData = { id, ...data }
  toasts = [newToast, ...toasts].slice(0, 5)
  emitChange()

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emitChange()
  }, 4000)
}

export function useToast() {
  const [localToasts, setLocalToasts] = useState<ToastData[]>([...toasts])

  useEffect(() => {
    function handleChange(updated: ToastData[]) {
      setLocalToasts(updated)
    }
    listeners.push(handleChange)
    return () => {
      const idx = listeners.indexOf(handleChange)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }, [])

  return { toasts: localToasts, toast }
}
