import axios from "axios";
import { useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import ReCAPTCHA from "react-google-recaptcha";
import { ToastContainer, toast } from "react-toastify";
import { isAddress } from "@ethersproject/address";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import "react-toastify/dist/ReactToastify.min.css";

import logo from "./images/logo.png";

const schema = yup.object({
  account: yup
    .string()
    .required("Account is required")
    .test("isValid", "Account is invalid", (value) => isAddress(value)),
  reCaptcha: yup.string().required("reCaptcha is required"),
});

function App() {
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
    setValue("signature", "");
    recaptchaRef.current.reset();
  }

  async function onSubmit({ account, reCaptcha }) {
    await toast.promise(
      axios.post(`${import.meta.env.VITE_API_URL}/request`, {
        account,
        reCaptcha,
      }),
      {
        pending: "Processing",
        success: {
          render({ data }) {
            return (
              <p>
                You have submited a transaction.
                <br />
                {data?.data ? (
                  <a
                    rel="noreferrer"
                    target="_blank"
                    href={`https://testnet.bscscan.com/tx/${data.data}`}
                  >
                    View it on block explorer
                  </a>
                ) : null}
              </p>
            );
          },
          autoClose: false,
          closeOnClick: false,
        },
        error: {
          render({ data }) {
            if (data?.response?.data?.message) {
              return data.response.data.message;
            }

            return "An error occurred";
          },
        },
      }
    );

    resetCaptcha();
  }

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
            placeholder="Input your address"
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
          <button className="button">Request 5 Run2n token</button>
        </form>
      </main>
      <ToastContainer position="top-right" />
    </section>
  );
}

export default App;
