"use client";

import { motion, Variants } from "framer-motion";
import { Upload, Zap, BarChart3, Shield, Play, ArrowRight } from "lucide-react";

export default function Home() {
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <main className="stealth-main">
      {/* Hero Section */}
      <section className="hero-section">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="hero-content"
        >
          <div className="badge">STREAMSIDE VIDEO ENGINE V1.0</div>
          <h1 className="text-gradient">Viral Architecture <br /> for Elite Creators</h1>
          <p className="hero-desc">
            The first cinematic AI pipeline designed for high-stakes video production. 
            Identify hooks, reframe content, and deploy viral assets in seconds.
          </p>
          <div className="hero-actions">
            <button className="glow-button">Get Early Access</button>
            <button className="secondary-btn">Watch the System <Play size={14} /></button>
          </div>
        </motion.div>
      </section>

      {/* Bento Grid Features */}
      <section className="bento-section">
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="bento-grid"
        >
          <motion.div variants={item} className="bento-item glass large">
            <div className="bento-icon"><Zap size={24} /></div>
            <h3>Dynamic Reframing</h3>
            <p>Our proprietary AI calculates eye-level attention to keep your audience locked on every frame.</p>
            <div className="bento-preview"></div>
          </motion.div>

          <motion.div variants={item} className="bento-item glass small">
            <div className="bento-icon"><BarChart3 size={24} /></div>
            <h3>Hook Detection</h3>
            <p>Scanning 1,000s of data points to identify viral potential before you even click upload.</p>
          </motion.div>

          <motion.div variants={item} className="bento-item glass small">
            <div className="bento-icon"><Shield size={24} /></div>
            <h3>Stealth Privacy</h3>
            <p>Venture-grade encryption. Your raw content never leaves our secure pipeline.</p>
          </motion.div>

          <motion.div variants={item} className="bento-item glass medium">
            <div className="bento-icon"><Upload size={24} /></div>
            <h3>Instant Deployment</h3>
            <p>Seamlessly export directly to TikTok, Reels, and Shorts with a single click.</p>
            <button className="bento-btn">Try Upload <ArrowRight size={14} /></button>
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}
