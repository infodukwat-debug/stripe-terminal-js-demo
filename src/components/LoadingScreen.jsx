import React from 'react';
import { css } from '@emotion/react';
import { colors, shadows, transitions, spacing, borderRadius } from '../styles/colors';

export const LoadingScreen = ({ message = 'Connexion au lecteur...', submessage = 'Veuillez patienter...' }) => {
  return (
    <div css={css`
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, ${colors.dark} 0%, ${colors.darkLight} 100%);
      color: ${colors.white};
      text-align: center;
      padding: ${spacing.lg};
      overflow: hidden;
    `}>
      {/* Spinner animé */}
      <div css={css`
        margin-bottom: ${spacing.xl};
      `}>
        <div css={css`
          width: 60px;
          height: 60px;
          border: 4px solid rgba(255, 255, 255, 0.2);
          border-top-color: ${colors.primary};
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
        margin-bottom: ${spacing.md};
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
        margin-top: ${spacing.lg};
        display: flex;
        gap: ${spacing.sm};
      `}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            css={css`
              width: 8px;
              height: 8px;
              background-color: ${colors.primary};
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

export const Spinner = ({ size = 'md', variant = 'primary' }) => {
  const sizes = {
    sm: '30px',
    md: '50px',
    lg: '70px',
  };

  const colors_map = {
    primary: colors.primary,
    white: colors.white,
    success: colors.success,
  };

  return (
    <div css={css`
      width: ${sizes[size]};
      height: ${sizes[size]};
      border: 4px solid rgba(255, 255, 255, 0.2);
      border-top-color: ${colors_map[variant]};
      border-radius: 50%;
      animation: spin 1.5s linear infinite;
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `} />
  );
};

export default LoadingScreen;
