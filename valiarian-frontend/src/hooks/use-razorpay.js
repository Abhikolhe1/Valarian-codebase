import { useCallback, useRef, useState } from 'react';

const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-script';
const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

export default function useRazorpay() {
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const scriptPromiseRef = useRef(null);

  const loadScript = useCallback(() => {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Razorpay is unavailable outside the browser'));
    }

    if (window.Razorpay) {
      return Promise.resolve(true);
    }

    if (scriptPromiseRef.current) {
      return scriptPromiseRef.current;
    }

    setIsLoadingScript(true);

    scriptPromiseRef.current = new Promise((resolve, reject) => {
      const existingScript = document.getElementById(RAZORPAY_SCRIPT_ID);

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true), { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Failed to load Razorpay checkout')),
          { once: true }
        );
        return;
      }

      const script = document.createElement('script');
      script.id = RAZORPAY_SCRIPT_ID;
      script.src = RAZORPAY_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
      document.body.appendChild(script);
    })
      .finally(() => {
        setIsLoadingScript(false);
      })
      .catch((error) => {
        scriptPromiseRef.current = null;
        throw error;
      });

    return scriptPromiseRef.current;
  }, []);

  const openCheckout = useCallback(
    async (options) => {
      await loadScript();

      if (!window.Razorpay) {
        throw new Error('Razorpay checkout is unavailable right now');
      }

      return new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          ...options,
          handler: (response) => {
            resolve({
              status: 'success',
              response,
            });
          },
          modal: {
            ...options?.modal,
            ondismiss: () => {
              options?.modal?.ondismiss?.();
              resolve({ status: 'cancelled' });
            },
          },
        });

        razorpay.on('payment.failed', (response) => {
          const error = new Error(
            response?.error?.description || 'Payment failed. Please try again.'
          );

          error.status = 'failed';
          error.response = response;

          reject(error);
        });

        razorpay.open();
      });
    },
    [loadScript]
  );

  return {
    isLoadingScript,
    loadScript,
    openCheckout,
  };
}
