import { ThemeProvider } from '@/components/editor/ThemeProvider'
import { EditorShell } from '@/components/layout/EditorShell'
import { FormatEditor } from '@/components/editor/FormatEditor'

export default function FormatPage() {
  return (
    <ThemeProvider>
      <EditorShell>
        <FormatEditor />
      </EditorShell>
    </ThemeProvider>
  )
}
