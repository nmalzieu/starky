import type { AppProps } from "next/app";
import Head from "next/head";

import "../styles/globals.scss";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className="container">
      <Head>
        <title>Starky</title>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/site.webmanifest" />
      </Head>
      <Component {...pageProps} />
    </div>
  );
}

export default MyApp;
