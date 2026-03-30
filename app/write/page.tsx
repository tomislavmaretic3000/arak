import { ThemeProvider } from '@/components/editor/ThemeProvider'
import { WriteEditor } from '@/components/editor/WriteEditor'

export default function WritePage() {
  return (
    <ThemeProvider>
      <WriteEditor />
    </ThemeProvider>
  )
}
