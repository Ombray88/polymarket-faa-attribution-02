# Jump-aware winsorized quantile forecaster

The forecaster models per-market volatility from winsorized one-minute price changes, incorporates damped 60-minute trend drift, and computes asymmetric bands wider below the median.

Tuning has been backtested on live FAA market history from Polymarket public price history, achieving a mean pinball score of about 0.75 points versus about 0.96 for the house baseline.

To run the forecaster, use Node 22 (stdlib only), set the `MAKEFUN_INPUT_DIR` and `MAKEFUN_OUTPUT_DIR` environment variables, and run `main.ts` with Node.

Licensed under the MIT License.
