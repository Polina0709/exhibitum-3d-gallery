import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { submitApplication } from '../services/requestService';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import './Home.css';

import heroFloral from '../assets/hero-floral.jpg';
import aboutFloral from '../assets/about-floral.jpg';
import previewFloral from '../assets/preview-floral.jpg';
import submitFloral from '../assets/submit-floral.jpg';
import first from '../assets/1.jpeg';
import second from '../assets/2.jpeg';

import PreviewCanvas from '../components/PreviewCanvas';

export default function Home() {
    const { currentUser, userRole } = useAuth();
    const { t } = useTranslation();

    const [artistName, setArtistName] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const [showScrollTop, setShowScrollTop] = useState(false);

    const toggleLanguage = () => {
        const currentLang = i18n.language || 'en';
        const newLang = currentLang.startsWith('uk') ? 'en' : 'uk';
        i18n.changeLanguage(newLang);
    };

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 400) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!currentUser) {
            setMessage({ text: t('submit_error_login'), type: 'error' });
            return;
        }
        if (!file) {
            setMessage({ text: t('submit_error_file'), type: 'error' });
            return;
        }

        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            await submitApplication(currentUser.uid, artistName, title, description, file);

            setMessage({ text: t('submit_success'), type: 'success' });
            setArtistName('');
            setTitle('');
            setDescription('');
            setFile(null);
            document.getElementById('artwork-file').value = '';
        } catch (error) {
            console.error(error);
            setMessage({ text: t('submit_error_general'), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            const y = element.getBoundingClientRect().top + window.scrollY;

            window.scrollTo({
                top: y,
                behavior: 'smooth'
            });
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="home-wrapper">

            {/* HEADER */}
            <header className="header">
                <div className="logo-block">
                    <h1 className="logo-text">EXHIBITUM</h1>
                    <p className="logo-subtext">{t('virtual_space')}</p>
                </div>

                <nav className="main-nav">
                    <button onClick={() => scrollToSection('about-section')} className="nav-item">{t('nav_about')}</button>
                    <button onClick={() => scrollToSection('exhibition-section')} className="nav-item">{t('nav_exhibition')}</button>
                    {currentUser && userRole !== 'admin' && (
                        <button onClick={() => scrollToSection('submit-section')} className="nav-item">{t('nav_apply')}</button>
                    )}
                </nav>

                <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>

                    <button
                        onClick={toggleLanguage}
                        className="nav-item lang-toggle"
                        style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '16px', fontWeight: 'bold', color: '#AF878D' }}
                    >
                        {(i18n.language || 'en').startsWith('uk') ? 'EN' : 'UA'}
                    </button>

                    <Link
                        to={currentUser ? (userRole === 'admin' ? "/admin" : "/dashboard") : "/login"}
                        className="nav-link"
                    >
                        {currentUser
                            ? (userRole === 'admin' ? t('nav_admin') : t('nav_dashboard'))
                            : t('nav_login')}
                        <div className="line-circle">
                            <span className="line"></span>
                            <span className="circle"></span>
                        </div>
                    </Link>
                </div>
            </header>

            {/* HERO SECTION */}
            <section id="hero-section" className="section hero-section">
                <div className="hero-left">
                    <h2 className="huge-title">EXHIBITUM</h2>
                    <p className="hero-desc">{t('hero_desc_1')} <br/>{t('hero_desc_2')} <br/>{t('hero_desc_3')}</p>
                    <div
                        className="explore-link"
                        onClick={() => scrollToSection('exhibition-section')}
                    >
                        <span>{t('explore_1')}<br/>{t('explore_2')}</span>
                        <div className="line-circle line-circle-hero">
                            <span className="line"></span>
                            <span className="circle"></span>
                        </div>
                    </div>
                </div>
                <div className="hero-right">
                    <img src={heroFloral} className="floral-placeholder floral-hero" alt="floral" />
                    <img src={second} className="pale-box hero-box" alt={1}></img>
                </div>
            </section>

            {/* ABOUT SECTION */}
            <section id="about-section" className="section about-section">
                <div className="about-left">
                    <img src={aboutFloral} className="floral-placeholder floral-about" alt="floral" />
                    <img src={first} className="pale-box about-box" alt={2}></img>
                    <button className="round-btn btn-more" onClick={() => scrollToSection('exhibition-section')}>{t('btn_more')}</button>
                </div>
                <div className="about-right">
                    <h2 className="huge-title overlap-title-about">{t('about_title')}</h2>
                    <div className="about-text">
                        <p>{t('about_p1_1')}<br/>{t('about_p1_2')}<br/>{t('about_p1_3')}<br/>{t('about_p1_4')}</p>
                        <p>{t('about_p2_1')} <br/>{t('about_p2_2')}<br/>{t('about_p2_3')}<br/>{t('about_p2_4')}</p>
                    </div>
                </div>
            </section>

            {/* 3D-EXHIBITION SECTION */}
            <section id="exhibition-section" className="section exhibition-section">
                <h2 className="huge-title overlap-title-preview">{t('preview_title')}</h2>
                <div className="exhibition-container">
                    <img src={previewFloral} className="floral-placeholder floral-preview" alt="floral" />
                    <div className="pale-box preview-box canvas-container">

                        <div className="canvas-wrapper">
                            <PreviewCanvas />
                        </div>

                        <Link to="/exhibition" className="round-btn btn-visit">{t('btn_visit')}</Link>
                    </div>
                </div>
            </section>

            {/* SUBMIT SECTION */}
            {currentUser && userRole !== 'admin' && (
                <section id="submit-section" className="section submit-section">
                    <div className="submit-left">
                        <h2 className="huge-title submit-title">{t('submit_title_1')}<br/>{t('submit_title_2')}</h2>
                        <div className="submit-text">
                            <p>{t('submit_p1_1')}<br/>{t('submit_p1_2')}</p>
                            <p>{t('submit_p2_1')}<br/>{t('submit_p2_2')}<br/>{t('submit_p2_3')}</p>
                        </div>
                    </div>
                    <div className="submit-right">
                        <img src={submitFloral} className="floral-placeholder floral-submit" alt="floral" />
                        <div className="pale-box submit-box">

                            {message.text && (
                                <p className={`submit-message ${message.type}`}>
                                    {message.text}
                                </p>
                            )}

                            <form className="application-form" onSubmit={handleSubmit}>
                                <input
                                    type="text"
                                    placeholder={t('form_artist_name')}
                                    required
                                    value={artistName}
                                    onChange={(e) => setArtistName(e.target.value)}
                                    className="form-input"
                                />

                                <input
                                    type="text"
                                    placeholder={t('form_artwork_title')}
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="form-input"
                                />

                                <textarea
                                    rows="2"
                                    placeholder={t('form_description')}
                                    required
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="form-input form-textarea"
                                ></textarea>

                                <div className="file-upload-container">
                                    <span className="file-upload-label">{t('form_upload_label')}</span>
                                    <input
                                        type="file"
                                        id="artwork-file"
                                        accept="image/*"
                                        required
                                        onChange={(e) => setFile(e.target.files[0])}
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="artwork-file" className="custom-file-upload">
                                        {file ? file.name : t('form_choose_file')}
                                    </label>
                                </div>

                                <button type="submit" className={`round-btn btn-submit ${loading ? 'loading' : ''}`} disabled={loading}>
                                    {loading ? t('form_btn_wait') : t('form_btn_submit')}
                                </button>
                            </form>
                        </div>
                    </div>
                </section>
            )}

            {/* "up" button */}
            <button
                className={`scroll-top-btn ${showScrollTop ? 'visible' : ''}`}
                onClick={scrollToTop}
                title="Go to top"
            >
                ↑
            </button>

        </div>
    );
}