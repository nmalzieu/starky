import styles from "../styles/SocialLinks.module.scss";

const SocialLinks = () => (
  <div className={styles.socialLinks}>
    <a href="https://twitter.com/starky_wtf" target="_blank" rel="noreferrer">
      twitter
    </a>
    <div className={styles.separator} />
    <a href="tutorial" target="_blank" rel="noreferrer">
      tutorial
    </a>
    <div className={styles.separator} />
    <a
      href="https://github.com/nmalzieu/starky"
      target="_blank"
      rel="noreferrer"
    >
      github
    </a>
    <div className={styles.separator} />
    <a href="telegram" target="_blank" rel="noreferrer">
      telegram
    </a>
  </div>
);

export default SocialLinks;
