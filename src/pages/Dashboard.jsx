import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import { getUserRequests } from '../services/requestService';
import { getUserProfile, updateUserProfile, uploadAvatar } from '../services/userService';
import { useTranslation } from 'react-i18next';
import './Dashboard.css';

export default function Dashboard() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState('artworks');
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const [profile, setProfile] = useState({ displayName: '', bio: '', portfolioLink: '', photoURL: '' });
    const [avatarFile, setAvatarFile] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser) {
                navigate('/login');
                return;
            }

            try {
                const userRequests = await getUserRequests(currentUser.uid);
                setRequests(userRequests);

                const userProfile = await getUserProfile(currentUser.uid);

                setProfile({
                    displayName: userProfile?.displayName || currentUser.displayName || '',
                    bio: userProfile?.bio || '',
                    portfolioLink: userProfile?.portfolioLink || '',
                    photoURL: userProfile?.photoURL || currentUser.photoURL || ''
                });
            } catch (error) {
                console.error("Data loading error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser, navigate]);

    const handleLogout = async () => {
        try {
            await logoutUser();
            navigate('/');
        } catch (error) {
            console.error("Error on exit:", error);
        }
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        setProfileMessage({ text: '', type: '' });

        try {
            let finalPhotoURL = profile.photoURL;

            if (avatarFile) {
                finalPhotoURL = await uploadAvatar(currentUser.uid, avatarFile);
            }

            const updatedProfile = { ...profile, photoURL: finalPhotoURL };
            await updateUserProfile(currentUser.uid, updatedProfile);

            setProfile(updatedProfile);
            setAvatarFile(null);
            setProfileMessage({ text: t('profile_success'), type: 'success' });
        } catch (error) {
            console.error("Error saving profile.", error);
            setProfileMessage({ text: t('profile_error'), type: 'error' });
        } finally {
            setSavingProfile(false);
        }
    };

    return (
        <div className="dashboard-wrapper">
            <header className="dashboard-header">
                <h2>{t('dashboard_title')}</h2>
                <div className="action-links">
                    <Link to="/" className="outline-btn admin-home-btn">{t('btn_home')}</Link>
                    <button onClick={handleLogout} className="outline-btn admin-logout-btn">
                        {t('btn_logout')}
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="dashboard-tabs">
                <button
                    className={`tab-btn ${activeTab === 'artworks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('artworks')}
                >
                    {t('tab_artworks')}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    {t('tab_profile')}
                </button>
            </div>

            {loading ? (
                <p className="loading-text">{t('loading_data')}</p>
            ) : (
                <div className="dashboard-content">
                    {/* Tab 1: Artworks */}
                    {activeTab === 'artworks' && (
                        <>
                            {requests.length === 0 ? (
                                <div className="empty-state">
                                    <p>{t('no_artworks_msg')}</p>
                                    <Link to="/" className="home-link">{t('go_home_submit')}</Link>
                                </div>
                            ) : (
                                <div className="requests-grid">
                                    {requests.map((req) => (
                                        <div key={req.id} className="request-card user-card">
                                            <img src={req.imageUrl} alt={req.title} className="artwork-image" />

                                            <div className="request-info">
                                                <h3>{req.title}</h3>
                                                <p><strong>{t('lbl_artist')}</strong> {req.artistName}</p>
                                                <p className="description">{req.description}</p>
                                            </div>

                                            {req.status === 'approved' && (
                                                <div className="stats-block">
                                                    <div className="stat-views">
                                                        <span className="stat-icon">👁️</span>
                                                        <strong>{req.views || 0}</strong> {t('lbl_views')}
                                                    </div>
                                                    <div className="stat-likes">
                                                        <span className="stat-icon">❤</span>
                                                        <strong>{req.likes || 0}</strong> {t('lbl_likes')}
                                                    </div>
                                                </div>
                                            )}

                                            {req.status === 'approved' && (
                                                <div className="dashboard-comments-section">
                                                    <h4>{t('lbl_comments')} ({req.comments ? req.comments.length : 0})</h4>
                                                    <div className="dashboard-comments-list">
                                                        {(!req.comments || req.comments.length === 0) ? (
                                                            <p className="no-comments-text">{t('no_comments')}</p>
                                                        ) : (
                                                            req.comments.map((comment, idx) => (
                                                                <div key={idx} className="dashboard-comment">
                                                                    <div className="dashboard-comment-header">
                                                                        <strong>{comment.name}</strong>
                                                                        <span>{new Date(comment.date).toLocaleDateString()}</span>
                                                                    </div>
                                                                    <p>{comment.text}</p>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className={`badge-wrapper ${req.status !== 'approved' ? 'push-bottom' : ''}`}>
                                                <span className={`status-badge status-${req.status}`}>
                                                    {/* Переклад статусів */}
                                                    {req.status === 'approved' ? t('status_approved') :
                                                        req.status === 'pending' ? t('status_pending') :
                                                            req.status === 'rejected' ? t('status_rejected') :
                                                                req.status.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Tab 2: Profile */}
                    {activeTab === 'profile' && (
                        <div className="profile-edit-section">
                            <div className="pale-box profile-box">
                                <h3>{t('profile_info_title')}</h3>
                                <p className="profile-hint">{t('profile_hint')}</p>

                                {profileMessage.text && (
                                    <p className={`profile-message ${profileMessage.type}`}>
                                        {profileMessage.text}
                                    </p>
                                )}

                                <form onSubmit={handleProfileSave} className="profile-form">
                                    {/* БЛОК АВАТАРА */}
                                    <div className="avatar-edit-container">
                                        <div className="avatar-preview">
                                            {avatarFile ? (
                                                <img src={URL.createObjectURL(avatarFile)} alt="Preview" />
                                            ) : profile.photoURL ? (
                                                <img src={profile.photoURL} alt="Avatar" />
                                            ) : (
                                                <span>{profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'A'}</span>
                                            )}
                                        </div>
                                        <div className="avatar-upload-info">
                                            <label htmlFor="avatar-upload" className="outline-btn avatar-upload-btn">
                                                {t('btn_change_photo')}
                                            </label>
                                            <input
                                                id="avatar-upload"
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setAvatarFile(e.target.files[0])}
                                                style={{ display: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <label>{t('lbl_display_name')}</label>
                                    <input
                                        type="text"
                                        placeholder={t('placeholder_name')}
                                        value={profile.displayName}
                                        onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                                        className="form-input"
                                        required
                                    />

                                    <label>{t('lbl_bio')}</label>
                                    <textarea
                                        rows="4"
                                        placeholder={t('placeholder_bio')}
                                        value={profile.bio}
                                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                        className="form-input form-textarea"
                                    />

                                    <label>{t('lbl_portfolio')}</label>
                                    <input
                                        type="url"
                                        placeholder="https://instagram.com/yourprofile"
                                        value={profile.portfolioLink}
                                        onChange={(e) => setProfile({ ...profile, portfolioLink: e.target.value })}
                                        className="form-input"
                                    />

                                    <button type="submit" className={`outline-btn profile-submit-btn ${savingProfile ? 'loading' : ''}`} disabled={savingProfile}>
                                        {savingProfile ? t('btn_saving') : t('btn_save_changes')}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}