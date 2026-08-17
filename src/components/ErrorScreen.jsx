import React from 'react';
import { css } from '@emotion/react';
import { colors, shadows, transitions, spacing, borderRadius } from '../styles/colors';
import { Button } from './Button';

export const ErrorScreen = ({ 
  title = 'Erreur de connexion',
  message = 'Une erreur est survenue',
  onRetry,
  icon = '❌'
}) => {
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
      animation: fadeIn 0.4s ease-in-out;
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `}>
      {/* Icône avec animation shake */}
      <div css={css`
        margin-bottom: ${spacing.xl};
        font-size: 4rem;
        animation: shake 0.5s ease-in-out;
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `}>
        {icon}
      </div>

      {/* Titre */}
      <h2 css={css`
        font-size: 1.75rem;
        margin-bottom: ${spacing.md};
        font-weight: 700;
        color: ${colors.white};
      `}>
        {title}
      </h2>

      {/* Message */}
      <p css={css`
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.8);
        max-width: 500px;
        margin: 0 0 ${spacing.xl} 0;
        line-height: 1.6;
      `}>
        {message}
      </p>

      {/* Bouton Réessayer */}
      {onRetry && (
        <Button 
          variant="primary" 
          onClick={onRetry}
          css={css`
            margin-top: ${spacing.lg};
            font-size: 1.1rem;
            padding: ${spacing.md} ${spacing.xl};
          `}
        >
          🔄 Réessayer
        </Button>
      )}
    </div>
  );
};

export default ErrorScreen;
