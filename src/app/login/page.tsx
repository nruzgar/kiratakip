'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setMessage('Hata: ' + error.message) }
    else { setMessage('Giriş başarılı! Yönlendiriliyorsunuz...'); window.location.href = '/dashboard' }
    setLoading(false)
  }

  const handleRegister = async () => {
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setMessage('Hata: ' + error.message) }
    else { setMessage('Kayıt başarılı! Giriş yapabilirsiniz.') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Background Effects */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.12) 0%, transparent 60%)'
      }}></div>

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              K
            </div>
            <span className="text-2xl font-bold gradient-text">KiraTakip</span>
          </Link>
        </div>

        <div className="glass-card-static p-8">
          <h1 className="text-xl font-bold text-white text-center mb-6">Hesabınıza Giriş Yapın</h1>

          {message && (
            <div className={`mb-4 ${message.includes('Hata') ? 'alert-error' : 'alert-success'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-dark" placeholder="ornek@email.com" required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Şifre</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="input-dark" placeholder="••••••••" required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Yükleniyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={handleRegister} disabled={loading}
              className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
              Hesabın yok mu? <span className="font-semibold">Kayıt ol</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}