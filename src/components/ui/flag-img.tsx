import { useState } from 'react'
import { cn } from '@/lib/utils'

const SUBDIVISION: Record<string, string> = {
  '🏴󠁧󠁢󠁥󠁮󠁧󠁿': 'gb-eng',
  '🏴󠁧󠁢󠁳󠁣󠁴󠁿': 'gb-sct',
  '🏴󠁧󠁢󠁷󠁬󠁳󠁿': 'gb-wls',
}

function emojiToCode(emoji: string): string {
  if (SUBDIVISION[emoji]) return SUBDIVISION[emoji]
  const chars = [...emoji]
  if (chars.length === 2 && chars[0].codePointAt(0)! >= 0x1f1e6) {
    return chars
      .map((c) => String.fromCharCode(c.codePointAt(0)! - 0x1f1e6 + 65))
      .join('')
      .toLowerCase()
  }
  return ''
}

export function FlagImg({
  emoji,
  size = 28,
  className,
}: {
  emoji: string
  size?: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const code = emojiToCode(emoji)

  if (!code || failed) {
    return (
      <span className={cn('inline-block leading-none', className)} style={{ fontSize: size * 0.85 }}>
        {emoji}
      </span>
    )
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={emoji}
      width={size}
      height={Math.round(size * 0.72)}
      onError={() => setFailed(true)}
      className={cn('inline-block object-cover rounded-sm align-middle', className)}
    />
  )
}
