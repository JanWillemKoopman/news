'use client'

import { notFound } from 'next/navigation'

import { OntdekkenContent } from '@/components/bruiloft/leveranciers/OntdekkenContent'
import { slugNaarTpwCategorie } from '@/lib/bruiloft/options'

interface Props {
  params: { categorie: string }
}

export default function TpwCategoriePage({ params }: Props) {
  const categorie = slugNaarTpwCategorie(params.categorie)
  if (!categorie) notFound()

  return <OntdekkenContent categoriePreset={categorie} />
}
