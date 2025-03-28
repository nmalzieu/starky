import styles from "../../styles/Example.module.scss";

interface KeyComponent {
  name: string;
  description: string;
}

interface KeyComponentsListProps {
  components: KeyComponent[];
}

export function KeyComponentsList({ components }: KeyComponentsListProps) {
  return (
    <div className={styles.componentsContainer}>
      <h3 className={styles.componentsTitle}>Key Components:</h3>
      <ul className={styles.componentsList}>
        {components.map((component, index) => (
          <li key={index} className={styles.componentsItem}>
            <span className={styles.componentName}>{component.name}</span>:{" "}
            {component.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
