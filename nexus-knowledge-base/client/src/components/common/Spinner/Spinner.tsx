import React from 'react';
import styles from './Spinner.module.css';

type SpinnerSize = 'small' | 'medium' | 'large';

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

export function Spinner({ size = 'medium', className }: SpinnerProps) {
  const classNames = [styles.spinner, styles[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      role="status"
      aria-label="Loading"
    />
  );
}

interface LoadingOverlayProps {
  children?: React.ReactNode;
}

export function LoadingOverlay({ children }: LoadingOverlayProps) {
  return (
    <div className={styles.overlay}>
      <Spinner size="large" />
      {children}
    </div>
  );
}

interface FullPageLoadingProps {
  message?: string;
}

export function FullPageLoading({ message = 'Loading...' }: FullPageLoadingProps) {
  return (
    <div className={styles.fullPage}>
      <Spinner size="large" />
      <span className={styles.loadingText}>{message}</span>
    </div>
  );
}

export default Spinner;
