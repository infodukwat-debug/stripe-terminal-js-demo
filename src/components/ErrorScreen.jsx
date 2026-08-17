import React from 'react';
import { css } from '@emotion/react';

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
      background: linear-gradient(135deg, #1A1A2E 0%, #2D2E47 100%);
      color: white;
      text-align: center;
      padding: 24px;
      overflow: hidden;
      animation: fadeIn 0.4s ease-in-out;
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `}>
      {/* Icône avec animation shake */}
      <div css={css`
        margin-bottom: 32px;
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
        margin: 0 0 16px 0;
        font-weight: 700;
        color: white;
      `}>
        {title}
      </h2>

      {/* Message */}
      <p css={css`
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.8);
        max-width: 500px;
        margin: 0 0 32px 0;
        line-height: 1.6;
      `}>
        {message}
      </p>

      {/* Bouton Réessayer */}
      {onRetry && (
        <button
          onClick={onRetry}
          css={css`
            padding: 16px 32px;
            font-size: 1.1rem;
            font-weight: 700;
            background-color: #0066FF;
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 102, 255, 0.3);
            
            &:hover {
              background-color: #0052CC;
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(0, 102, 255, 0.4);
            }
            
            &:active {
              transform: translateY(0);
            }
          `}
        >
          🔄 Réessayer
        </button>
      )}
    </div>
  );
};

export default ErrorScreen;
