import "../styles/globals.css";
import type { AppProps } from "next/app";
import { setupDb } from "../db";

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
