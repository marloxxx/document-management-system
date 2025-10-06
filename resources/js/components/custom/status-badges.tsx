import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DocumentStatusBadgeProps {
  status: "DRAFT" | "SUBMITTED"
}

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  return (
    <Badge
      variant={status === "SUBMITTED" ? "default" : "secondary"}
      className={cn(
        status === "DRAFT" && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20",
        status === "SUBMITTED" && "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20",
      )}
    >
      {status}
    </Badge>
  )
}

interface DirectionBadgeProps {
  direction: "Indo-Mandarin" | "Mandarin-Indo" | "Indo-Taiwan" | "Taiwan-Indo"
}

export function DirectionBadge({ direction }: DirectionBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        direction === "Indo-Mandarin" && "border-blue-500/50 text-blue-700 dark:text-blue-400",
        direction === "Mandarin-Indo" && "border-purple-500/50 text-purple-700 dark:text-purple-400",
        direction === "Indo-Taiwan" && "border-green-500/50 text-green-700 dark:text-green-400",
        direction === "Taiwan-Indo" && "border-orange-500/50 text-orange-700 dark:text-orange-400",
      )}
    >
      {direction}
    </Badge>
  )
}

interface RegistrationStateBadgeProps {
  state: "ISSUED" | "PARTIAL" | "COMMITTED" | "VOID"
}

export function RegistrationStateBadge({ state }: RegistrationStateBadgeProps) {
  const variants = {
    ISSUED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20",
    PARTIAL: "bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20",
    COMMITTED: "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20",
    VOID: "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20",
  }

  return (
    <Badge variant="secondary" className={cn(variants[state])}>
      {state}
    </Badge>
  )
}
