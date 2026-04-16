import * as React from "react"
import { cn } from "@/utils"
import { motion, HTMLMotionProps } from "framer-motion"

export interface ButtonProps
    extends Omit<HTMLMotionProps<"button">, "variant" | "children"> {
    children?: React.ReactNode
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success"
    size?: "sm" | "md" | "lg" | "icon"
    loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
        const variants = {
            primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/20 clay-btn",
            secondary: "bg-accent-500 text-white hover:bg-accent-600 shadow-lg shadow-accent-500/20 clay-btn",
            outline: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm rounded-2xl",
            ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-2xl",
            danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 clay-btn",
            success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 clay-btn",
        }

        const sizes = {
            sm: "h-9 px-4 text-xs gap-1.5 rounded-xl font-bold",
            md: "h-11 px-6 text-sm gap-2 rounded-xl font-semibold",
            lg: "h-13 px-8 text-base gap-3 rounded-2xl font-bold",
            icon: "h-10 w-10 p-0 rounded-xl",
        }

        return (
            <motion.button
                ref={ref}
                disabled={disabled || loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
              >
                {loading ? (
                    <div className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
                ) : null}
                <span className="relative z-10 flex items-center gap-2">{children}</span>
            </motion.button>
        )
    }
)
Button.displayName = "Button"

export { Button }

