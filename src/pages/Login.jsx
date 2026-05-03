import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, loginWithGoogle } from '../services/authService';
import { useTranslation } from 'react-i18next';
import './Home.css';
import './Auth.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const { role } = await loginUser(email, password);
            if (role === 'admin') navigate('/admin');
            else navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError(t('login_error_credentials'));
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { role } = await loginWithGoogle();
            if (role === 'admin') navigate('/admin');
            else navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError(t('login_error_google'));
        }
    };

    return (
        <div className="home-wrapper auth-page-wrapper">

            {/* Back button */}
            <Link to="/" className="back-link">
                <span className="arrow">⟵</span> {t('back_to_home')}
            </Link>

            <div className="pale-box auth-box">
                <h2 className="huge-title auth-title">{t('login_title')}</h2>

                {error && <p className="auth-error">{error}</p>}

                <form onSubmit={handleLogin} className="auth-form">
                    <input
                        type="email"
                        placeholder={t('email_placeholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="auth-input"
                    />
                    <input
                        type="password"
                        placeholder={t('password_placeholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="auth-input"
                    />

                    <button type="submit" className="auth-submit-btn">
                        {t('login_btn')}
                    </button>
                </form>

                <div className="auth-divider">{t('auth_or')}</div>

                {/* GOOGLE button*/}
                <button onClick={handleGoogleLogin} className="google-btn">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="google-icon"/>
                    {t('continue_with_google')}
                </button>

                <p className="auth-footer">
                    {t('no_account')} <Link to="/register" className="auth-link">{t('register_link')}</Link>
                </p>
            </div>
        </div>
    );
}