import { CodeBlock } from "./CodeBlock";
import { KeyComponentsList } from "./KeyComponentsList";
import styles from "../../styles/Example.module.scss";

interface KeyComponent {
  name: string;
  description: string;
}

interface ExampleCardProps {
  title: string;
  description: string;
  explanation: string;
  config: object;
  keyComponents: KeyComponent[];
}

export function ExampleCard({
  title,
  description,
  explanation,
  config,
  keyComponents,
}: ExampleCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{title}</h2>
        <p className={styles.cardDescription}>{description}</p>
      </div>
      <div className={styles.cardContent}>
        <div className={styles.explanation}>
          <p>{explanation}</p>
        </div>
        <CodeBlock code={config} />
        <KeyComponentsList components={keyComponents} />
      </div>
    </div>
  );
}
