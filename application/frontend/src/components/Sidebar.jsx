import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Compass, Brush, Settings, LogOut, PanelLeftClose, PanelLeftOpen, Volume2, VolumeX, Home } from 'lucide-react';
import { useAmbience } from '../context/AmbienceContext';
import './Sidebar.css';

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { user, logout } = useAuth();
  const { enabled: ambienceEnabled, supported: ambienceSupported, toggle: toggleAmbience } = useAmbience();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Workspace', path: '/workspace', icon: <Brush size={20} /> },
    { name: 'About', path: '/about', icon: <Compass size={20} /> },
  ];

  return (
    <aside className={`app-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-header">
        <button
          type="button"
          className="brand"
          onClick={() => navigate('/dashboard')}
          aria-label="Go to dashboard"
        >
          <div className="brand-logo">
            <span className="brand-icon" aria-hidden="true"><Home size={16} strokeWidth={2.3} /></span>
          </div>
          {isExpanded && <span className="brand-text">Home4U</span>}
        </button>
        <button 
          type="button"
          className="toggle-collapse-btn" 
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isExpanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
      </div>

      <div className="sidebar-content">
        <nav className="sidebar-nav primary-nav">
          <p className="nav-label">{isExpanded ? 'Main Menu' : 'Main'}</p>
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  title={!isExpanded ? item.name : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {isExpanded && <span className="nav-text">{item.name}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="sidebar-footer">
        <nav className="sidebar-nav secondary-nav">
          <ul>
            <li>
              <button
                type="button"
                className="nav-link"
                disabled
                title="Settings (coming soon)"
                aria-disabled="true"
              >
                <span className="nav-icon"><Settings size={20} /></span>
                {isExpanded && <span className="nav-text">Settings</span>}
              </button>
            </li>
            <li>
              <button
                type="button"
                className="nav-link ambience-toggle"
                onClick={() => ambienceSupported && toggleAmbience()}
                aria-pressed={ambienceEnabled}
                title={!isExpanded ? (ambienceEnabled ? 'Ambience on' : 'Ambience off') : undefined}
                disabled={!ambienceSupported}
              >
                <span className="nav-icon">
                  {ambienceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </span>
                {isExpanded && (
                  <span className="nav-text">
                    Ambience
                    <span className={`ambience-pill ${ambienceEnabled ? 'on' : 'off'}`}>
                      {ambienceSupported ? (ambienceEnabled ? 'On' : 'Off') : 'N/A'}
                    </span>
                  </span>
                )}
              </button>
            </li>
            <li>
              <button 
                type="button"
                className="nav-link logout-nav-btn" 
                onClick={handleLogout}
                title={!isExpanded ? 'Logout' : undefined}
              >
                <span className="nav-icon"><LogOut size={20} /></span>
                {isExpanded && <span className="nav-text">Logout</span>}
              </button>
            </li>
          </ul>
        </nav>
        
        {isExpanded && (
          <div className="sidebar-user-profile">
            <div className="user-avatar">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.full_name || 'Demo User'}</span>
              <span className="user-email">{user?.email || 'user@example.com'}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
