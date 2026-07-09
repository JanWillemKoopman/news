
import { ToastProvider } from '@/components/bruiloft/ui'
import { cormorant } from '@/lib/fonts'

export default function SignupFlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`wedding ${cormorant.variable} text-foreground`}>
      <ToastProvider>{children}</ToastProvider>
    </div>
  )
}
