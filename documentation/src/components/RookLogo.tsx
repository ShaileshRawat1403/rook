import { useColorMode } from '@docusaurus/theme-common';

export const RookLogo = (props: { className?: string }) => {
  const { colorMode } = useColorMode();
  
  const logoSrc = colorMode === 'dark' 
    ? 'img/rook-logo-white.png' 
    : 'img/rook-logo-black.png';
  
  const logoAlt = 'rook logo';

  return (
    <img
      src={logoSrc}
      alt={logoAlt}
      className={props.className}
      style={{ height: 'auto', maxWidth: '100%' }}
    />
  );
};