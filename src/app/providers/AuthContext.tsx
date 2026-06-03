import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { apiClient, AUTH_TOKEN_KEY } from '@/shared/api/apiClient'
import { authApi } from '@/features/auth/authApi'
import type { LoginRequest } from '@/shared/types/api'

type EstadoAuth = {
    isAuthenticated: boolean
    isLoading: boolean
}

type ValorContextoAuth = EstadoAuth & {
    login: (credenciales: LoginRequest) => Promise<void>
    logout: () => void
}

const ContextoAuth = createContext<ValorContextoAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [estado, setEstado] = useState<EstadoAuth>({
        isAuthenticated: false,
        isLoading: Boolean(localStorage.getItem(AUTH_TOKEN_KEY)),
    })

    useEffect(() => {
        const tieneToken = Boolean(localStorage.getItem(AUTH_TOKEN_KEY))
        if (tieneToken) {
            authApi.verifyToken()
                .then(() => setEstado({ isAuthenticated: true, isLoading: false }))
                .catch(() => { authApi.logout(); setEstado({ isAuthenticated: false, isLoading: false }) })
        } else {
            setEstado({ isAuthenticated: false, isLoading: false })
        }
    }, [])

    useEffect(() => {
        const idInterceptor = apiClient.interceptors.response.use(
        (respuesta) => respuesta,
        (error) => {
            if (error?.response?.status === 401) {
            setEstado({ isAuthenticated: false, isLoading: false })
            }
            return Promise.reject(error)
        },
        )
        return () => apiClient.interceptors.response.eject(idInterceptor)
    }, [])

    const login = useCallback(async (credenciales: LoginRequest) => {
        setEstado((previo) => ({ ...previo, isLoading: true }))
        try {
        await authApi.login(credenciales)
        setEstado({ isAuthenticated: true, isLoading: false })
        } catch (err) {
        setEstado({ isAuthenticated: false, isLoading: false })
        throw err
        }
    }, [])

    const logout = useCallback(() => {
        authApi.logout()
        setEstado({ isAuthenticated: false, isLoading: false })
    }, [])

    const valorContexto = useMemo(() => ({ ...estado, login, logout }), [estado, login, logout])

    return (
        <ContextoAuth.Provider value={valorContexto}>
        {children}
        </ContextoAuth.Provider>
    )
    }

    export function useAuth() {
    const contexto = useContext(ContextoAuth)
    if (!contexto) throw new Error('useAuth must be used inside AuthProvider')
    return contexto
}
