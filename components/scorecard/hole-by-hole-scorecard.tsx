import { ArrowUp } from "lucide-react";
import type { MatchWithDetails } from "@/lib/data";
import { getSideNames } from "@/lib/match-helpers";
import { computeHoleWinners, computeMatchPlayStatus, type HoleWinner } from "@/lib/scorecard-logic";
import { cn } from "@/lib/utils";

function sumRange(holes: number[], start: number, end: number): number | null {
  const slice = holes.slice(start, end);
  if (slice.length === 0 || slice.some((h) => h <= 0)) return null;
  return slice.reduce((a, b) => a + b, 0);
}

function NineRows({
  holeNumbers,
  par,
  teamAHoles,
  teamBHoles,
  teamAName,
  teamBName,
  holeWinners,
}: {
  holeNumbers: number[];
  par: number[];
  teamAHoles: number[];
  teamBHoles: number[];
  teamAName: string;
  teamBName: string;
  holeWinners: HoleWinner[];
}) {
  const start = holeNumbers[0]! - 1;
  const end = start + holeNumbers.length;
  const label = holeNumbers[0] === 1 ? "Out" : "In";
  const aTotal = sumRange(teamAHoles, start, end);
  const bTotal = sumRange(teamBHoles, start, end);

  return (
    <>
      {par.length === 18 && (
        <tr className="text-xs text-ink-700/40">
          <td className="p-1 text-left">Par</td>
          {holeNumbers.map((n) => (
            <td key={n} className="p-1">
              {par[n - 1]}
            </td>
          ))}
          <td className="p-1">{par.slice(start, end).reduce((a, b) => a + b, 0)}</td>
        </tr>
      )}
      <tr>
        <td className="p-1 text-left font-medium text-ink-900">{teamAName}</td>
        {holeNumbers.map((n) => (
          <td key={n} className="p-1">
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded",
                holeWinners[n - 1] === "A" ? "bg-red-500 font-bold text-white" : "text-ink-700/80",
              )}
            >
              {teamAHoles[n - 1] || "-"}
            </span>
          </td>
        ))}
        <td className="p-1 font-semibold text-ink-900">{aTotal ?? "-"}</td>
      </tr>
      <tr>
        <td className="p-1 text-left font-medium text-ink-900">{teamBName}</td>
        {holeNumbers.map((n) => (
          <td key={n} className="p-1">
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded",
                holeWinners[n - 1] === "B" ? "bg-blue-500 font-bold text-white" : "text-ink-700/80",
              )}
            >
              {teamBHoles[n - 1] || "-"}
            </span>
          </td>
        ))}
        <td className="p-1 font-semibold text-ink-900">{bTotal ?? "-"}</td>
      </tr>
      <tr aria-hidden className="h-1">
        <td colSpan={holeNumbers.length + 2} />
      </tr>
      {label === "Out" && <tr aria-hidden className="border-b border-fairway-900/5" />}
    </>
  );
}

export function HoleByHoleScorecard({ match }: { match: MatchWithDetails }) {
  const par = match.course?.parByHole ?? [];
  const teamAName = getSideNames(match, "A");
  const teamBName = getSideNames(match, "B");
  const holeWinners = computeHoleWinners(match.teamAHoleScores, match.teamBHoleScores);
  const matchPlayStatus = computeMatchPlayStatus(holeWinners);

  return (
    <div className="mt-5 border-t border-fairway-900/5 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/40">Scorecard</p>
        {matchPlayStatus.holesPlayed > 0 && (
          <p className="flex items-center gap-1 text-sm font-bold text-fairway-800">
            {matchPlayStatus.leaderSide === null ? (
              `All square thru ${matchPlayStatus.holesPlayed}`
            ) : (
              <>
                {matchPlayStatus.leaderSide === "A" ? teamAName : teamBName} {matchPlayStatus.margin}
                <ArrowUp className="h-3.5 w-3.5" />
                thru {matchPlayStatus.holesPlayed}
              </>
            )}
          </p>
        )}
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-center text-sm">
          <thead>
            <tr className="text-xs text-ink-700/50">
              <th className="p-1 text-left font-medium">Hole</th>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <th key={n} className="p-1 font-medium">
                  {n}
                </th>
              ))}
              <th className="p-1 font-semibold">Out</th>
            </tr>
          </thead>
          <tbody>
            <NineRows
              holeNumbers={[1, 2, 3, 4, 5, 6, 7, 8, 9]}
              par={par}
              teamAHoles={match.teamAHoleScores}
              teamBHoles={match.teamBHoleScores}
              teamAName={teamAName}
              teamBName={teamBName}
              holeWinners={holeWinners}
            />
          </tbody>
          <thead>
            <tr className="text-xs text-ink-700/50">
              <th className="p-1 text-left font-medium">Hole</th>
              {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((n) => (
                <th key={n} className="p-1 font-medium">
                  {n}
                </th>
              ))}
              <th className="p-1 font-semibold">In</th>
            </tr>
          </thead>
          <tbody>
            <NineRows
              holeNumbers={[10, 11, 12, 13, 14, 15, 16, 17, 18]}
              par={par}
              teamAHoles={match.teamAHoleScores}
              teamBHoles={match.teamBHoleScores}
              teamAName={teamAName}
              teamBName={teamBName}
              holeWinners={holeWinners}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
