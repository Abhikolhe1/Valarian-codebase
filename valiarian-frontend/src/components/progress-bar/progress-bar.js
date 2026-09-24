import { useEffect } from 'react';
import NProgress from 'nprogress';
//
import StyledProgressBar from './styles';

// ----------------------------------------------------------------------

export default function ProgressBar() {
  useEffect(() => {
    NProgress.configure({ showSpinner: false });
    NProgress.start();
    return () => NProgress.done();
  }, []);

  useEffect(() => {
    NProgress.done();
  }, []);

  return <StyledProgressBar />;
}
