const express = require("express");

const app = express();
const port = process.env.PORT || 3000;
const appName = process.env.APP_NAME || "demo-app";

app.get("/", (req, res) => {
  res.json({
    app: appName,
    status: "running",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.listen(port, () => {
  console.log(`${appName} listening on port ${port}`);
});
