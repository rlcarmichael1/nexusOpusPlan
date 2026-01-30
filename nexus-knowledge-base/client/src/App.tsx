import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  AuthProvider,
  ArticleProvider,
  UIProvider,
  CategoryProvider,
} from './contexts';
import { Layout } from './components/layout';
import {
  ArticleList,
  ArticleView,
  ArticleEditor,
} from './components/articles';
import { LayoutMode } from './types';

interface AppProps {
  initialLayoutMode?: LayoutMode;
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ArticleList />} />
        <Route path="/articles/new" element={<ArticleEditor />} />
        <Route path="/articles/:id" element={<ArticleView />} />
        <Route path="/articles/:id/edit" element={<ArticleEditor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App({ initialLayoutMode }: AppProps) {
  return (
    <BrowserRouter>
      <UIProvider initialLayoutMode={initialLayoutMode}>
        <AuthProvider>
          <CategoryProvider>
            <ArticleProvider>
              <AppRoutes />
            </ArticleProvider>
          </CategoryProvider>
        </AuthProvider>
      </UIProvider>
    </BrowserRouter>
  );
}

export default App;
