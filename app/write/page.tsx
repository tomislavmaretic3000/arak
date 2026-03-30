import { ThemeProvider } from '@/components/editor/ThemeProvider'
import { AutosaveProvider } from '@/components/editor/AutosaveProvider'
import { WriteEditor } from '@/components/editor/WriteEditor'
import { SaveIndicator } from '@/components/ui/SaveIndicator'

export default function WritePage() {
  return (
    <ThemeProvider>
      <AutosaveProvider>
        <WriteEditor />
        <SaveIndicator />
      </AutosaveProvider>
    </ThemeProvider>
  )
}
