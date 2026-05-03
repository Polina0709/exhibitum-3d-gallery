import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, loginWithGoogle } from '../services/authService';
import { useTranslation } from 'react-i18next';
import './Home.css';
import './Auth.css';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await registerUser(email, password, 'artist');
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError(t('register_error_general'));
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError(t('login_error_google')); // Використовуємо існуючий ключ з Login
        }
    };

    return (
        <div className="home-wrapper auth-page-wrapper">

            {/* Back button */}
            <Link to="/" className="back-link">
                <span className="arrow">⟵</span> {t('back_to_home')}
            </Link>

            <div className="pale-box auth-box">
                <h2 className="huge-title auth-title">{t('register_title')}</h2>

                {error && <p className="auth-error">{error}</p>}

                <form onSubmit={handleRegister} className="auth-form">
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
                        placeholder={t('password_min_chars')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="auth-input"
                    />

                    <button type="submit" className="auth-submit-btn">
                        {t('create_account_btn')}
                    </button>
                </form>

                <div className="auth-divider">{t('auth_or')}</div>

                {/* GOOGLE button */}
                <button onClick={handleGoogleLogin} className="google-btn">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="google-icon" />
                    {t('continue_with_google')}
                </button>

                <p className="auth-footer">
                    {t('already_have_account')} <Link to="/login" className="auth-link">{t('login_link')}</Link>
                </p>
            </div>
        </div>
    );
}