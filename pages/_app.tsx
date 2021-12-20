import "../styles/globals.css";
import "../styles/tooltip.css";
import "../styles/spin.css";
import "../styles/dropdown.css";
import "../styles/menu.css";
import "../styles/slider.css";
import type { AppProps } from "next/app";
import { MetaMaskProvider } from "metamask-react";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <MetaMaskProvider>
      <Component {...pageProps} />
    </MetaMaskProvider>
  );
}

export default MyApp;
