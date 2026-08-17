import React from 'react';
import { css } from '@emotion/react';

export const LoadingScreen = ({ message = 'Connexion au lecteur...', submessage = 'Veuillez patienter...' }) => {
  return (
    <div css={css`
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #1A1A2E 0%, #2D2E47 100%);
      color: white;
      text-align: center;
      padding: 24px;
      overflow: hidden;
    `}>
      {/* Spinner animé */}
      <div css={css`
        margin-bottom: 32px;
      `}>
        <div css={css`
          width: 60px;
          height: 60px;
          border: 4px solid rgba(255, 255, 255, 0.2);
          border-top-color: #0066FF;
          border-radius: 50%;
          animation: spin 1.5s linear infinite;
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `} />
      </div>

      {/* Message principal */}
      <h2 css={css`
        font-size: 1.75rem;
        margin: 0 0 16px 0;
        font-weight: 700;
        animation: pulse 2s infinite;
      `}>
        {message}
      </h2>

      {/* Sous-message */}
      <p css={css`
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.7);
        margin: 0;
      `}>
        {submessage}
      </p>

      {/* Points animés */}
      <div css={css`
        margin-top: 24px;
        display: flex;
        gap: 8px;
      `}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            css={css`
              width: 8px;
              height: 8px;
              background-color: #0066FF;
              border-radius: 50%;
              animation: pulse 1s infinite;
              animation-delay: ${i * 0.15}s;
            `}
          />
        ))}
      </div>
    </div>
  );
};

export default LoadingScreen;
