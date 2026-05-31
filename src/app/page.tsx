import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)'
      }}></div>

      <div className="relative z-10 text-center space-y-8 px-4 animate-fade-in-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)' }}>
            K
          </div>
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold gradient-text">
          KiraTakip
        </h1>
        <p className="text-xl text-slate-400 max-w-md mx-auto">
          Kişisel kira ve kiracı yönetim sisteminiz. Tüm mülklerinizi, kiracılarınızı ve ödemelerinizi tek yerden takip edin.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link
            href="/login"
            className="btn-primary text-lg px-8 py-4 inline-block"
          >
            Giriş Yap →
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-12">
          <div className="glass-card p-4 text-center">
            <span className="text-2xl block mb-2">🏠</span>
            <p className="text-sm text-slate-300 font-medium">Mülk Yönetimi</p>
          </div>
          <div className="glass-card p-4 text-center">
            <span className="text-2xl block mb-2">💰</span>
            <p className="text-sm text-slate-300 font-medium">Kira Takibi</p>
          </div>
          <div className="glass-card p-4 text-center">
            <span className="text-2xl block mb-2">🔔</span>
            <p className="text-sm text-slate-300 font-medium">Telegram Bildirimleri</p>
          </div>
        </div>
      </div>
    </main>
  )
}