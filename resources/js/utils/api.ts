/**
 * Utility functions for handling CSRF tokens and API requests
 */

/**
 * Get fresh CSRF token from the server
 */
export const getFreshCSRFToken = async (): Promise<string> => {
    try {
        const response = await fetch('/csrf-token', {
            method: 'GET',
            credentials: 'same-origin',
        })

        if (response.ok) {
            const data = await response.json()
            return data.csrf_token || data._token || ''
        }

        // Fallback to meta tag if API fails
        return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    } catch (error) {
        console.warn('Failed to get fresh CSRF token, using meta tag:', error)
        return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    }
}

/**
 * Update CSRF token in meta tag
 */
export const updateCSRFTokenInMeta = (token: string): void => {
    const metaTag = document.querySelector('meta[name="csrf-token"]')
    if (metaTag) {
        metaTag.setAttribute('content', token)
    }
}

/**
 * Make API request with automatic CSRF token refresh on failure
 */
export const makeAPIRequest = async (
    url: string,
    options: RequestInit = {},
    retryOnCSRF = true
): Promise<Response> => {
    // Get current CSRF token
    let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''

    // Prepare headers
    const headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrfToken,
        ...options.headers,
    }

    // Make request
    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'same-origin',
    })

    // If CSRF token mismatch and retry is enabled, try once more with fresh token
    if (!response.ok && retryOnCSRF && response.status === 419) {
        console.log('CSRF token expired, refreshing...')

        // Get fresh CSRF token
        const freshToken = await getFreshCSRFToken()

        if (freshToken && freshToken !== csrfToken) {
            // Update meta tag
            updateCSRFTokenInMeta(freshToken)

            // Retry request with fresh token
            const retryHeaders = {
                ...headers,
                'X-CSRF-TOKEN': freshToken,
            }

            return fetch(url, {
                ...options,
                headers: retryHeaders,
                credentials: 'same-origin',
            })
        }
    }

    return response
}

/**
 * Handle API response with proper error handling
 */
export const handleAPIResponse = async (response: Response): Promise<any> => {
    if (!response.ok) {
        let errorMessage = 'Request failed'

        try {
            const errorData = await response.json()
            errorMessage = errorData.message || errorData.error || errorMessage
        } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }

        throw new Error(errorMessage)
    }

    try {
        return await response.json()
    } catch {
        return null
    }
}
