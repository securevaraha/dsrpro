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
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-dubai-gradient rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-base sm:text-xl">DSR</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-display font-bold bg-dubai-gradient bg-clip-text text-transparent">DSR Info</h1>
                <span className="text-xs text-gray-500 dark:text-gray-400">Dubai Premier POS</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="hidden sm:block">
                <LanguageDropdown />
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === 'light' ? <Moon className="h-4 w-4 text-gray-600" /> : <Sun className="h-4 w-4 text-gray-300" />}
              </button>
              <Link href="/auth/signin" className="hidden md:block text-gray-600 dark:text-gray-300 hover:text-primary transition-colors text-sm font-medium">
                {t('signIn')}
              </Link>
              <Link href="/auth/signup" className="dubai-button text-sm px-4 py-2">
                {t('startNow')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center">
          <div className="flex justify-center mb-5 sm:mb-6">
            <span className="bg-gold/10 dark:bg-gold/20 text-gold dark:text-gold px-5 py-2 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium border border-gold/20 dark:border-gold/30">
              🇦🇪 {t('trustedBy1000')}
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-gray-900 dark:text-white mb-5 sm:mb-6 leading-[1.1] tracking-tight">
            {t('advancedPOSTitle')}
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            {t('transformBusinessDesc')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-6">
            <Link href="/auth/signup" className="dubai-button text-base px-7 py-3.5 sm:px-8 sm:py-4 w-full sm:w-auto text-center inline-flex items-center justify-center">
              {t('freeTrialButton')} <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link href="#demo" className="border-2 border-gold/60 text-gold dark:text-gold px-7 py-3.5 sm:px-8 sm:py-4 rounded-xl text-base font-semibold hover:bg-gold hover:text-white dark:hover:text-white transition-all duration-300 w-full sm:w-auto text-center">
              {t('watchDemo')}
            </Link>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('noCreditCard')}</p>
        </div>

        {/* POS Features Grid */}
        <div className="mt-14 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          <div className="dubai-card p-6 sm:p-8 text-center group hover:shadow-dubai transition-all duration-300">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald/10 dark:bg-emerald/20 rounded-xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
              <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-emerald" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3">{t('advancedPOS')}</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">{t('advancedPOSDesc')}</p>
          </div>
          
          <div className="dubai-card p-6 sm:p-8 text-center group hover:shadow-dubai transition-all duration-300">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gold/10 dark:bg-gold/20 rounded-xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
              <Smartphone className="h-6 w-6 sm:h-8 sm:w-8 text-gold" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3">{t('mobileApp')}</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">{t('mobileAppDesc')}</p>
          </div>
          
          <div className="dubai-card p-6 sm:p-8 text-center group hover:shadow-dubai transition-all duration-300">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-accent/10 dark:bg-accent/20 rounded-xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
              <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3">{t('instantProcessing')}</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">{t('instantProcessingDesc')}</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-14 sm:mt-24 bg-white dark:bg-gray-800 rounded-2xl p-8 sm:p-12 border border-gray-200/80 dark:border-gray-700/60">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">{t('whyChooseDSR')}</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('builtForUAE')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-success mt-1" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">{t('uaeBanking')}</h4>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('uaeBankingDesc')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-success mt-1" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">{t('localSupport')}</h4>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('localSupportDesc')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-success mt-1" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">{t('aedCurrency')}</h4>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('aedCurrencyDesc')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-success mt-1" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">{t('cloudOnPremise')}</h4>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('cloudOnPremiseDesc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mt-12 sm:mt-20">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">{t('whatClientsSay')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-warning fill-current" />
                ))}
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">{t('testimonial1')}</p>
              <div className="font-semibold text-gray-900 dark:text-white">{t('ahmed')}</div>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('ceoAlMansouri')}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-warning fill-current" />
                ))}
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">{t('testimonial2')}</p>
              <div className="font-semibold text-gray-900 dark:text-white">{t('fatima')}</div>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('financeManager')}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-warning fill-current" />
                ))}
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">{t('testimonial3')}</p>
              <div className="font-semibold text-gray-900 dark:text-white">{t('mohammad')}</div>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('ownerKhalil')}</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 sm:mt-20 bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-2xl p-8 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <h2 className="text-xl sm:text-3xl font-bold text-white mb-4">{t('readyTransform')}</h2>
            <p className="text-gray-300 mb-6 sm:mb-8 text-sm sm:text-lg max-w-xl mx-auto">{t('join500UAE')}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <Link href="/auth/signup" className="bg-dubai-gradient text-white px-6 py-3 sm:px-8 sm:py-3.5 rounded-xl text-sm sm:text-base font-semibold hover:shadow-dubai transition-all">
                {t('startFreeTrial')}
              </Link>
              <Link href="tel:+971-4-123-4567" className="border border-white/30 text-white px-6 py-3 sm:px-8 sm:py-3.5 rounded-xl text-sm sm:text-base font-medium hover:bg-white/10 transition-all">
                {t('callUs')}
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0E0E1A] text-white mt-16 sm:mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            <div>
              <h3 className="text-sm sm:text-lg font-semibold mb-3 sm:mb-4 text-white">DSR Info</h3>
              <p className="text-xs sm:text-base text-gray-300 dark:text-gray-400">UAE Leading ERP</p>
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
                <li>hello@dsrinfo.ae</li>
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
