import React from 'react';
import { ShoppingCart, MapPin, CreditCard, CheckCircle2 } from 'lucide-react';

export const CheckoutSteps = ({ currentStep = 1 }) => {
  const steps = [
    { number: 1, label: 'Cart Basket', icon: ShoppingCart },
    { number: 2, label: 'Delivery Details', icon: MapPin },
    { number: 3, label: 'Payment', icon: CreditCard },
    { number: 4, label: 'Confirmation', icon: CheckCircle2 }
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      maxWidth: '720px',
      margin: '0 auto 28px auto',
      padding: '12px 16px',
      background: 'var(--color-bg-surface)',
      borderRadius: 'var(--radius-md)',
      border: 'var(--border-hairline)',
      overflowX: 'auto'
    }}>
      {steps.map((step, idx) => {
        const isDone = currentStep > step.number;
        const isActive = currentStep === step.number;
        const Icon = step.icon;

        return (
          <React.Fragment key={step.number}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isActive || isDone ? 1 : 0.45,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--color-primary)' : isDone ? 'var(--color-success)' : 'var(--color-text-muted)',
              whiteSpace: 'nowrap'
            }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8125rem',
                backgroundColor: isActive
                  ? 'var(--color-primary-light)'
                  : isDone
                  ? 'var(--color-success-bg)'
                  : 'var(--color-bg-subtle)',
                border: isActive
                  ? '1px solid var(--color-primary-border)'
                  : isDone
                  ? '1px solid #bbf7d0'
                  : '1px solid #e2e8f0',
                color: isActive ? 'var(--color-primary)' : isDone ? 'var(--color-success)' : 'var(--color-text-muted)'
              }}>
                {isDone ? <CheckCircle2 size={16} /> : <Icon size={15} />}
              </div>
              <span style={{ fontSize: '0.875rem' }}>{step.label}</span>
            </div>

            {idx < steps.length - 1 && (
              <div style={{
                flex: 1,
                minWidth: '24px',
                maxWidth: '60px',
                height: '2px',
                margin: '0 10px',
                backgroundColor: isDone ? 'var(--color-success)' : '#e2e8f0'
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
