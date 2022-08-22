require("dotenv").config();

const async = require("async");
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
const config = require("./config");

const tokenPerRequest = parseEther(config.tokenPerRequest);
const wallet = Wallet.fromMnemonic(process.env.MNEMOMIC);
const provider = new JsonRpcProvider(config.rpcUrl);
const signer = wallet.connect(provider);
const contract = new Contract(process.env.TOKEN_ADDRESS, abi, signer);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("dist"));

let processing = [];

const queue = async.queue(async (task) => {
  const { account } = task;
  console.log(`Transfering to ${account}`);

  try {
    const tx = await contract.transfer(account, tokenPerRequest);
    const info = { account, txHash: tx.hash };
    console.log(info);
    processing.push(info);

    await tx.wait();

    processing = processing.filter(({ txHash }) => txHash !== tx.hash);
  } catch (error) {
    console.log(`Failure: ${account}`);
  }
}, 1);

const schema = yup.object({
  account: yup
    .string()
    .required("Account is required")
    .test("isValid", "Account is invalid", (value) => isAddress(value)),
  reCaptcha: yup.string().required("reCaptcha is required"),
});

app.get("/queue", function (_, res) {
  return res.status(200).json({
    processing: [...processing],
  });
});

app.post("/queue/add", async function (req, res) {
  const { account, reCaptcha } = req.body;

  try {
    await schema.validate({ account, reCaptcha });
  } catch (error) {
    return res.status(400).send(error);
  }

  const { data } = await axios.post(
    `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${reCaptcha}`
  );

  if (!data.success) {
    return res.status(400).send({ message: "reCaptcha is invalid" });
  }

  const balance = await contract.balanceOf(account);

  if (
    Number(formatEther(balance)) + Number(config.tokenPerRequest) >=
    Number(config.maxToken)
  ) {
    return res.status(400).send({ message: "Token request reaches the limit" });
  }

  if (queue.length() >= config.queueSize) {
    return res.status(400).send({
      message: "Queue is full. Try again later.",
    });
  }

  if (
    [...queue].find((t) => t.account === account) ||
    processing.find((t) => t.account === account)
  ) {
    return res.status(400).send({
      message: "You have a pending transaction. Try again later.",
    });
  }

  queue.push({ account });

  return res.status(200).send({ message: "Request added to the queue" });
});

app.listen(process.env.PORT, () =>
  console.log(`Server is running on http://localhost:${process.env.PORT}`)
);
