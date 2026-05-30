'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()
    
    // GİRİŞ YAP (signInWithPassword)
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage('Hata: ' + error.message)
    } else {
      setMessage('Giriş başarılı! Yönlendiriliyorsunuz...')
      window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    setLoading(true)
    setMessage('')

    const supabase = createClient()
    
    // KAYIT OL (signUp)
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setMessage('Hata: ' + error.message)
    } else {
      setMessage('Kayıt başarılı! Giriş yapabilirsiniz.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">KiraTakip Giriş</h1>
        
        {message && (
          <div className={`mb-4 p-3 rounded ${message.includes('Hata') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Yükleniyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={handleRegister}
            disabled={loading}
            className="text-blue-600 hover:underline text-sm"
          >
            Hesabın yok mu? Kayıt ol
          </button>
        </div>
      </div>
    </div>
  )
}