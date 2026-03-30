import { ThemeProvider } from '@/components/editor/ThemeProvider'
import { EditorShell } from '@/components/layout/EditorShell'
import { FormatEditor } from '@/components/editor/FormatEditor'
import { SaveIndicator } from '@/components/ui/SaveIndicator'

export default function FormatPage() {
  return (
    <ThemeProvider>
      <EditorShell>
        <FormatEditor />
        <SaveIndicator mode="format" />
      </EditorShell>
    </ThemeProvider>
  )
}
