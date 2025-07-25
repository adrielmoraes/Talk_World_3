import React from 'react';
import logo from '../assets/logo.png';

// Usando a imagem PNG do logo do projeto

export const Logo = (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
  // Aumentar o tamanho em 20%
  const width = props.width ? (typeof props.width === 'number' ? Math.round(props.width * 1.2) : parseInt(props.width) * 1.2) : 120;
  const height = props.height ? (typeof props.height === 'number' ? Math.round(props.height * 1.2) : parseInt(props.height) * 1.2) : 120;
  
  return (
    <img
      {...props}
      src={logo}
      alt="Talk World Logo"
      width={width}
      height={height}
      style={{
        maxWidth: '100%',
        height: 'auto',
        ...props.style
      }}
    />
  );
};