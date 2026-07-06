import { OntdekTabsProvider } from '@/components/bruiloft/ontdekken/OntdekTabsContext'
import { TabDock } from '@/components/bruiloft/ontdekken/TabDock'

// Eigen provider voor deze sectie: geopende leverancier-tabbladen blijven
// bewaard zolang je binnen Ontdekken van categorie wisselt (vergelijken
// blijft mogelijk), maar worden losgelaten zodra je de sectie verlaat.
export default function OntdekkenLayout({ children }: { children: React.ReactNode }) {
  return (
    <OntdekTabsProvider>
      {children}
      <TabDock />
    </OntdekTabsProvider>
  )
}
