import { ThemeProvider } from '@/components/editor/ThemeProvider'
import { EditorShell } from '@/components/layout/EditorShell'
import { FormatEditor } from '@/components/editor/FormatEditor'
import { CommandBar } from '@/components/ui/CommandBar'

export default function FormatPage() {
  return (
    <ThemeProvider>
      <EditorShell>
        <FormatEditor />
        <CommandBar />
      </EditorShell>
    </ThemeProvider>
  )
}
