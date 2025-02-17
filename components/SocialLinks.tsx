import styles from "../styles/SocialLinks.module.scss";

const SocialLinks = () => (
  <div className={styles.socialLinks}>
    <a href="https://twitter.com/starky_wtf" target="_blank" rel="noreferrer">
      twitter
    </a>
    <div className={styles.separator} />
    <a
      href="https://starkywtf.notion.site/Starky-wtf-f2f918be668b4e96863e82c0791e317c"
      target="_blank"
      rel="noreferrer"
    >
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
    <a
      href="https://t.me/+Mi34Im1Uafc1Y2Q8"
      target="_blank"
      rel="noopener noreferrer"
    >
      telegram
    </a>
  </div>
);

export default SocialLinks;
