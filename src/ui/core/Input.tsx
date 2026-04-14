import * as React from "react"
import { cn } from "@/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, icon, ...props }, ref) => {
        return (
            <div className="w-full space-y-2 relative">
                {label && (
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1 opacity-70">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {icon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                            {icon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            "input-minimal flex w-full h-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all duration-300",
                            icon ? "pl-12" : "pl-5",
                            error && "ring-2 ring-red-500/20 bg-red-50/10",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                </div>
                {error && <p className="mt-1 text-[10px] font-semibold text-red-500 tracking-tight ml-1">{error}</p>}
            </div>
        )
    }
)
Input.displayName = "Input"

export { Input }

