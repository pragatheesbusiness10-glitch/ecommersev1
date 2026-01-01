import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Store, Users, ShoppingCart, Shield, Zap, BarChart3, ChevronDown, Play } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Index: React.FC = () => {
  const {
    settingsMap,
    isLoading
  } = usePlatformSettings();
  const siteName = settingsMap.site_name || 'Afflux';
  const logoUrl = settingsMap.site_logo_url;
  const landingEnabled = settingsMap.landing_page_enabled;
  const heroTitle = settingsMap.landing_page_title || 'Empower Your Affiliate Network';
  const heroSubtitle = settingsMap.landing_page_subtitle || 'A private e-commerce platform where affiliates run their own storefronts, you control the catalog, and payments flow seamlessly.';
  const videoUrl = settingsMap.landing_video_url;
  const faqItems = settingsMap.faq_items || [];

  // If landing page is disabled, redirect to login
  if (!isLoading && !landingEnabled) {
    return <Navigate to="/login" replace />;
  }

  // Helper to render video (supports YouTube, Vimeo, direct video)
  const renderVideo = (url: string) => {
    if (!url) return null;

    // YouTube embed
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      if (url.includes('youtube.com/watch')) {
        videoId = new URL(url).searchParams.get('v') || '';
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0] || '';
      }
      if (videoId) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full aspect-video rounded-xl shadow-2xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }

    // Vimeo embed
    if (url.includes('vimeo.com')) {
      const vimeoId = url.split('vimeo.com/')[1]?.split('?')[0];
      if (vimeoId) {
        return (
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            className="w-full aspect-video rounded-xl shadow-2xl"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }

    // Direct video file
    return (
      <video
        src={url}
        controls
        className="w-full aspect-video rounded-xl shadow-2xl"
      >
        Your browser does not support the video tag.
      </video>
    );
  };

  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? <img src={logoUrl} alt={siteName} className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">{siteName.charAt(0)}</span>
              </div>}
            <span className="font-bold text-xl text-foreground">{siteName}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild>
              <Link to="/login">
                Sign In
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4" style={{
      background: 'var(--gradient-hero)'
    }}>
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm text-primary">The Future of Affiliate Commerce</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-primary text-center">
            {heroTitle.includes('Affiliate') ? <>
                {heroTitle.split('Affiliate')[0]}
                <span className="text-accent">Affiliate</span>
                {heroTitle.split('Affiliate')[1]}
              </> : heroTitle}
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 text-primary">
            {heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="xl" asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/login">
                Get Started
                <ArrowRight className="w-5 h-5 ml-2 text-secondary-foreground" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
              View Demo Store
            </Button>
          </div>
        </div>
      </section>

      {/* Video Section */}
      {videoUrl && (
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Play className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary">Watch & Learn</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                See How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Watch this quick tutorial to understand how our platform can help you grow your affiliate network.
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              {renderVideo(videoUrl)}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete platform for managing your private e-commerce network with affiliate resellers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[{
            icon: Store,
            title: 'Private Main Store',
            description: 'Your central product catalog, accessible only to you and your approved affiliates.'
          }, {
            icon: Users,
            title: 'Affiliate Storefronts',
            description: 'Each affiliate gets their own branded storefront with custom pricing.'
          }, {
            icon: ShoppingCart,
            title: 'Smart Order Flow',
            description: 'Orders are fulfilled only after affiliates pay you the base price.'
          }, {
            icon: Shield,
            title: 'Secure Payments',
            description: 'Built-in wallet system with transparent payment tracking.'
          }, {
            icon: BarChart3,
            title: 'Real-time Analytics',
            description: 'Track orders, revenue, and affiliate performance at a glance.'
          }, {
            icon: Zap,
            title: 'Instant Setup',
            description: 'Get your affiliate network running in minutes, not days.'
          }].map((feature, index) => <div key={index} className="dashboard-card hover:border-accent/50 transition-colors opacity-0 animate-slide-up" style={{
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'forwards'
          }}>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>)}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A simple, transparent workflow that benefits everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[{
            step: '01',
            title: 'You Add Products',
            desc: 'Stock your private catalog with products and set base prices.'
          }, {
            step: '02',
            title: 'Affiliates List',
            desc: 'Affiliates add products to their storefronts with their markup.'
          }, {
            step: '03',
            title: 'Customers Buy',
            desc: 'Customers purchase from affiliate storefronts.'
          }, {
            step: '04',
            title: 'You Fulfill',
            desc: 'After affiliate pays base price, you ship to customer.'
          }].map((item, index) => <div key={index} className="text-center">
                <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-accent">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>)}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {faqItems.length > 0 && (
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Got questions? We've got answers.
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-4">
                {faqItems.map((item, index) => (
                  <AccordionItem 
                    key={item.id} 
                    value={item.id}
                    className="dashboard-card border rounded-xl px-6"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-6">
                      <span className="text-lg font-semibold text-foreground">{item.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-6">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 px-4" style={{
      background: 'var(--gradient-primary)'
    }}>
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
            Ready to Launch Your Affiliate Network?
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-8 text-primary">
            Join hundreds of businesses growing with {siteName}.
          </p>
          <Button size="xl" asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/login">
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {logoUrl ? <img src={logoUrl} alt={siteName} className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">{siteName.charAt(0)}</span>
              </div>}
            <span className="font-semibold text-foreground">{siteName}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>;
};
export default Index;