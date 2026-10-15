import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-light flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between">
        <span className="text-white font-bold text-xl">UNi LaunDRY</span>
        <Link to="/login">
          <Button variant="outline" size="sm" className="border-white text-white hover:bg-white hover:text-primary">
            Sign In
          </Button>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white shadow-xl mb-6">
            <span className="text-primary font-bold text-4xl">L</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Hostel Laundry,<br />Made Simple.
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Submit your laundry, track its progress in real-time, and get notified when it's ready.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-primary"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-white/50 text-sm">
        © {new Date().getFullYear()} UNi LaunDRY
      </footer>
    </div>
  )
}
