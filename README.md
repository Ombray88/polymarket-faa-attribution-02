# Empirical-quantile forecaster

The forecaster models per-market volatility from sorted clipped one-minute differences over the most recent 120 minutes, with no trend drift and the median set to the last price.

Tuning has been backtested on live FAA market history, scoring about 0.10 points versus about 0.26 for the previous live entry.

To run the forecaster, use Node 22 (stdlib only), set the `MAKEFUN_INPUT_DIR` and `MAKEFUN_OUTPUT_DIR` environment variables, and run `main.ts` with Node.

Licensed under the MIT License.
