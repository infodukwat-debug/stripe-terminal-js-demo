import React from 'react';
import { css } from '@emotion/react';

export const ProductGrid = ({ products, onSelectProduct }) => {
  return (
    <div css={css`
      padding: 40px 20px;
      max-width: 1200px;
      margin: 0 auto;
      background: linear-gradient(135deg, #F5F5F7 0%, #FFFFFF 100%);
      min-height: 100vh;
    `}>
      {/* Header */}
      <div css={css`
        text-align: center;
        margin-bottom: 48px;
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
        <h2 css={css`
          font-size: 2.5rem;
          margin: 0 0 12px 0;
          color: #1A1A2E;
          font-weight: 900;
          font-family: 'Poppins', sans-serif;
        `}>
          Choisissez votre durée
        </h2>
        <p css={css`
          color: #6B7280;
          font-size: 1.1rem;
          margin: 0;
          font-family: 'Inter', sans-serif;
        `}>
          Touchez la durée qui vous convient
        </p>
      </div>

      {/* Grid */}
      <div css={css`
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 28px;
        margin-top: 40px;
        animation: fadeIn 0.8s ease-out;
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}>
        {products.map((product, index) => (
          <div
            key={product.id}
            onClick={() => onSelectProduct(product)}
            css={css`
              background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFF 100%);
              border: 2px solid #E5E7EB;
              border-radius: 16px;
              padding: 28px 20px;
              text-align: center;
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
              position: relative;
              overflow: hidden;
              animation: slideUp 0.6s ease-out;
              animation-delay: ${index * 0.1}s;
              animation-fill-mode: both;
              
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
              
              &::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(0, 102, 255, 0.1) 0%, transparent 100%);
                opacity: 0;
                transition: opacity 0.3s ease;
              }
              
              &:hover {
                transform: translateY(-12px) scale(1.02);
                box-shadow: 0 16px 40px rgba(0, 102, 255, 0.2);
                border-color: #0066FF;
                background: linear-gradient(135deg, #FFFFFF 0%, #F0F4FF 100%);
                
                &::before {
                  opacity: 1;
                }
              }
              
              &:active {
                transform: translateY(-8px) scale(1.01);
              }
            `}
          >
            {/* Emoji/Icon */}
            <div css={css`
              font-size: 3.5rem;
              margin-bottom: 16px;
              filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
              transition: transform 0.3s ease;
            `}>
              {product.image || '🛋️'}
            </div>

            {/* Titre */}
            <h3 css={css`
              font-size: 1.4rem;
              color: #1A1A2E;
              margin: 0 0 12px 0;
              font-weight: 700;
              font-family: 'Poppins', sans-serif;
            `}>
              {product.name}
            </h3>

            {/* Prix */}
            <div css={css`
              font-family: 'Inter', sans-serif;
            `}>
              {product.promo ? (
                <>
                  <div css={css`
                    font-size: 0.9rem;
                    color: #9CA3AF;
                    text-decoration: line-through;
                    margin-bottom: 4px;
                  `}>
                    {product.originalPrice ? `${(product.originalPrice / 100).toFixed(2)} €` : `${(product.price / 100).toFixed(2)} €`}
                  </div>
                  <div css={css`
                    color: #EF4444;
                    font-size: 1.5rem;
                    font-weight: 800;
                  `}>
                    {product.promo.type === 'percent'
                      ? `${((product.price * (1 - product.promo.value / 100)) / 100).toFixed(2)} €`
                      : `${(Math.max(0, product.price - product.promo.value) / 100).toFixed(2)} €`}
                  </div>
                </>
              ) : (
                <div css={css`
                  color: #0066FF;
                  font-size: 1.5rem;
                  font-weight: 800;
                `}>
                  {(product.price / 100).toFixed(2)} €
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductGrid;
