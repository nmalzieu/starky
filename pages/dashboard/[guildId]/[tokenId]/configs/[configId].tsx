import { GetServerSideProps, NextPage } from "next";
import { FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import Logo from "../../../../../components/Logo";
import SocialLinks from "../../../../../components/SocialLinks";
import RedirectMessage from "../../../../../components/RedirectMessage";
import Guild from "../../../../../components/guild/Guild";
import styles from "../../../../../styles/Dashboard.module.scss";
import {
  setupDb,
  DiscordServerConfigRepository,
  DiscordServerRepository,
} from "../../../../../db";
import { validateDashboardToken } from "../../../../../utils/validateDashboardToken";
import { getDiscordServerInfo } from "../../../../../discord/utils";
import { StarkyModuleConfig } from "../../../../../types/starkyModules";
import BackButton from "../../../../../components/BackButton";

interface ConfigProps {
  config: {
    id: string;
    starknetNetwork: "goerli" | "mainnet" | "sepolia" | "ethereum-mainnet";
    discordRoleId: string;
    starkyModuleType: string;
    starkyModuleConfig: StarkyModuleConfig;
  };
  guildId: string;
  discordServerName: string | null;
  discordServerIcon: string | null;
  tokenId: string;
  error?: string;
}

const ConfigPage: NextPage<ConfigProps> = ({
  config,
  guildId,
  discordServerName,
  discordServerIcon,
  tokenId,
  error,
}) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    starknetNetwork: "",
    discordRoleId: "",
    starkyModuleType: "",
    starkyModuleConfig: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        starknetNetwork: config.starknetNetwork,
        discordRoleId: config.discordRoleId,
        starkyModuleType: config.starkyModuleType,
        starkyModuleConfig: JSON.stringify(config.starkyModuleConfig, null, 2),
      });
    }
  }, [config]);

  if (error === "Invalid or expired token.") {
    return (
      <RedirectMessage
        title="Session Expired"
        description="Your access token has expired. You'll be redirected shortly."
        redirectTo="/"
      />
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Logo />
        <h1>Error</h1>
        <p>{error}</p>
        <SocialLinks />
      </div>
    );
  }

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Parse the JSON config
      let parsedConfig;
      try {
        parsedConfig = JSON.parse(formData.starkyModuleConfig);
      } catch (err) {
        setSaveError("Invalid JSON in module config");
        setIsSaving(false);
        return;
      }

      // Submit the form data
      const response = await axios.put(
        `/api/guilds/${guildId}/configs/${config.id}?token=${tokenId}`,
        {
          starknetNetwork: formData.starknetNetwork,
          discordRoleId: formData.discordRoleId,
          starkyModuleType: formData.starkyModuleType,
          starkyModuleConfig: parsedConfig,
        }
      );

      if (response.status === 200) {
        setSaveSuccess(true);
        // Refresh the form data with the new values
        setFormData({
          starknetNetwork: response.data.starknetNetwork,
          discordRoleId: response.data.discordRoleId,
          starkyModuleType: response.data.starkyModuleType,
          starkyModuleConfig: JSON.stringify(
            response.data.starkyModuleConfig,
            null,
            2
          ),
        });
      }
    } catch (error: any) {
      setSaveError(
        error.response?.data?.error || "Failed to save configuration"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Edit Configuration</h1>
      <Guild
        discordServerName={discordServerName!}
        discordServerIcon={discordServerIcon}
      />

      <BackButton destination={`/dashboard/${guildId}/${tokenId}`} />

      <form onSubmit={handleSubmit} className={styles.configForm}>
        <div className={styles.formGroup}>
          <label htmlFor="starknetNetwork">Starknet Network:</label>
          <select
            id="starknetNetwork"
            name="starknetNetwork"
            value={formData.starknetNetwork}
            onChange={handleInputChange}
            required
            className={styles.formInput}
          >
            <option value="mainnet">Mainnet</option>
            <option value="sepolia">Sepolia</option>
            <option value="ethereum-mainnet">Ethereum Mainnet</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="discordRoleId">Discord Role ID:</label>
          <input
            type="text"
            id="discordRoleId"
            name="discordRoleId"
            value={formData.discordRoleId}
            onChange={handleInputChange}
            required
            className={styles.formInput}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="starkyModuleType">Starky Module Type:</label>
          <input
            type="text"
            id="starkyModuleType"
            name="starkyModuleType"
            value={formData.starkyModuleType}
            onChange={handleInputChange}
            required
            className={styles.formInput}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="starkyModuleConfig">
            Starky Module Config (JSON):
          </label>
          <textarea
            id="starkyModuleConfig"
            name="starkyModuleConfig"
            value={formData.starkyModuleConfig}
            onChange={handleInputChange}
            required
            className={`${styles.formInput} ${styles.textArea}`}
            rows={10}
          />
        </div>

        {saveError && <div className={styles.errorMessage}>{saveError}</div>}
        {saveSuccess && (
          <div className={styles.successMessage}>
            Configuration saved successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className={styles.submitButton}
        >
          {isSaving ? "Saving..." : "Save Configuration"}
        </button>
      </form>

      <SocialLinks />
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  params,
  res,
}) => {
  await setupDb();

  const guildId = params?.guildId as string;
  const tokenId = params?.tokenId as string;
  const configId = params?.configId as string;

  if (!guildId || !tokenId || !configId) {
    if (res) res.statusCode = 400;
    return {
      props: {
        error: "Missing guild ID, token, or config ID",
        guildId: "",
        tokenId: "",
        config: null,
      },
    };
  }

  // Validate token
  const isValidToken = await validateDashboardToken(guildId, tokenId);
  if (!isValidToken) {
    if (res) res.statusCode = 403;
    return {
      props: {
        error: "Invalid or expired token.",
        guildId,
        tokenId,
        config: null,
      },
    };
  }

  // Check if the guild exists
  const discordServer = await DiscordServerRepository.findOneBy({
    id: guildId,
  });

  if (!discordServer) {
    if (res) res.statusCode = 404;
    return {
      props: {
        error: "Guild not found",
        guildId,
        tokenId,
        config: null,
      },
    };
  }

  // Get the config
  const config = await DiscordServerConfigRepository.findOneBy({
    id: configId,
    discordServerId: guildId,
  });

  if (!config) {
    if (res) res.statusCode = 404;
    return {
      props: {
        error: "Configuration not found",
        guildId,
        tokenId,
        config: null,
      },
    };
  }

  // Get guild info
  let discordServerName: string | null = null;
  let discordServerIcon: string | null = null;
  try {
    const info = await getDiscordServerInfo(guildId);
    discordServerName = info.name;
    if (info.icon) {
      const ext = info.icon.startsWith("a_") ? ".gif" : ".png";
      discordServerIcon = `https://cdn.discordapp.com/icons/${guildId}/${info.icon}${ext}`;
    }
  } catch (error) {
    console.error("Failed to fetch guild info:", error);
  }

  return {
    props: {
      config: {
        id: config.id,
        starknetNetwork: config.starknetNetwork,
        discordRoleId: config.discordRoleId,
        starkyModuleType: config.starkyModuleType,
        starkyModuleConfig: config.starkyModuleConfig,
      },
      guildId,
      discordServerName,
      discordServerIcon,
      tokenId,
    },
  };
};

export default ConfigPage;
