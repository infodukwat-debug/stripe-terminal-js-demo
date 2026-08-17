import React from 'react';
import { css } from '@emotion/react';

export const SessionScreen = ({
  minutes,
  seconds,
  productName,
  productPrice,
  onEnd,
  onCancel,
  isPaymentInProgress
}) => {
  return (
    <div css={css`
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #0066FF 0%, #1A1A2E 100%);
      color: white;
      text-align: center;
      padding: 24px;
      font-family: 'Arial', sans-serif;
      position: relative;
      overflow: hidden;
    `}>
      {/* Décoration */}
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
        {/* Icône + Titre */}
        <h2 css={css`
          font-size: 2rem;
          margin: 0 0 24px 0;
          font-weight: 700;
        `}>
          ⏱️ Session en cours
        </h2>

        {/* Info produit */}
        <p css={css`
          font-size: 1.2rem;
          margin: 0 0 48px 0;
          opacity: 0.9;
        `}>
          {productName} • <strong>{productPrice}</strong>
        </p>

        {/* Timer géant */}
        <div css={css`
          font-size: 5rem;
          font-weight: 900;
          font-family: 'Courier New', monospace;
          margin-bottom: 48px;
          letter-spacing: 0.15em;
          animation: glow 2s infinite;
          text-shadow: 0 0 30px rgba(0, 102, 255, 0.6);
          
          @keyframes glow {
            0%, 100% { 
              filter: brightness(1);
              text-shadow: 0 0 30px rgba(0, 102, 255, 0.6);
            }
            50% { 
              filter: brightness(1.2);
              text-shadow: 0 0 50px rgba(0, 102, 255, 0.9);
            }
          }
        `}>
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </div>

        {/* Buttons */}
        <div css={css`
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        `}>
          {/* Bouton Terminer et payer */}
          <button
            onClick={onEnd}
            disabled={isPaymentInProgress}
            css={css`
              padding: 16px 32px;
              font-size: 1.1rem;
              font-weight: 700;
              background-color: #10B981;
              color: white;
              border: none;
              border-radius: 10px;
              cursor: ${isPaymentInProgress ? 'not-allowed' : 'pointer'};
              transition: all 0.3s ease;
              box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
              opacity: ${isPaymentInProgress ? 0.6 : 1};
              
              &:hover:not(:disabled) {
                background-color: #059669;
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(16, 185, 129, 0.5);
              }
              
              &:active:not(:disabled) {
                transform: translateY(0);
              }
            `}
          >
            {isPaymentInProgress ? '💳 Paiement...' : '✅ Terminer et payer'}
          </button>

          {/* Bouton Annuler */}
          <button
            onClick={onCancel}
            disabled={isPaymentInProgress}
            css={css`
              padding: 16px 32px;
              font-size: 1.1rem;
              font-weight: 700;
              background-color: #EF4444;
              color: white;
              border: none;
              border-radius: 10px;
              cursor: ${isPaymentInProgress ? 'not-allowed' : 'pointer'};
              transition: all 0.3s ease;
              box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
              opacity: ${isPaymentInProgress ? 0.6 : 1};
              
              &:hover:not(:disabled) {
                background-color: #DC2626;
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(239, 68, 68, 0.5);
              }
              
              &:active:not(:disabled) {
                transform: translateY(0);
              }
            `}
          >
            ❌ Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionScreen;
