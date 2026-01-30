import React, { ReactNode } from 'react';
import styles from './Layout.module.css';
import { useUI } from '../../../contexts';
import { Header } from '../Header';
import { ToastContainer } from '../../common';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { layoutMode } = useUI();

  const layoutClass = [
    styles.layout,
    layoutMode === 'standalone' ? styles.standalone : styles.sidebar,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={layoutClass}>
      <Header />
      <main className={styles.main}>{children}</main>
      <ToastContainer />
    </div>
  );
}

export default Layout;
