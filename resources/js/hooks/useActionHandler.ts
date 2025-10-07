import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import { makeAPIRequest, handleAPIResponse } from '@/utils/api'

export const useActionHandler = () => {
    const handleStatusToggle = async (
        _id: number,
        url: string,
        currentStatus: boolean,
        itemName: string,
        options?: { onSuccess?: () => void }
    ) => {
        try {
            await router.post(url, {}, {
                onSuccess: () => {
                    toast.success(`${itemName} ${currentStatus ? 'deactivated' : 'activated'} successfully`)
                    options?.onSuccess?.()
                },
                onError: () => {
                    toast.error(`Failed to ${currentStatus ? 'deactivate' : 'activate'} ${itemName}`)
                }
            })
        } catch (error) {
            toast.error(`Failed to ${currentStatus ? 'deactivate' : 'activate'} ${itemName}`)
        }
    }

    const handleDelete = async (
        _id: number,
        url: string,
        itemName: string,
        options?: { onSuccess?: () => void }
    ) => {
        try {
            const response = await makeAPIRequest(url, {
                method: 'DELETE',
            })

            const data = await handleAPIResponse(response)
            toast.success(data.message || `${itemName} deleted successfully`)
            options?.onSuccess?.()
        } catch (error: any) {
            toast.error(error.message || `Failed to delete ${itemName}`)
        }
    }

    const handleExport = async (selectedRows: any[], type: string) => {
        try {
            const ids = selectedRows.map(row => row.id).join(',')
            const url = `/export/${type}${ids ? `?ids=${ids}` : ''}`

            // Use fetch to check for errors before opening window
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Export failed')
            }

            // If successful, open the download
            window.open(url, '_blank')
            toast.success('Export started')
        } catch (error: any) {
            toast.error(error.message || 'Failed to start export')
        }
    }

    const handleBulkDelete = async (selectedRows: any[], type: string) => {
        try {
            const ids = selectedRows.map(row => row.id)
            await router.post(`/${type}/bulk-delete`, { ids }, {
                onSuccess: () => {
                    toast.success(`${selectedRows.length} items deleted successfully`)
                },
                onError: () => {
                    toast.error('Failed to delete selected items')
                }
            })
        } catch (error) {
            toast.error('Failed to delete selected items')
        }
    }

    const handleBulkActivate = async (selectedRows: any[], type: string) => {
        try {
            const ids = selectedRows.map(row => row.id)
            await router.post(`/${type}/bulk-activate`, { ids }, {
                onSuccess: () => {
                    toast.success(`${selectedRows.length} items activated successfully`)
                },
                onError: () => {
                    toast.error('Failed to activate selected items')
                }
            })
        } catch (error) {
            toast.error('Failed to activate selected items')
        }
    }

    return {
        handleStatusToggle,
        handleDelete,
        handleExport,
        handleBulkDelete,
        handleBulkActivate,
    }
}

export default useActionHandler
