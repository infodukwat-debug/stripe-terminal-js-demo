import React from 'react';
import { css } from '@emotion/react';
import { colors, shadows, transitions, spacing, borderRadius, gradients } from '../styles/colors';

export const Card = ({ children, variant = 'default', onClick, ...props }) => {
  const cardStyles = {
    default: css`
      background-color: ${colors.white};
      border: 1px solid ${colors.border};
      border-radius: ${borderRadius.lg};
      padding: ${spacing.lg};
      box-shadow: ${shadows.sm};
      transition: all ${transitions.base};
      
      ${onClick && css`
        cursor: pointer;
        
        &:hover {
          box-shadow: ${shadows.lg};
          transform: translateY(-4px);
        }
      `}
    `,
    
    elevated: css`
      background: ${gradients.card};
      border-radius: ${borderRadius.lg};
      padding: ${spacing.lg};
      box-shadow: ${shadows.md};
      transition: all ${transitions.base};
      
      ${onClick && css`
        cursor: pointer;
        
        &:hover {
          box-shadow: ${shadows.lg};
          transform: translateY(-4px);
        }
      `}
    `,
    
    bordered: css`
      background-color: ${colors.white};
      border: 2px solid ${colors.primary};
      border-radius: ${borderRadius.lg};
      padding: ${spacing.lg};
      box-shadow: ${shadows.xs};
    `,
  };

  return (
    <div css={cardStyles[variant]} onClick={onClick} {...props}>
      {children}
    </div>
  );
};

export const InfoBox = ({ title, children, icon = 'ℹ️' }) => {
  return (
    <div css={css`
      background-color: ${colors.primaryLight};
      border-left: 4px solid ${colors.primary};
      border-radius: ${borderRadius.md};
      padding: ${spacing.md};
      margin-bottom: ${spacing.lg};
    `}>
      <div css={css`
        display: flex;
        gap: ${spacing.md};
        align-items: flex-start;
      `}>
        <span css={css`font-size: 1.5rem;`}>{icon}</span>
        <div>
          {title && (
            <p css={css`
              font-weight: 600;
              color: ${colors.text};
              margin-bottom: ${spacing.sm};
            `}>
              {title}
            </p>
          )}
          <div css={css`
            color: ${colors.textSecondary};
            font-size: 0.95rem;
            line-height: 1.5;
          `}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AlertBox = ({ title, children, icon = '⚠️', type = 'warning' }) => {
  const typeStyles = {
    warning: {
      bgColor: colors.warningLight,
      borderColor: colors.warning,
      textColor: colors.text,
    },
    error: {
      bgColor: colors.errorLight,
      borderColor: colors.error,
      textColor: colors.text,
    },
    success: {
      bgColor: colors.successLight,
      borderColor: colors.success,
      textColor: colors.text,
    },
  };

  const style = typeStyles[type];

  return (
    <div css={css`
      background-color: ${style.bgColor};
      border-left: 4px solid ${style.borderColor};
      border-radius: ${borderRadius.md};
      padding: ${spacing.md};
      margin-bottom: ${spacing.lg};
    `}>
      <div css={css`
        display: flex;
        gap: ${spacing.md};
        align-items: flex-start;
      `}>
        <span css={css`font-size: 1.5rem;`}>{icon}</span>
        <div>
          {title && (
            <p css={css`
              font-weight: 600;
              color: ${style.textColor};
              margin-bottom: ${spacing.sm};
            `}>
              {title}
            </p>
          )}
          <div css={css`
            color: ${style.textColor};
            font-size: 0.95rem;
            line-height: 1.5;
          `}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Badge = ({ children, variant = 'primary', ...props }) => {
  const badgeStyles = {
    primary: css`
      background-color: ${colors.primaryLight};
      color: ${colors.primary};
    `,
    success: css`
      background-color: ${colors.successLight};
      color: ${colors.success};
    `,
    error: css`
      background-color: ${colors.errorLight};
      color: ${colors.error};
    `,
    warning: css`
      background-color: ${colors.warningLight};
      color: ${colors.warning};
    `,
  };

  return (
    <span css={[css`
      display: inline-block;
      padding: ${spacing.xs} ${spacing.sm};
      border-radius: ${borderRadius.full};
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `, badgeStyles[variant]]} {...props}>
      {children}
    </span>
  );
};

export default Card;
