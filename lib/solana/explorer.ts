import { SOLANA_CLUSTER, type SolanaCluster } from "./constants";

const BASE = "https://explorer.solana.com";

const CLUSTER_QUERY: Record<SolanaCluster, string> = {
  "mainnet-beta": "",
  devnet: "?cluster=devnet",
  localnet: "?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899",
};

function clusterQuery(cluster: SolanaCluster): string {
  return CLUSTER_QUERY[cluster] ?? CLUSTER_QUERY.devnet;
}

export function getExplorerTxUrl(
  signature: string,
  cluster: SolanaCluster = SOLANA_CLUSTER,
): string {
  return `${BASE}/tx/${signature}${clusterQuery(cluster)}`;
}

export function getExplorerAddressUrl(
  address: string,
  cluster: SolanaCluster = SOLANA_CLUSTER,
): string {
  return `${BASE}/address/${address}${clusterQuery(cluster)}`;
}
