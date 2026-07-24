import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, FileText, Microscope, Scale, ArrowRight, Activity, Clock, Users } from 'lucide-react';

const stats = [
  { icon: Activity, value: '24/7', label: 'Service' },
  { icon: Clock, value: '< 2hr', label: 'Avg Response' },
  { icon: Users, value: '15+', label: 'Medical Officers' },
];

const features = [
  { icon: FileText, title: 'Case Management', desc: 'End-to-end tracking from admission to final report dispatch with full audit trail.' },
  { icon: Microscope, title: 'Forensic Examinations', desc: 'Clinical and postmortem examination workflows with injury documentation and lab integration.' },
  { icon: Scale, title: 'Court Integration', desc: 'Seamless MLR dispatch, court summons management, and trial scheduling.' },
  { icon: Shield, title: 'Secure & Compliant', desc: 'Role-based access control, digital signatures, and complete audit logging.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">MLIMS</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            Sign In
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(59,130,246,0.4) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(37,99,235,0.3) 0%, transparent 50%)' }} />
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-600/10 border border-primary-500/20 rounded-full text-primary-400 text-xs font-medium mb-8">
            <Shield className="w-3.5 h-3.5" />
            Medico-Legal Information Management System
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
            Modern Forensic<br />
            <span className="text-primary-400">Case Management</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A comprehensive digital platform for managing medico-legal cases, clinical examinations,
            postmortem procedures, and court documentation — built for the Department of Forensic Medicine.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center px-8 py-3.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/25"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center px-8 py-3.5 bg-white/10 text-slate-300 font-semibold rounded-xl hover:bg-white/20 transition-all border border-slate-700"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative -mt-12 mb-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 divide-y md:divide-y-0 md:divide-x divide-slate-200 md:flex">
            {stats.map((s, i) => (
              <div key={i} className="flex-1 p-6 text-center">
                <s.icon className="w-6 h-6 text-primary-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Core Capabilities</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Everything you need to manage forensic cases from intake to court disposition.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-primary-200 transition-all group">
                <div className="w-11 h-11 bg-primary-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                  <f.icon className="w-5.5 h-5.5 text-primary-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">Access the MLIMS platform to manage cases, generate reports, and track court proceedings.</p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center px-8 py-3.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/25"
          >
            Sign In to MLIMS
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-slate-700">MLIMS</span>
            </div>
            <p className="text-xs text-slate-400">Department of Forensic Medicine &copy; {new Date().getFullYear()}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
