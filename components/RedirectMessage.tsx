import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/RedirectMessage.module.scss";

interface RedirectMessageProps {
  title: string;
  description: string;
  buttonLabel: string;
  buttonLink: string;
  redirectTo: string;
  delay?: number;
}

const RedirectMessage = ({
  title,
  description,
  buttonLabel,
  buttonLink,
  redirectTo,
  delay = 4000,
}: RedirectMessageProps) => {
  const router = useRouter();
  const [countdown, setCountdown] = useState(Math.floor(delay / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : prev));
    }, 1000);

    const timeout = setTimeout(() => {
      router.push(redirectTo);
    }, delay);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [redirectTo, delay, router]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>{title}</div>
        <p className={styles.description}>{description}</p>
        <div className={styles.cardContent}>
          <a href={buttonLink} className={styles.button}>
            {buttonLabel}
          </a>
          <div className={styles.bottomNote}>
            Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
            <span className={styles.loader} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RedirectMessage;
