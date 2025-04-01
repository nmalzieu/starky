/**
 * @description      :
 * @author           :
 * @group            :
 * @created          : 01/04/2025 - 13:53:03
 *
 * MODIFICATION LOG
 * - Version         : 1.0.0
 * - Date            : 01/04/2025
 * - Author          :
 * - Modification    :
 **/

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/RedirectMessage.module.scss";

interface RedirectMessageProps {
  title: string;
  description: string;
  buttonLabel: string;
  buttonLink: string;
  redirectTime?: number;
}

export default function RedirectMessage({
  title,
  description,
  buttonLabel,
  buttonLink,
  redirectTime = 5000,
}: RedirectMessageProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(redirectTime / 1000);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const timeout = setTimeout(() => {
      router.push(buttonLink);
    }, redirectTime);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router, buttonLink, redirectTime]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.cardHeader}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <a href={buttonLink} className={styles.button}>
          {buttonLabel}
        </a>
        <div className={styles.explanation}>
          You will automatically be redirected in {countdown} seconds.
          <div className={styles.loader}></div>
        </div>
      </div>
    </div>
  );
}
