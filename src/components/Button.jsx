import React from 'react';
import { css } from '@emotion/react';
import { colors, shadows, transitions, spacing, borderRadius } from '../styles/colors';

const buttonStyles = {
  base: css`
    font-family: 'Inter', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    padding: ${spacing.md} ${spacing.xl};
    border: none;
    border-radius: ${borderRadius.md};
    cursor: pointer;
    transition: all ${transitions.base};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${spacing.sm};
    
    &:focus {
      outline: 2px solid ${colors.primary};
      outline-offset: 2px;
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  
  primary: css`
    background-color: ${colors.primary};
    color: ${colors.white};
    box-shadow: ${shadows.blue};
    
    &:hover:not(:disabled) {
      background-color: ${colors.primaryDark};
      box-shadow: ${shadows.blueHover};
      transform: translateY(-2px);
    }
    
    &:active:not(:disabled) {
      background-color: ${colors.primaryVeryDark};
      transform: translateY(0);
    }
  `,
  
  secondary: css`
    background-color: ${colors.light};
    color: ${colors.text};
    border: 1px solid ${colors.border};
    
    &:hover:not(:disabled) {
      background-color: #EFEFEF';
      box-shadow: ${shadows.sm};
    }
    
    &:active:not(:disabled) {
      background-color: #E5E5E7';
    }
  `,
  
  success: css`
    background-color: ${colors.success};
    color: ${colors.white};
    
    &:hover:not(:disabled) {
      background-color: #059669;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      transform: translateY(-2px);
    }
    
    &:active:not(:disabled) {
      background-color: #047857;
      transform: translateY(0);
    }
  `,
  
  danger: css`
    background-color: ${colors.error};
    color: ${colors.white};
    
    &:hover:not(:disabled) {
      background-color: #DC2626;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
      transform: translateY(-2px);
    }
    
    &:active:not(:disabled) {
      background-color: #B91C1C;
      transform: translateY(0);
    }
  `,
  
  fullWidth: css`
    width: 100%;
  `,
  
  small: css`
    padding: ${spacing.sm} ${spacing.md};
    font-size: 0.875rem;
  `,
  
  large: css`
    padding: ${spacing.lg} ${spacing.xl};
    font-size: 1.125rem;
  `,
};

export const Button = ({
  variant = 'primary',
  size = 'base',
  fullWidth = false,
  disabled = false,
  children,
  ...props
}) => {
  const sizeStyle = size === 'small' ? buttonStyles.small : size === 'large' ? buttonStyles.large : null;
  const variantStyle = buttonStyles[variant] || buttonStyles.primary;
  const widthStyle = fullWidth ? buttonStyles.fullWidth : null;

  return (
    <button
      css={[buttonStyles.base, variantStyle, sizeStyle, widthStyle]}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
