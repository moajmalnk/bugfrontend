import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertCircle, Check } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={4000}>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isDestructive = variant === "destructive"

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex shrink-0 items-center justify-center">
              {isDestructive ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500">
                  <AlertCircle className="h-3.5 w-3.5 text-white" />
                </span>
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                  <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription className={title ? "mt-0.5" : undefined}>
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <div className="ml-1 flex shrink-0 items-center border-l border-white/15 pl-3">
              <ToastClose />
            </div>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
