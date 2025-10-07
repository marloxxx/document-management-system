import "./bootstrap"
import "../css/app.css"

import { createRoot } from "react-dom/client"
import { createInertiaApp } from "@inertiajs/react"
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers"
import { ThemeProvider } from "next-themes"
import { ConfirmDialogProvider } from "@/components/custom"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"

// Extend ImportMeta interface for Vite
declare global {
  interface ImportMeta {
    env: {
      VITE_APP_NAME?: string
      [key: string]: any
    }
    glob: (pattern: string) => Record<string, () => Promise<any>>
  }
}

const appName = import.meta.env.VITE_APP_NAME || "Laravel"

createInertiaApp({
  title: (title) => `${title} - ${appName}`,
  resolve: (name) => resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob("./Pages/**/*.tsx")),
  setup({ el, App, props }) {
    const root = createRoot(el)

    root.render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <ConfirmDialogProvider>
          <App {...props} />
          <Toaster />
          <SonnerToaster />
        </ConfirmDialogProvider>
      </ThemeProvider>,
    )
  },
  progress: {
    color: "var(--color-primary)",
  },
})
