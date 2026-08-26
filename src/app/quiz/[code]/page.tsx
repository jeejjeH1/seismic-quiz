import PlayerRoom from "./player-room";

export default function QuizPage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code).toUpperCase();
  return <PlayerRoom code={code} />;
}
