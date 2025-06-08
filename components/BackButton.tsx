import Link from "next/link";
import styles from "../styles/BackButton.module.scss";

interface BackButtonProps {
  destination?: string;
}

export default function BackButton({ destination = "/" }: BackButtonProps) {
  return (
    <Link href={destination} className={styles.backButton}>
      ◀ Back
    </Link>
  );
}
