import { create } from 'zustand'
import type { Project } from '@shared/types'

interface AppState {
  // Project state
  currentProject: Project | null
  projectPath: string | null

  // UI state
  isSidebarOpen: boolean
  currentView: 'lexicon' | 'texts' | 'concordance' | 'grammar' | 'notebook'
  theme: 'light' | 'dark'

  // Loading state
  isLoading: boolean
  loadingMessage: string | null

  // Actions
  setCurrentProject: (project: Project | null) => void
  setProjectPath: (path: string | null) => void
  setSidebarOpen: (isOpen: boolean) => void
  setCurrentView: (view: 'lexicon' | 'texts' | 'concordance' | 'grammar' | 'notebook') => void
  setTheme: (theme: 'light' | 'dark') => void
  setLoading: (isLoading: boolean, message?: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  currentProject: null,
  projectPath: null,
  isSidebarOpen: true,
  currentView: 'lexicon',
  theme: 'light',
  isLoading: false,
  loadingMessage: null,

  // Actions
  setCurrentProject: (project) => set({ currentProject: project }),
  setProjectPath: (path) => set({ projectPath: path }),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setCurrentView: (view) => set({ currentView: view }),
  setTheme: (theme) => set({ theme }),
  setLoading: (isLoading, message) =>
    set({ isLoading, loadingMessage: message || null })
}))
