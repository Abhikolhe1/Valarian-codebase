const PAYMENT_SESSION_STORAGE_KEY = 'valiarian-payment-session';

export const savePaymentSession = (session) => {
  if (typeof window === 'undefined' || !session) {
    return;
  }

  localStorage.setItem(
    PAYMENT_SESSION_STORAGE_KEY,
    JSON.stringify({
      ...session,
      updatedAt: new Date().toISOString(),
    })
  );
};

export const getPaymentSession = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = localStorage.getItem(PAYMENT_SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    localStorage.removeItem(PAYMENT_SESSION_STORAGE_KEY);
    return null;
  }
};

export const clearPaymentSessionStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(PAYMENT_SESSION_STORAGE_KEY);
};

export const buildPaymentQuery = (session = {}) => {
  const searchParams = new URLSearchParams();

  ['orderId', 'orderNumber', 'amount', 'status'].forEach((key) => {
    if (session[key] !== undefined && session[key] !== null && session[key] !== '') {
      searchParams.set(key, String(session[key]));
    }
  });

  if (session.createdAt) {
    searchParams.set('date', session.createdAt);
  }

  return searchParams.toString();
};
