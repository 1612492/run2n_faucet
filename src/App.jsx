import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import ReCAPTCHA from "react-google-recaptcha";
import { ToastContainer, toast } from "react-toastify";
import { isAddress } from "@ethersproject/address";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import "react-toastify/dist/ReactToastify.min.css";

import logo from "./images/logo.png";
import * as api from "./api";

const explorer = "https://testnet.bscscan.com/tx/";

const schema = yup.object({
  account: yup
    .string()
    .required("Account is required")
    .test("isValid", "Account is invalid", (value) => isAddress(value)),
  reCaptcha: yup.string().required("reCaptcha is required"),
});

export function shortenTxHash(hash) {
  const startStr = hash.substring(0, 10);
  const endStr = hash.substring(hash.length -20);
  return startStr + "..." + endStr;
}

function App() {
  const [processingTransactions, setProcessingTransactions] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });
  const recaptchaRef = useRef();

  function resetCaptcha() {
    setValue("reCaptcha", "");
    recaptchaRef.current.reset();
  }

  async function onSubmit({ account, reCaptcha }) {
    await toast.promise(api.addToQueue({ account, reCaptcha }), {
      pending: "Processing",
      success: {
        render({ data }) {
          if (data?.data?.message) {
            return data.data.message;
          }

          return "Success";
        },
      },
      error: {
        render({ data }) {
          if (data?.response?.data?.message) {
            return data.response.data.message;
          }

          return "An error occurred";
        },
      },
    });

    resetCaptcha();
  }

  async function getQueue() {
    try {
      const { data } = await api.getQueue();
      setProcessingTransactions(data.processing);
    } catch (error) {}
  }

  useEffect(() => {
    const intervalId = setInterval(() => {
      getQueue();
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    register("reCaptcha");
  }, []);

  return (
    <section className="container">
      <header className="header">
        <img src={logo} alt="logo" className="logo" />
      </header>

      <main className="main">
        <form onSubmit={handleSubmit(onSubmit)} className="card">
          <h1 className="title">Testnet Faucet</h1>
          <p className="sub-title">
            Fell free to get test Run2n token to your wallet
          </p>
          <input
            {...register("account")}
            placeholder="Input your wallet address (get in test app)"
            className="input"
          />
          <p className="validation">{errors.account?.message}</p>
          <div className="captcha">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey="6LdxS2UhAAAAAF4vb4wH6rfVEB60cV0Qchr2v0-H"
              onChange={(value) => {
                setValue("reCaptcha", value);
                clearErrors("reCaptcha");
              }}
            />
          </div>
          <p className="validation">{errors.reCaptcha?.message}</p>
          <button className="button">Request 25 token</button>
        </form>
        {processingTransactions && processingTransactions.length > 0 ? (
          <section className="sub-card">
            <p className="heading">Processing transactions</p>
            {processingTransactions.map(({ txHash }) => (
              <a
                href={explorer + txHash}
                target="_blank"
                rel="noreferrer"
                className="link"
              >
                {shortenTxHash(txHash)}
              </a>
            ))}
          </section>
        ) : null}
      </main>
      <ToastContainer position="top-right" />
    </section>
  );
}

export default App;
