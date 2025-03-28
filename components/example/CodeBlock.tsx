"use client";
import { Copy, Check } from "lucide-react";
import { copyToClipboard } from "../../utils/copyText";
import styles from "../../styles/Example.module.scss";
import { useState } from "react";

interface CodeBlockProps {
  code: object;
}

export function CodeBlock({ code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const formattedCode = JSON.stringify(code, null, 2);

  const handleCopy = () => {
    copyToClipboard(formattedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.codeContainer}>
      <pre className={styles.code}>{formattedCode}</pre>
      <button className={styles.copyButton} onClick={handleCopy}>
        {copied ? <Check size={16} color="green" /> : <Copy size={16} />}
      </button>
    </div>
  );
}
