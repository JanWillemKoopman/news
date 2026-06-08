interface PageHeaderProps {
  titel: string
  beschrijving?: string
  actie?: React.ReactNode
}

export function PageHeader({ titel, beschrijving, actie }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{titel}</h1>
        {beschrijving ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{beschrijving}</p>
        ) : null}
      </div>
      {actie ? <div className="flex shrink-0 flex-wrap gap-2">{actie}</div> : null}
    </div>
  )
}
