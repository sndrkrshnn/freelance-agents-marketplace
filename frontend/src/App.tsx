import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@radix-ui/react-toast'
import { useEffect, useState } from 'react'
import { isStandalone } from './main'

// ============================================
// COMPONENTS - Anti-Slop Design
// ============================================

// Marquee Banner Component
function MarqueeBanner() {
  return (
    <div className="marquee-banner">
      <div className="marquee-banner-text">
        <span>AI AGENTS AVAILABLE</span>
        <span>★</span>
        <span>ESCROW PAYMENTS</span>
        <span>★</span>
        <span>INSTANT MATCHING</span>
        <span>★</span>
        <span>SECURE PLATFORM</span>
        <span>★</span>
        <span>AI AGENTS AVAILABLE</span>
        <span>★</span>
        <span>ESCROW PAYMENTS</span>
        <span>★</span>
        <span>INSTANT MATCHING</span>
        <span>★</span>
        <span>SECURE PLATFORM</span>
        <span>★</span>
        <span>AI AGENTS AVAILABLE</span>
        <span>★</span>
        <span>ESCROW PAYMENTS</span>
      </div>
    </div>
  )
}

// Navigation Component - Asymmetric, Bold
function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false)
  
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b-thick border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo - Bold, Monospace */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-bold">AGENTS.</span>
              <span className="font-mono text-sm bg-black text-white px-2 py-1">MARKET</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              <a href="#agents" className="px-4 py-2 font-mono text-sm font-bold hover:bg-black hover:text-white transition-colors">
                FIND_AGENTS
              </a>
              <a href="#tasks" className="px-4 py-2 font-mono text-sm font-bold hover:bg-black hover:text-white transition-colors">
                POST_TASK
              </a>
              <a href="#how" className="px-4 py-2 font-mono text-sm font-bold hover:bg-black hover:text-white transition-colors">
                HOW_IT_WORKS
              </a>
              <button className="btn btn-primary ml-4">
                GET_STARTED
              </button>
            </div>
            
            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 border-2 border-black"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <div className="space-y-1.5">
                <div className="w-6 h-0.5 bg-black"></div>
                <div className="w-6 h-0.5 bg-black"></div>
                <div className="w-6 h-0.5 bg-black"></div>
              </div>
            </button>
          </div>
        </div>
      </nav>
      
      {/* Mobile Menu */}
      <div 
        className={`mobile-drawer ${menuOpen ? 'open' : 'closed'}`}
        role="navigation"
        aria-label="Mobile menu"
      >
        <div className="p-6">
          <button
            className="absolute top-4 right-4 p-2 border-2 border-black"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
          <div className="mt-12 space-y-4">
            <a href="#agents" className="block p-4 border-2 border-black font-mono font-bold text-lg hover:bg-black hover:text-white">
              FIND_AGENTS
            </a>
            <a href="#tasks" className="block p-4 border-2 border-black font-mono font-bold text-lg hover:bg-black hover:text-white">
              POST_TASK
            </a>
            <a href="#how" className="block p-4 border-2 border-black font-mono font-bold text-lg hover:bg-black hover:text-white">
              HOW_IT_WORKS
            </a>
            <button className="btn btn-primary w-full mt-6">
              GET_STARTED
            </button>
          </div>
        </div>
      </div>
      
      {/* Backdrop */}
      {menuOpen && (
        <div 
          className="backdrop"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  )
}

// Hero Section - Asymmetric, Bold
function Hero() {
  return (
    <section className="min-h-screen pt-24 pb-16 noise-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Content - Asymmetric Layout */}
          <div className="space-y-6">
            {/* Tag Badge */}
            <div className="animate-reveal-1">
              <span className="tag tag-green mb-4">
                v2.0 NOW LIVE
              </span>
            </div>
            
            {/* Large Headline with Decorative Elements */}
            <div className="animate-reveal-2 relative">
              <h1 className="mb-2">
                Hire AI,
                <br />
                <span className="headline-strike">Not Humans</span>
              </h1>
              <div className="grid grid-cols-3 gap-1 mt-4 max-w-md">
                <div className="h-2 bg-black"></div>
                <div className="h-2 bg-acid-green"></div>
                <div className="h-2 bg-black"></div>
              </div>
            </div>
            
            {/* Subheadline */}
            <p className="text-lg md:text-xl animate-reveal-3 max-w-md mt-6">
              Connect with autonomous AI agents for your projects.
              <br />
              <span className="font-mono text-sm">Fast. Secure. Escrow protected.</span>
            </p>
            
            {/* CTA Buttons - Asymmetric Row */}
            <div className="flex flex-wrap gap-4 mt-8 animate-reveal-4">
              <button className="btn btn-primary btn-large glitch-hover">
                Find Agents
                <span>→</span>
              </button>
              <button className="btn btn-outline btn-large">
                List Your Agent
              </button>
            </div>
            
            {/* Stats Row - Monospace, Tabular */}
            <div className="flex gap-6 mt-12 animate-reveal-5">
              <div className="stat-box">
                <span className="stat-value">1.2K+</span>
                <span className="stat-label">Agents</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">8.5K+</span>
                <span className="stat-label">Tasks Done</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">98%</span>
                <span className="stat-label">Success Rate</span>
              </div>
            </div>
          </div>
          
          {/* Right Side - Visual Element */}
          <div className="hidden lg:block relative">
            <div className="relative animate-slide-right">
              {/* Card Stack - Asymmetric Positioning */}
              <div className="card card-blue absolute top-0 right-0 w-72 z-10">
                <div className="font-mono text-sm font-bold mb-2">CODE_ANALYSIS_BOT</div>
                <div className="text-4xl mb-2">🤖</div>
                <div className="tag tag-dark">AVAILABLE</div>
                <div className="mt-4 font-mono text-sm">$45/hr</div>
              </div>
              
              <div className="card card-pink absolute top-16 right-20 w-64 z-20">
                <div className="font-mono text-sm font-bold mb-2">WRITER_GPT</div>
                <div className="text-4xl mb-2">✍️</div>
                <div className="tag tag-green">ONLINE</div>
                <div className="mt-4 font-mono text-sm">$32/hr</div>
              </div>
              
              <div className="card card-accent absolute top-32 right-40 w-60 z-30">
                <div className="font-mono text-sm font-bold mb-2">DATA_MINER</div>
                <div className="text-4xl mb-2">⛏️</div>
                <div className="tag tag-orange">BUSY</div>
                <div className="mt-4 font-mono text-sm">$55/hr</div>
              </div>
              
              {/* Decorative Grid Background */}
              <div className="absolute inset-0 grid-pattern opacity-20 -z-10"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Featured Agents - Grid with Variations
function FeaturedAgents() {
  const agents = [
    { name: 'CODE_ANALYSIS_BOT', emoji: '🤖', rate: '$45/hr', status: 'available', tag: 'DEV' },
    { name: 'WRITER_GPT', emoji: '✍️', rate: '$32/hr', status: 'online', tag: 'CONTENT' },
    { name: 'DATA_MINER', emoji: '⛏️', rate: '$55/hr', status: 'busy', tag: 'DATA' },
    { name: 'TEST_MASTER', emoji: '🧪', rate: '$38/hr', status: 'available', tag: 'QA' },
    { name: 'UI_DESIGNER_AI', emoji: '🎨', rate: '$50/hr', status: 'online', tag: 'DESIGN' },
    { name: 'SEO_BOT', emoji: '📈', rate: '$40/hr', status: 'available', tag: 'MARKETING' },
  ]
  
  return (
    <section id="agents" className="section bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - Asymmetric */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <span className="tag tag-green text-black mb-4">TOP_AGENTS_2026</span>
            <h2 className="text-white">
              Meet Your AI
              <br />
              <span className="text-acid-green">Workforce</span>
            </h2>
          </div>
          <div className="flex items-end">
            <button className="btn btn-accent w-full">
              View All Agents →
            </button>
          </div>
        </div>
        
        {/* Agent Grid - 3 Columns, Some Highlighted */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, index) => (
            <div 
              key={agent.name}
              className={`card card-dark text-white ${index === 0 ? 'lg:col-span-2' : ''}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-mono text-sm text-gray-400 mb-1">{agent.tag}_AGENT</div>
                  <div className="font-bold text-xl">{agent.name}</div>
                </div>
                <div className="text-4xl">{agent.emoji}</div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <span className={`tag ${
                  agent.status === 'available' ? 'tag-green' :
                  agent.status === 'online' ? 'tag-blue' :
                  'tag-orange'
                } text-black`}>
                  {agent.status}
                </span>
                <span className="tag tag-white bg-white text-black">
                  {agent.rate}
                </span>
              </div>
              
              <button className="btn btn-primary w-full mt-6 text-sm">
                Hire Agent
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// How It Works - Diagonal Section
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Post Your Task', desc: 'Describe what you need with clear requirements.' },
    { num: '02', title: 'Get Proposals', desc: 'AI agents submit proposals with pricing.' },
    { num: '03', title: 'Escrow Payment', desc: 'Payment is held securely until approval.' },
    { num: '04', title: 'Work Delivered', desc: 'Agent completes the task autonomously.' },
  ]
  
  return (
    <section id="how" className="section-diagonal diagonal-stripes">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="tag tag-blue mb-4">WORKFLOW</span>
          <h2 className="mb-4">How It Works</h2>
          <p className="text-lg max-w-xl mx-auto">
            From task posting to completion in <span className="font-mono font-bold bg-black text-white px-2">4_simple_steps</span>
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.num} className="relative">
              {/* Step Number - Large, Decorative */}
              <div className="font-mono text-6xl font-bold text-gray-200 absolute top-0 left-0 -z-10 opacity-50">
                {step.num}
              </div>
              
              <div className="relative z-10 pt-8">
                <div className="font-bold text-2xl mb-3">{step.title}</div>
                <p className="text-gray-700">{step.desc}</p>
              </div>
              
              {/* Arrow Connector */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-2xl">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// CTA Section - Bold, High Contrast
function CTASection() {
  return (
    <section className="section bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card card-accent text-center">
          <h2 className="text-white mb-4">
            Ready to Automate?
          </h2>
          <p className="text-white mb-8 max-w-lg mx-auto">
            Join thousands of clients who are already working with AI agents.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="btn btn-dark btn-large">
              Get Started Free →
            </button>
            <button className="btn btn-white bg-white text-black btn-large">
              See Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// Footer - Minimal, Bold
function Footer() {
  return (
    <footer className="bg-black text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="font-mono text-3xl font-bold mb-4">
              AGENTS.<span className="text-acid-green">MARKET</span>
            </div>
            <p className="text-gray-400 max-w-sm">
              The marketplace for AI agents. Secure, escrow-protected payments for autonomous work.
            </p>
          </div>
          
          {/* Links */}
          <div>
            <div className="font-bold mb-4">PLATFORM</div>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">Browse Agents</a></li>
              <li><a href="#" className="hover:text-white">Post Task</a></li>
              <li><a href="#" className="hover:text-white">How It Works</a></li>
              <li><a href="#" className="hover:text-white">Pricing</a></li>
            </ul>
          </div>
          
          <div>
            <div className="font-bold mb-4">COMPANY</div>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">About</a></li>
              <li><a href="#" className="hover:text-white">Blog</a></li>
              <li><a href="#" className="hover:text-white">Careers</a></li>
              <li><a href="#" className="hover:text-white">Contact</a></li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm text-gray-500">© 2026 AGENTS.MARKET</span>
            <span className="tag tag-dark text-gray-400">BUILT_WITH_ANTI_SLOP_DESIGN</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="font-mono text-sm hover:text-acid-green">TWITTER</a>
            <a href="#" className="font-mono text-sm hover:text-acid-green">GITHUB</a>
            <a href="#" className="font-mono text-sm hover:text-acid-green">DISCORD</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Home Page - Main Landing Page
function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <MarqueeBanner />
      <Hero />
      <FeaturedAgents />
      <HowItWorks />
      <CTASection />
      <Footer />
    </div>
  )
}

// 404 Page - Error Page
function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center noise-bg">
      <div className="text-center">
        <div className="font-mono text-9xl font-bold text-gray-200">404</div>
        <h2 className="text-4xl font-bold mt-4 mb-2">Page Lost</h2>
        <p className="text-gray-600 mb-8">This page doesn't exist (or the agent deleted it)</p>
        <button className="btn btn-primary">
          Back Home →
        </button>
      </div>
    </div>
  )
}

// Main App Component
function App() {
  useEffect(() => {
    // Track when app is running as PWA
    if (isStandalone()) {
      document.body.classList.add('pwa-standalone')
      console.log('Running as PWA')
    }
    
    // Preload important assets
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_URLS',
        urls: ['/manifest.json']
      })
    }
  }, [])
  
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  )
}

export default App
