import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900">KiraTakip</h1>
        <p className="text-lg text-gray-600">Kişisel Kiracı ve Kira Yönetim Sistemi</p>
        <div className="space-x-4">
          <Link 
            href="/login" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Giriş Yap
          </Link>
        </div>
      </div>
    </main>
  )
}