import React, { useEffect, useState } from "react";

interface Base64ImageProps {
  imageUrl: string; // The URL of the image to be converted
  alt: string; // Alt text for the image
  width: number; // Width of the image
  height: number; // Height of the image
}

const AppImages: React.FC<Base64ImageProps> = ({ imageUrl, alt, width, height }) => {
  const [decodedString, setDecodedString] = useState<string>("https://images.seromatic.com/ca/f5/caf5c19afc9bd4b5865fc2020746a9f68cc47481-large.jpg");

  useEffect(() => {
    setDecodedString(atob(imageUrl));
    console.log("Decoded string:", decodedString);
  }, [imageUrl]);

  return <img src={decodedString} alt={alt} width={width} height={height} />;
  // return <h2>{decodedString}</h2>;
};

export default AppImages;
