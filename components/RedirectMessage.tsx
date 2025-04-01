import { useEffect } from "react";
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
  delay = 5000,
}: RedirectMessageProps) => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(redirectTo);
    }, delay);

    return () => clearTimeout(timer);
  }, [router, redirectTo, delay]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      <a href={buttonLink} className={styles.button}>
        {buttonLabel}
      </a>
      <div className={styles.bottomNote}>
        <span>
          You will automatically be redirected in {delay / 1000} seconds.
        </span>
        <div className={styles.loader}></div>
      </div>
    </div>
  );
};

export default RedirectMessage;
