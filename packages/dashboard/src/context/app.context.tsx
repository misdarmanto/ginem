import { useReducer } from 'react'
import { AppContext, appReducer } from './app.context.store'

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, {
    appAlert: { isDisplayAlert: false, message: '', alertType: undefined },
    isLoading: false
  })

  const value = { state, dispatch }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
