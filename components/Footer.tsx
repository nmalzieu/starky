import React from "react";
import styles from "../styles/SocialLinks.module.scss";

const Footer = () => {
  return (
    <div className={styles.socialLinks}>
      <a href="https://twitter.com/starky_wtf" target="_blank" rel="noopener noreferrer">
        twitter
      </a>
      <div className={styles.separator} />
      <a
        href="https://starkywtf.notion.site/Starky-wtf-f2f918be668b4e96863e82c0791e317c"
        target="_blank"
        rel="noopener noreferrer"
      >
        tutorial
      </a>
      <div className={styles.separator} />
      <a
        href="https://github.com/nmalzieu/starky"
        target="_blank"
        rel="noopener noreferrer"
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
};

export default Footer;