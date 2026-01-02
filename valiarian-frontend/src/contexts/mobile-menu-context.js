import PropTypes from 'prop-types';
import { createContext, useContext, useState, useMemo } from 'react';

// ----------------------------------------------------------------------

const MobileMenuContext = createContext(undefined);

export function MobileMenuProvider({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const value = useMemo(
    () => ({ isMenuOpen, setIsMenuOpen }),
    [isMenuOpen]
  );

  return (
    <MobileMenuContext.Provider value={value}>
      {children}
    </MobileMenuContext.Provider>
  );
}

MobileMenuProvider.propTypes = {
  children: PropTypes.node,
};

export function useMobileMenu() {
  const context = useContext(MobileMenuContext);
  // Return default values if context is not provided (for backward compatibility)
  if (context === undefined) {
    return { isMenuOpen: false, setIsMenuOpen: () => {} };
  }
  return context;
}

