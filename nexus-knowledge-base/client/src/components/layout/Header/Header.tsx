import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Header.module.css';
import { useAuth, useUI } from '../../../contexts';
import { Badge } from '../../common';

const BookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M4 3H16C16.5523 3 17 3.44772 17 4V16C17 16.5523 16.5523 17 16 17H4C3.44772 17 3 16.5523 3 16V4C3 3.44772 3.44772 3 4 3Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path d="M7 3V17" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 7H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M10 10H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M4 6L8 10L12 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LayoutStandaloneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const LayoutSidebarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 2V14" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const roleColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  reader: 'default',
  actor: 'info' as 'primary',
  author: 'success',
  editor: 'warning',
};

export function Header() {
  const { user, availableRoles, switchRole } = useAuth();
  const { layoutMode, setLayoutMode } = useUI();
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleSelect = async (userId: string) => {
    await switchRole(userId);
    setIsRoleDropdownOpen(false);
  };

  const headerClass = [
    styles.header,
    layoutMode === 'sidebar' && styles.sidebar,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={headerClass}>
      <div className={styles.left}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>
            <BookIcon />
          </span>
          <span className={styles.logoText}>Nexus KB</span>
        </Link>
      </div>

      <div className={styles.right}>
        {/* Layout Toggle */}
        <div className={styles.layoutToggle}>
          <button
            type="button"
            className={`${styles.layoutButton} ${layoutMode === 'standalone' ? styles.active : ''}`}
            onClick={() => setLayoutMode('standalone')}
            title="Standalone mode"
          >
            <LayoutStandaloneIcon />
          </button>
          <button
            type="button"
            className={`${styles.layoutButton} ${layoutMode === 'sidebar' ? styles.active : ''}`}
            onClick={() => setLayoutMode('sidebar')}
            title="Sidebar mode"
          >
            <LayoutSidebarIcon />
          </button>
        </div>

        {/* Role Selector */}
        <div className={styles.roleSelector} ref={dropdownRef}>
          <button
            type="button"
            className={styles.roleSelectorButton}
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            aria-expanded={isRoleDropdownOpen}
            aria-haspopup="listbox"
          >
            <span className={styles.userName}>{user?.displayName || 'Guest'}</span>
            {user && (
              <Badge variant={roleColors[user.role] || 'default'} size="small">
                {user.role}
              </Badge>
            )}
            <ChevronDownIcon />
          </button>

          {isRoleDropdownOpen && (
            <div className={styles.roleDropdown} role="listbox">
              {availableRoles.map((roleUser) => (
                <button
                  key={roleUser.id}
                  type="button"
                  className={`${styles.roleOption} ${
                    user?.id === roleUser.id ? styles.active : ''
                  }`}
                  onClick={() => handleRoleSelect(roleUser.id)}
                  role="option"
                  aria-selected={user?.id === roleUser.id}
                >
                  <span className={styles.roleOptionName}>{roleUser.displayName}</span>
                  <span className={styles.roleOptionRole}>{roleUser.role}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
