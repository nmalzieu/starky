import { ExampleCard } from "../../components/example/ExampleCard";
import styles from "../../styles/Example.module.scss";

export default function ExamplesPage() {
  // Standard NFT Config
  const standardNftConfig = {
    network: "mainnet",
    moduleType: "erc721",
    contractAddress:
      "0x05dbdedc203e92749e2e746e2d40a768d966bd243df04a6b712e222bc040a9af",
  };

  const standardNftKeyComponents = [
    {
      name: "network",
      description: "Specifies the Starknet network (mainnet)",
    },
    { name: "moduleType", description: "Uses the standard ERC721 module" },
    { name: "contractAddress", description: "The address of the NFT contract" },
  ];

  // Custom API NFT Config
  const customApiNftConfig = {
    moduleType: "erc721Metadata",
    conditionPattern: [{ path: "domain", pattern: "^([a-z0-9-]){4}\\.stark$" }],
    contractAddress:
      "0x05dbdedc203e92749e2e746e2d40a768d966bd243df04a6b712e222bc040a9af",
    customApiParamName: "full_ids",
    customApiUri: "https://api.starknet.id/addr_to_full_ids?addr={ADDRESS_INT}",
  };

  const customApiNftKeyComponents = [
    {
      name: "moduleType",
      description: "Uses the ERC721 metadata module for enhanced data",
    },
    {
      name: "conditionPattern",
      description:
        "Filters for domains matching the pattern (4+ character .stark domains)",
    },
    { name: "contractAddress", description: "The address of the NFT contract" },
    {
      name: "customApiParamName",
      description: "Parameter name for the custom API",
    },
    {
      name: "customApiUri",
      description:
        "Custom endpoint with {ADDRESS_INT} placeholder for the wallet address",
    },
  ];

  const implementationNotes = [
    {
      title: "Configuration Format",
      content: "All configurations should be valid JSON objects.",
    },
    {
      title: "Contract Address",
      content: "Always use the full Starknet contract address.",
    },
    {
      title: "Custom API",
      content:
        "When using custom APIs, ensure the {ADDRESS_INT} placeholder is included to be replaced with the user's address.",
    },
    {
      title: "Condition Patterns",
      content:
        "Use regular expressions in the pattern field to filter metadata based on specific criteria.",
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>NFT Configuration Examples</h1>
        <p className={styles.description}>
          Below are example configurations for NFTs that can be used as
          templates for your own projects.
        </p>
      </div>
      <div className={styles.grid}>
        <ExampleCard
          title="Standard NFT Config"
          description="Using Starkscan API for basic ERC721 token integration"
          explanation="This configuration is suitable for standard ERC721 tokens on the Starknet mainnet. It uses the default API to fetch token data."
          config={standardNftConfig}
          keyComponents={standardNftKeyComponents}
        />

        <ExampleCard
          title="Custom API NFT Config"
          description="With Metadata Module and condition pattern for Starknet.ID domains"
          explanation="This advanced configuration uses a custom API endpoint and includes a condition pattern to filter for specific Starknet.ID domains."
          config={customApiNftConfig}
          keyComponents={customApiNftKeyComponents}
        />
      </div>
      <div className={styles.notesSection}>
        <h2 className={styles.notesTitle}>Implementation Notes</h2>
        <div className={styles.notesContainer}>
          <ul className={styles.notesList}>
            {implementationNotes.map((note, index) => (
              <li key={index} className={styles.notesItem}>
                <span className={styles.notesItemTitle}>{note.title}:</span>{" "}
                {note.content}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
