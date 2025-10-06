import React, { createContext, useCallback, useContext, useState } from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type ConfirmOptions = {
    title?: string
    description?: React.ReactNode
    confirmText?: string
    cancelText?: string
}

type ConfirmContextType = {
    confirm: (options?: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [options, setOptions] = useState<ConfirmOptions>({})
    const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null)

    const confirm = useCallback((opts?: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setOptions(opts || {})
            setResolver(() => resolve)
            setOpen(true)
        })
    }, [])

    const handleCancel = () => {
        resolver?.(false)
        setOpen(false)
    }

    const handleConfirm = () => {
        resolver?.(true)
        setOpen(false)
    }

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{options.title || 'Are you sure?'}</AlertDialogTitle>
                        {options.description && (
                            <AlertDialogDescription>{options.description}</AlertDialogDescription>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancel}>{options.cancelText || 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm}>{options.confirmText || 'Continue'}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmContext.Provider>
    )
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext)
    if (!ctx) {
        throw new Error('useConfirm must be used within ConfirmDialogProvider')
    }
    return ctx.confirm
}