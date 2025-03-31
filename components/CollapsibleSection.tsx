// components/CollapsibleSection.tsx
import React, { useState } from "react";
import styles from "../styles/CollapsibleSection.module.scss";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
}

const CollapsibleSection = ({ title, children }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.section}>
      <button
        className={styles.sectionHeader}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={isOpen ? styles.arrowDown : styles.arrowRight}>
          {isOpen ? "▼" : "▶"}
        </span>
        {title}
      </button>
      {isOpen && <div className={styles.sectionContent}>{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
