import React from 'react';
import { css } from '@emotion/react';
import { colors, spacing } from '../styles/colors';
import { Card } from './Card';

export const ProductGrid = ({ products, onSelectProduct }) => {
  return (
    <div css={css`
      padding: ${spacing.xl};
      max-width: 1200px;
      margin: 0 auto;
    `}>
      {/* Header */}
      <div css={css`
        text-align: center;
        margin-bottom: ${spacing.xl};
      `}>
        <h2 css={css`
          font-size: 2rem;
          margin-bottom: ${spacing.md};
          color: ${colors.text};
        `}>
          Choisissez votre durée
        </h2>
        <p css={css`
          color: ${colors.textSecondary};
          font-size: 1.1rem;
        `}>
          Touchez la durée qui vous convient
        </p>
      </div>

      {/* Grid */}
      <div css={css`
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: ${spacing.lg};
        margin-top: ${spacing.xl};
      `}>
        {products.map((product) => (
          <Card
            key={product.id}
            variant="elevated"
            onClick={() => onSelectProduct(product)}
            css={css`
              text-align: center;
              cursor: pointer;
              transition: all 0.3s ease;
              
              &:hover {
                transform: translateY(-8px);
              }
            `}
          >
            {/* Emoji/Icon */}
            <div css={css`
              font-size: 3rem;
              margin-bottom: ${spacing.md};
            `}>
              {product.image || '🕐'}
            </div>

            {/* Titre */}
            <h3 css={css`
              font-size: 1.2rem;
              color: ${colors.text};
              margin-bottom: ${spacing.sm};
              font-weight: 600;
            `}>
              {product.name}
            </h3>

            {/* Prix */}
            <div css={css`
              font-size: 1.3rem;
              font-weight: 700;
              color: ${colors.primary};
            `}>
              {product.promo ? (
                <>
                  <div css={css`
                    font-size: 0.9rem;
                    color: ${colors.textSecondary};
                    text-decoration: line-through;
                  `}>
                    {product.originalPrice ? `${(product.originalPrice / 100).toFixed(2)} €` : `${(product.price / 100).toFixed(2)} €`}
                  </div>
                  <div css={css`
                    color: ${colors.error};
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
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProductGrid;
