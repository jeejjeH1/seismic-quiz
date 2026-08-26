import PublicLeaderboard from "./public-leaderboard";

export default function LeaderboardPage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code).toUpperCase();
  return <PublicLeaderboard code={code} />;
}
