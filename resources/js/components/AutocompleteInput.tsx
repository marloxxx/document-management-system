import React, { useState, useEffect, useRef, forwardRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'

interface Suggestion {
    value: string
    label: string
}

interface AutocompleteInputProps {
    id: string
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    error?: string
    required?: boolean
    suggestionsUrl: string
}

export const AutocompleteInput = forwardRef<HTMLInputElement, AutocompleteInputProps>(({
    id,
    label,
    value,
    onChange,
    placeholder,
    error,
    required = false,
    suggestionsUrl
}, ref) => {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const suggestionsRef = useRef<HTMLDivElement>(null)

    // Debounce function
    const debounce = (func: Function, delay: number) => {
        let timeoutId: NodeJS.Timeout
        return (...args: any[]) => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(() => func.apply(null, args), delay)
        }
    }

    // Fetch suggestions
    const fetchSuggestions = async (query: string) => {
        if (query.length < 2) {
            setSuggestions([])
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch(`${suggestionsUrl}?q=${encodeURIComponent(query)}`)
            if (response.ok) {
                const data = await response.json()
                setSuggestions(data)
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error)
            setSuggestions([])
        } finally {
            setIsLoading(false)
        }
    }

    // Debounced fetch function
    const debouncedFetchSuggestions = debounce(fetchSuggestions, 300)

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        onChange(newValue)
        debouncedFetchSuggestions(newValue)
        setShowSuggestions(true)
    }

    // Handle suggestion click
    const handleSuggestionClick = (suggestion: Suggestion) => {
        onChange(suggestion.value)
        setShowSuggestions(false)
        setSuggestions([])
    }

    // Handle input focus
    const handleInputFocus = () => {
        if (suggestions.length > 0) {
            setShowSuggestions(true)
        }
    }

    // Handle input blur
    const handleInputBlur = () => {
        // Delay hiding suggestions to allow clicking on them
        setTimeout(() => {
            if (!suggestionsRef.current?.contains(document.activeElement)) {
                setShowSuggestions(false)
            }
        }, 150)
    }

    // Handle key navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setShowSuggestions(false)
        }
    }

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                ref &&
                typeof ref === 'object' &&
                'current' in ref &&
                ref.current &&
                !ref.current.contains(event.target as Node) &&
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [ref])

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>
                {label} {required && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative">
                <Input
                    ref={ref}
                    id={id}
                    value={value}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={error ? "border-destructive" : ""}
                    autoComplete="off"
                />

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div
                        ref={suggestionsRef}
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
                    >
                        {isLoading ? (
                            <div className="p-2 text-sm text-gray-500">Loading...</div>
                        ) : (
                            suggestions.map((suggestion, index) => (
                                <div
                                    key={index}
                                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                    onClick={() => handleSuggestionClick(suggestion)}
                                >
                                    {suggestion.label}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {error && (
                <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                </p>
            )}
        </div>
    )
})

AutocompleteInput.displayName = 'AutocompleteInput'
