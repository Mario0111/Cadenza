// The signed-in session as reactive state.
//
// It hydrates from localStorage at creation, so on a hard refresh the token and
// user are already present and the router guards make the right decision without
// waiting on the network. Actions keep the reactive state and the stored copy in
// step through persist()/logout().

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '@/api/auth'
import { getMe } from '@/api/users'
import {
  getToken,
  setToken,
  clearToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser
} from '@/api/token'

export const useAuthStore = defineStore('auth', () => {
  // Seed from storage so the app boots already knowing who you are.
  const token = ref(getToken())
  const user = ref(getStoredUser())

  const isAuthenticated = computed(() => Boolean(token.value))
  const isAdmin = computed(() => user.value?.role === 'admin')

  // Save a fresh session to both reactive state and localStorage at once.
  function persist(newToken, newUser) {
    token.value = newToken
    user.value = newUser
    setToken(newToken)
    setStoredUser(newUser)
  }

  async function register(form) {
    const { token: newToken, user: newUser } = await authApi.register(form)
    persist(newToken, newUser)
  }

  async function login(credentials) {
    const { token: newToken, user: newUser } = await authApi.login(credentials)
    persist(newToken, newUser)
  }

  function logout() {
    token.value = null
    user.value = null
    clearToken()
    clearStoredUser()
  }

  // Adopt a fresh user object we already have (e.g. the response of a profile
  // update) into both the reactive state and the stored copy — the same two
  // places refresh() writes, just without another network round trip.
  function setUser(fresh) {
    user.value = fresh
    setStoredUser(fresh)
  }

  // Re-fetch the user from the server (called once on app startup). This both
  // confirms the saved token is still valid and picks up any profile changes;
  // a 401 means the token expired or the account is gone, so we sign out.
  async function refresh() {
    if (!token.value) return
    try {
      const { user: fresh } = await getMe()
      user.value = fresh
      setStoredUser(fresh)
    } catch (err) {
      if (err.status === 401) {
        logout()
      }
      // Any other error (e.g. server briefly unreachable) leaves the cached
      // session in place rather than logging you out over a blip.
    }
  }

  return { token, user, isAuthenticated, isAdmin, register, login, logout, setUser, refresh }
})
