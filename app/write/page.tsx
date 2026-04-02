import { ThemeProvider } from '@/components/editor/ThemeProvider'
import { AutosaveProvider } from '@/components/editor/AutosaveProvider'
import { EditorShell } from '@/components/layout/EditorShell'
import { WriteEditor } from '@/components/editor/WriteEditor'
import { SearchBar } from '@/components/editor/SearchBar'

export default function WritePage() {
  return (
    <ThemeProvider>
      <AutosaveProvider>
        <EditorShell>
          <WriteEditor />
          <SearchBar />
        </EditorShell>
      </AutosaveProvider>
    </ThemeProvider>
  )
}
