require("dotenv").config();

const axios = require("axios");
const express = require("express");
const cors = require("cors");
const yup = require("yup");
const { isAddress } = require("@ethersproject/address");
const { Contract } = require("@ethersproject/contracts");
const { JsonRpcProvider } = require("@ethersproject/providers");
const { parseEther } = require("@ethersproject/units");
const { Wallet } = require("@ethersproject/wallet");
const { formatEther } = require("@ethersproject/units");

const abi = require("./abi/ERC20.json");

const MAX_ERC20 = "50.0";
const TOKEN_PER_REQUEST = "25.0";

const tokenPerRequest = parseEther(TOKEN_PER_REQUEST);
const wallet = Wallet.fromMnemonic(process.env.MNEMOMIC);
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("dist"));

const schema = yup.object({
  account: yup
    .string()
    .required("Account is required")
    .test("isValid", "Account is invalid", (value) => isAddress(value)),
  reCaptcha: yup.string().required("reCaptcha is required"),
});

app.post("/faucet", async function (req, res) {
  const { account, reCaptcha } = req.body;

  try {
    await schema.validate({ account, reCaptcha });
  } catch (error) {
    res.status(400).send(error);
    return;
  }

  const { data } = await axios.post(
    `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${reCaptcha}`
  );

  if (!data.success) {
    res.status(400).send({ message: "reCaptcha is invalid" });
    return;
  }

  const provider = new JsonRpcProvider(
    "https://data-seed-prebsc-1-s3.binance.org:8545",
    97
  );
  const signer = wallet.connect(provider);

  const contract = new Contract(process.env.TOKEN_ADDRESS, abi, signer);

  const balance = await contract.balanceOf(account);

  if (
    Number(formatEther(balance)) + Number(TOKEN_PER_REQUEST) >=
    Number(MAX_ERC20)
  ) {
    res.status(400).send({ message: "Token request reaches the limit" });
    return;
  }

  const tx = await contract.transfer(account, tokenPerRequest);
  console.log({ account, txHash: tx.hash });

  res.send(tx.hash);
});

app.listen(process.env.PORT, () => console.log("Server is running"));
