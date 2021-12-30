import { useCallback, useMemo, useState } from "react";
import Web3 from "web3";
import { AbiItem } from "web3-utils";

import showToast from "@lib/notification";

import { Button } from "@components/ui/Button";

import genericAbi from "../web3/abis/abiWithGetBalance.json";

interface Window {
  ethereum: any;
  web3: Web3;
}

interface EvtsToVerify {
  [eventId: string]: boolean;
}

declare const window: Window;

interface CryptoSectionProps {
  id: number | string;
  scAddress: string;
  oneStep: boolean; // When set to true, there will be only 1 button which will both connect Metamask and verify the user's wallet. Otherwise, it will be in 2 steps with 2 buttons.
  verified: boolean | undefined;
  setEvtsToVerify: React.Dispatch<React.SetStateAction<Record<number | string, boolean>>>;
}

const CryptoSection = (props: CryptoSectionProps) => {
  // Crypto section which should be shown on booking page if event type requires a smart contract token.
  const [ethEnabled, toggleEthEnabled] = useState<boolean>(false);

  const connectMetamask = useCallback(async () => {
    if (window.ethereum) {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      window.web3 = new Web3(window.ethereum);
      toggleEthEnabled(true);
    } else {
      toggleEthEnabled(false);
    }
  }, []);

  const verifyWallet = useCallback(async () => {
    try {
      const contract = new window.web3.eth.Contract(genericAbi as AbiItem[], props.scAddress);
      const balance = await contract.methods.balanceOf(window.ethereum.selectedAddress).call();

      const hasToken = balance > 0;

      props.setEvtsToVerify((prevState: EvtsToVerify) => {
        const changedEvt = { [props.id]: hasToken };
        return { ...prevState, ...changedEvt };
      });

      if (!hasToken)
        throw new Error("Specified wallet does not own any tokens belonging to this smart contract");
    } catch (err) {
      err instanceof Error ? showToast(err.message, "error") : showToast("An error has occurred", "error");
    }
  }, [props]);

  // @TODO: Show error on either of buttons if fails. Yup schema already contains the error message.
  const successButton = useMemo(() => {
    return (
      <Button type="button" disabled>
        Success!
      </Button>
    );
  }, []);

  const verifyButton = useMemo(() => {
    return (
      <Button onClick={verifyWallet} type="button" id="hasToken" name="hasToken">
        Verify wallet
      </Button>
    );
  }, [verifyWallet]);

  const connectButton = useMemo(() => {
    return (
      <Button onClick={connectMetamask} type="button">
        Connect Metamask
      </Button>
    );
  }, [connectMetamask]);

  const oneStepButton = useMemo(() => {
    return (
      <Button
        type="button"
        onClick={async () => {
          await connectMetamask();
          await verifyWallet();
        }}>
        Verify wallet
      </Button>
    );
  }, [connectMetamask, verifyWallet]);

  const determineButton = useCallback(() => {
    // Did it in an extra function for some added readability, but this can be done in a ternary depending on preference
    if (props.oneStep) {
      return props.verified ? successButton : oneStepButton;
    } else {
      if (ethEnabled) {
        return props.verified ? successButton : verifyButton;
      } else {
        return connectButton;
      }
    }
  }, [props.verified, successButton, oneStepButton, connectButton, ethEnabled, props.oneStep, verifyButton]);

  return (
    <div
      id={`crypto-${props.id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "2.5%",
      }}>
      {determineButton()}
    </div>
  );
};

export default CryptoSection;