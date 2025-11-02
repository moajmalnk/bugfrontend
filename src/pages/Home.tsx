import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  BugIcon, 
  ArrowRight, 
  Shield, 
  Zap, 
  Users, 
  Bell, 
  FileText, 
  Video, 
  MessageSquare,
  CheckCircle2,
  Lock,
  Sparkles,
  Mail,
  Smartphone,
  BarChart3,
  HeadphonesIcon,
  TrendingUp,
  Clock,
  Globe,
  MessageCircle
} from 'lucide-react';

const Home = () => {
  useEffect(() => {
    // Enable body scrolling for this page
    document.body.style.overflow = 'auto';
    return () => {
      // Restore overflow hidden when leaving the page
      document.body.style.overflow = 'hidden';
    };
  }, []);

  const features = [
    {
      icon: BugIcon,
      title: "Advanced Bug Tracking",
      description: "Comprehensive bug reporting with screenshots, voice notes, and detailed categorization"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Real-time messaging and role-based access for seamless team coordination"
    },
    {
      icon: Video,
      title: "Video Meetings",
      description: "Built-in video conferencing with screen sharing and meeting recordings"
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Multi-channel notifications via email, WhatsApp, and browser alerts"
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Comprehensive analytics with detailed reports and activity tracking"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Role-based permissions, data encryption, and secure authentication"
    },
    {
      icon: Clock,
      title: "Time Tracking",
      description: "Monitor work hours and project time allocation"
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Daily updates and work logs for transparent progress monitoring"
    }
  ];

  // Custom Google Icon Component
  const GoogleIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  // Custom WhatsApp Icon Component
  const WhatsAppIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.77.966-.944 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );

  const loginMethods = [
    {
      icon: Lock,
      label: "Username",
      color: "blue"
    },
    {
      icon: Mail,
      label: "Email",
      color: "blue"
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      color: "green",
      customIcon: WhatsAppIcon
    },
    {
      icon: Sparkles,
      label: "Magic Link",
      color: "purple"
    },
    {
      icon: Globe,
      label: "Google Sign-In",
      color: "red",
      customIcon: GoogleIcon
    }
  ];

  const companyInfo = {
    name: "BugRicer AI Innovations",
    tagline: "Advanced Bug Tracking & Project Management Platform",
    website: "https://bugricer.com",
    email: "info@bugricer.com",
    phone: "+91 8086995559",
    address: "Malappuram, Kerala, India"
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.05)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:20px_20px]" />
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        <div className="relative container mx-auto px-4 py-16 sm:py-24 md:py-32 max-w-6xl">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-2xl group transform hover:scale-105 transition-all duration-300">
                <BugIcon className="h-10 w-10 sm:h-12 sm:w-12 text-white group-hover:rotate-12 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              BugRicer
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
              Advanced Bug Tracking & Project Management Platform
            </p>

            {/* Tagline */}
            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Streamline your development workflow with powerful bug tracking, seamless team collaboration, 
              and comprehensive project management tools all in one place.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link to="/login">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto h-12 sm:h-14 px-8 text-base sm:text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#features">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full sm:w-auto h-12 sm:h-14 px-8 text-base sm:text-lg font-semibold border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl transition-all duration-300 hover:scale-105"
                >
                  Explore Features
                </Button>
              </a>
            </div>

            {/* Login Methods Preview */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8">
              {loginMethods.map((method, index) => {
                const IconComponent = method.customIcon || method.icon;
                const colorClasses = {
                  blue: "text-blue-600 dark:text-blue-400",
                  green: "text-green-600 dark:text-green-400",
                  purple: "text-purple-600 dark:text-purple-400",
                  red: "text-red-600 dark:text-red-400"
                };
                const colorClass = colorClasses[method.color as keyof typeof colorClasses] || colorClasses.blue;
                
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
                  >
                    {method.customIcon ? (
                      <span className="flex items-center justify-center">
                        <IconComponent />
                      </span>
                    ) : (
                      <IconComponent className={`h-4 w-4 ${colorClass}`} />
                    )}
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {method.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="relative py-16 sm:py-24 md:py-32 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Everything you need to manage bugs and collaborate with your team effectively
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why Choose Section */}
      <div className="relative py-16 sm:py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Why Choose BugRicer?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Built for modern development teams who value efficiency and security
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Secure Authentication
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Multiple login methods including OTP, magic links, and Google Sign-In for enhanced security
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-100 dark:border-purple-800">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Real-time Collaboration
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Instant messaging, video meetings, and live updates keep your team synchronized
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-100 dark:border-green-800">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Smart Analytics
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Comprehensive reporting and insights to track project progress and team performance
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Company Info Section */}
      <div className="relative py-16 sm:py-24 bg-slate-100 dark:bg-slate-900/50">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 sm:p-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                About BugRicer AI Innovations
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Your trusted partner in bug tracking and project management
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Contact Information
                </h3>
                <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    <strong>Website:</strong>{' '}
                    <a href={companyInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                      {companyInfo.website}
                    </a>
                  </p>
                  <p>
                    <strong>Email:</strong>{' '}
                    <a href={`mailto:${companyInfo.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {companyInfo.email}
                    </a>
                  </p>
                  <p>
                    <strong>Phone:</strong>{' '}
                    <a href={`tel:${companyInfo.phone.replace(/\s/g, '')}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {companyInfo.phone}
                    </a>
                  </p>
                  <p>
                    <strong>Address:</strong> {companyInfo.address}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <HeadphonesIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Support
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  We're committed to providing excellent customer support. If you have any questions, 
                  concerns, or need assistance with our platform, please don't hesitate to reach out to our team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA Section */}
      <div className="relative py-16 sm:py-24 bg-gradient-to-br from-blue-600 to-indigo-600">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg sm:text-xl text-blue-100 mb-8">
            Join thousands of teams already using BugRicer to streamline their development workflow
          </p>
          <Link to="/login">
            <Button 
              size="lg" 
              className="h-14 px-8 text-lg font-semibold bg-white hover:bg-slate-50 text-blue-600 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
            >
              Sign In Now
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>

          <div className="mt-12 pt-8 border-t border-blue-500/30">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6 text-sm text-blue-100">
              <Link to="/privacy-policy" className="hover:text-white transition-colors flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Privacy Policy
              </Link>
              <span className="hidden sm:inline text-blue-300">•</span>
              <Link to="/terms-of-use" className="hover:text-white transition-colors flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Terms of Use
              </Link>
              <span className="hidden sm:inline text-blue-300">•</span>
              <div className="text-blue-100">
                © 2025 BugRicer | CODO AI Innovations
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

