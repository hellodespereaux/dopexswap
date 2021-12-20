import styles from "../styles/swapbox.module.css";
import { FunctionComponent, useState, useEffect } from "react";
import { Slider, Spin, Dropdown, Menu, Tooltip } from "antd";
import { DelayInput } from "react-delay-input";

const tokensOut = [
  {
    address: "0x6c2c06790b3e3e3c38e12ee22f8183b37a13ee55",
    name: "Dopex Governance Token",
    decimals: 18,
    symbol: "DPX",
  },
  {
    address: "0x32eb7902d4134bf98a28b963d26de779af92a212",
    name: "Dopex Rebase Token",
    decimals: 18,
    symbol: "rDPX",
  },
];

const tokensIn = [
  {
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    name: "Ethereum",
    decimals: 18,
    symbol: "ETH",
  },
  {
    address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    name: "Wrapped Ethereum",
    decimals: 18,
    symbol: "WETH",
  },
  {
    address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    name: "Tether USD",
    decimals: 6,
    symbol: "USDT",
  },
  {
    address: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    name: "USD Coin",
    decimals: 6,
    symbol: "USDC",
  },
  {
    address: "0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a",
    name: "Magic Internet Money",
    decimals: 18,
    symbol: "MIM",
  },
  {
    address: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    name: "DAI Stablecoin",
    decimals: 18,
    symbol: "DAI",
  },
];

type SwapBoxProps = {
  account: string | null;
};

type Token = {
  address: string;
  name: string;
  decimals: number;
  symbol: string;
};

type Transaction = {
  from: string;
  data: string;
  gas: number | string | undefined;
  to: string;
  value: string;
  gasPrice?: string | null ;
};

type Path = {
  toTokenAmount: string;
  tx: Transaction;
  protocols: any[];
};

export const SwapBox: FunctionComponent<SwapBoxProps> = ({ account }) => {
  const [tokenIn, setTokenIn] = useState<Token | null>(tokensIn[0]);
  const [tokenOut, setTokenOut] = useState<Token | null>(tokensOut[0]);
  const [amountIn, setAmountIn] = useState<string>("");
  const [slippageTolerance, setSlippageTolerance] = useState<string>("0.1");
  const [path, setPath] = useState<Path | null>(null);
  const [isSettingsDropdownVisible, setIsSettingsDropdownVisible] =
    useState<boolean>(false);
  const [isBalanceInsufficient, setIsBalanceInsufficient] =
    useState<boolean>(false);
  const [suggestedMaximumAmount, setSuggestedMaximumAmount] = useState<
    string | null
  >("0");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAllowanceInsufficient, setIsAllowanceInsufficient] =
    useState<boolean>(false);
  const [allowanceTransaction, setAllowanceTransaction] =
    useState<Transaction | null>();

  const getPathFromAmountIn = async () => {
    setIsLoading(true);
    setIsBalanceInsufficient(false);
    setIsAllowanceInsufficient(false);
    const amount =
      tokenIn &&
      (parseFloat(amountIn) * 10 ** tokenIn.decimals)
        .toLocaleString()
        .replaceAll(".", "");
    const request = await fetch(
      `https://api.1inch.io/v4.0/42161/swap?fromTokenAddress=${tokenIn?.address}&toTokenAddress=${tokenOut?.address}&amount=${amount}&fromAddress=${account}&slippage=${slippageTolerance}`
    );
    const data = await request.json();
    setPath(data);

    if (request.status === 400) {
      const requestWithoutEstimate = await fetch(
        `https://api.1inch.io/v4.0/42161/swap?fromTokenAddress=${tokenIn?.address}&toTokenAddress=${tokenOut?.address}&amount=${amount}&fromAddress=${account}&slippage=${slippageTolerance}&disableEstimate=true`
      );
      const dataWithoutEstimate = await requestWithoutEstimate.json();
      setPath(dataWithoutEstimate);

      // order is important

      if (data.description.includes("Not enough allowance")) {
        setIsAllowanceInsufficient(true);
      } else if (data.description.includes("Not enough")) {
        setIsBalanceInsufficient(true);
        if (tokenIn) {
          let maxAmount =
            parseFloat(data["meta"][2]["value"]) / 10 ** tokenIn.decimals;
          if (tokenIn.symbol === "ETH") maxAmount -= 0.02; // max tx fee
          setSuggestedMaximumAmount(Math.max(maxAmount, 0).toString());
        }
      }
    }

    if (request.status === 200) {
      setIsBalanceInsufficient(false);
    }

    setIsLoading(false);
  };

  const getAllowance = async () => {
    const request = await fetch(
      `https://api.1inch.io/v4.0/42161/approve/transaction?tokenAddress=${tokenIn?.address}`
    );
    let data = await request.json();
    setAllowanceTransaction(data);
  };

  const approve = async () => {
    if (!allowanceTransaction || !account) return;
    allowanceTransaction["from"] = account;
    delete allowanceTransaction["gasPrice"];
    // @ts-ignore
    await window["ethereum"]
      .request({
        method: "eth_sendTransaction",
        params: [allowanceTransaction],
      })
      .then(() => {
        getPathFromAmountIn();
      });
  };

  const swap = async () => {
    if (!path || isBalanceInsufficient) return;
    delete path["tx"]["gasPrice"];
    path["tx"]["gas"] = path["tx"].gas?.toString(16);
    path["tx"]["value"] = parseInt(path["tx"]["value"]).toString(16);
    await window["ethereum"]
      .request({ method: "eth_sendTransaction", params: [path["tx"]] })
      .then(() => {
        setAmountIn("");
        setPath(null);
      });
  };

  const getHops = () => {
    const hops: string[] = [];
    path &&
      path["protocols"] &&
      path.protocols[0].map((protocol: { name: string }[]) =>
        hops.push(protocol[0].name)
      );
    return hops;
  };

  useEffect(
    function () {
      if (amountIn && tokenIn && tokenOut) getPathFromAmountIn();
    },
    [amountIn, tokenIn, tokenOut]
  );

  useEffect(
    function () {
      if (!isAllowanceInsufficient) getAllowance();
    },
    [isAllowanceInsufficient]
  );

  useEffect(
    function () {
      // @ts-ignore
      if (account) setAmountIn(window["ethereum"].eth?.get_balance(account));
    },
    [account]
  );

  return (
    <div className={styles.swapBoxWrapper}>
      <div className="absolute top-1/4 -left-10 bg-blue bottom-4 w-3/5 rounded-full z-0 filter blur-[150px]" />
      <div className="absolute bottom-1/4 -right-10 bg-other-blue top-4 w-3/5 rounded-full z-0  filter blur-[150px]" />
      <div className="relative filter drop-shadow">
        <div className="p-4 space-y-4 rounded bg-dark-900 z-1">
          <div className={styles.swapBox}>
            <div className={styles.header}>
              <div className={styles.section}>
                <span className="text-sky-600 text-big ml-2 mt-2">
                  Swap across Arbitrum DEXs
                </span>
              </div>
              <Dropdown
                visible={isSettingsDropdownVisible}
                overlay={
                  <Menu>
                    <Menu.Item key={0} className={"text-center"}>
                      Slippage tolerance
                      <Slider
                        min={0}
                        max={5}
                        onChange={(value) =>
                          setSlippageTolerance(value.toString())
                        }
                        step={0.1}
                        value={parseFloat(slippageTolerance)}
                      />
                      <p className={"text-sky-500 mb-1"}>
                        {slippageTolerance}%{" "}
                        {parseFloat(slippageTolerance) > 0.3 && (
                          <span className={"text-red-500"}>(High!)</span>
                        )}
                      </p>
                    </Menu.Item>
                  </Menu>
                }
                placement="topRight"
              >
                <svg
                  onClick={() =>
                    setIsSettingsDropdownVisible(!isSettingsDropdownVisible)
                  }
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                  className="w-[23px] h-[23px] transform rotate-90 ml-auto mt-1.5 icon-colored cursor-pointer"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </Dropdown>
            </div>
            <div className="flex mt-7 max-w-full flex-wrap ml-8 mr-8">
              <DelayInput
                delayTimeout={300}
                inputMode="decimal"
                placeholder="0.0"
                autoComplete="off"
                autoCorrect="off"
                type="text"
                pattern="^[0-9]*[.,]?[0-9]*$"
                min={0}
                minLength={1}
                maxLength={79}
                spellCheck="false"
                className={styles.inputBox}
                value={amountIn}
                onChange={(e: { target: { value: string } }) =>
                  setAmountIn(e.target.value)
                }
              />
            </div>
            {isBalanceInsufficient && (
              <div className="flex mt-3 mb-7 max-w-full flex-wrap ml-8 mr-8">
                <p
                  className={"text-red-500 cursor-pointer"}
                  onClick={() => {
                    suggestedMaximumAmount &&
                      setAmountIn(suggestedMaximumAmount);
                  }}
                >
                  <b>
                    You can sell at maximum {suggestedMaximumAmount}{" "}
                    {tokenIn?.symbol}{" "}
                    <span className={styles.smallNote}>(Click to set)</span>
                  </b>
                </p>
              </div>
            )}

            <div className="flex mt-3 max-w-full flex-wrap ml-6">
              {tokensIn.map((token) => (
                <div
                  key={token.symbol}
                  className={
                    tokenIn?.address === token.address
                      ? styles.tokenBoxSelected
                      : styles.tokenBox
                  }
                  onClick={() => setTokenIn(token)}
                >
                  <span className={"text-sky-600 ml-1"}>{token.symbol}</span>{" "}
                  <img
                    src={"/images/" + token.symbol + ".png"}
                    className={"ml-auto mr-0 w-6 h-6 rounded-md mt-0.5"}
                  />
                </div>
              ))}
            </div>

            <div className={"flex center"}>
              <div
                style={{ width: "22px", height: "22px" }}
                className={"mx-auto mt-5 mb-1"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 500 500"
                  width={500}
                  height={500}
                  preserveAspectRatio="xMidYMid meet"
                  style={{
                    width: "100%",
                    height: "100%",
                    transform: "translate3d(0px, 0px, 0px)",
                  }}
                >
                  <defs>
                    <clipPath id="__lottie_element_156">
                      <rect width={500} height={500} x={0} y={0} />
                    </clipPath>
                    <clipPath id="__lottie_element_158">
                      <path d="M0,0 L500,0 L500,500 L0,500z" />
                    </clipPath>
                  </defs>
                  <g clipPath="url(#__lottie_element_156)">
                    <g
                      transform="matrix(4.5,0,0,4.5,207.25,194.875)"
                      opacity={1}
                      style={{ display: "block" }}
                    >
                      <g opacity={1} transform="matrix(1,0,0,1,0,0)">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fillOpacity={0}
                          stroke="rgb(226,226,226)"
                          strokeOpacity={1}
                          strokeWidth="5.6000000000000005"
                          d=" M28.945999145507812,-27.937000274658203 C28.966999053955078,-9.605999946594238 29.014999389648438,33.75299835205078 29.034000396728516,50.236000061035156"
                        />
                      </g>
                    </g>
                    <g
                      transform="matrix(3.1819803714752197,-3.1819803714752197,3.1819803714752197,3.1819803714752197,363.2012939453125,326.5682373046875)"
                      opacity={1}
                      style={{ display: "block" }}
                    >
                      <g opacity={1} transform="matrix(1,0,0,1,0,0)">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fillOpacity={0}
                          stroke="rgb(226,226,226)"
                          strokeOpacity={1}
                          strokeWidth="5.6000000000000005"
                          d=" M-20.548999786376953,-4.929999828338623 C-20.548999786376953,-4.929999828338623 -20.548999786376953,12.746999740600586 -20.548999786376953,12.746999740600586 C-20.548999786376953,12.746999740600586 -2.927000045776367,12.746999740600586 -2.927000045776367,12.746999740600586"
                        />
                      </g>
                    </g>
                    <g
                      transform="matrix(-4.5,0,0,-4.5,292.75,305.125)"
                      opacity={1}
                      style={{ display: "block" }}
                    >
                      <g opacity={1} transform="matrix(1,0,0,1,0,0)">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fillOpacity={0}
                          stroke="rgb(226,226,226)"
                          strokeOpacity={1}
                          strokeWidth="5.6000000000000005"
                          d=" M28.945999145507812,-27.937000274658203 C28.966999053955078,-9.605999946594238 29.014999389648438,33.75299835205078 29.034000396728516,50.236000061035156"
                        />
                      </g>
                    </g>
                    <g
                      transform="matrix(-3.1819803714752197,3.1819803714752197,-3.1819803714752197,-3.1819803714752197,136.79869079589844,173.43174743652344)"
                      opacity={1}
                      style={{ display: "block" }}
                    >
                      <g opacity={1} transform="matrix(1,0,0,1,0,0)">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fillOpacity={0}
                          stroke="rgb(226,226,226)"
                          strokeOpacity={1}
                          strokeWidth="5.6000000000000005"
                          d=" M-20.548999786376953,-4.929999828338623 C-20.548999786376953,-4.929999828338623 -20.548999786376953,12.746999740600586 -20.548999786376953,12.746999740600586 C-20.548999786376953,12.746999740600586 -2.927000045776367,12.746999740600586 -2.927000045776367,12.746999740600586"
                        />
                      </g>
                    </g>
                    <g
                      clipPath="url(#__lottie_element_158)"
                      transform="matrix(1,0,0,1,0,0)"
                      opacity={1}
                      style={{ display: "block" }}
                    />
                  </g>
                </svg>
              </div>
            </div>
            <div className="flex mt-7 max-w-full flex-wrap ml-8 mr-8">
              <input
                inputMode="decimal"
                placeholder="0.0"
                autoComplete="off"
                autoCorrect="off"
                type="text"
                pattern="^[0-9]*[.,]?[0-9]*$"
                min={0}
                minLength={1}
                maxLength={79}
                spellCheck="false"
                className={styles.inputBox}
                style={{ cursor: "auto" }}
                value={
                  path?.toTokenAmount && tokenOut
                    ? parseInt(path?.toTokenAmount) / 10 ** tokenOut.decimals
                    : "0.0"
                }
                readOnly={true}
              />
            </div>
            <div className="flex mt-3 max-w-full flex-wrap ml-6">
              {tokensOut.map((token) => (
                <div
                  key={token.symbol}
                  className={
                    tokenOut?.address === token.address
                      ? styles.tokenBoxSelected
                      : styles.tokenBox
                  }
                  onClick={() => setTokenOut(token)}
                >
                  <span className={"text-sky-600 ml-1"}>{token.symbol}</span>{" "}
                  <img
                    src={"/images/" + token.symbol + ".png"}
                    className={"ml-auto mr-0 w-6 h-6 rounded-md mt-0.5"}
                  />
                </div>
              ))}
            </div>
            {isLoading && (
              <div className="flex center mt-5 mb-7 max-w-full">
                <Spin className={"mx-auto"} size={"large"} />
              </div>
            )}
            {!isLoading && (
              <div className="flex center mt-5 mb-7 max-w-full">
                {!isAllowanceInsufficient ? (
                  <button
                    className={
                      "w-full text-white text-high-emphesis bg-gradient-to-r from-blue to-other-blue opacity-80 hover:opacity-100 disabled:bg-opacity-80 px-6 py-4 text-base rounded disabled:cursor-not-allowed focus:outline-none mx-7 disabled:opacity-30"
                    }
                    disabled={!path || isBalanceInsufficient}
                    onClick={swap}
                  >
                    {path ? "Swap" : "Insert an amount"}
                  </button>
                ) : (
                  <button
                    onClick={approve}
                    className={
                      "w-full text-white text-high-emphesis bg-gradient-to-r from-blue to-other-blue opacity-80 hover:opacity-100 disabled:bg-opacity-80 px-6 py-4 text-base rounded disabled:cursor-not-allowed focus:outline-none mx-7"
                    }
                  >
                    Approve
                  </button>
                )}
              </div>
            )}
            {path && (
              <div className="mt-5 mb-7 max-w-full mx-7">
                <p className={"text-white mt-1"}>
                  Minimum amount -{" "}
                  <b>
                    {path?.toTokenAmount && tokenOut
                      ? (parseInt(path?.toTokenAmount) *
                          (1 - parseFloat(slippageTolerance) / 100)) /
                        10 ** tokenOut.decimals
                      : "0.0"}
                  </b>
                </p>
                <p className={"text-white mt-1"}>
                  Slippage tolerance - <b>{slippageTolerance}%</b>
                </p>
                <div className={"flex mt-1"}>
                  <p className={"text-white"}>Path -</p>{" "}
                  {getHops().map((hop) => (
                    <Tooltip title={hop} key={hop}>
                      <img
                        src={"/images/" + hop + ".png"}
                        className={styles.hopImage}
                      />
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
