import { createContext, useContext, type Dispatch as ReactDispatch } from 'react'

type IAppAlertTypes = {
  isDisplayAlert: boolean
  alertType: 'error' | 'info' | 'warning' | 'success' | undefined
  message: string
}

export interface AppContextTypes {
  isLoading: boolean
  setIsLoading: (value: boolean) => void
  appAlert: IAppAlertTypes
  setAppAlert: (value: IAppAlertTypes) => void
}

export enum AppAction {
  IS_LOADING = 'IS_LOADING',
  APP_ALERT = 'APP_ALERT'
}

export type State = {
  isLoading: boolean
  appAlert: IAppAlertTypes
}

type ActionPayload = { isLoading?: boolean; appAlert?: IAppAlertTypes }
export type Action = { type: AppAction; payload?: ActionPayload }
type Dispatch = ReactDispatch<Action>

export type AppContextType = {
  state: State
  dispatch: Dispatch
}

export const AppContext = createContext<AppContextType | undefined>(undefined)

export function appReducer(state: State, action: Action): State {
  switch (action.type) {
    case AppAction.IS_LOADING: {
      return { ...state, isLoading: action.payload?.isLoading ?? state.isLoading }
    }
    case AppAction.APP_ALERT: {
      return { ...state, appAlert: action.payload?.appAlert ?? state.appAlert }
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`)
    }
  }
}

export function useAppContext(): AppContextTypes {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within a AppProvider')
  }
  return {
    ...context.state,
    setIsLoading: (value: boolean) => {
      return context.dispatch({
        type: AppAction.IS_LOADING,
        payload: {
          isLoading: value
        }
      })
    },
    setAppAlert: (value: IAppAlertTypes) => {
      return context.dispatch({
        type: AppAction.APP_ALERT,
        payload: {
          appAlert: value
        }
      })
    }
  }
}
