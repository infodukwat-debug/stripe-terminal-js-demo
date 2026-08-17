import React from 'react';
import { css } from '@emotion/react';

export const WelcomeScreen = ({ onTouch, readerStatus = 'connected', showBadge = true }) => {
  return (
    <div
      onClick={onTouch}
      css={css`
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: linear-gradient(135deg, #0066FF 0%, #1A1A2E 100%);
        color: white;
        cursor: pointer;
        text-align: center;
        padding: 24px;
        position: relative;
        overflow: hidden;
        animation: fadeIn 0.6s ease-in-out;
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}
    >
      {/* Élément de fond décoratif */}
      <div css={css`
        position: absolute;
        top: -50%;
        right: -50%;
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
      `} />

      {/* Container principal */}
      <div css={css`
        z-index: 10;
        animation: slideUp 0.6s ease-out;
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}>
        {/* Logo/Emoji principal */}
        <h1 css={css`
          font-size: 5rem;
          margin: 0 0 24px 0;
          animation: pulse 3s infinite;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
        `}>
          🛋️
        </h1>

        {/* Titre */}
        <h1 css={css`
          font-size: clamp(2.5rem, 8vw, 4rem);
          margin: 0 0 16px 0;
          font-weight: 900;
          letter-spacing: -1px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        `}>
          Qnook
        </h1>

        {/* Sous-titre */}
        <p css={css`
          font-size: clamp(1.2rem, 4vw, 1.5rem);
          margin: 0 0 32px 0;
          font-weight: 400;
          opacity: 0.95;
          letter-spacing: 0.5px;
        `}>
          Bienvenue chez Qnook
        </p>

        {/* CTA principal */}
        <p css={css`
          font-size: 1.1rem;
          margin: 0;
          opacity: 0.85;
          font-weight: 500;
          animation: pulse 2s infinite;
          animation-delay: 0.3s;
        `}>
          ➜ Touchez l'écran pour commencer
        </p>
      </div>

      {/* Badge statut en bas */}
      {showBadge && readerStatus === 'connected' && (
        <div css={css`
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          animation: slideUp 0.8s ease-out 0.5s both;
          background: rgba(16, 185, 129, 0.9);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          backdrop-filter: blur(10px);
        `}>
          ✅ Lecteur connecté
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;
