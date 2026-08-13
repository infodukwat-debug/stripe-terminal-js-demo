import React from 'react';
import ReactDOM from 'react-dom/client';
import MainPage from './MainPage';

// Global styles
const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background-color: #1a1a2e;
    color: #333;
    width: 100%;
    height: 100%;
  }
  
  #root {
    width: 100vw;
    height: 100vh;
  }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = globalStyles;
document.head.appendChild(styleSheet);

// Render app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MainPage />
  </React.StrictMode>
);
