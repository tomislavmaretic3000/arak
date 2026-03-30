import { ThemeProvider } from '@/components/editor/ThemeProvider'
import { FormatEditor } from '@/components/editor/FormatEditor'
import { SaveIndicator } from '@/components/ui/SaveIndicator'

export default function FormatPage() {
  return (
    <ThemeProvider>
      <FormatEditor />
      <SaveIndicator mode="format" />
    </ThemeProvider>
  )
}
