import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface CustomSelectProps {
    label?: string
    placeholder?: string
    value: string
    onValueChange: (value: string) => void
    options: { label: string; value: string }[]
    className?: string
    disabled?: boolean
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    label,
    placeholder,
    value,
    onValueChange,
    options,
    className = '',
    disabled = false,
}) => {
    return (
        <div className={`space-y-2 ${className}`}>
            {label && <Label className="text-sm font-medium">{label}</Label>}
            <Select value={value} onValueChange={onValueChange} disabled={disabled}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder={placeholder || label || 'Select an option'} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}

export default CustomSelect
