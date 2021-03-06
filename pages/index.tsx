import type { NextPage } from "next";
import { useEffect, useState } from "react";
import Head from "next/head";
import { useMetaMask } from "metamask-react";
import styles from "../styles/home.module.css";
import { Navbar } from "../components/navbar";
import { SwapBox } from "../components/swapbox";

const Home: NextPage = () => {
  const { status, connect, account } = useMetaMask();
  const [chainId, setChainId] = useState<string | null>(null);

  function updateNetworkId() {
    // @ts-ignore
    setChainId(window["ethereum"].chainId);
  }

  async function switchToArbitrum() {
    try {
      // @ts-ignore
      await window["ethereum"].request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xa4b1" }],
      });
    } catch (error) {
      // @ts-ignore
      await window["ethereum"].request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0xa4b1",
            rpcUrls: ["https://arb1.arbitrum.io/rpc"],
            chainName: "Arbitrum One",
            nativeCurrency: {
              name: "Ethereum",
              symbol: "ETH",
              decimals: 18,
            },
          },
        ],
      });
    }
  }

  useEffect(function () {
    updateNetworkId();
    // @ts-ignore
    window["ethereum"].on("networkChanged", function () {
      updateNetworkId();
    });
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Dopex Swap</title>
        <meta name="description" content="Generated by create next app" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/images/favicon.png"
        />
      </Head>

      <Navbar
        status={status}
        account={account}
        connect={connect}
        chainId={chainId}
        switchToArbitrum={switchToArbitrum}
      />

      <SwapBox account={account} />
    </div>
  );
};

export default Home;
