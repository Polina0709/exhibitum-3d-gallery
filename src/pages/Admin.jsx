import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import { getAllRequests, updateRequestStatus, deleteCommentFromArtwork } from '../services/requestService';
import { useTranslation } from 'react-i18next';
import './Dashboard.css';

export default function Admin() {
    const { currentUser, userRole } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSlots, setSelectedSlots] = useState({});

    const [activeTab, setActiveTab] = useState('active');
    const TOTAL_SLOTS = 25;

    useEffect(() => {
        const fetchAllRequests = async () => {
            if (!currentUser) {
                navigate('/login');
                return;
            }
            if (userRole !== 'admin') {
                alert(t('admin_access_denied'));
                navigate('/dashboard');
                return;
            }

            try {
                const allRequests = await getAllRequests();
                setRequests(allRequests);
            } catch (error) {
                console.error("Application loading error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllRequests();
    }, [currentUser, userRole, navigate, t]);

    const handleSlotSelection = (requestId, slotName) => {
        setSelectedSlots(prev => ({
            ...prev,
            [requestId]: slotName
        }));
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            let slot = null;
            const currentReq = requests.find(r => r.id === id);

            if (newStatus === 'approved') {
                slot = selectedSlots[id] || currentReq.placementSlot;
                if (!slot) {
                    alert(t('admin_choose_slot'));
                    return;
                }
            } else if (newStatus === 'archived' || newStatus === 'rejected') {
                slot = null;
                setSelectedSlots(prev => {
                    const newState = { ...prev };
                    delete newState[id];
                    return newState;
                });
            }

            await updateRequestStatus(id, newStatus, slot);

            setRequests(requests.map(req =>
                req.id === id ? { ...req, status: newStatus, placementSlot: slot } : req
            ));

            alert(t('admin_update_success'));
        } catch (error) {
            console.error("Error details:", error);
            alert(t('admin_update_fail'));
        }
    };

    const handleDeleteComment = async (reqId, comment) => {
        if (!window.confirm(t('admin_confirm_delete'))) return;

        await deleteCommentFromArtwork(reqId, comment);

        setRequests(prev => prev.map(req => {
            if (req.id === reqId) {
                return {
                    ...req,
                    comments: req.comments.filter(c => c.date !== comment.date || c.name !== comment.name)
                };
            }
            return req;
        }));
    };

    const handleLogout = async () => {
        await logoutUser();
        navigate('/');
    };

    const getAvailableSlots = (currentReqId) => {
        const occupied = new Set();

        requests.forEach(r => {
            if (r.id !== currentReqId && r.status === 'approved' && r.placementSlot) {
                occupied.add(r.placementSlot);
            }
        });

        Object.entries(selectedSlots).forEach(([reqId, slotName]) => {
            if (reqId !== currentReqId && slotName) {
                occupied.add(slotName);
            }
        });

        const available = [];
        for (let i = 1; i <= TOTAL_SLOTS; i++) {
            const slotName = `Place_${i}`;
            if (!occupied.has(slotName)) {
                available.push(slotName);
            }
        }

        return available;
    };

    if (loading) return <div className="dashboard-wrapper"><p>{t('admin_loading')}</p></div>;

    const displayedRequests = requests.filter(req => {
        if (activeTab === 'active') {
            return req.status === 'pending' || req.status === 'approved';
        } else {
            return req.status === 'archived';
        }
    });

    return (
        <div className="dashboard-wrapper">
            <header className="dashboard-header">
                <h2>{t('admin_title')}</h2>
                <div className="action-links">
                    <Link to="/" className="outline-btn admin-home-btn">{t('btn_home')}</Link>
                    <button onClick={handleLogout} className="outline-btn admin-logout-btn">
                        {t('btn_logout')}
                    </button>
                </div>
            </header>

            <div className="admin-tabs">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`tab-btn active-btn ${activeTab === 'active' ? 'selected' : ''}`}
                >
                    {t('admin_tab_active')} ({requests.filter(r => r.status === 'pending' || r.status === 'approved').length})
                </button>
                <button
                    onClick={() => setActiveTab('archived')}
                    className={`tab-btn archive-btn ${activeTab === 'archived' ? 'selected' : ''}`}
                >
                    {t('admin_tab_archived')} ({requests.filter(r => r.status === 'archived').length})
                </button>
            </div>

            {displayedRequests.length === 0 ? (
                <div className="empty-state">
                    <p>{activeTab === 'active' ? t('admin_no_active') : t('admin_no_archive')}</p>
                </div>
            ) : (
                <div className="requests-grid">
                    {displayedRequests.map((req) => {
                        const availableSlots = getAvailableSlots(req.id);

                        return (
                            <div key={req.id} className={`request-card card-${req.status}`}>
                                <img
                                    src={req.imageUrl}
                                    alt={req.title}
                                    className={`artwork-image ${req.status === 'archived' ? 'image-archived' : ''}`}
                                />

                                <div className="request-info">
                                    <h3>{req.title}</h3>
                                    <p><strong>{t('lbl_artist')}</strong> {req.artistName}</p>
                                    <p className="description">{req.description}</p>
                                </div>

                                {req.comments && req.comments.length > 0 && (
                                    <div className="comments-section">
                                        <h4>{t('admin_reviews')} ({req.comments.length}):</h4>
                                        <div className="comments-list">
                                            {req.comments.map((comment, idx) => (
                                                <div key={idx} className="comment-item">
                                                    <div className="comment-content">
                                                        <strong className="comment-author">{comment.name}</strong>
                                                        <p className="comment-text">{comment.text}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteComment(req.id, comment)}
                                                        className="delete-comment-btn"
                                                        title={t('admin_delete_comment')}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="status-section">
                                    <span className={`status-badge status-${req.status}`}>
                                        {req.status === 'approved' ? t('status_approved') :
                                            req.status === 'pending' ? t('status_pending') :
                                                req.status === 'rejected' ? t('status_rejected') :
                                                    req.status.toUpperCase()}
                                    </span>

                                    {req.status === 'pending' && (
                                        <div className="action-box box-pending">
                                            <select
                                                value={selectedSlots[req.id] || ''}
                                                onChange={(e) => handleSlotSelection(req.id, e.target.value)}
                                                className="action-select select-pending"
                                            >
                                                <option value="">{t('admin_select_place')}</option>
                                                {availableSlots.map((slotName) => (
                                                    <option key={slotName} value={slotName}>
                                                        {slotName}
                                                    </option>
                                                ))}
                                            </select>

                                            <div className="action-buttons">
                                                <button onClick={() => handleStatusChange(req.id, 'approved')} className="action-btn btn-appreciate">
                                                    {t('admin_btn_approve')}
                                                </button>
                                                <button onClick={() => handleStatusChange(req.id, 'rejected')} className="action-btn btn-decline">
                                                    {t('admin_btn_reject')}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {req.status === 'approved' && (
                                        <div className="action-box box-approved">
                                            <p className="approved-text">{t('admin_exhibited_at')} {req.placementSlot}</p>

                                            <select
                                                value={selectedSlots[req.id] || req.placementSlot || ''}
                                                onChange={(e) => handleSlotSelection(req.id, e.target.value)}
                                                className="action-select select-approved"
                                            >
                                                <option value={req.placementSlot}>{req.placementSlot}</option>
                                                {availableSlots.map((slotName) => (
                                                    <option key={slotName} value={slotName}>
                                                        {slotName}
                                                    </option>
                                                ))}
                                            </select>

                                            <div className="action-buttons">
                                                <button onClick={() => handleStatusChange(req.id, 'approved')} className="action-btn btn-update">
                                                    {t('admin_btn_update_place')}
                                                </button>
                                                <button onClick={() => handleStatusChange(req.id, 'archived')} className="action-btn btn-remove">
                                                    {t('admin_btn_archive')}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {req.status === 'archived' && (
                                        <div className="action-box box-archived">
                                            <select
                                                value={selectedSlots[req.id] || ''}
                                                onChange={(e) => handleSlotSelection(req.id, e.target.value)}
                                                className="action-select select-archived"
                                            >
                                                <option value="">{t('admin_select_new_place')}</option>
                                                {availableSlots.map((slotName) => (
                                                    <option key={slotName} value={slotName}>{slotName}</option>
                                                ))}
                                            </select>

                                            <button onClick={() => handleStatusChange(req.id, 'approved')} className="action-btn btn-return">
                                                {t('admin_btn_return')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}