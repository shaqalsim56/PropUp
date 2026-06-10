import { useState, useCallback } from 'react'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase } from '../lib/supabase'

WebBrowser.maybeCompleteAuthSession()

// Shared Google OAuth flow used by Login + both signup screens.
// On success, onAuthStateChange (in AuthContext) drives navigation.
export function useGoogleSignIn() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const signIn = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      // A path segment is required — a host-only redirect is malformed on iOS.
      const redirectTo = makeRedirectUri({ path: 'auth' })
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error || !data?.url) {
        setError(error?.message ?? 'Could not start Google sign-in.')
        return
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (result.type !== 'success') return

      // Params may arrive in the query (?…, PKCE) or fragment (#…, implicit).
      const returnUrl = result.url
      const qStart = returnUrl.indexOf('?')
      const hStart = returnUrl.indexOf('#')
      const queryStr = qStart >= 0 ? returnUrl.slice(qStart + 1, hStart >= 0 ? hStart : undefined) : ''
      const hashStr = hStart >= 0 ? returnUrl.slice(hStart + 1) : ''
      const params = new URLSearchParams(queryStr)
      const hash = new URLSearchParams(hashStr)

      const code = params.get('code')
      const access_token = hash.get('access_token') ?? params.get('access_token')
      const refresh_token = hash.get('refresh_token') ?? params.get('refresh_token')
      const oauthError = params.get('error_description') ?? hash.get('error_description')

      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)
        if (exErr) setError(exErr.message)
      } else if (access_token && refresh_token) {
        const { error: ssErr } = await supabase.auth.setSession({ access_token, refresh_token })
        if (ssErr) setError(ssErr.message)
      } else if (oauthError) {
        setError(oauthError)
      } else {
        setError('Google sign-in did not return a session.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed.')
    } finally {
      setLoading(false)
    }
  }, [])

  return { signIn, loading, error, setError }
}
