'use client'

import { notFound } from 'next/navigation'

import { LeverancierDetailPagina } from '@/components/bruiloft/ontdekken/LeverancierDetailPagina'
import { slugNaarTpwCategorie } from '@/lib/bruiloft/options'

interface Props {
  params: { categorie: string; id: string }
}

export default function LeverancierPage({ params }: Props) {
  if (!slugNaarTpwCategorie(params.categorie)) notFound()

  return <LeverancierDetailPagina id={params.id} categorieSlug={params.categorie} />
}
