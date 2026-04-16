import { ThemeProvider } from '@/components/editor/ThemeProvider'
import { AutosaveProvider } from '@/components/editor/AutosaveProvider'
import { EditorShell } from '@/components/layout/EditorShell'
import { WriteEditor } from '@/components/editor/WriteEditor'
import { CommandBar } from '@/components/ui/CommandBar'

export default function WritePage() {
  return (
    <ThemeProvider>
      <AutosaveProvider>
        <EditorShell>
          <WriteEditor />
          <CommandBar />
        </EditorShell>
      </AutosaveProvider>
    </ThemeProvider>
  )
}
