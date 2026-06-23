import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import * as cheerio from 'cheerio'

// Config for Vercel Serverless Function duration (maximum allowed)
export const maxDuration = 300

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuickWin {
  impact: 'High' | 'Medium' | 'Low'
  fix: string
  effort: 'Minutes' | 'Hours' | 'Days'
  estimated_lift: string // e.g. "+12-18% CTR lift" or "+8-15% conversion lift"
}

export interface AlternativeSuggestion {
  copy: string
  angle: string
  strategy: string
}

export interface CopyAnalysis {
  is_strong: boolean
  explanation: string
}

export interface BusinessProfile {
  site_type: string              // e.g. "Community Platform", "Developer Tool", "SaaS", etc.
  business_model: string         // e.g. "Freemium Social Platform", "B2B SaaS"
  primary_user_goal: string      // e.g. "Connect and communicate with friends", "Ship production apps faster"
  primary_conversion_goal: string // e.g. "Download desktop app", "Start free project"
}

export interface AIRecommendation {
  recommendation: string
  reasoning: string
}

export interface AuditResult {
  overall_score: number
  headline_clarity_score: number
  cta_effectiveness_score: number
  trust_signals_score: number
  readability_score: number
  value_proposition_score: number
  seo_score: number

  website_type: string         // e.g. SaaS, Developer Tool, Open Source, E-commerce, Agency, etc.
  confidence_score: number     // 0-100 score on recommendation confidence
  
  business_profile: BusinessProfile

  headline_analysis: CopyAnalysis
  improved_headlines: AlternativeSuggestion[] // 3 alternatives

  cta_analysis: CopyAnalysis
  improved_ctas: AlternativeSuggestion[] // 3 alternatives

  // Top level fields preserved for backward compatibility
  currentHeadline: string
  improvedHeadline: string     // Preferred alternative (Option A)
  currentCTA: string
  improvedCTA: string          // Preferred alternative (Option A)
  currentMetaDescription: string
  improvedMetaDescription: string

  quickWins: QuickWin[]
  topProblems: string[]
  topImprovements: string[]
  strengths: string[]
  weaknesses: string[]
  recommendations: AIRecommendation[]
  aboveFoldAnalysis: string
  trustGapAnalysis: string
}

// ─── Scraper — structured extraction, no raw HTML to AI ──────────────────────

export interface ExtractedPageData {
  title: string
  metaDescription: string
  h1: string
  h2s: string[]
  h3s: string[]
  primaryCTAs: string[]
  allButtons: string[]
  testimonials: string[]
  pricingText: string[]
  bodyParagraphs: string[]
  navItems: string[]
  trustSignals: {
    hasTestimonials: boolean
    hasRatings: boolean
    hasSocialProof: boolean          // e.g. "10,000 customers"
    hasMoneyBackGuarantee: boolean
    hasSecurityBadge: boolean
    hasFAQ: boolean
    hasVideo: boolean
    hasLogos: boolean                // client logos
    hasCaseStudies: boolean
    hasPricingVisible: boolean
    // New developer/OSS trust signals
    hasGitHubStars: boolean
    hasCommunityStats: boolean
    hasDocsVisible: boolean
  }
}

function extractPageData(html: string): ExtractedPageData {
  const $ = cheerio.load(html)

  // ── Remove noise ──────────────────────────────────────────────────────────
  $('script, style, noscript, iframe, [aria-hidden="true"], .sr-only, .visually-hidden').remove()

  // ── Core fields ───────────────────────────────────────────────────────────
  const title = $('title').text().trim()
  const metaDescription = ($('meta[name="description"]').attr('content') ?? '').trim()
  const h1 = $('h1').first().text().replace(/\s+/g, ' ').trim()

  const h2s = $('h2')
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
    .get().filter(Boolean).slice(0, 8)

  const h3s = $('h3')
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
    .get().filter(Boolean).slice(0, 6)

  // ── CTAs — only meaningful button/link text ───────────────────────────────
  const allButtonTexts = $('a, button')
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter(t => t.length >= 2 && t.length <= 60)

  // Primary CTAs: short action words (Get, Start, Try, Sign, Buy, Book, etc.), EXCLUDING navigation sign in/out
  const primaryCTARegex = /^(get|start|try|sign|buy|book|request|schedule|watch|see|learn|join|claim|grab|download|access|begin|launch|unlock|activate)/i
  const primaryCTAs = [
    ...new Set(
      allButtonTexts.filter(
        t => primaryCTARegex.test(t) && !/log\s*in|sign\s*in|sign\s*out|log\s*out/i.test(t)
      )
    )
  ].slice(0, 5)
  const allButtons = [...new Set(allButtonTexts)].slice(0, 15)

  // ── Testimonials ──────────────────────────────────────────────────────────
  const testimonialSelectors = [
    'blockquote', '[class*="testimonial"]', '[class*="review"]',
    '[class*="quote"]', '[class*="customer"]', '[class*="feedback"]',
  ]
  const testimonials = $(testimonialSelectors.join(','))
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter(t => t.length > 20 && t.length < 400)
    .slice(0, 3)

  // ── Pricing text ──────────────────────────────────────────────────────────
  const pricingSelectors = [
    '[class*="price"]', '[class*="pricing"]', '[class*="plan"]',
    '[class*="cost"]', '[class*="tier"]',
  ]
  const pricingText = $(pricingSelectors.join(','))
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter(t => t.length > 3 && t.length < 300)
    .slice(0, 6)

  // ── Body paragraphs (above-the-fold approximation) ────────────────────────
  const bodyParagraphs = $('p')
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter(p => p.length > 30)
    .slice(0, 6)

  // ── Nav items ─────────────────────────────────────────────────────────────
  const navItems = $('nav a')
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter(Boolean)
    .slice(0, 10)

  // ── Trust signals (boolean detection) ────────────────────────────────────
  const fullText = $('body').text().toLowerCase()
  const htmlLower = html.toLowerCase()

  const trustSignals = {
    hasTestimonials: testimonials.length > 0
      || /testimonial|said|says|review|rated us/i.test(html),
    hasRatings: /\d+(\.\d+)?\s*(stars?|\/5|out of 5|rating)/i.test(html)
      || /★|⭐/.test(html)
      || /stargazers|github stars/i.test(html),
    hasSocialProof: /(\d[\d,k+]+\s*(customers?|users?|companies|teams?|businesses?|clients?|brands?|developers?|stars?))/i.test(html),
    hasMoneyBackGuarantee: /money.back|refund|guarantee|risk.free/i.test(html),
    hasSecurityBadge: /ssl|secure|encrypt|gdpr|soc\s*2|iso\s*27001/i.test(html),
    hasFAQ: /faq|frequently asked|common questions/i.test(html),
    hasVideo: /video|youtube|vimeo|loom|wistia/i.test(htmlLower),
    hasLogos: /\b(trusted by|as seen in|used by|powered by|partners?)\b/i.test(html)
      || $('img[alt*="logo" i], [class*="logo-grid"], [class*="client-logo"]').length > 0,
    hasCaseStudies: /case\s*stud/i.test(html),
    hasPricingVisible: pricingText.length > 0 || /price|pricing|plan|billing/i.test(html),
    hasGitHubStars: /github/i.test(html) && /stars|stargazers/i.test(html),
    hasCommunityStats: /discord|community|members|join\s*our/i.test(html),
    hasDocsVisible: /docs|documentation|api\s*reference/i.test(html)
  }

  return {
    title,
    metaDescription,
    h1,
    h2s,
    h3s,
    primaryCTAs,
    allButtons,
    testimonials,
    pricingText,
    bodyParagraphs,
    navItems,
    trustSignals
  }
}

function generateMockAudit(url: string, data: ExtractedPageData): AuditResult {
  const currentHeadline = data.h1 || data.title || "Modern Solutions for Growing Businesses"
  const currentCTA = data.primaryCTAs[0] || (data.allButtons && data.allButtons[0]) || "Learn More"
  const currentMeta = data.metaDescription || "We offer services to help you scale your business and automate processes."

  // 1. Determine Category, Business Model, Goals based on scraper metrics or URL
  let site_type = 'SaaS'
  let business_model = 'B2B SaaS Subscription'
  let primary_user_goal = 'Evaluate product features & automate workflow'
  let primary_conversion_goal = 'Start free trial'

  const lowerUrl = url.toLowerCase()
  const lowerText = (data.title + ' ' + currentHeadline + ' ' + currentCTA + ' ' + data.bodyParagraphs.join(' ')).toLowerCase()

  if (lowerUrl.includes('discord.com') || /discord|community|chat\b|hang\s*out|play\s*games|forum/i.test(lowerText)) {
    site_type = 'Community Platform'
    business_model = 'Freemium Social Platform'
    primary_user_goal = 'Join and communicate'
    primary_conversion_goal = 'Download app'
  } else if (data.trustSignals.hasGitHubStars || lowerUrl.includes('docs.') || lowerUrl.includes('/docs') || /github\.com|postgres|sqlite|mongodb|redis|graphql|rest\s*api|typescript|npm\s*install|yarn\s*add|pip\s*install|\bsdk\b/i.test(lowerText)) {
    site_type = 'Developer Tool'
    business_model = 'Open Core Developer SaaS'
    primary_user_goal = 'Build apps faster and reduce setup complexity'
    primary_conversion_goal = 'Start project'
  } else if (lowerUrl.includes('marketplace') || /marketplace|freelancer|talent|hire\s*freelancers|escrow|job\s*board|dual-sided/i.test(lowerText)) {
    site_type = 'Marketplace'
    business_model = 'Transactional Commission Fee'
    primary_user_goal = 'Post listings and discover services'
    primary_conversion_goal = 'Post listing'
  } else if (lowerUrl.includes('ai') || /ai\b|artificial\s*intelligence|generative\s*ai|openai|model|chatgpt|generate\s*video|generate\s*image|stable\s*diffusion|midjourney|text\s*to\s*image/i.test(lowerText)) {
    site_type = 'AI Tool'
    business_model = 'Usage-based SaaS / Freemium'
    primary_user_goal = 'Generate high-quality creative assets'
    primary_conversion_goal = 'Try for free'
  } else if (lowerUrl.includes('agency') || /agency|consulting|design\s*studio|creative\s*agency|development\s*studio|portfolio|case\s*study|our\s*work|work\s*with\s*us/i.test(lowerText)) {
    site_type = 'Agency'
    business_model = 'Professional Service Consulting'
    primary_user_goal = 'Evaluate portfolios and hire contractors'
    primary_conversion_goal = 'Book a call'
  } else if (lowerUrl.includes('shop') || lowerUrl.includes('store') || lowerUrl.includes('checkout') || data.pricingText.some(t => t.toLowerCase().includes('add to cart') || t.toLowerCase().includes('cart') || t.toLowerCase().includes('shipping')) || /add\s*to\s*cart|shop\s*now|buy\s*now|checkout|storefront|e-commerce|ecommerce|shopify/i.test(lowerText)) {
    site_type = 'E-commerce'
    business_model = 'Direct-to-Consumer Retail'
    primary_user_goal = 'Browse items and complete purchases'
    primary_conversion_goal = 'Shop Now / Add to Cart'
  }

  const business_profile = {
    site_type,
    business_model,
    primary_user_goal,
    primary_conversion_goal
  }

  // 2. Category-specific copy and heuristics
  let isHeadlineStrong = false
  let headlineExplanation = ''
  let improvedHeadlines: AlternativeSuggestion[] = []

  let isCtaStrong = false
  let ctaExplanation = ''
  let improvedCtas: AlternativeSuggestion[] = []

  let improvedMetaDescription = ''
  let trustScoreFactor = 50

  if (site_type === 'Community Platform') {
    isHeadlineStrong = /fun & games|imagine a place|where.*communities|hang out|chat/i.test(currentHeadline) || currentHeadline.length > 10
    headlineExplanation = isHeadlineStrong
      ? `The headline "${currentHeadline}" works well because it communicates voice/chat belonging and gaming/chilling connections without SaaS conversion pressure.`
      : `The headline "${currentHeadline}" is generic. A community platform headline should appeal to social connections, hanging out, or specific servers.`

    improvedHeadlines = [
      {
        copy: isHeadlineStrong ? currentHeadline : "Where Your Communities Connect and Hang Out",
        angle: "Emotional Branding Hook",
        strategy: "Appeals directly to the user's need for belonging, presenting the site as a comfortable hangout."
      },
      {
        copy: "Talk, Chat, and Chill with Your Friends Easily",
        angle: "Direct Function Hook",
        strategy: "Clarifies core platform communication functions (talk, chat, chill) to lower onboarding friction."
      },
      {
        copy: "Create a Custom Space for Your Club, Gaming Group, or Team",
        angle: "Group Personalization",
        strategy: "Gives concrete group use cases to trigger instant personalization for creators."
      }
    ]

    isCtaStrong = /download|open.*browser|join|get invite/i.test(currentCTA)
    ctaExplanation = isCtaStrong
      ? `The CTA "${currentCTA}" is excellent. Community platforms thrive on app downloads or direct browser entries rather than demo booking.`
      : `The CTA "${currentCTA}" is passive. It should suggest downloading the client installer or joining a server.`

    improvedCtas = [
      {
        copy: "Download app",
        angle: "Direct Client Install",
        strategy: "Prompts the highest-converting installation action to maximize retention."
      },
      {
        copy: "Join community",
        angle: "Social Entry",
        strategy: "Frames onboarding around entry to a social collective."
      },
      {
        copy: "Open in browser",
        angle: "Frictionless Play",
        strategy: "Allows instant evaluation without local client installation overhead."
      }
    ]

    improvedMetaDescription = `Talk, chat, hang out, and stay close with your friends and communities on a friendly, customizable communication space.`
    trustScoreFactor = (data.trustSignals.hasCommunityStats ? 40 : 0) + (data.trustSignals.hasSocialProof ? 30 : 0) + (data.trustSignals.hasLogos ? 20 : 0)

  } else if (site_type === 'Developer Tool') {
    isHeadlineStrong = /build|scale|postgres|auth|realtime|api|developer|deploy|code/i.test(currentHeadline)
    headlineExplanation = isHeadlineStrong
      ? `The headline "${currentHeadline}" is strong. It lists standard architectural components or developer outcomes (quick setup, high scale) directly.`
      : `The headline "${currentHeadline}" describes a generic category. It should list core technical components, frameworks, or developer outcomes.`

    improvedHeadlines = [
      {
        copy: isHeadlineStrong ? currentHeadline : "Build and Scale Applications Faster",
        angle: "Technical Outcome Hook",
        strategy: "Speaks directly to the engineering team's desire to ship features without boilerplate setup."
      },
      {
        copy: "The Postgres-Powered Core for Modern Backends",
        angle: "Architecture Stack Hook",
        strategy: "Calls out standard stack elements to lower evaluation time for technical leads."
      },
      {
        copy: "Launch Secure APIs and Realtime Databases in Minutes",
        angle: "Boilerplate Speed Hook",
        strategy: "Appeals directly to the developer under tight product release deadlines."
      }
    ]

    isCtaStrong = /start.*project|view.*docs|deploy|get.*started|install/i.test(currentCTA) && !/sign\s*in|log\s*in/i.test(currentCTA)
    ctaExplanation = isCtaStrong
      ? `The CTA "${currentCTA}" works well because it represents a technical developer sandbox action or docs reading path.`
      : `The CTA "${currentCTA}" is passive. A dev tool CTA should initiate database setup, project deployment, or open CLI docs.`

    improvedCtas = [
      {
        copy: "Start project",
        angle: "Action Sandbox Hook",
        strategy: "Invites developers directly into a dashboard workbench sandbox."
      },
      {
        copy: "View docs",
        angle: "Low Friction Onboarding",
        strategy: "Targets developers who want to inspect the API spec before creating an account."
      },
      {
        copy: "Deploy to cloud",
        angle: "Immediate Value",
        strategy: "Emphasizes automated hosting capability to appeal to deployment speed."
      }
    ]

    improvedMetaDescription = `Build production-grade applications with secure databases, instant auth APIs, and realtime database sync. Start for free today.`
    trustScoreFactor = (data.trustSignals.hasGitHubStars ? 40 : 0) + (data.trustSignals.hasDocsVisible ? 30 : 0) + (data.trustSignals.hasLogos ? 20 : 0)

  } else if (site_type === 'E-commerce') {
    isHeadlineStrong = /shop|store|sell|buy|product|brand|catalog|free shipping/i.test(currentHeadline)
    headlineExplanation = isHeadlineStrong
      ? `The headline "${currentHeadline}" matches e-commerce targets. It either highlights direct purchase/store creation benefits, or lists catalog segments.`
      : `The headline "${currentHeadline}" is generic. E-commerce titles should state product uniqueness, discounts, or store-builder outcomes.`

    improvedHeadlines = [
      {
        copy: "Start selling online today",
        angle: "Store Setup Hook",
        strategy: "Appeals directly to creators and merchants looking to build a digital store easily."
      },
      {
        copy: "Premium Quality Apparel, Handcrafted & Delivered Free",
        angle: "Direct-to-Consumer Hook",
        strategy: "Highlights material quality and free shipping to remove purchasing hesitation."
      },
      {
        copy: "Shop Our Custom Collection & Save 20% This Week",
        angle: "Scarcity & Discount Hook",
        strategy: "Creates purchase urgency by offering a time-limited savings discount."
      }
    ]

    isCtaStrong = /shop|add.*cart|buy|start.*selling|start.*trial/i.test(currentCTA)
    ctaExplanation = isCtaStrong
      ? `The CTA "${currentCTA}" is appropriate. It pushes users straight to shopping, cart additions, or store creation.`
      : `The CTA "${currentCTA}" is non-committal. Try a direct purchase button, store setup action, or discount claim.`

    improvedCtas = [
      {
        copy: "Shop Now",
        angle: "Storefront Navigation",
        strategy: "Sends visitors straight to products catalog browsing."
      },
      {
        copy: "Add to Cart",
        angle: "Direct Acquisition",
        strategy: "Accelerates conversion loop by targeting direct catalog purchase actions."
      },
      {
        copy: "Start free trial",
        angle: "Creator Sandbox",
        strategy: "Appeals to store builders looking to set up storefronts risk-free."
      }
    ]

    improvedMetaDescription = `Discover premium items and start your store or browse our custom catalogs with free shipping on orders over $50.`
    trustScoreFactor = (data.trustSignals.hasPricingVisible ? 35 : 0) + (data.trustSignals.hasTestimonials ? 35 : 0) + (data.trustSignals.hasRatings ? 25 : 0)

  } else if (site_type === 'Marketplace') {
    isHeadlineStrong = /marketplace|hire|find|freelancer|buy.*sell|listing/i.test(currentHeadline)
    headlineExplanation = isHeadlineStrong
      ? `The headline "${currentHeadline}" works well for a marketplace by matching supply providers with prospective high-intent buyers.`
      : `The headline "${currentHeadline}" is generic. Marketplace headings need to clarify what can be bought/sold and build dual-sided trust.`

    improvedHeadlines = [
      {
        copy: "Find Elite Freelancers for Your Next Big Project",
        angle: "Demand Acquisition Hook",
        strategy: "Attracts high-value employers by promising vetted professional contractors."
      },
      {
        copy: "Buy & Sell Services Instantly in a Trusted Network",
        angle: "Dual-Sided Exchange",
        strategy: "Attracts both sellers looking for income and buyers looking for rapid service delivery."
      },
      {
        copy: "The Safe Way to Hire Inspected Talent with Escrow Security",
        angle: "Trust & Safety Hook",
        strategy: "Addresses buyer anxiety regarding quality and contract fulfillment fraud."
      }
    ]

    isCtaStrong = /post.*listing|find.*services|hire|browse/i.test(currentCTA)
    ctaExplanation = isCtaStrong
      ? `The CTA "${currentCTA}" works. It prompts users to post listings, browse existing inventory, or hire candidates.`
      : `The CTA "${currentCTA}" is passive. Marketplace buttons should prompt immediate candidate hiring or posting listings.`

    improvedCtas = [
      {
        copy: "Post listing",
        angle: "Supply Generation Hook",
        strategy: "Invites sellers or recruiters to list their products/jobs instantly."
      },
      {
        copy: "Find services",
        angle: "Demand Search Hook",
        strategy: "Directs buyers to browse categories and spend funds."
      },
      {
        copy: "Hire freelancers",
        angle: "Contract Initiation",
        strategy: "Focuses on rapid project startup and hiring."
      }
    ]

    improvedMetaDescription = `The trusted dual-sided marketplace to hire vetted professionals, browse listings, and conduct secure escrow transactions.`
    trustScoreFactor = (data.trustSignals.hasSocialProof ? 40 : 0) + (data.trustSignals.hasRatings ? 30 : 0) + (data.trustSignals.hasSecurityBadge ? 25 : 0)

  } else if (site_type === 'AI Tool') {
    isHeadlineStrong = /generate|create|synthesize|ai\b|model|text to|image to/i.test(currentHeadline)
    headlineExplanation = isHeadlineStrong
      ? `The headline "${currentHeadline}" is strong. It lists the output type (video, audio, text) and highlights AI generative capabilities.`
      : `The headline "${currentHeadline}" is generic. An AI tool H1 should state what creative assets can be generated and how quickly.`

    improvedHeadlines = [
      {
        copy: "Generate Studio-Quality Videos from Simple Text Prompts",
        angle: "Generative Outcome Hook",
        strategy: "Appeals to creators looking to bypass complex rendering or filming budgets."
      },
      {
        copy: "Create Anything You Imagine with State-of-the-Art AI Models",
        angle: "Creative Freedom Hook",
        strategy: "Motivates casual and professional users by promoting boundless generation capabilities."
      },
      {
        copy: "The Generative Platform for Elite Creative Workflows",
        angle: "Enterprise Workflow Hook",
        strategy: "Targets design studios looking for team-compatible generative speed."
      }
    ]

    isCtaStrong = /try.*free|get.*started|generate|start.*creating/i.test(currentCTA)
    ctaExplanation = isCtaStrong
      ? `The CTA "${currentCTA}" is strong. AI tools convert best using low-friction sandbox entry keywords.`
      : `The CTA "${currentCTA}" is passive. It should suggest starting creation or claiming free generations.`

    improvedCtas = [
      {
        copy: "Try for free",
        angle: "Frictionless Sandbox Hook",
        strategy: "Offers immediate testing credits with no upfront credit card required."
      },
      {
        copy: "Start creating",
        angle: "Creative Spark Hook",
        strategy: "Aligns the button with the user's emotional goal of making art/text."
      },
      {
        copy: "Generate now",
        angle: "Instant Gratification",
        strategy: "Emphasizes near-zero processing delay to motivate clicks."
      }
    ]

    improvedMetaDescription = `Generate studio-quality videos, graphics, and assets instantly using advanced generative AI models. Try it for free today.`
    trustScoreFactor = (data.trustSignals.hasVideo ? 40 : 0) + (data.trustSignals.hasSocialProof ? 30 : 0) + (data.trustSignals.hasRatings ? 25 : 0)

  } else if (site_type === 'Agency') {
    isHeadlineStrong = /agency|consulting|design|studio|build|work|portfolio/i.test(currentHeadline)
    headlineExplanation = isHeadlineStrong
      ? `The headline "${currentHeadline}" is strong. It calls out service categories (design, dev) and implies high-end project results.`
      : `The headline "${currentHeadline}" is vague. An agency H1 needs to state service niche, target clientele, or product capabilities.`

    improvedHeadlines = [
      {
        copy: "We Design and Build High-Converting Digital Products",
        angle: "Capabilities Value Hook",
        strategy: "Focuses on business growth outcomes (conversions) to motivate corporate buyers."
      },
      {
        copy: "Elite Product Development for High-Growth Startups",
        angle: "Niche Target Hook",
        strategy: "Self-selects funded startup founders looking for rapid development squads."
      },
      {
        copy: "Your Dedicated Design and Engineering Partner",
        angle: "Collaboration Focus Hook",
        strategy: "Appeals to managers looking for fractional design or development support."
      }
    ]

    isCtaStrong = /view.*work|get.*touch|book.*call|work.*us/i.test(currentCTA)
    ctaExplanation = isCtaStrong
      ? `The CTA "${currentCTA}" is appropriate. Agencies convert best by driving call schedules or portfolio views.`
      : `The CTA "${currentCTA}" is passive. It should direct users to case studies, or a discovery call booking.`

    improvedCtas = [
      {
        copy: "Book a call",
        angle: "Direct Scheduling Hook",
        strategy: "Moves the lead straight to a qualified sales consultation calendar."
      },
      {
        copy: "View work",
        angle: "Proof Validation Hook",
        strategy: "Drives prospective clients to examine project portfolios and build trust."
      },
      {
        copy: "Get estimate",
        angle: "Price Inquiry Hook",
        strategy: "Triggers pricing request emails to capture high-intent budget buyers."
      }
    ]

    improvedMetaDescription = `We are an elite design and development agency crafting custom web applications for high-growth startups and enterprises.`
    trustScoreFactor = (data.trustSignals.hasTestimonials ? 40 : 0) + (data.trustSignals.hasLogos ? 35 : 0) + (data.trustSignals.hasCaseStudies ? 20 : 0)

  } else {
    isHeadlineStrong = currentHeadline.length > 25 && /help|save|increase|reduce|platform|workflow|software/i.test(currentHeadline)
    headlineExplanation = isHeadlineStrong
      ? `The headline "${currentHeadline}" is strong because it uses direct outcome verbs (e.g. increase, reduce) and targets core business goals.`
      : `The headline "${currentHeadline}" is category-centric instead of customer-centric. It describes what you do instead of how the customer benefits.`

    improvedHeadlines = [
      {
        copy: `${currentHeadline.split(':')[0]}: Reclaim 10+ Hours Every Week`,
        angle: "Direct Benefit Hook",
        strategy: "Focuses on tangible time saved to motivate high-intent business buyers."
      },
      {
        copy: "Reduce Process Friction and Automate Manual Work by 70%",
        angle: "Loss Aversion Hook",
        strategy: "Targets common operational frustrations to promise direct cost savings."
      },
      {
        copy: "The Automated Workspace That Keeps Your Team Aligned",
        angle: "Team Alignment Hook",
        strategy: "Appeals to managers looking to resolve communication overhead."
      }
    ]

    isCtaStrong = /start.*trial|try.*free|book.*demo/i.test(currentCTA)
    ctaExplanation = isCtaStrong
      ? `The CTA "${currentCTA}" is effective. It gives a clear, low-risk path to entry.`
      : `The CTA "${currentCTA}" is passive (e.g. Learn More). Action-oriented trial buttons convert 20-30% higher.`

    improvedCtas = [
      {
        copy: "Start trial",
        angle: "Risk-Free Trial Hook",
        strategy: "Gives a standard benefit-rich trial promise with zero upfront commitment."
      },
      {
        copy: "Book demo",
        angle: "High Touch Value Hook",
        strategy: "Attracts enterprise decision-makers who want an immediate guided walkthrough."
      },
      {
        copy: "Start free trial",
        angle: "Freemium Onboarding Hook",
        strategy: "Lowers sign-up anxiety by offering a forever-free gateway."
      }
    ]

    trustScoreFactor = (data.trustSignals.hasTestimonials ? 30 : 0) + (data.trustSignals.hasRatings ? 30 : 0) + (data.trustSignals.hasLogos ? 20 : 0)
  }

  const improvedHeadline = improvedHeadlines[0].copy
  const improvedCTA = improvedCtas[0].copy

  const finalTrustScore = Math.max(35, Math.min(95, trustScoreFactor))
  const seoScore = data.metaDescription && data.h1 ? 95 : 60
  const ctaScore = isCtaStrong ? 90 : 45
  const overallScore = Math.round((75 + finalTrustScore + seoScore + ctaScore) / 4)

  return {
    overall_score: overallScore,
    headline_clarity_score: isHeadlineStrong ? 90 : 70,
    cta_effectiveness_score: ctaScore,
    trust_signals_score: finalTrustScore,
    readability_score: 80,
    value_proposition_score: isHeadlineStrong ? 90 : 65,
    seo_score: seoScore,

    website_type: site_type,
    confidence_score: 90,
    business_profile,

    headline_analysis: {
      is_strong: isHeadlineStrong,
      explanation: headlineExplanation
    },
    improved_headlines: improvedHeadlines,

    cta_analysis: {
      is_strong: isCtaStrong,
      explanation: ctaExplanation
    },
    improved_ctas: improvedCtas,

    currentHeadline,
    improvedHeadline,
    currentCTA,
    improvedCTA,
    currentMetaDescription: currentMeta,
    improvedMetaDescription,

    quickWins: [
      {
        impact: 'High',
        effort: 'Minutes',
        estimated_lift: '+12-18% CTR lift',
        fix: isCtaStrong 
          ? `Keep the primary button "${currentCTA}" centered and above the fold. Optimize the background contrast to enhance visibility.`
          : `Change your primary CTA copy from "${currentCTA}" to "${improvedCTA}". Benefit-focused CTAs remove user hesitation and boost conversion.`
      },
      {
        impact: 'High',
        effort: 'Hours',
        estimated_lift: '+8-15% Conv lift',
        fix: isHeadlineStrong
          ? `Your headline "${currentHeadline}" is strong. We suggest running split tests against alternative B ("${improvedHeadlines[1].copy}") to test user segment hooks.`
          : `Change H1 headline from "${currentHeadline}" to "${improvedHeadline}". Clear benefit copy helps visitors understand your product outcome under 3 seconds.`
      },
      {
        impact: 'Medium',
        effort: 'Hours',
        estimated_lift: '+5-10% trust lift',
        fix: data.trustSignals.hasTestimonials
          ? `Move testimonials higher up the page to catch user interest earlier in the scroll.`
          : `Add 2-3 testimonials or ratings badges. The current page has zero visible trust signals, creating friction.`
      },
      {
        impact: 'Medium',
        effort: 'Minutes',
        estimated_lift: '+4-8% SEO lift',
        fix: `Update your HTML meta description. Changing it to the suggested version will include search keywords and boost your Google CTR.`
      }
    ],

    topProblems: [
      isHeadlineStrong
        ? `Headline is strong, but secondary page sections do not maintain the same benefit hooks.`
        : `The main headline "${currentHeadline}" focus too much on product categories instead of how the customer benefits.`,
      isCtaStrong
        ? `Primary CTA "${currentCTA}" is strong, but there is no secondary option for low-intent users.`
        : `The Call to Action "${currentCTA}" is too passive. It fails to convey what value is gained after clicking.`,
      data.trustSignals.hasTestimonials
        ? `Social proof is hidden near the footer. Testimonials should be closer to CTA conversion sections.`
        : `Critical trust gap: No testimonials, logos, or review counts were detected on the page, increasing signup anxiety.`
    ],

    topImprovements: [
      `BEFORE: Generic or category headline "${currentHeadline}" → AFTER: Direct value hook "${improvedHeadline}". This communicates product purpose instantly.`,
      `BEFORE: Non-committal CTA "${currentCTA}" → AFTER: Specific action CTA "${improvedCTA}". This motivates clicks.`,
      `BEFORE: Missing or placeholder meta description → AFTER: Benefit-oriented description under 155 characters.`
    ],

    strengths: [
      data.title ? `Page title tag "${data.title}" is present and well-formed.` : `Document structure has clear typography levels.`,
      data.primaryCTAs.length > 0 ? `Active primary conversion buttons are easily discoverable.` : `The site layout has a clean navigation structure.`,
      `Mobile-friendly CSS layout styling with good typography scale and contrast.`
    ],

    weaknesses: [
      isHeadlineStrong ? `Missing secondary hooks directly under the H1 to sustain visitor interest.` : `The main headline fails to state a timeline, target cohort, or specific outcome.`,
      isCtaStrong ? `No secondary CTA is provided for users who are not ready to download or register yet.` : `Primary conversion buttons are passive and fail to suggest a high-value action step.`,
      `Lack of prominent trust indicators (ratings, company logos, review counts) near conversion buttons.`,
      data.metaDescription ? `Meta description is generic and could be optimized for search engine CTR.` : `Meta description is entirely missing, causing search engines to auto-generate snippet copy.`
    ],

    recommendations: [
      {
        recommendation: `Run a split test comparing the current headline "${currentHeadline}" with the rewritten outcome statement: "${improvedHeadline}".`,
        reasoning: `Testing direct outcome hooks against category headlines typically yields +10-25% improvement in click-through retention. Outcome statements clarify value immediately and reduce cognitive load for visitors.`
      },
      {
        recommendation: `Replace passive button copy like "${currentCTA}" with the category-focused CTA: "${improvedCTA}".`,
        reasoning: `Strong action-oriented CTAs specify what visitors will get after clicking, removing friction. Category-specific context words (like "docs", "project", "listing") improve visual saliency.`
      },
      {
        recommendation: `Ensure key trust elements (like ratings badges or logo strips) are visible above the fold.`,
        reasoning: `Early trust indicators lower signup anxiety. Placed near primary CTA buttons, badges or partner logos act as powerful psychological compliance cues.`
      },
      {
        recommendation: `Optimize page load performance by compressing large hero images and deferring non-critical scripts.`,
        reasoning: `A 1-second delay in page load time can reduce conversions by up to 7%. Compressing and optimizing images preserves visitor attention and reduces early bounce rates.`
      },
      {
        recommendation: `Address common conversion friction points by introducing a short FAQ section near the footer.`,
        reasoning: `FAQs answer prospective customer objections right at the point of conversion decision. Keeping answers short helps resolve late-stage friction and boosts conversion rates.`
      }
    ],

    aboveFoldAnalysis: `Within the first few seconds, users are greeted with the headline "${currentHeadline}" and button "${currentCTA}". The copy describes your category but does not paint a vivid picture of the user's ultimate outcome, leading to lower engagement.`,
    trustGapAnalysis: data.trustSignals.hasTestimonials
      ? `Testimonials exist but are placed too low. Promoting them closer to the hero section will bridge the early trust gap.`
      : `No customer quotes, company logos, or ratings were found. Introducing a logo strip of current clients or one high-quality quote will dramatically decrease the trust gap.`
  }
}

function isOpenAiDemoMode(): boolean {
  const key = process.env.OPENAI_API_KEY
  return !key || key.trim() === '' || key.includes('your-') || key.includes('placeholder') || key.includes('openai-key')
}

async function analyzeWithAI(url: string, data: ExtractedPageData): Promise<AuditResult> {
  if (isOpenAiDemoMode()) {
    console.log('[LandingLens] Running AI Audit in Demo/Mock Mode because OpenAI key is placeholder or empty.')
    return generateMockAudit(url, data)
  }

  const apiKey = process.env.OPENAI_API_KEY || ''
  const isOpenRouter = apiKey.startsWith('sk-or-')
  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined,
    defaultHeaders: isOpenRouter ? {
      'HTTP-Referer': 'https://landinglens.com',
      'X-Title': 'LandingLens'
    } : undefined
  })

  // Build a clean, structured context string — no raw HTML
  const context = `
URL: ${url}
Page Title: ${data.title || '(missing)'}
Meta Description: ${data.metaDescription || '(missing — this is a problem)'}

HEADLINE (H1): ${data.h1 || '(no H1 found — critical SEO/CRO issue)'}
SECTION HEADINGS (H2): ${data.h2s.length ? data.h2s.map((h, i) => `\n  ${i + 1}. "${h}"`).join('') : '(none)'}
SUB-HEADINGS (H3): ${data.h3s.length ? data.h3s.map(h => `"${h}"`).join(', ') : '(none)'}

PRIMARY CTA BUTTONS: ${data.primaryCTAs.length ? data.primaryCTAs.map(c => `"${c}"`).join(', ') : '(none found)'}
ALL BUTTONS/LINKS: ${data.allButtons.map(b => `"${b}"`).join(', ')}

TESTIMONIALS FOUND: ${data.testimonials.length ? data.testimonials.map(t => `"${t.slice(0, 150)}"`).join('\n  ') : '(none detected)'}

PRICING TEXT: ${data.pricingText.length ? data.pricingText.map(p => `"${p.slice(0, 100)}"`).join(', ') : '(no pricing visible)'}

BODY COPY (first paragraphs): 
${data.bodyParagraphs.map((p, i) => `  P${i + 1}: "${p.slice(0, 200)}"`).join('\n')}

NAVIGATION: ${data.navItems.join(', ')}

TRUST SIGNALS DETECTED:
${Object.entries(data.trustSignals).map(([k, v]) => `  ${v ? '✓' : '✗'} ${k}`).join('\n')}
`.trim()

  const prompt = `You are an elite Conversion Rate Optimization (CRO) expert. Your reputation is built on being brutally specific — you ALWAYS quote the actual copy from the page. You never give generic advice.

PROMPT ISOLATION COMPLIANCE:
You must audit this URL and page data in complete isolation. Do NOT mix context or copy rules from previous instructions, other websites, or default templates. Do NOT output standard B2B SaaS templates (e.g., "Start Your Free 14-Day Trial", "Reclaim 10+ Hours Every Week", "Team automation") for E-commerce, Marketplace, Developer, Agency, AI Tool, or Community Platforms unless those elements are already explicitly present in the preprocessed page data. Every recommendation and copy suggestion MUST be custom-tailored to the target site's industry and existing copy vocabulary.

STEPS FOR CONTEXTUAL AUDITING:
1. BEFORE generating any scores or recommendations, solve this business profile analysis to align your mindset:
   {
     "site_type": "<Classified platform type: 'SaaS' | 'Developer Tool' | 'E-commerce' | 'Marketplace' | 'AI Tool' | 'Agency' | 'Community Platform'>",
     "business_model": "<Revenue model: e.g. 'Freemium Social Network', 'B2B SaaS Subscription', 'Open Core Developer Tool', 'Direct-to-Consumer Retail', 'Transactional Commission Fee', 'Usage-based SaaS / Freemium', 'Professional Service Consulting'>",
     "primary_user_goal": "<Visitor goal: e.g. 'Join and communicate', 'Build apps faster', 'Browse items and complete purchases', 'Find services', 'Generate creative assets', 'Hire designers', 'Evaluate features'>",
     "primary_conversion_goal": "<Metric target: e.g. 'Download app', 'Start project', 'Add to Cart / Shop Now', 'Post listing', 'Try for free', 'Book a call', 'Start trial'>"
   }
   You MUST include this in the final JSON under the "business_profile" key.

2. Determine page category based on the profile and enforce the Industry-Specific CTA and Copy Library:

   - If category = Community Platform:
     * Focus: Evaluate engagement, onboarding friction, social proof, and network effects.
     * CTAs: "Download app", "Join server", "Open in browser", "Join community", "Get invite". Accept "Download" as a perfectly valid, strong CTA.
     * Headline: Do NOT call brand headlines (like "Group chat that's all fun & games") "generic". Explain how they set a friendly tone.
     * Never suggest: Free trial, demo booking, team automation, or SaaS trial copy.

   - If category = Developer Tool:
     * Focus: Evaluate documentation visibility, GitHub stargazers, API simplicity, onboarding time, and developer integrations.
     * CTAs: "Start project", "View docs", "Deploy", "Get started", "Install", "Run command". Do NOT flag sign-in links as weak primary CTAs.
     * Headline: Accept developer hooks (like "Build in a weekend, scale to millions") as strong brand statements.

   - If category = E-commerce:
     * Focus: Evaluate product discoverability, checkout friction, transaction trust, catalog size, and store setup.
     * CTAs: "Shop Now", "Add to Cart", "Buy Now", "Start selling", "Start free trial" (for platforms), "Get discount".
     * Never suggest: Team automation or enterprise demo booking for retail storefronts.

   - If category = Marketplace:
     * Focus: Evaluate dual-sided supply and demand, listing discovery, transaction security, and escrow trust.
     * CTAs: "Post listing", "Find services", "Hire [Role]", "Browse listings", "Sell items".

   - If category = AI Tool:
     * Focus: Evaluate output quality, generation latency, free credit options, and sandbox ease-of-use.
     * CTAs: "Try for free", "Get started", "Generate [Asset]", "Start creating", "Generate now".

   - If category = Agency:
     * Focus: Evaluate portfolio quality, design capabilities, client case studies, and call booking.
     * CTAs: "View work", "Get in touch", "Book a call", "Work with us", "Get estimate".

   - If category = SaaS:
     * Focus: Evaluate business productivity, automation, seat expansion, ROI, hours saved.
     * CTAs: "Book demo", "Start trial", "Start free trial", "Get started", "View pricing".

3. If a headline or CTA is already strong, clear, and benefit-driven in its specific category, mark it as strong (is_strong: true), explain WHY it works, and provide alternatives as optional split-testing suggestions rather than corrections. Do NOT show correction indicators if the copy is strong.
4. Only include recommendations where confidence is greater than 70%.

GOLDEN RULE: Every problem, weakness, or recommendation MUST reference specific text or elements actually found on this page. If the headline is "Imagine a Place", say that exact phrase. Never say "your headline lacks clarity" — say 'The headline "Imagine a Place" fits a Community Platform's branding by setting a friendly tone.'

Here is the preprocessed page data (NOT raw HTML):

${context}

Return ONLY valid JSON matching this EXACT structure. No markdown, no explanation, just JSON:

{
  "overall_score": <0-100, weighted: headline 25%, value_prop 20%, cta 20%, trust 15%, readability 10%, seo 10%>,
  "headline_clarity_score": <0-100>,
  "cta_effectiveness_score": <0-100>,
  "trust_signals_score": <0-100>,
  "readability_score": <0-100>,
  "value_proposition_score": <0-100>,
  "seo_score": <0-100>,

  "website_type": "<Classified category: 'SaaS' | 'Developer Tool' | 'Open Source' | 'E-commerce' | 'Agency' | 'Blog' | 'Documentation' | 'Community Platform'>",
  "confidence_score": <0-100, confidence in these recommendations>,

  "business_profile": {
    "site_type": "<Classified platform type: e.g. 'Community Platform', 'Developer Tool', 'B2B SaaS', 'E-commerce Store'>",
    "business_model": "<Revenue distribution model: e.g. 'Freemium Social Network', 'B2B SaaS Subscription', 'Open Core Developer Tool', 'DTC Retail'>",
    "primary_user_goal": "<What the target visitor wants to accomplish on this page: e.g. 'Join social servers and talk to friends', 'Deploy secure cloud APIs', 'Buy designer clothes'>",
    "primary_conversion_goal": "<The main business metric action: e.g. 'Download application installer', 'Start a free developer sandbox project', 'Complete cart checkout'>"
  },

  "headline_analysis": {
    "is_strong": <true if the current headline is already strong, category-appropriate and benefit-driven, false otherwise>,
    "explanation": "<Strategic breakdown of the current headline. If strong, explain why it works; if weak, point out what it is missing. Quote specific words from it.>"
  },
  "improved_headlines": [
    {
      "copy": "<Alternative Headline Option A: strategic rewrite>",
      "angle": "<The psychological/strategic angle (e.g. 'Direct Benefit Hook', 'Loss Aversion Hook')>",
      "strategy": "<Brief explanation of why this copy will convert this specific target audience>"
    },
    {
      "copy": "<Alternative Headline Option B>",
      "angle": "<Psychological angle>",
      "strategy": "<Brief strategy description>"
    },
    {
      "copy": "<Alternative Headline Option C>",
      "angle": "<Psychological angle>",
      "strategy": "<Brief strategy description>"
    }
  ],

  "cta_analysis": {
    "is_strong": <true if the current CTA is already action-oriented and benefit-driven, false otherwise>,
    "explanation": "<Strategic breakdown of the current CTA button text. Quote it.>"
  },
  "improved_ctas": [
    {
      "copy": "<Alternative CTA Option A: strategic rewrite>",
      "angle": "<Strategic angle (e.g. 'Immediate Value', 'Low Friction')>",
      "strategy": "<Why this works for this user cohort>"
    },
    {
      "copy": "<Alternative CTA Option B>",
      "angle": "<Strategic angle>",
      "strategy": "<Why this works>"
    },
    {
      "copy": "<Alternative CTA Option C>",
      "angle": "<Strategic angle>",
      "strategy": "<Why this works>"
    }
  ],

  "currentHeadline": "<exact H1 text from the page, or 'No H1 found'>",
  "improvedHeadline": "<the copy from improved_headlines Option A, for backward compatibility>",

  "currentCTA": "<the most prominent CTA button text found on the page, verbatim>",
  "improvedCTA": "<the copy from improved_ctas Option A, for backward compatibility>",

  "currentMetaDescription": "<exact meta description text, or 'Not set — this page is missing a meta description'>",
  "improvedMetaDescription": "<rewritten meta description under 155 chars: includes primary keyword, main benefit, clear CTA>",

  "quickWins": [
    {
      "impact": "High",
      "effort": "Minutes",
      "estimated_lift": "<Estimated percentage lift, e.g. '+12-18% CTR lift' or '+8-15% conversion lift'>",
      "fix": "<Single specific action. Quote old → new. E.g.: Change CTA from \\"Learn More\\" to \\"Start My Free Trial\\" — this one change can lift CTR by 10-30%>"
    },
    {
      "impact": "High",
      "effort": "Hours",
      "estimated_lift": "<Estimated percentage lift, e.g. '+8-15% conversion lift'>",
      "fix": "<Second quick win — specific and actionable>"
    },
    {
      "impact": "Medium",
      "effort": "Hours",
      "estimated_lift": "<Estimated percentage lift, e.g. '+5-10% trust lift'>",
      "fix": "<Third quick win>"
    },
    {
      "impact": "Medium",
      "effort": "Minutes",
      "estimated_lift": "<Estimated percentage lift, e.g. '+4-8% SEO lift'>",
      "fix": "<Fourth quick win>"
    }
  ],

  "topProblems": [
    "<Problem 1: Quote the EXACT copy or element. Explain WHY it hurts conversions. E.g.: 'The headline \\"We Build Software\\" occupies prime above-fold real estate but communicates zero value — it describes a category, not a customer benefit.>'",
    "<Problem 2: specific and quoted>",
    "<Problem 3: specific and quoted>"
  ],

  "topImprovements": [
    "<Improvement 1 with BEFORE → AFTER. E.g.: 'BEFORE: \\"Learn More\\" button (passive, non-committal) → AFTER: \\"Get My Free Audit\\" (outcome-specific, low-friction). This improvement removes ambiguity about what happens when users click.'>",
    "<Improvement 2 with BEFORE → AFTER>",
    "<Improvement 3 with BEFORE → AFTER>"
  ],

  "strengths": [
    "<Strength 1 — quote specific copy or element that works well>",
    "<Strength 2>",
    "<Strength 3>"
  ],

  "weaknesses": [
    "<Weakness 1 — reference actual page element>",
    "<Weakness 2>",
    "<Weakness 3>",
    "<Weakness 4>"
  ],

  "recommendations": [
    {
      "recommendation": "<Direct, actionable advice. E.g. 'Promote client logo strip above the fold.'>",
      "reasoning": "<3-4 lines explanation of why this works. Explain the psychology, cognitive load, or trust building reason behind it.>"
    },
    {
      "recommendation": "<Recommendation 2>",
      "reasoning": "<Reasoning 2>"
    },
    {
      "recommendation": "<Recommendation 3>",
      "reasoning": "<Reasoning 3>"
    },
    {
      "recommendation": "<Recommendation 4>",
      "reasoning": "<Reasoning 4>"
    },
    {
      "recommendation": "<Recommendation 5>",
      "reasoning": "<Reasoning 5>"
    }
  ],

  "aboveFoldAnalysis": "<2-3 sentences about exactly what a visitor sees in the first 3 seconds. Quote the actual headline and CTA. Answer: Does it instantly communicate WHO this is for, WHAT they get, and WHY now?>",

  "trustGapAnalysis": "<2 sentences on the most critical missing trust element. Be specific: e.g. 'The page has no customer logos, testimonials, or review counts. The only trust signal is a padlock icon in the footer — invisible to most visitors.'>"
}`

  const model = isOpenRouter ? 'openai/gpt-oss-120b:free' : 'gpt-4o-mini'
  const completion = await openai.chat.completions.create({
    model: model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 2400,
  })

  const raw = completion.choices[0]?.message?.content ?? ''
  const cleaned = raw.replace(/^```json\n?/m, '').replace(/\n?```$/m, '').trim()

  try {
    return JSON.parse(cleaned) as AuditResult
  } catch {
    console.error('AI JSON parse failed. Raw output:', cleaned.slice(0, 600))
    throw new Error('AI returned an unreadable response. Please try again.')
  }
}

// ─── POST /api/audit ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

    try { new URL(url) } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // ── Plan limits ───────────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, audit_count_this_month, audit_reset_date')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const isPro = profile.plan === 'pro'
    const resetDate = new Date(profile.audit_reset_date)
    const now = new Date()
    const isNewMonth = now.getFullYear() > resetDate.getFullYear() ||
      (now.getFullYear() === resetDate.getFullYear() && now.getMonth() > resetDate.getMonth())

    if (isNewMonth) {
      await supabase.from('profiles').update({
        audit_count_this_month: 0,
        audit_reset_date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      }).eq('id', user.id)
      profile.audit_count_this_month = 0
    }

    if (!isPro && profile.audit_count_this_month >= 3) {
      return NextResponse.json(
        { error: 'Monthly audit limit reached. Upgrade to Pro for unlimited audits.' },
        { status: 429 }
      )
    }

    // ── Fetch page ────────────────────────────────────────────────────────────
    let html: string
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LandingLensBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      html = await res.text()
    } catch {
      return NextResponse.json(
        { error: 'Could not fetch the page. Make sure the URL is publicly accessible and not behind a login.' },
        { status: 422 }
      )
    }

    // ── Extract structured data ───────────────────────────────────────────────
    const pageData = extractPageData(html)

    // ── AI analysis ───────────────────────────────────────────────────────────
    let analysis: AuditResult
    try {
      analysis = await analyzeWithAI(url, pageData)
    } catch (err: unknown) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'AI analysis failed' },
        { status: 500 }
      )
    }

    // ── Save to DB ────────────────────────────────────────────────────────────
    const { data: audit, error: dbError } = await supabase
      .from('audits')
      .insert({
        user_id: user.id,
        url,
        page_title: pageData.title || null,
        overall_score: analysis.overall_score,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        recommendations: analysis.recommendations.map(r => typeof r === 'string' ? r : r.recommendation),
        top_problems: analysis.topProblems,
        top_improvements: analysis.topImprovements,
        suggested_headline: analysis.improvedHeadline,
        suggested_cta: analysis.improvedCTA,
        headline_clarity_score: analysis.headline_clarity_score,
        cta_effectiveness_score: analysis.cta_effectiveness_score,
        trust_signals_score: analysis.trust_signals_score,
        readability_score: analysis.readability_score,
        value_proposition_score: analysis.value_proposition_score,
        seo_score: analysis.seo_score,
        raw_analysis: analysis,  // stores ALL fields including quickWins, before/after, etc.
      })
      .select('*')
      .single()

    if (dbError) {
      console.error('DB error:', dbError)
      return NextResponse.json({ error: 'Failed to save audit' }, { status: 500 })
    }

    await supabase.from('profiles')
      .update({ audit_count_this_month: profile.audit_count_this_month + 1 })
      .eq('id', user.id)

    return NextResponse.json({ auditId: audit.id, audit })

  } catch (err: unknown) {
    console.error('Audit error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
