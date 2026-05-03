import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserProfile } from '../services/userService';
import { getApprovedRequestsByArtist } from '../services/requestService';
import { useTranslation } from 'react-i18next';
import './ArtistProfile.css';

export default function ArtistProfile() {
    const { id } = useParams();
    const { t } = useTranslation();

    const [profile, setProfile] = useState(null);
    const [artworks, setArtworks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchArtistData = async () => {
            setLoading(true);
            try {
                const [profileData, artistArtworks] = await Promise.all([
                    getUserProfile(id),
                    getApprovedRequestsByArtist(id)
                ]);

                setProfile(profileData || {
                    displayName: artistArtworks[0]?.artistName || t('profile_unknown_artist'),
                    bio: t('profile_default_bio'),
                    portfolioLink: ''
                });
                setArtworks(artistArtworks);
            } catch (error) {
                console.error("Error loading artist profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchArtistData();
    }, [id, t]);

    if (loading) {
        return <div className="home-wrapper"><p className="loading-text" style={{marginTop: '100px'}}>{t('profile_loading')}</p></div>;
    }

    return (
        <div className="home-wrapper profile-page-wrapper">
            <header className="header" style={{ position: 'static' }}>
                <div className="logo-block">
                    <h1 className="logo-text">EXHIBITUM</h1>
                </div>
                <Link to="/exhibition" className="nav-link">
                    <span className="arrow">⟵</span> {t('profile_back_exhibition')}
                </Link>
            </header>

            <div className="artist-profile-container">
                <div className="pale-box profile-sidebar">
                    <div className="profile-avatar">
                        {profile.photoURL ? (
                            <img src={profile.photoURL} alt={profile.displayName} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
                        ) : (
                            profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'A'
                        )}
                    </div>
                    <h2 className="profile-name">{profile.displayName}</h2>
                    <p className="profile-bio">{profile.bio}</p>

                    {profile.portfolioLink && (
                        <a href={profile.portfolioLink} target="_blank" rel="noopener noreferrer" className="outline-btn portfolio-btn">
                            {t('profile_visit_portfolio')}
                        </a>
                    )}
                </div>

                <div className="profile-gallery">
                    <h3 className="gallery-title">{t('profile_exhibited_artworks')} ({artworks.length})</h3>
                    {artworks.length === 0 ? (
                        <p className="no-artworks-msg">{t('profile_no_artworks')}</p>
                    ) : (
                        <div className="artist-artworks-grid">
                            {artworks.map(art => (
                                <div key={art.id} className="pale-box artist-artwork-card">
                                    <div className="artwork-image-crop">
                                        <img src={art.imageUrl} alt={art.title} />
                                    </div>
                                    <div className="artwork-card-info">
                                        <h4>{art.title}</h4>
                                        <p>{art.description}</p>
                                        <Link to={`/exhibition?artworkId=${art.id}`} className="view-in-3d-btn">
                                            {t('profile_view_in_3d')} ➔
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}