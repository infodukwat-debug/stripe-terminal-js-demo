import React from 'react';
import { css } from '@emotion/react';
import { colors, gradients, spacing } from '../styles/colors';
import { Button } from './Button';

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
      background: ${gradients.sessionActive};
      color: ${colors.white};
      text-align: center;
      padding: ${spacing.xl};
      position: relative;
      overflow: hidden;
    `}>
      {/* Décoration fond */}
      <div css={css`
        position: absolute;
        top: -50%;
        right: -50%;
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
      `} />

      {/* Container principal */}
      <div css={css`
        z-index: 10;
      `}>
        {/* Titre */}
        <h2 css={css`
          font-size: 2rem;
          margin-bottom: ${spacing.lg};
          font-weight: 700;
        `}>
          ⏱️ Session en cours
        </h2>

        {/* Info produit */}
        <p css={css`
          font-size: 1.2rem;
          margin-bottom: ${spacing.lg};
          opacity: 0.9;
        `}>
          {productName} • {productPrice}
        </p>

        {/* Timer géant */}
        <div css={css`
          font-size: 5rem;
          font-weight: 800;
          font-family: 'Courier New', monospace;
          margin-bottom: ${spacing.xl};
          letter-spacing: 0.1em;
          animation: glow 2s infinite;
          text-shadow: 0 0 20px rgba(0, 102, 255, 0.5);
          
          @keyframes glow {
            0%, 100% { filter: brightness(1); }
            50% { filter: brightness(1.1); }
          }
        `}>
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </div>

        {/* Buttons */}
        <div css={css`
          display: flex;
          gap: ${spacing.lg};
          justify-content: center;
          flex-wrap: wrap;
        `}>
          <Button
            variant="success"
            size="large"
            onClick={onEnd}
            disabled={isPaymentInProgress}
          >
            {isPaymentInProgress ? '💳 Paiement...' : '✅ Terminer et payer'}
          </Button>
          <Button
            variant="danger"
            size="large"
            onClick={onCancel}
            disabled={isPaymentInProgress}
          >
            ❌ Annuler
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionScreen;
