import type { ComponentProps } from "react"
import { useTheme } from "@/context/ThemeContext"
import { Toaster as Sonner } from "sonner"

type ToasterProps = ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme === "dark" ? "dark" : "light"}
      position="bottom-center"
      offset={24}
      closeButton
      richColors={false}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast !bg-[#1c1c1c] !text-white !border-0 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)] px-4 py-3 font-sans",
          title: "!text-white text-sm font-medium",
          description: "!text-white/70 text-xs",
          success: "!bg-[#1c1c1c] !text-white !border-0",
          error: "!bg-[#1c1c1c] !text-white !border-0",
          warning: "!bg-[#1c1c1c] !text-white !border-0",
          info: "!bg-[#1c1c1c] !text-white !border-0",
          closeButton:
            "!bg-transparent !text-white/55 hover:!text-white !border-0 !border-l !border-white/15 !left-auto !right-3 !top-1/2 !-translate-y-1/2",
          icon: "!text-emerald-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
