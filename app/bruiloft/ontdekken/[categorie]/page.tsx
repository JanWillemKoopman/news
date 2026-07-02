'use client'

import { notFound } from 'next/navigation'

import { OntdekkenContent } from '@/components/bruiloft/leveranciers/OntdekkenContent'
import { slugNaarDirectoryCategorie } from '@/lib/bruiloft/options'

interface Props {
  params: { categorie: string }
}

export default function DirectoryCategoriePage({ params }: Props) {
  const categorie = slugNaarDirectoryCategorie(params.categorie)
  if (!categorie) notFound()

  return <OntdekkenContent categoriePreset={categorie} />
}
