import Link from "next/link";
import styles from "../styles/BackButton.module.scss";
export default function BackButton() {
  return (
    <Link href="/" className={styles.backButton}>
      ◀ Back
    </Link>
  );
}
