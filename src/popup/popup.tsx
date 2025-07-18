import React from 'react';
import { createRoot } from 'react-dom/client';
import MainInterface from './components/MainInterface';
import './styles.css';

const App: React.FC = () => {
  return <MainInterface />;
};

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} 