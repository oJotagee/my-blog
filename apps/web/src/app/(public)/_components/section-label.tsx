export function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <p className="flex items-center gap-3 border-t border-line-strong pt-3 font-mono text-xs tracking-[0.16em] text-faint">
      <span className="text-foreground">{number}</span>
      <span>{label}</span>
    </p>
  )
}
