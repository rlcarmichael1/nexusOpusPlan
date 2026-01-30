import React, { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  children: ReactNode;
}

export function Card({
  bordered = false,
  hoverable = false,
  compact = false,
  children,
  className,
  ...props
}: CardProps) {
  const classNames = [
    styles.card,
    bordered && styles.bordered,
    hoverable && styles.hoverable,
    compact && styles.compact,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export function CardHeader({
  title,
  subtitle,
  action,
  children,
  className,
  ...props
}: CardHeaderProps) {
  const classNames = [styles.cardHeader, className].filter(Boolean).join(' ');

  if (children) {
    return (
      <div className={classNames} {...props}>
        {children}
      </div>
    );
  }

  return (
    <div className={classNames} {...props}>
      <div>
        {title && <h3 className={styles.cardTitle}>{title}</h3>}
        {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
  children: ReactNode;
}

export function CardBody({
  noPadding = false,
  children,
  className,
  ...props
}: CardBodyProps) {
  const classNames = [
    styles.cardBody,
    noPadding && styles.noPadding,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  const classNames = [styles.cardFooter, className].filter(Boolean).join(' ');

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
}

export default Card;
