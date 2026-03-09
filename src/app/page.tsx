'use client'
import Link from 'next/link'
import { ArrowRight, Moon, Sun, CreditCard, Smartphone, Zap, CheckCircle, Star } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { useLanguage } from '@/components/LanguageProvider'
import LanguageDropdown from '@/components/LanguageDropdown'

export default function HomePage() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-black transition-colors duration-500">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-gold/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-dubai-gradient rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">د</span>
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold bg-dubai-gradient bg-clip-text text-transparent">DSR Pro</h1>
                <span className="text-sm text-gray-600 dark:text-gray-400">Dubai's Premier POS System</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageDropdown />
              <button
                onClick={toggleTheme}
                className="p-2 rounded-card bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </button>
              <Link href="/auth/signin" className="text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
                {t('signIn')}
              </Link>
              <Link href="/auth/signup" className="dubai-button">
                {t('startNow')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <span className="bg-gold/10 text-gold px-6 py-3 rounded-full text-sm font-medium border border-gold/20">
              🇦🇪 Trusted by 1000+ UAE Businesses
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-text dark:text-text-dark mb-6">
            Advanced POS System for Dubai
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto mb-8 leading-relaxed">
            Transform your Dubai business with our advanced POS system. VAT compliant, Arabic-first interface, and built specifically for UAE retail, restaurants, and service businesses.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <Link href="/auth/signup" className="dubai-button text-lg px-8 py-4">
              {t('freeTrialButton')} <ArrowRight className="ml-2 h-6 w-6" />
            </Link>
            <Link href="#demo" className="border-2 border-gold text-gold dark:text-gold px-8 py-4 rounded-card text-lg font-semibold hover:bg-gold hover:text-white transition-all duration-300">
              {t('watchDemo')}
            </Link>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">No credit card required • Setup in 5 minutes • Multi-language Support</p>
        </div>

        {/* POS Features Grid */}
        <div className="mt-20 pos-grid">
          <div className="dubai-card p-8 text-center group hover:shadow-dubai transition-all duration-300">
            <div className="w-16 h-16 bg-emerald/10 rounded-card flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <CreditCard className="h-8 w-8 text-emerald" />
            </div>
            <h3 className="text-xl font-semibold text-text dark:text-text-dark mb-3">{t('advancedPOS')}</h3>
            <p className="text-gray-600 dark:text-gray-300">Advanced POS terminals with touch screens, barcode scanning, and receipt printing</p>
          </div>
          
          <div className="dubai-card p-8 text-center group hover:shadow-dubai transition-all duration-300">
            <div className="w-16 h-16 bg-gold/10 rounded-card flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Smartphone className="h-8 w-8 text-gold" />
            </div>
            <h3 className="text-xl font-semibold text-text dark:text-text-dark mb-3">{t('mobileApp')}</h3>
            <p className="text-gray-600 dark:text-gray-300">Mobile app for inventory management, sales tracking, and customer engagement</p>
          </div>
          
          <div className="dubai-card p-8 text-center group hover:shadow-dubai transition-all duration-300">
            <div className="w-16 h-16 bg-accent/10 rounded-card flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Zap className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-text dark:text-text-dark mb-3">{t('instantProcessing')}</h3>
            <p className="text-gray-600 dark:text-gray-300">Lightning-fast transaction processing with offline capability</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-20 bg-white rounded-card p-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-text mb-4">Why Choose DSR Pro?</h2>
            <p className="text-gray-600">Built specifically for UAE businesses with local expertise</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-success mt-1" />
              <div>
                <h4 className="font-semibold text-text">UAE Banking Integration</h4>
                <p className="text-gray-600">Direct integration with Emirates NBD, ADCB, FAB, and other local banks</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-success mt-1" />
              <div>
                <h4 className="font-semibold text-text">Local Support Team</h4>
                <p className="text-gray-600">24/7 support in Arabic and English from our Dubai office</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-success mt-1" />
              <div>
                <h4 className="font-semibold text-text">AED Currency Support</h4>
                <p className="text-gray-600">Native AED support with proper formatting and calculations</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-success mt-1" />
              <div>
                <h4 className="font-semibold text-text">Cloud & On-Premise</h4>
                <p className="text-gray-600">Flexible deployment options to meet your security requirements</p>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-text mb-4">What Our Clients Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-card shadow-sm">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-warning fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4">"DSR Pro transformed our accounting process. VAT compliance is now effortless."</p>
              <div className="font-semibold text-text">Ahmed Al Mansouri</div>
              <div className="text-sm text-gray-500">CEO, Al Mansouri Trading</div>
            </div>
            <div className="bg-white p-6 rounded-card shadow-sm">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-warning fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4">"Excellent support team and the Arabic interface is perfect for our staff."</p>
              <div className="font-semibold text-text">Fatima Hassan</div>
              <div className="text-sm text-gray-500">Finance Manager, Dubai Retail Co.</div>
            </div>
            <div className="bg-white p-6 rounded-card shadow-sm">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-warning fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4">"Best ERP solution we've used. Saves us 10+ hours weekly on financial reporting."</p>
              <div className="font-semibold text-text">Mohammad Khalil</div>
              <div className="text-sm text-gray-500">Owner, Khalil Construction</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-primary rounded-card p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Business?</h2>
          <p className="text-blue-100 mb-8 text-lg">Join 500+ UAE businesses already using DSR Pro</p>
          <div className="flex justify-center gap-4">
            <Link href="/auth/signup" className="bg-white text-primary px-8 py-3 rounded-card text-lg font-medium hover:bg-gray-100">
              Start Free Trial
            </Link>
            <Link href="tel:+971-4-123-4567" className="border border-white text-white px-8 py-3 rounded-card text-lg font-medium hover:bg-white hover:text-primary">
              Call +971 4 123 4567
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-sidebar text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">DSR Pro</h3>
              <p className="text-gray-300">UAE's leading ERP solution for modern businesses.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Features</li>
                <li>Pricing</li>
                <li>Security</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Training</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Dubai, UAE</li>
                <li>+971 4 123 4567</li>
                <li>hello@dsrpro.ae</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>{t('copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}