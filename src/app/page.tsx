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
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-gold/20 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-6">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-dubai-gradient rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm sm:text-xl">DSR</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-2xl font-display font-bold bg-dubai-gradient bg-clip-text text-transparent">{t('dsrPro')}</h1>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t('dubaiPremierPOS')}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-4">
              <div className="hidden sm:block">
                <LanguageDropdown />
              </div>
              <button
                onClick={toggleTheme}
                className="p-1.5 sm:p-2 rounded-card bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === 'light' ? <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" /> : <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-gray-300" />}
              </button>
              <Link href="/auth/signin" className="hidden md:block text-gray-600 dark:text-gray-300 hover:text-primary transition-colors text-sm">
                {t('signIn')}
              </Link>
              <Link href="/auth/signup" className="dubai-button text-xs sm:text-sm px-2 py-1.5 sm:px-4 sm:py-2">
                {t('startNow')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center">
          <div className="flex justify-center mb-4 sm:mb-6">
            <span className="bg-gold/10 dark:bg-gold/20 text-gold dark:text-gold px-4 py-2 sm:px-6 sm:py-3 rounded-full text-xs sm:text-sm font-medium border border-gold/20 dark:border-gold/30">
              🇦🇪 {t('trustedBy1000')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-5xl md:text-7xl font-display font-bold text-text dark:text-text-dark mb-4 sm:mb-6 leading-tight">
            {t('advancedPOSTitle')}
          </h1>
          <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2">
            {t('transformBusinessDesc')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <Link href="/auth/signup" className="dubai-button text-base sm:text-lg px-6 py-3 sm:px-8 sm:py-4 w-full sm:w-auto text-center">
              {t('freeTrialButton')} <ArrowRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6" />
            </Link>
            <Link href="#demo" className="border-2 border-gold text-gold dark:text-gold px-6 py-3 sm:px-8 sm:py-4 rounded-card text-base sm:text-lg font-semibold hover:bg-gold hover:text-white dark:hover:text-white transition-all duration-300 w-full sm:w-auto text-center">
              {t('watchDemo')}
            </Link>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('noCreditCard')}</p>
        </div>

        {/* POS Features Grid */}
        <div className="mt-12 sm:mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="dubai-card p-6 sm:p-8 text-center group hover:shadow-dubai transition-all duration-300">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald/10 dark:bg-emerald/20 rounded-card flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
              <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-emerald" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-text dark:text-text-dark mb-3">{t('advancedPOS')}</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">{t('advancedPOSDesc')}</p>
          </div>
          
          <div className="dubai-card p-6 sm:p-8 text-center group hover:shadow-dubai transition-all duration-300">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gold/10 dark:bg-gold/20 rounded-card flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
              <Smartphone className="h-6 w-6 sm:h-8 sm:w-8 text-gold" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-text dark:text-text-dark mb-3">{t('mobileApp')}</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">{t('mobileAppDesc')}</p>
          </div>
          
          <div className="dubai-card p-6 sm:p-8 text-center group hover:shadow-dubai transition-all duration-300">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-accent/10 dark:bg-accent/20 rounded-card flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
              <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-text dark:text-text-dark mb-3">{t('instantProcessing')}</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">{t('instantProcessingDesc')}</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-12 sm:mt-20 bg-white dark:bg-gray-800 rounded-card p-6 sm:p-12 border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-text dark:text-text-dark mb-4">{t('whyChooseDSR')}</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('builtForUAE')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-success mt-1" />
              <div>
                <h4 className="font-semibold text-text dark:text-text-dark">{t('uaeBanking')}</h4>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('uaeBankingDesc')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-success mt-1" />
              <div>
                <h4 className="font-semibold text-text dark:text-text-dark">{t('localSupport')}</h4>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('localSupportDesc')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-success mt-1" />
              <div>
                <h4 className="font-semibold text-text dark:text-text-dark">{t('aedCurrency')}</h4>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('aedCurrencyDesc')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-success mt-1" />
              <div>
                <h4 className="font-semibold text-text dark:text-text-dark">{t('cloudOnPremise')}</h4>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('cloudOnPremiseDesc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mt-12 sm:mt-20">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-3xl font-bold text-text dark:text-text-dark mb-4">{t('whatClientsSay')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-card shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-warning fill-current" />
                ))}
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">{t('testimonial1')}</p>
              <div className="font-semibold text-text dark:text-text-dark">{t('ahmed')}</div>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('ceoAlMansouri')}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-card shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-warning fill-current" />
                ))}
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">{t('testimonial2')}</p>
              <div className="font-semibold text-text dark:text-text-dark">{t('fatima')}</div>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('financeManager')}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-card shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-warning fill-current" />
                ))}
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">{t('testimonial3')}</p>
              <div className="font-semibold text-text dark:text-text-dark">{t('mohammad')}</div>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('ownerKhalil')}</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 sm:mt-20 bg-primary dark:bg-primary rounded-card p-6 sm:p-12 text-center">
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-4">{t('readyTransform')}</h2>
          <p className="text-blue-100 dark:text-blue-200 mb-6 sm:mb-8 text-sm sm:text-lg">{t('join500UAE')}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link href="/auth/signup" className="bg-white text-primary px-4 py-2.5 sm:px-8 sm:py-3 rounded-card text-sm sm:text-lg font-medium hover:bg-gray-100 transition-colors">
              {t('startFreeTrial')}
            </Link>
            <Link href="tel:+971-4-123-4567" className="border border-white text-white px-4 py-2.5 sm:px-8 sm:py-3 rounded-card text-sm sm:text-lg font-medium hover:bg-white hover:text-primary transition-colors">
              {t('callUs')}
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-sidebar dark:bg-gray-900 text-white mt-12 sm:mt-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            <div>
              <h3 className="text-sm sm:text-lg font-semibold mb-3 sm:mb-4 text-white">{t('dsrPro')}</h3>
              <p className="text-xs sm:text-base text-gray-300 dark:text-gray-400">{t('uaeLeadingERP')}</p>
            </div>
            <div>
              <h4 className="text-xs sm:text-base font-semibold mb-3 sm:mb-4 text-white">{t('product')}</h4>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-300 dark:text-gray-400">
                <li>{t('features')}</li>
                <li>{t('pricing')}</li>
                <li>{t('security')}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs sm:text-base font-semibold mb-3 sm:mb-4 text-white">{t('support')}</h4>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-300 dark:text-gray-400">
                <li>{t('helpCenter')}</li>
                <li>{t('contactUs')}</li>
                <li>{t('training')}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs sm:text-base font-semibold mb-3 sm:mb-4 text-white">{t('contactInfo')}</h4>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-300 dark:text-gray-400">
                <li>{t('dubaiUAE')}</li>
                <li>+971 4 123 4567</li>
                <li>hello@dsrpro.ae</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 dark:border-gray-600 mt-4 sm:mt-8 pt-4 sm:pt-8 text-center text-xs sm:text-sm text-gray-400">
            <p>{t('copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}