interface PageHeaderProps {
  titel: string
  beschrijving?: string
  actie?: React.ReactNode
}

export function PageHeader({ titel, beschrijving, actie }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground md:text-4xl">
          {titel}
        </h1>
        {beschrijving ? (
          <p className="mt-2 text-base text-muted-foreground">{beschrijving}</p>
        ) : null}
      </div>
      {actie ? <div className="flex shrink-0 gap-2">{actie}</div> : null}
    </div>
  )
}
