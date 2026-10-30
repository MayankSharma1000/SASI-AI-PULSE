import React from "react";

import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight, ArrowUpRight, Bookmark, BookmarkCheck,
  BookOpen,
  Check, ChevronDown,
  CircleHelp,
  Clock3,
  Compass, ExternalLink, FileText,
  Flame,
  Home, Layers3, Menu, Moon, MoreHorizontal, Newspaper,
  PanelLeftClose, PanelLeftOpen,
  Search, Settings2, ShieldCheck,
  SlidersHorizontal,
  Sparkles, Sun, ThumbsDown, ThumbsUp, X,
  Zap
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { topics as availableTopics, demoPapers, demoStories } from './demoData';

const cx = (...classes) => classes.filter(Boolean).join(' ');
const idOf = item => String(item.id || item._id || item.externalId || item.url || item.title);
const dateLabel = value => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
const shortName = profile => profile?.name?.trim()?.split(/\s+/)[0] || 'there';
const publishedTime = item => {
  const value = item?.publishedAt || item?.publishedDate || item?.publicationDate || item?.published || item?.date;
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};
const newestFirst = items => [...items].sort((a, b) => publishedTime(b) - publishedTime(a));

function IconButton({ label, onClick, children, active = false, className = '' }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={cx('icon-button', active && 'is-active', className)}>{children}</button>;
}

function Brand({ compact = false }) {
  return <div className="brand-lockup" aria-label="SASI AI Pulse">
    <span className="brand-mark"><Activity size={20} strokeWidth={2.6} /></span>
    {!compact && <span className="brand-name">SASI <b>AI Pulse</b></span>}
  </div>;
}

function Sidebar({ page, setPage, collapsed, setCollapsed, profile }) {
  const nav = [
    { id: 'feed', label: 'For you', icon: Home },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'saved', label: 'Saved items', icon: Bookmark },
    { id: 'liked', label: 'Liked items', icon: ThumbsUp },
    { id: 'disliked', label: 'Disliked items', icon: ThumbsDown }
  ];
  return <aside className={cx('sidebar', collapsed && 'sidebar-collapsed')}>
    <div className="sidebar-top">
      <Brand compact={collapsed} />
      <IconButton label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={() => setCollapsed(!collapsed)} className="collapse-button">
        {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
      </IconButton>
    </div>
    <div className="nav-label">{!collapsed && 'YOUR SPACE'}</div>
    <nav className="main-nav" aria-label="Main navigation">
      {nav.map(({ id, label, icon: Icon }) => <button key={id} className={cx('nav-item', page === id && 'nav-item-active')} onClick={() => setPage(id)} title={collapsed ? label : undefined}>
        <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{id === 'saved' && !collapsed && <span className="nav-count"> </span>}
      </button>)}
    </nav>
    <div className="nav-divider" />
    <div className="nav-label">{!collapsed && 'DISCOVER'}</div>
    <nav className="main-nav" aria-label="Discovery">
      <button className={cx('nav-item', page === 'profile' && 'nav-item-active')} onClick={() => setPage('profile')} title={collapsed ? 'My profile' : undefined}>
        <Settings2 size={18} strokeWidth={1.8} /><span>My profile</span>
      </button>
    </nav>
    <div className="sidebar-spacer" />
    <div className="sidebar-note">
      <div className="note-icon"><Sparkles size={17} /></div>
      {!collapsed && <>
        <strong>Your feed, your way.</strong>
        <p>Choose interests to make your daily briefing more relevant.</p>

      </>}
    </div>
    <button className="profile-mini" onClick={() => setPage('profile')} title={collapsed ? 'Open profile' : undefined}>
      <span className="avatar">{(profile?.name || 'MS').slice(0, 1).toUpperCase()}</span>
      {!collapsed && <span className="profile-mini-copy"><strong>{profile?.name || 'Your profile'}</strong><small>Personal workspace</small></span>}
      {!collapsed && <MoreHorizontal size={18} className="profile-more" />}
    </button>
  </aside>;
}

function Header({ query, setQuery, theme, setTheme, onMobileMenu, onProfile }) {
  return <header className="topbar">
    <IconButton label="Open navigation" className="mobile-menu" onClick={onMobileMenu}><Menu size={20} /></IconButton>
    <div className="search-wrap">
      <Search size={17} />
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search papers, topics, or news..." aria-label="Search papers, topics, or news" />
      <kbd>⌘ K</kbd>
    </div>
    <div className="topbar-actions">
      <IconButton label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </IconButton>
      <IconButton label="Help and guidance" onClick={() => window.alert('Tip: choose a topic or search for a paper to explore your AI briefing.')}><CircleHelp size={18} /></IconButton>
      <button className="account-button" onClick={onProfile}><span>My workspace</span><ChevronDown size={15} /></button>
    </div>
  </header>;
}

function SectionHeading({ eyebrow, title, description, action, onAction }) {
  return <div className="section-heading">
    <div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{description && <p>{description}</p>}</div>
    {action && <button className="quiet-button" onClick={onAction}>{action}<ArrowRight size={15} /></button>}
  </div>;
}

function TopicPills({ items = [] }) {
  return <div className="topic-pills">{items.slice(0, 4).map(tag => <span className="topic-pill" key={tag}>{tag}</span>)}</div>;
}

function ResearchCard({ item, onFeedback, feedbackAction, saved, onSave, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  const authors = Array.isArray(item.authors) ? item.authors.join(', ') : (item.authors || item.author || 'Research team');
  const tags = item.topicTags || item.topics || item.tags || [];
  const summary = item.summary || item.abstract || 'Open the original source to explore the research and its findings.';
  return <motion.article layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} transition={{ duration: 0.22 }} className="content-card research-card">
    <div className="card-topline"><span className="type-label"><span className="type-dot paper-dot" />Research paper</span><button className="more-button" aria-label="More paper actions" onClick={() => setExpanded(!expanded)}><MoreHorizontal size={19} /></button></div>
    <button className="card-title-button" onClick={() => onOpen(item)}><h3>{item.title || 'Untitled research paper'}</h3><ExternalLink size={15} /></button>
    <div className="meta-line"><span>{authors}</span><span className="meta-separator">·</span><span>{item.source || 'arXiv'}</span><span className="meta-separator">·</span><span>{dateLabel(item.publishedAt || item.publishedDate || item.createdAt)}</span></div>
    <TopicPills items={tags} />
    <p className={cx('summary-text', !expanded && 'summary-clamp')}>{summary}</p>
    {item.relevanceReason && <div className="relevance-note"><span className="relevance-icon"><Sparkles size={15} /></span><div><strong>Why this may interest you</strong><p>{item.relevanceReason}</p></div></div>}
    {expanded && <div className="expanded-details"><span><Clock3 size={14} /> {item.readingMinutes || 8} min read</span>{item.doi && <span>DOI: {item.doi}</span>}{item.clusterId && <span>Story group: {item.clusterId}</span>}</div>}
    <div className="card-actions">
      <button className="button-primary button-sm" onClick={() => onOpen(item)}>Read paper <ArrowUpRight size={15} /></button>
      <button className={cx('button-secondary button-sm', saved && 'button-selected')} onClick={() => onSave(item)}>{saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}{saved ? 'Saved' : 'Save'}</button>
      <div className="feedback-actions">
        <IconButton label="Mark useful" active={feedbackAction === 'like'} onClick={() => onFeedback(item, 'like')}><ThumbsUp size={15} /></IconButton>
        <IconButton label="Not for me" active={feedbackAction === 'dismiss'} onClick={() => onFeedback(item, 'dismiss')}><ThumbsDown size={15} /></IconButton>
      </div>
    </div>
  </motion.article>;
}

function NewsCard({ item, onOpen, onFeedback, feedbackAction }) {
  const [showSources, setShowSources] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const sources = item.sources || item.sourceList || [];
  return <motion.article layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} transition={{ duration: 0.22 }} className="content-card news-card">
    {item.imageUrl && !imageFailed && (
      <div className="news-visual">
        <button
          className="news-image-button"
          onClick={() => onOpen(item)}
          aria-label={`Open story: ${item.title || 'AI industry update'}`}
        >
          <img
            className="news-thumbnail"
            src={item.imageUrl}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        </button>
      </div>
    )}
    <div className="card-topline"><span className="type-label"><span className="type-dot news-dot" />AI industry story</span><span className="freshness-label">{dateLabel(item.publishedAt || item.publishedDate)}</span></div>
    <button className="card-title-button" onClick={() => onOpen(item)}><h3>{item.title || 'AI industry update'}</h3><ExternalLink size={15} /></button>
    <div className="meta-line"><span>{item.source || 'Industry news'}</span><span className="meta-separator">·</span><span>{sources.length || item.clusterCount || item.sourceCount || 1} {(sources.length || item.clusterCount || item.sourceCount || 1) === 1 ? 'source' : 'sources'}</span></div>
    <p className="summary-text summary-clamp">{item.summary || item.description || 'Read the original report for the complete details.'}</p>
    <TopicPills items={item.topicTags || item.tags || []} />
    <AnimatePresence initial={false}>
      {showSources && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="sources-panel">
        {sources.length ? sources.map((source, i) => <a key={`${source.name || source.title}-${i}`} href={source.url || item.url || '#'} target="_blank" rel="noreferrer">{source.name || source.title || `Source ${i + 1}`}<ExternalLink size={13} /></a>) : <p>Source details are not available for this story yet.</p>}
      </motion.div>}
    </AnimatePresence>
    <div className="card-actions">
      <button className="button-primary button-sm" onClick={() => onOpen(item)}>Read story <ArrowUpRight size={15} /></button>
      <button className="button-secondary button-sm" onClick={() => setShowSources(!showSources)}><Layers3 size={15} />{showSources ? 'Hide sources' : 'View sources'}</button>
      <div className="feedback-actions">
        <IconButton label={feedbackAction === 'like' ? 'Unlike story' : 'Like story'} active={feedbackAction === 'like'} onClick={() => onFeedback?.(item, 'like')}><ThumbsUp size={15} /></IconButton>
        <IconButton label={feedbackAction === 'dismiss' ? 'Undo not for me' : 'Not for me'} active={feedbackAction === 'dismiss'} onClick={() => onFeedback?.(item, 'dismiss')}><ThumbsDown size={15} /></IconButton>
      </div>
    </div>
  </motion.article>;
}

function RightRail({ page, profile, papers, stories, savedCount, onEditTopics, setPage }) {
  const userTopics = profile?.topics || [];
  return <aside className="right-rail">
    {page === 'feed' ? <section className="rail-card interest-rail">
      <div className="rail-heading"><div><span className="eyebrow">TUNED TO YOU</span><h3>Your interests</h3></div><button className="small-icon-link" onClick={onEditTopics} aria-label="Edit interests"><Settings2 size={16} /></button></div>
      <div className="topic-pills rail-pills">{[...new Set([...userTopics, ...(profile?.likedTopics || [])])].slice(0, 6).map(t => <span className="topic-pill" key={t}>{t}</span>)}</div>{!userTopics.length && !(profile?.likedTopics || []).length && <p className="empty-interests">No interests yet. Choose topics to personalize your feed.</p>}
      <button className="text-link" onClick={onEditTopics}>Edit preferences <ArrowRight size={14} /></button>
    </section> : <section className="rail-card">
      <div className="rail-heading"><div><span className="eyebrow">QUICK GUIDE</span><h3>{{ explore: 'Open discovery', research: 'Research desk', news: 'Industry watch', saved: 'Reading list' }[page] || 'Your workspace'}</h3></div><span className="pulse-orb"><Activity size={16} /></span></div>
      <p className="rail-description">{{ explore: 'Browse the complete collection without personalisation hiding items.', research: 'Explore academic work, abstracts, authors and original paper links.', news: 'Follow industry developments in publication-date order, newest first.', saved: 'Keep papers and stories you want to revisit in one place.' }[page] || 'Your AI research workspace.'}</p>
      {page === 'saved' && <div className="stat-row"><span className="stat-icon green"><Bookmark size={16} /></span><span className="stat-copy"><strong>{savedCount}</strong><small>Saved items</small></span></div>}
      {page === 'research' && <button className="text-link" onClick={() => setPage('explore')}>Explore all content <ArrowRight size={14} /></button>}
      {page === 'news' && <button className="text-link" onClick={() => setPage('explore')}>Explore research too <ArrowRight size={14} /></button>}
    </section>}
    <section className="rail-card">
      <div className="rail-heading"><div><span className="eyebrow">AT A GLANCE</span><h3>Today's pulse</h3></div><span className="pulse-orb"><Activity size={16} /></span></div>
      <div className="stat-row"><span className="stat-icon blue"><FileText size={16} /></span><span className="stat-copy"><strong>{papers.length}</strong><small>Research papers</small></span></div>
      <div className="stat-row"><span className="stat-icon violet"><Newspaper size={16} /></span><span className="stat-copy"><strong>{stories.length}</strong><small>AI industry stories</small></span></div>
      <div className="stat-row"><span className="stat-icon green"><Flame size={16} /></span><span className="stat-copy"><strong>{new Set([...papers, ...stories].flatMap(x => x.topicTags || x.tags || [])).size}</strong><small>Topics in your feed</small></span></div>
    </section>
    <section className="rail-card trending-rail">
      <div className="rail-heading"><div><span className="eyebrow">EXPLORE</span><h3>Popular topics</h3></div><button className="small-text-link" onClick={() => setPage('topics')}>View all</button></div>
      {['AI Agents', 'Multimodal AI', 'AI Safety', 'Robotics'].map((topic, index) => <button key={topic} className="trending-row" onClick={() => setPage('topics')}><span className="trend-rank">0{index + 1}</span><span>{topic}</span><ArrowUpRight size={14} /></button>)}
    </section>
    <div className="rail-footer"><ShieldCheck size={15} /><span>Always traceable to original sources.</span></div>
  </aside>;
}

function OnboardingModal({ onClose, onComplete, initialTopics = [] }) {
  const [selected, setSelected] = useState(initialTopics);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('student');
  const [project, setProject] = useState('');
  const [step, setStep] = useState(0);
  const toggle = topic => setSelected(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  const finish = () => onComplete({ name: name.trim() || 'AI Explorer', topics: selected, goal, project: project.trim() });
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <motion.div className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.98 }}>
      <div className="modal-top"><Brand /><button className="icon-button" onClick={onClose} aria-label="Close setup"><X size={19} /></button></div>
      <div className="step-track"><span className={step >= 0 ? 'step-active' : ''}></span><span className={step >= 1 ? 'step-active' : ''}></span><span className={step >= 2 ? 'step-active' : ''}></span></div>
      <AnimatePresence mode="wait">
        {step === 0 && <motion.div key="welcome" className="modal-content" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
          <div className="welcome-art"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="welcome-core"><Sparkles size={35} /></div><span className="float-chip chip-a"><FileText size={15} /> Research</span><span className="float-chip chip-b"><Zap size={15} /> Ideas</span></div>
          <span className="eyebrow">A BETTER WAY TO KEEP UP</span><h2 id="onboarding-title">Your daily window<br />into the world of AI.</h2><p>Tell us what interests you. We'll shape a briefing that's useful to you, without the noise.</p>
          <label className="field-label" htmlFor="display-name">What should we call you?</label><input id="display-name" className="text-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name (optional)" />
          <button className="button-primary full-button" onClick={() => setStep(1)}>Let's personalize it <ArrowRight size={16} /></button>
        </motion.div>}
        {step === 1 && <motion.div key="topics" className="modal-content" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
          <span className="eyebrow">STEP 1 OF 2</span><h2 id="onboarding-title">What are you curious about?</h2><p>Choose a few topics. No technical knowledge required, and you can change these anytime.</p>
          <div className="topic-picker">{availableTopics.map(topic => <button key={topic} className={cx('topic-choice', selected.includes(topic) && 'topic-choice-selected')} onClick={() => toggle(topic)} aria-pressed={selected.includes(topic)}>{selected.includes(topic) && <Check size={14} />}{topic}</button>)}</div>
          <div className="modal-bottom"><button className="button-quiet" onClick={() => setStep(0)}>Back</button><button className="button-primary" onClick={() => setStep(2)}>Continue <ArrowRight size={16} /></button></div>
        </motion.div>}
        {step === 2 && <motion.div key="goal" className="modal-content" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
          <span className="eyebrow">STEP 2 OF 2 · OPTIONAL</span><h2 id="onboarding-title">Help us make it more relevant.</h2><p>Choose what best describes you. You can skip the project details if you're just exploring.</p>
          <div className="goal-options">{[['student', 'I’m a student'], ['researcher', 'I’m a researcher'], ['professional', 'I work in industry'], ['curious', 'I’m just curious']].map(([value, label]) => <button key={value} className={cx('goal-option', goal === value && 'goal-option-selected')} onClick={() => setGoal(value)}><span className="radio-dot">{goal === value && <span />}</span>{label}</button>)}</div>
          <label className="field-label" htmlFor="project-description">Anything you're working on? <span>Optional</span></label><textarea id="project-description" className="text-input text-area" value={project} onChange={e => setProject(e.target.value)} placeholder="For example, I'm exploring AI agents for education..." rows={3}></textarea>
          <div className="modal-bottom"><button className="button-quiet" onClick={() => setStep(1)}>Back</button><button className="button-primary" onClick={finish}>Build my feed <Sparkles size={16} /></button></div>
        </motion.div>}
      </AnimatePresence>
      <div className="modal-footnote"><ShieldCheck size={14} /> Your preferences stay in your workspace.</div>
    </motion.div>
  </div>;
}

function TopicsPage({ profile, onUpdate }) {
  const [selected, setSelected] = useState(profile?.topics || []);
  const [saved, setSaved] = useState(false);
  const toggle = topic => setSelected(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  return <div className="page-body narrow-page">
    <div className="eyebrow">DISCOVER</div><h1>Explore your interests</h1><p className="page-lede">Follow the ideas you care about. Your choices help us make your research feed more relevant.</p>
    <div className="topic-page-grid">{availableTopics.map((topic, index) => <button key={topic} className={cx('topic-tile', selected.includes(topic) && 'topic-tile-selected')} onClick={() => toggle(topic)}><span className="topic-tile-icon">{index % 2 === 0 ? <Sparkles size={19} /> : <Compass size={19} />}</span><span><strong>{topic}</strong><small>{topic === 'AI Agents' ? 'Systems that plan and use tools' : topic === 'AI Safety' ? 'Building AI that behaves reliably' : topic === 'Language Models' ? 'How models understand and generate text' : 'Explore research and new developments'}</small></span><span className="topic-check">{selected.includes(topic) ? <Check size={16} /> : <ArrowUpRight size={16} />}</span></button>)}</div>
    <div className="save-preferences-row"><span>{selected.length} topics selected</span><button className="button-primary" onClick={() => { onUpdate({ ...profile, topics: selected }); setSaved(true); setTimeout(() => setSaved(false), 2500); }}>{saved ? <Check size={16} /> : <Check size={16} />}{saved ? 'Preferences saved' : 'Save preferences'}</button></div>
  </div>;
}

function ProfilePage({ profile, onEditTopics, onLogout, apiStatus }) {
  return <div className="page-body narrow-page">
    <div className="eyebrow">YOUR WORKSPACE</div><h1>Your profile</h1><p className="page-lede">A little context helps SASI AI Pulse surface research that matters to you.</p>
    <div className="profile-panel"><div className="profile-hero"><span className="avatar avatar-large">{(profile?.name || 'A').slice(0,1).toUpperCase()}</span><div><h2>{profile?.name || 'AI Explorer'}</h2><p>{profile?.goal || 'Curious learner'} · Research discovery</p></div><button className="button-secondary button-sm" onClick={onEditTopics}>Edit interests</button></div>
      <div className="profile-section"><div><h3>Topics you follow</h3><p>Used to personalize your paper recommendations.</p></div><TopicPills items={profile?.topics || []} /></div>
      <div className="profile-section"><div><h3>Current project</h3><p>{profile?.project || 'No project added yet. You can add one anytime.'}</p></div></div>
      <div className="profile-section"><div><h3>Connection status</h3><p>Feed API: {apiStatus === 'connected' ? 'Connected' : apiStatus === 'demo' ? 'Preview mode · API not connected' : 'Checking connection'}</p></div><span className={cx('status-pill', apiStatus === 'connected' ? 'status-good' : 'status-demo')}><span />{apiStatus === 'connected' ? 'Live data' : 'Preview'}</span></div>
      <div className="profile-section profile-account-actions"><div><h3>Account</h3><p>Leave this workspace and set up another local profile.</p></div><div className="profile-action-buttons"><button className="button-secondary" onClick={onLogout}>Log out / switch profile</button></div></div>
    </div>
  </div>;
}


function AuthScreen({ onAuthenticate }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const submit = async event => {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      const result = mode === 'register'
        ? await api.register(name.trim(), email.trim(), password)
        : await api.login(email.trim(), password);

      await onAuthenticate(result);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const features = [
    {
      icon: '▤',
      className: 'research',
      title: 'Research Papers',
      description: 'Explore academic work and discover ideas shaping the future of AI.'
    },
    {
      icon: '▧',
      className: 'industry',
      title: 'Industry News',
      description: 'Stay informed about important developments across the AI industry.'
    },
    {
      icon: '✳',
      className: 'personal',
      title: 'Personalized Feed',
      description: 'Find research and stories tailored to your interests and goals.'
    },
    {
      icon: '♧',
      className: 'saved',
      title: 'Save & Revisit',
      description: 'Build your own reading list and return to important discoveries.'
    }
  ];

  return (
    <main className="pulse-auth-page">
      <div className="pulse-auth-orb pulse-auth-orb-one" />
      <div className="pulse-auth-orb pulse-auth-orb-two" />
      <div className="pulse-auth-orb pulse-auth-orb-three" />

      <section className="pulse-auth-shell">
        <header className="pulse-auth-header">
          <Brand />
          <div className="pulse-auth-nav" aria-label="Platform features">
            <span>Research</span>
            <i>·</i>
            <span>Ideas</span>
            <i>·</i>
            <span>Industry Insights</span>
            <i>·</i>
            <span>All in one place</span>
          </div>
        </header>

        <div className="pulse-auth-layout">
          <section className="pulse-auth-intro">
            <span className="pulse-auth-eyebrow">
              YOUR AI RESEARCH WORKSPACE
            </span>

            <h1>
              Stay ahead in the
              <br />
              <span>world of AI.</span>
            </h1>

            <p className="pulse-auth-description">
              Discover the latest research papers, industry news, and
              breakthrough ideas, personalized to your interests.
            </p>

            <div className="pulse-auth-features">
              {features.map(feature => (
                <div className="pulse-auth-feature" key={feature.title}>
                  <div className={`pulse-auth-feature-icon ${feature.className}`}>
                    {feature.icon}
                  </div>
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pulse-auth-visual" aria-label="Preview of the SASI AI Pulse research workspace">
              <div className="pulse-auth-visual-glow" />

              <div className="pulse-auth-float-card pulse-auth-float-for-you">
                <span className="float-symbol pink">✳</span>
                <span>For You</span>
              </div>

              <div className="pulse-auth-float-card pulse-auth-float-research">
                <div className="float-card-heading">
                  <span className="float-symbol blue">▤</span>
                  <strong>Research</strong>
                </div>
                <div className="float-line wide" />
                <div className="float-line" />
                <div className="float-line short" />
                <div className="float-chart"><span /><span /><span /><span /><span /></div>
              </div>

              <div className="pulse-auth-float-card pulse-auth-float-news">
                <div className="float-card-heading">
                  <span className="float-symbol violet">N</span>
                  <strong>Industry News</strong>
                </div>
                <div className="float-line wide" />
                <div className="float-line" />
                <div className="float-line short" />
                <div className="float-news-image">✦</div>
              </div>

              <div className="pulse-auth-float-card pulse-auth-float-explore">
                <span className="float-symbol violet">◈</span>
                <span>Explore All</span>
              </div>

              <div className="pulse-auth-float-card pulse-auth-float-saved">
                <span className="float-symbol green">♧</span>
                <span>Saved</span>
              </div>

              <div className="pulse-auth-illustration">
                <div className="illustration-sun" />
                <div className="illustration-plant">
                  <span /><span /><span />
                  <div />
                </div>
                <div className="illustration-person">
                  <div className="person-hair" />
                  <div className="person-head" />
                  <div className="person-neck" />
                  <div className="person-body" />
                  <div className="person-arm" />
                  <div className="person-laptop">
                    <div>✦</div>
                  </div>
                  <div className="person-leg leg-one" />
                  <div className="person-leg leg-two" />
                  <div className="person-shoe shoe-one" />
                  <div className="person-shoe shoe-two" />
                </div>
                <div className="illustration-desk" />
                <div className="illustration-books"><span /><span /><span /></div>
              </div>
            </div>

            <div className="pulse-auth-community">
              <div className="pulse-auth-avatar avatar-one">M</div>
              <div className="pulse-auth-avatar avatar-two">A</div>
              <div className="pulse-auth-avatar avatar-three">S</div>
              <p>
                Join curious minds exploring
                <br />
                the future of artificial intelligence.
              </p>
            </div>
          </section>

          <section className="pulse-auth-form-panel">
            <div className="pulse-auth-form-heading">
              <span className="pulse-auth-form-eyebrow">
                {mode === 'login' ? 'WELCOME BACK' : 'YOUR NEXT CHAPTER'}
              </span>

              <h2>
                {mode === 'login'
                  ? 'Sign in to your account'
                  : 'Create your account'}
              </h2>

              <p>
                {mode === 'login'
                  ? 'Continue your AI research journey with SASI AI Pulse.'
                  : 'Build your personal AI research workspace in minutes.'}
              </p>
            </div>

            <form onSubmit={submit} className="pulse-auth-form">
              {mode === 'register' && (
                <label className="pulse-auth-input-wrap">
                  <span className="pulse-auth-input-icon" aria-hidden="true">♙</span>
                  <span className="pulse-auth-input-content">
                    <span>Your name</span>
                    <input
                      type="text"
                      value={name}
                      onChange={event => setName(event.target.value)}
                      placeholder="How should we call you?"
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                      required
                    />
                  </span>
                </label>
              )}

              <label className="pulse-auth-input-wrap">
                <span className="pulse-auth-input-icon" aria-hidden="true">✉</span>
                <span className="pulse-auth-input-content">
                  <span>Email address</span>
                  <input
                    type="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </span>
              </label>

              <label className="pulse-auth-input-wrap">
                <span className="pulse-auth-input-icon" aria-hidden="true">♙</span>
                <span className="pulse-auth-input-content">
                  <span>Password</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'}
                    minLength={8}
                    maxLength={128}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                  />
                </span>
                <button
                  type="button"
                  className="pulse-auth-password-toggle"
                  onClick={() => setShowPassword(value => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </label>

              {mode === 'login' && (
                <div className="pulse-auth-form-options">
                  <span className="pulse-auth-secure-note">
                    <span className="pulse-auth-check">✓</span>
                    Secure sign-in
                  </span>
                  <span className="pulse-auth-no-reset">
                    Use your registered email
                  </span>
                </div>
              )}

              {error && (
                <p className="pulse-auth-error" role="alert">{error}</p>
              )}

              <button
                className="pulse-auth-submit"
                type="submit"
                disabled={busy}
              >
                <span>
                  {busy
                    ? 'Please wait…'
                    : mode === 'login'
                      ? 'Sign in'
                      : 'Create account'}
                </span>
                {!busy && <ArrowRight size={19} />}
              </button>
            </form>

            <div className="pulse-auth-divider">
              <span />
              <p>Your AI journey starts here</p>
              <span />
            </div>

            <div className="pulse-auth-benefits">
              <div><span>✓</span> Personalized discovery</div>
              <div><span>✓</span> One research workspace</div>
              <div><span>✓</span> Your saved reading list</div>
            </div>

            <div className="pulse-auth-account-switch">
              <p>
                {mode === 'login'
                  ? 'New to SASI AI Pulse?'
                  : 'Already have an account?'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError('');
                  setPassword('');
                }}
              >
                {mode === 'login' ? 'Create an account' : 'Sign in instead'}
              </button>
            </div>

            <p className="pulse-auth-privacy">
              <span>◆</span> Your research workspace, built around you.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}

function Pagination({ page, total, pageSize = 10, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return <div className="pagination-controls" aria-label="Feed pagination">
    <button className="button-secondary button-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
    <span>Page {page} of {pages}</span>
    <button className="button-secondary button-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
  </div>;
}

function EmptyState({ title, description, action, onAction }) {
  return <div className="empty-state"><span className="empty-icon"><BookOpen size={24} /></span><h3>{title}</h3><p>{description}</p>{action && <button className="button-secondary" onClick={onAction}>{action}<ArrowRight size={15} /></button>}</div>;
}

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('sasi-theme') || 'light');
  const [page, setPage] = useState(() => {
    const savedPage = localStorage.getItem('sasi-current-page');
    const validPages = ['feed', 'explore', 'research', 'news', 'saved', 'topics', 'profile'];

    if (savedPage === 'research' || savedPage === 'news') {
      return 'explore';
    }
    return validPages.includes(savedPage) ? savedPage : 'feed';
  });
  const [exploreTab, setExploreTab] = useState('research');
  const [papersPage, setPapersPage] = useState(1);
  const [storiesPage, setStoriesPage] = useState(1);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState('');
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sasi-profile')) || { name: 'AI Explorer', topics: [], likedTopics: [], goal: 'student', project: '' }; }
    catch { return { name: 'AI Explorer', topics: [], likedTopics: [], goal: 'student', project: '' }; }
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [papers, setPapers] = useState(demoPapers);
  const [stories, setStories] = useState(demoStories);
  const [savedIds, setSavedIds] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [likedItems, setLikedItems] = useState([]);
  const [dismissedItems, setDismissedItems] = useState([]);
  const [feedback, setFeedback] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sasi-feedback') || '{}'); }
    catch { return {}; }
  });
  const [apiStatus, setApiStatus] = useState('checking');
  const [apiMessage, setApiMessage] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('sasi-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sasi-current-page', page);
  }, [page]);

  useEffect(() => {
    let cancelled = false;

    api.getSession()
      .then(session => {
        if (cancelled) return;

        const user = session?.user;
        const server = session?.profile;

        if (!user || !server) return;

        setAuthUser(user);
        setProfile({
          ...server,
          id: server.id || server._id || server.userId,
          name: server.name || user.name || 'AI Explorer',
          topics: server.topics || server.interests || [],
          likedTopics: server.likedTopics || [],
          goal: server.goal || 'student',
          project: server.project || server.projectDescription || ''
        });
        setShowOnboarding(!user.onboardingCompleted);
        setApiStatus('connected');
      })
      .catch(() => {
        if (!cancelled) {
          setAuthUser(null);
          setShowOnboarding(false);
        }
      })
      .finally(() => {
        if (!cancelled) setAuthChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
    if (authUser) localStorage.setItem('sasi-profile', JSON.stringify(profile));
  }, [profile, authUser]);
  useEffect(() => { localStorage.setItem('sasi-feedback', JSON.stringify(feedback)); }, [feedback]);
  useEffect(() => { setPapersPage(1); setStoriesPage(1); }, [page, query]);

  const loadFeed = useCallback(async (mode = 'personalized', profileOverride = null) => {
    try {
      const activeProfile = profileOverride || profile;
      const result = await api.getFeed(
        mode === 'explore' ? undefined : (activeProfile?.id || activeProfile?._id),
        mode
      );
      setPapers(result.papers.length ? result.papers : []);
      setStories(newestFirst(result.stories.length ? result.stories : []));
      setApiStatus('connected');
      setApiMessage('');
    }
    catch (error) {
      setApiStatus('demo');
      setApiMessage(error.message || 'Could not reach the API');
    }
  }, [profile]);

  useEffect(() => {
    if (!authUser || authChecking || showOnboarding) return;
    loadFeed(page === 'explore' ? 'explore' : 'personalized');
  }, [authUser, authChecking, showOnboarding, loadFeed, page]);

  const loadSavedItems = useCallback(async () => {
    if (!authUser || authChecking) return;

    try {
      const result = await api.getSavedItems();
    setSavedItems(result.items || []);
      const ids = (result.items || []).map(item => idOf(item));
      setSavedIds(ids);
      setApiStatus('connected');
    } catch (error) {
      console.error('Could not load saved items:', error.message);
    }
  }, [authUser, authChecking]);

  useEffect(() => {
    if (!authUser || authChecking || showOnboarding) return;
    loadSavedItems();
  }, [authUser, authChecking, showOnboarding, loadSavedItems]);

  const loadLikedItems = useCallback(async () => {
    if (!authUser || authChecking) return;
    try {
      const result = await api.getLikedItems();
      setLikedItems(result.items || []);
    } catch (error) {
      console.error('Could not load liked items:', error.message);
    }
  }, [authUser, authChecking]);

  const loadDismissedItems = useCallback(async () => {
    if (!authUser || authChecking) return;
    try {
      const result = await api.getDismissedItems();
      setDismissedItems(result.items || []);
    } catch (error) {
      console.error('Could not load dismissed items:', error.message);
    }
  }, [authUser, authChecking]);

  useEffect(() => {
    if (!authUser || authChecking || showOnboarding) return;
    loadLikedItems();
    loadDismissedItems();
  }, [
    authUser, authChecking, showOnboarding,
    loadLikedItems, loadDismissedItems
  ]);

  const notify = message => {
    setToast(message);
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setToast(''), 2600);
  };

  const handleAuthenticate = async result => {
    const user = result?.user;
    const server = result?.profile;

    if (!user || !server) {
      throw new Error('Could not load your account profile.');
    }

    setAuthUser(user);
    setProfile({
      ...server,
      id: server.id || server._id || server.userId,
      name: server.name || user.name || 'AI Explorer',
      topics: server.topics || server.interests || [],
      likedTopics: server.likedTopics || [],
      goal: server.goal || 'student',
      project: server.project || server.projectDescription || ''
    });
    setShowOnboarding(!user.onboardingCompleted);
    setPage('feed');
    setApiStatus('connected');
    setApiMessage('');
  };

  const completeOnboarding = async values => {
    try {
      const result = await api.completeOnboarding(values);
      const server = result?.profile || {};

      const updated = {
        ...profile,
        ...server,
        id: server.id || server._id || profile.id,
        name: server.name || authUser?.name || profile.name,
        topics: server.topics || server.interests || values.topics || [],
        likedTopics: server.likedTopics || profile.likedTopics || [],
        goal: server.goal || values.goal || 'student',
        project: server.project || server.projectDescription || values.project || ''
      };

      setProfile(updated);
      setAuthUser(previous => previous
        ? { ...previous, onboardingCompleted: true }
        : previous
      );
      localStorage.setItem('sasi-onboarded', 'true');
      setApiStatus('connected');
      setShowOnboarding(false);
      notify('Your personal feed is ready.');
    } catch (error) {
      notify(`Could not save preferences: ${error.message}`);
    }
  };

  const handleFeedback = async (item, action) => {
    const id = idOf(item);

    const previousAction = feedback[id];
    const nextAction = action === 'like' && previousAction === 'like' ? 'unlike' : action;
    setFeedback(prev => {
      const next = { ...prev };
      if (nextAction === 'unlike') delete next[id];
      else next[id] = nextAction;
      return next;
    });

    if (nextAction === 'dismiss') {
      if (page !== 'explore') {
        setPapers(prev => prev.filter(candidate => idOf(candidate) !== id));
        setStories(prev => prev.filter(candidate => idOf(candidate) !== id));
      }
      notify('Moved to Disliked items.');
    } else if (nextAction === 'undismiss') {
      notify('Item restored.');
    } else if (nextAction === 'unlike') {
      notify('Like removed.');
    } else {
      notify('Liked! This helps shape your recommendations.');
    }

    try {
      const response = await api.sendFeedback(id, nextAction, profile?.id || profile?._id);
      if (response?.feedback?.likedTopics) {
        setProfile(prev => {
          const updated = { ...prev, likedTopics: response.feedback.likedTopics };
          localStorage.setItem('sasi-profile', JSON.stringify(updated));
          return updated;
        });
      }
      await Promise.all([
        loadSavedItems(),
        loadLikedItems(),
        loadDismissedItems()
      ]);

      if (['like', 'unlike', 'dismiss', 'undismiss'].includes(nextAction)) {
        await loadFeed('personalized');
      }
    } catch (error) {
      notify(`Saved on this device. Server sync failed: ${error.message}`);
    }
  };

  const handleSave = async item => {
    const id = idOf(item);
    const wasSaved = savedIds.includes(id);
    const action = wasSaved ? 'unsave' : 'save';

    // Optimistic UI update, rolled back if the server rejects the change.
    setSavedIds(previous =>
      wasSaved
        ? previous.filter(savedId => savedId !== id)
        : [...previous, id]
    );

    notify(wasSaved ? 'Removed from saved items.' : 'Saved for later.');

    try {
      await api.sendFeedback(id, action);
      await loadSavedItems();
    } catch (error) {
      setSavedIds(previous =>
        wasSaved
          ? [...new Set([...previous, id])]
          : previous.filter(savedId => savedId !== id)
      );
      notify(`Could not sync saved item: ${error.message}`);
    }
  };

  const openItem = item => {
    const url = item.url || item.htmlUrl || item.link || item.externalUrl;
    if (url && url !== '#') window.open(url, '_blank', 'noopener,noreferrer');
    else notify('The original source link is not available for this item yet.');
  };

  const filteredPapers = useMemo(() => papers.filter(item => `${item.title || ''} ${item.summary || item.abstract || ''} ${(item.topicTags || item.tags || []).join(' ')}`.toLowerCase().includes(query.toLowerCase())), [papers, query]);
  const filteredStories = useMemo(() => newestFirst(stories.filter(item => `${item.title || ''} ${item.summary || item.description || ''} ${(item.topicTags || item.tags || []).join(' ')}`.toLowerCase().includes(query.toLowerCase()))), [stories, query]);
  const visiblePapers = filteredPapers.slice((papersPage - 1) * 10, papersPage * 10);
  const visibleStories = filteredStories.slice((storiesPage - 1) * 10, storiesPage * 10);

  const updateProfile = async next => {
    try {
      const result = await api.updateProfile(next);
      const server = result?.profile || {};

      const updated = {
        ...next,
        ...server,
        id: server.id || server._id || server.userId || next.id,
        name: server.name || next.name || authUser?.name || 'AI Explorer',
        topics: server.topics || server.interests || next.topics || [],
        likedTopics: server.likedTopics || next.likedTopics || [],
        goal: server.goal || next.goal || 'student',
        project: server.project || server.projectDescription || next.project || ''
      };

      setProfile(updated);
      setPapersPage(1);
      setStoriesPage(1);
      setApiStatus('connected');
      notify('Your preferences have been saved.');
    } catch (error) {
      notify(`Could not save preferences: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout request failed:', error.message);
    }

    for (const key of [
      'sasi-user-id',
      'sasi-profile',
      'sasi-onboarded',
      'sasi-feedback',
      'sasi-saved'
    ]) {
      localStorage.removeItem(key);
    }

    setAuthUser(null);
    setShowOnboarding(false);
    setProfile({
      name: 'AI Explorer',
      topics: [],
      likedTopics: [],
      goal: 'student',
      project: ''
    });
    setFeedback({});
    setSavedIds([]);
    setSavedItems([]);
    setPapers(demoPapers);
    setStories(demoStories);
    setPage('feed');
    setPapersPage(1);
    setStoriesPage(1);
  };

  const pageTitle = { feed: 'Your daily AI briefing', explore: 'Explore all', research: 'Research papers', news: 'AI industry news', saved: 'Saved for later', liked: 'Liked items', disliked: 'Disliked items', topics: 'Explore your interests', profile: 'Your profile' }[page] || 'Your daily AI briefing';

  if (authChecking) return <div className="app-shell" />;
  if (!authUser) return <AuthScreen onAuthenticate={handleAuthenticate} />;

  return <div className="app-shell">
    <div className={cx('mobile-sidebar-backdrop', mobileNav && 'mobile-sidebar-backdrop-show')} onClick={() => setMobileNav(false)} />
    <div className={cx('app-layout', mobileNav && 'mobile-nav-open')}>
      <Sidebar page={page} setPage={p => { setPage(p); setMobileNav(false); }} collapsed={collapsed} setCollapsed={setCollapsed} profile={profile} />
      <div className="main-column">
        <Header query={query} setQuery={setQuery} theme={theme} setTheme={setTheme} onMobileMenu={() => setMobileNav(!mobileNav)} onProfile={() => setPage('profile')} />
        {apiStatus === 'demo' && <div className="demo-banner"><span><Sparkles size={15} /> Preview mode</span><p>Showing sample content because the API isn't connected yet.</p><button onClick={() => { loadFeed(); notify('Checking the API connection…'); }}>Retry connection <ArrowRight size={14} /></button></div>}
        <main className="main-content">
          {['feed', 'explore', 'research', 'news', 'saved', 'liked', 'disliked'].includes(page) && <div className={cx('feed-layout', page === 'feed' && 'feed-layout-dashboard')}>
            <section className="feed-main">
              {page !== 'feed' && <div className="welcome-heading">
                <div><div className="eyebrow"><span className="live-dot" /> YOUR PERSONAL BRIEFING</div><h1>{page === 'feed' ? `Good day, ${shortName(profile)}.` : pageTitle}</h1><p>{page === 'feed' ? 'A little more signal. A lot less noise.' : page === 'explore' ? 'Browse the full collection. No favorite topics required.' : page === 'research' ? 'Research worth your attention, explained clearly.' : page === 'news' ? 'Important AI developments, gathered from across the industry.' : 'The papers and stories you want to come back to.'}</p></div>
                <div className="date-chip">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
              </div>}
              {page !== 'feed' && <div className="feed-toolbar">
                <div className="feed-tabs" role="tablist" aria-label="Feed type">
                  {[['feed', 'For you'], ['explore', 'Explore'], ['saved', 'Saved']].map(([id, label]) => <button key={id} role="tab" aria-selected={page === id} className={cx('feed-tab', page === id && 'feed-tab-active')} onClick={() => setPage(id)}>{label}</button>)}
                </div>
                <button className="filter-button" onClick={() => setPage('topics')}><SlidersHorizontal size={16} /><span>Personalize</span></button>
              </div>}

{page === 'feed' && <div className="pulse-dashboard">

  <section className="pulse-dashboard-hero">
    <div className="pulse-dashboard-welcome">
      <span className="eyebrow"><span className="live-dot" /> YOUR PERSONAL BRIEFING</span>
      <h1>Good day, {shortName(profile)}<span className="pulse-wave"> ✦</span></h1>
      <p>Your AI research briefing is ready. Discover the ideas worth your attention.</p>
    </div>

    <div className="pulse-interest-card">
      <div className="pulse-dashboard-section-title">
        <span className="pulse-section-icon"><Sparkles size={17} /></span>
        <div>
          <h2>Your interests</h2>
          <p>Your research, your direction.</p>
        </div>
        <button className="quiet-button" onClick={() => setPage('topics')}>Edit <ArrowRight size={14} /></button>
      </div>

      <div className="pulse-interest-chips">
        {(profile?.topics?.length ? profile.topics : ['Artificial Intelligence', 'Machine Learning', 'LLMs']).slice(0, 7).map((topic, index) => {
          const label = typeof topic === 'string' ? topic : topic.name || topic.label || topic.title || String(topic);
          return <button key={label} className={`pulse-interest-chip pulse-chip-${index % 5}`} onClick={() => { setQuery(label); setPage('explore'); }}>{label}</button>;
        })}
      </div>
    </div>
  </section>

  <section className="pulse-dashboard-panel pulse-trending-panel">
    <div className="pulse-dashboard-section-title">
      <span className="pulse-section-icon pulse-trending-icon"><Flame size={18} /></span>
      <div>
        <h2>Trending in AI</h2>
        <p>Topics to explore across research and industry.</p>
      </div>
      <button className="quiet-button" onClick={() => setPage('explore')}>Explore all <ArrowRight size={14} /></button>
    </div>

    <div className="pulse-trending-chips">
      {(availableTopics || []).slice(0, 6).map((topic, index) => {
        const label = typeof topic === 'string' ? topic : topic.name || topic.label || topic.title || String(topic);
        return <button key={label} className={`pulse-trend-chip pulse-chip-${index % 5}`} onClick={() => { setQuery(label); setPage('explore'); }}><span>#</span>{label}</button>;
      })}
      {!(availableTopics || []).length && ['AI Agents', 'Large Language Models', 'Computer Vision', 'Robotics', 'AI Safety'].map((topic, index) => <button key={topic} className={`pulse-trend-chip pulse-chip-${index % 5}`} onClick={() => { setQuery(topic); setPage('explore'); }}><span>#</span>{topic}</button>)}
    </div>
  </section>

  <section className="pulse-dashboard-panel pulse-recommended-panel">
    <div className="pulse-dashboard-section-title">
      <span className="pulse-section-icon"><Sparkles size={18} /></span>
      <div>
        <h2>Recommended for you</h2>
        <p>A handpicked starting point from your current feed.</p>
      </div>
      <button className="quiet-button" onClick={() => setPage('explore')}>View all <ArrowRight size={14} /></button>
    </div>

    <div className="pulse-recommended-grid">
      {filteredPapers.slice(0, 3).map(item => (
        <ResearchCard key={`recommended-${idOf(item)}`} item={item}
          saved={savedIds.includes(idOf(item))}
          feedbackAction={feedback[idOf(item)]}
          onSave={handleSave} onFeedback={handleFeedback} onOpen={openItem} />
      ))}
      {filteredStories.slice(0, 2).map(item => (
        <NewsCard key={`recommended-${idOf(item)}`} item={item}
          onOpen={openItem} onFeedback={handleFeedback}
          feedbackAction={feedback[idOf(item)]} />
      ))}
    </div>

    {!filteredPapers.length && !filteredStories.length && (
      <EmptyState title="Your feed is warming up"
        description="New research and AI stories will appear here when available."
        action="Explore all" onAction={() => setPage('explore')} />
    )}
  </section>

  <section className="pulse-dashboard-panel">
    <div className="pulse-dashboard-section-title">
      <span className="pulse-section-icon"><Layers3 size={18} /></span>
      <div>
        <h2>Papers for you</h2>
        <p>Research selected around your interests.</p>
      </div>
      <button className="quiet-button" onClick={() => setPage('research')}>All papers <ArrowRight size={14} /></button>
    </div>
    <div className="pulse-recommended-grid">
      {filteredPapers.slice(0, 5).map(item => (
        <ResearchCard key={`paper-${idOf(item)}`} item={item}
          saved={savedIds.includes(idOf(item))}
          feedbackAction={feedback[idOf(item)]}
          onSave={handleSave} onFeedback={handleFeedback} onOpen={openItem} />
      ))}
    </div>
    {!filteredPapers.length && (
      <EmptyState title="No papers available yet"
        description="Research papers will appear here as they are collected."
        action="Explore research" onAction={() => setPage('research')} />
    )}
  </section>

  <section className="pulse-dashboard-panel">
    <div className="pulse-dashboard-section-title">
      <span className="pulse-section-icon pulse-trending-icon"><Newspaper size={18} /></span>
      <div>
        <h2>Today's AI stories</h2>
        <p>Industry developments from across the AI ecosystem.</p>
      </div>
      <button className="quiet-button" onClick={() => setPage('news')}>All stories <ArrowRight size={14} /></button>
    </div>
    <div className="pulse-recommended-grid">
      {filteredStories.slice(0, 5).map(item => (
        <NewsCard key={`story-${idOf(item)}`} item={item}
          onOpen={openItem} onFeedback={handleFeedback}
          feedbackAction={feedback[idOf(item)]} />
      ))}
    </div>
    {!filteredStories.length && (
      <EmptyState title="No stories available yet"
        description="New AI industry stories will appear here when available."
        action="Explore news" onAction={() => setPage('news')} />
    )}
  </section>

  <footer className="content-footer pulse-dashboard-footer">
    <Brand compact />
    <span>Curiosity, with a little more clarity.</span>
    <a href="https://arxiv.org/" target="_blank" rel="noreferrer">Explore original research <ExternalLink size={13} /></a>
  </footer>
</div>}
              {/*  */}
              {page === 'explore' && <>
                <SectionHeading
                  eyebrow="OPEN DISCOVERY"
                  title="Explore the AI landscape"
                  description="Discover research breakthroughs and the latest AI industry developments."
                />

                <div className="explore-type-tabs" role="tablist" aria-label="Explore content type">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={exploreTab === 'research'}
                    className={cx('explore-type-tab', exploreTab === 'research' && 'explore-type-tab-active')}
                    onClick={() => { setExploreTab('research'); setPapersPage(1); }}
                  >
                    <FileText size={16} /> Research Papers <span>{filteredPapers.length}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={exploreTab === 'news'}
                    className={cx('explore-type-tab', exploreTab === 'news' && 'explore-type-tab-active')}
                    onClick={() => { setExploreTab('news'); setStoriesPage(1); }}
                  >
                    <Newspaper size={16} /> Industry News <span>{filteredStories.length}</span>
                  </button>
                </div>

                {exploreTab === 'research' && <>
                  <div className="cards-stack">
                    {visiblePapers.map(item => (
                      <ResearchCard
                        key={idOf(item)}
                        item={item}
                        saved={savedIds.includes(idOf(item))}
                        feedbackAction={feedback[idOf(item)]}
                        onSave={handleSave}
                        onFeedback={handleFeedback}
                        onOpen={openItem}
                      />
                    ))}
                  </div>
                  <Pagination page={papersPage} total={filteredPapers.length} onChange={setPapersPage} />
                  {!filteredPapers.length && <EmptyState title="No papers found" description="Try another search or topic." />}
                </>}

                {exploreTab === 'news' && <>
                  <div className="cards-stack">
                    {visibleStories.map(item => (
                      <NewsCard
                        key={idOf(item)}
                        item={item}
                        onOpen={openItem}
                        onFeedback={handleFeedback}
                        feedbackAction={feedback[idOf(item)]}
                      />
                    ))}
                  </div>
                  <Pagination page={storiesPage} total={filteredStories.length} onChange={setStoriesPage} />
                  {!filteredStories.length && <EmptyState title="No stories found" description="Try another search or topic." />}
                </>}
              </>}
              {page === 'research' && <><SectionHeading eyebrow="THE RESEARCH FRONTIER" title="Papers for curious minds" description="Explore recent work across AI, machine learning, and beyond." /><div className="cards-stack">{visiblePapers.map(item => <ResearchCard key={idOf(item)} item={item} saved={savedIds.includes(idOf(item))} feedbackAction={feedback[idOf(item)]} onSave={handleSave} onFeedback={handleFeedback} onOpen={openItem} />)}</div><Pagination page={papersPage} total={filteredPapers.length} onChange={setPapersPage} />{!filteredPapers.length && <EmptyState title="No papers found" description="Try a different search term." />}</>}
              {page === 'news' && <><SectionHeading eyebrow="WHAT'S HAPPENING" title="AI, beyond the headlines" description="Related coverage brought together, so you can see the bigger picture." /><div className="cards-stack">{visibleStories.map(item => <NewsCard key={idOf(item)} item={item} onOpen={openItem} onFeedback={handleFeedback} feedbackAction={feedback[idOf(item)]} />)}</div><Pagination page={storiesPage} total={filteredStories.length} onChange={setStoriesPage} />{!filteredStories.length && <EmptyState title="No stories found" description="Try a different search term." />}</>}
              {page === 'saved' && <><SectionHeading eyebrow="YOUR READING LIST" title="Saved for later" description="A quiet corner for the ideas you don't want to lose." /><div className="cards-stack">{savedItems.map(item => (item.type === 'paper' || item._viewType === 'paper') ? <ResearchCard key={idOf(item)} item={item} saved onSave={handleSave} onFeedback={handleFeedback} onOpen={openItem} /> : <NewsCard key={idOf(item)} item={item} onOpen={openItem} onFeedback={handleFeedback} feedbackAction={feedback[idOf(item)]} />)}</div>{!savedItems.length && <EmptyState title="Nothing saved just yet" description="When you find something worth revisiting, save it here." action="Explore your feed" onAction={() => setPage('feed')} />}</>}
              {page === 'liked' && <>
                <SectionHeading
                  eyebrow="YOUR FAVORITES"
                  title="Liked items"
                  description="Papers and stories you've marked as useful."
                />
                <div className="cards-stack">
                  {likedItems.map(item => {
                    const isPaper = item.type === 'paper' || item._viewType === 'paper';
                    return isPaper
                      ? <ResearchCard key={idOf(item)} item={item} saved={savedIds.includes(idOf(item))} onSave={handleSave} onFeedback={handleFeedback} onOpen={openItem} feedbackAction="like" />
                      : <NewsCard key={idOf(item)} item={item} onOpen={openItem} onFeedback={handleFeedback} feedbackAction="like" />;
                  })}
                </div>
                {!likedItems.length && <EmptyState title="Nothing liked yet" description="Like a paper or story to keep it in this library." action="Explore your feed" onAction={() => setPage('feed')} />}
              </>}

              {page === 'disliked' && <>
                <SectionHeading
                  eyebrow="YOUR FILTERS"
                  title="Disliked items"
                  description="Items you've dismissed. Restore anything you'd like to reconsider."
                />
                <div className="cards-stack">
                  {dismissedItems.map(item => <article className="content-card" key={idOf(item)}>
                    <div className="card-content">
                      <div className="eyebrow">{item.type === 'paper' ? 'RESEARCH PAPER' : 'AI NEWS'}</div>
                      <h3>{item.title || 'Untitled item'}</h3>
                      <p>{item.summary || item.abstract || 'No summary available.'}</p>
                      <div className="card-actions">
                        <button type="button" className="quiet-button" onClick={() => openItem(item)}>Read item <ArrowUpRight size={14} /></button>
                        <button type="button" className="quiet-button" onClick={() => handleFeedback(item, 'undismiss')}>Restore to feed <ArrowRight size={14} /></button>
                      </div>
                    </div>
                  </article>)}
                </div>
                {!dismissedItems.length && <EmptyState title="No dismissed items" description="Items you mark as not for you will appear here." action="Return to your feed" onAction={() => setPage('feed')} />}
              </>}
              {page !== 'feed' && <footer className="content-footer"><Brand compact /><span>Curiosity, with a little more clarity.</span><a href="https://arxiv.org/" target="_blank" rel="noreferrer">Explore original research <ExternalLink size={13} /></a></footer>}
            </section>
            {page !== 'feed' && <RightRail page={page} profile={profile} papers={papers} stories={stories} savedCount={savedIds.length} onEditTopics={() => setPage('topics')} setPage={setPage} />}
          </div>}
          {page === 'topics' && <TopicsPage profile={profile} onUpdate={updateProfile} />}
          {page === 'profile' && <ProfilePage profile={profile} onEditTopics={() => setPage('topics')} onLogout={handleLogout} apiStatus={apiStatus} />}
        </main>
      </div>
    </div>
    <AnimatePresence>{showOnboarding && <OnboardingModal initialTopics={profile?.topics || []} onClose={() => {}} onComplete={completeOnboarding} />}</AnimatePresence>
    <AnimatePresence>{toast && <motion.div className="toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><span className="toast-check"><Check size={15} /></span>{toast}</motion.div>}</AnimatePresence>
  </div>;
}
