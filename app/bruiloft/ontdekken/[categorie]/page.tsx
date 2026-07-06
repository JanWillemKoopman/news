'use client'

import { notFound } from 'next/navigation'

import { CategorieResultaten } from '@/components/bruiloft/ontdekken/CategorieResultaten'
import { slugNaarTpwCategorie } from '@/lib/bruiloft/options'

interface Props {
  params: { categorie: string }
}

export default function TpwCategoriePage({ params }: Props) {
  const categorie = slugNaarTpwCategorie(params.categorie)
  if (!categorie) notFound()

  return <CategorieResultaten categorie={categorie} />
}
