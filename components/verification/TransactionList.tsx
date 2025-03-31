import { useEffect, useState } from "react";
import axios from "axios";
import styles from "../../styles/Verify.module.scss";

type TransactionListProps = {
  account: string | null;
};

const TransactionList = ({ account }: TransactionListProps) => {
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const fetchTransactions = async (address: string) => {
      try {
        const response = await axios.get(
          `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY}`
        );
        setTransactions(response.data.result);
      } catch (error) {
        console.error("Error fetching transactions", error);
      }
    };

    if (account) {
      fetchTransactions(account);
    }
  }, [account]);

  return (
    <div>
      {transactions.length > 0 ? (
        <div>
          <h3>Recent Transactions</h3>
          <ul>
            {transactions.slice(0, 5).map((tx) => (
              <li key={tx.hash}>
                <a
                  href={`https://etherscan.io/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tx.hash.slice(0, 10)}... ({tx.value / 1e18} ETH)
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={styles.advancedErrorMessage}>
          No recent transactions found.
        </p>
      )}
    </div>
  );
};

export default TransactionList;
