import React from 'react';
import { css } from '@emotion/react';

export const ProductGrid = ({ products, onSelectProduct }) => {
  return (
    <div css={css`
      padding: 32px 16px;
      max-width: 1200px;
      margin: 0 auto;
    `}>
      {/* Header */}
      <div css={css`
        text-align: center;
        margin-bottom: 32px;
      `}>
        <h2 css={css`
          font-size: 2rem;
          margin: 0 0 16px 0;
          color: #1A1A2E;
        `}>
          Choisissez votre durée
        </h2>
        <p css={css`
          color: #6B7280;
          font-size: 1.1rem;
          margin: 0;
        `}>
          Touchez la durée qui vous convient
        </p>
      </div>

      {/* Grid */}
      <div css={css`
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 24px;
        margin-top: 32px;
      `}>
        {products.map((product) => (
          <div
            key={product.id}
            onClick={() => onSelectProduct(product)}
            css={css`
              background: linear-gradient(135deg, #FFFFFF 0%, #F5F5F7 100%);
              border: 1px solid #E5E7EB;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              
              &:hover {
                transform: translateY(-8px);
                box-shadow: 0 8px 24px rgba(0, 102, 255, 0.15);
              }
            `}
          >
            {/* Emoji/Icon */}
            <div css={css`
              font-size: 3rem;
              margin-bottom: 16px;
            `}>
              {product.image || '🕐'}
            </div>

            {/* Titre */}
            <h3 css={css`
              font-size: 1.2rem;
              color: #1A1A2E;
              margin: 0 0 8px 0;
              font-weight: 600;
            `}>
              {product.name}
            </h3>

            {/* Prix */}
            <div css={css`
              font-size: 1.3rem;
              font-weight: 700;
              color: #0066FF;
            `}>
              {product.promo ? (
                <>
                  <div css={css`
                    font-size: 0.9rem;
                    color: #6B7280;
                    text-decoration: line-through;
                  `}>
                    {product.originalPrice ? `${(product.originalPrice / 100).toFixed(2)} €` : `${(product.price / 100).toFixed(2)} €`}
                  </div>
                  <div css={css`
                    color: #EF4444;
                    font-size: 1.3rem;
                  `}>
                    {product.promo.type === 'percent'
                      ? `${((product.price * (1 - product.promo.value / 100)) / 100).toFixed(2)} €`
                      : `${(Math.max(0, product.price - product.promo.value) / 100).toFixed(2)} €`}
                  </div>
                </>
              ) : (
                `${(product.price / 100).toFixed(2)} €`
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductGrid;
