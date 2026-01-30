import React, { HTMLAttributes, ReactNode } from 'react';
import styles from './Badge.module.css';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  withDot?: boolean;
  children: ReactNode;
}

export function Badge({
  variant = 'default',
  size = 'medium',
  withDot = false,
  children,
  className,
  ...props
}: BadgeProps) {
  const classNames = [
    styles.badge,
    styles[variant],
    styles[size],
    withDot && styles.withDot,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames} {...props}>
      {withDot && <span className={styles.dot} />}
      {children}
    </span>
  );
}

export default Badge;
