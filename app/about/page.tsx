import { ThemeProvider } from '@/components/editor/ThemeProvider'
import { EditorShell } from '@/components/layout/EditorShell'
import { AboutView } from '@/components/editor/AboutView'

export default function AboutPage() {
  return (
    <ThemeProvider>
      <EditorShell>
        <AboutView />
      </EditorShell>
    </ThemeProvider>
  )
}
