import React, { ReactNode } from 'react';
import styles from './EmptyState.module.css';
import { useUI } from '../../../contexts';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const DefaultIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="8"
      y="8"
      width="32"
      height="32"
      rx="4"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M16 20H32M16 28H26"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  const { layoutMode } = useUI();

  const containerClass = [
    styles.emptyState,
    layoutMode === 'sidebar' && styles.compact,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass}>
      <div className={styles.icon}>{icon || <DefaultIcon />}</div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

export default EmptyState;
